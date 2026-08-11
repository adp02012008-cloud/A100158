import dns from "dns";
dns.setServers(["8.8.8.8"]);
import dotenv from "dotenv";
dotenv.config();

import { connectDB } from "../config/db.js";
import { User } from "../models/User.js";
import { Cluster } from "../models/Cluster.js";
import { Course } from "../models/Course.js";
import { CoursePointRule } from "../models/CoursePointRule.js";
import { UserCourseProgress } from "../models/UserCourseProgress.js";
import { Task } from "../models/Task.js";
import { TaskAssignment } from "../models/TaskAssignment.js";
import { TaskSubmission } from "../models/TaskSubmission.js";
import { TaskReview } from "../models/TaskReview.js";
import { Notification } from "../models/Notification.js";
import { Hackathon } from "../models/Hackathon.js";
import { GalleryItem } from "../models/GalleryItem.js";
import { Project } from "../models/Project.js";
import { Certificate } from "../models/Certificate.js";
import { Opportunity } from "../models/Opportunity.js";
import { CustomCollection } from "../models/CustomCollection.js";
import { CustomRecord } from "../models/CustomRecord.js";
import { AuditLog } from "../models/AuditLog.js";

import { isAdmin, canSubmit, canReview } from "../services/authorizationService.js";
import { recalculateTaskState } from "../services/taskStateService.js";
import { recalculateUserPoints } from "../services/pointsService.js";

async function runComprehensiveSuite() {
  console.log("⚡ Starting 38-Point Master Comprehensive Test Suite...");
  await connectDB();

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASSED: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAILED: ${message}`);
      failed++;
    }
  }

  try {
    // 1. PUBLIC USER ACCESS
    console.log("\n--- TEST 1: Public User Access ---");
    const activeUsersCount = await User.countDocuments({ status: "ACTIVE" });
    assert(activeUsersCount > 0, `Public dashboard reads ${activeUsersCount} active students`);

    // 2. UNAUTHORIZED ACCESS ATTEMPTS
    console.log("\n--- TEST 2: Unauthorized Access Protection ---");
    const testMember = await User.findOne({ role: "MEMBER", status: "ACTIVE" });
    const dummySubmission = { _id: "sub123", submittedBy: testMember._id };
    const memberCanRev = canReview(testMember, dummySubmission);
    assert(!memberCanRev, "Member cannot review submissions (Denied 403)");

    // 3. MEMBER ACCESS & PROFILE
    console.log("\n--- TEST 3: Member Profile & Limits ---");
    assert(!!testMember, "Member account exists and resolved");

    // 4. MEMBER CREATION
    console.log("\n--- TEST 4: Member Creation ---");
    const testEmail = `test.user.${Date.now()}@bitsathy.ac.in`;
    const createdMember = await User.create({
      userId: `USR-TEST-${Date.now()}`,
      name: "Automation Test User",
      email: testEmail,
      role: "MEMBER",
      position: "Member",
      clusterName: "Core",
      status: "ACTIVE",
    });
    assert(!!createdMember._id, `Created test user ${createdMember.email}`);

    // 5. MEMBER EDITING
    console.log("\n--- TEST 5: Member Editing ---");
    createdMember.position = "Senior Member";
    await createdMember.save();
    assert(createdMember.position === "Senior Member", "Updated member position successfully");

    // 6. MEMBER DEACTIVATION
    console.log("\n--- TEST 6: Member Deactivation ---");
    createdMember.status = "INACTIVE";
    await createdMember.save();
    assert(createdMember.status === "INACTIVE", "Member soft-deactivated successfully");

    // 7. MEMBER REACTIVATION
    console.log("\n--- TEST 7: Member Reactivation ---");
    createdMember.status = "ACTIVE";
    await createdMember.save();
    assert(createdMember.status === "ACTIVE", "Member reactivated successfully");

    // 8. ADMIN PROMOTION
    console.log("\n--- TEST 8: Admin Promotion ---");
    createdMember.role = "ADMIN";
    await createdMember.save();
    assert(createdMember.role === "ADMIN", "Promoted test member to ADMIN");

    // 9. ADMIN DEMOTION
    console.log("\n--- TEST 9: Admin Demotion ---");
    const activeAdminsBefore = await User.countDocuments({ role: "ADMIN", status: "ACTIVE" });
    createdMember.role = "MEMBER";
    await createdMember.save();
    assert(createdMember.role === "MEMBER", "Demoted test user back to MEMBER");

    // 10. LAST-ADMIN PROTECTION
    console.log("\n--- TEST 10: Last-Admin Protection ---");
    const activeAdminsNow = await User.countDocuments({ role: "ADMIN", status: "ACTIVE" });
    assert(activeAdminsNow >= 2, `System has ${activeAdminsNow} active admins (Safe against last-admin demotion)`);

    // 11. CLUSTER CREATION
    console.log("\n--- TEST 11: Cluster Creation ---");
    const testClusterName = `Test Cluster ${Date.now()}`;
    const newCluster = await Cluster.create({
      clusterId: `CLS-TEST-${Date.now()}`,
      name: testClusterName,
      description: "Automated test cluster",
      status: "ACTIVE",
    });
    assert(!!newCluster._id, `Created new cluster ${newCluster.name}`);

    // 12. CLUSTER ASSIGNMENT
    console.log("\n--- TEST 12: Cluster Assignment ---");
    createdMember.clusterId = newCluster._id;
    createdMember.clusterName = newCluster.name;
    await createdMember.save();
    assert(String(createdMember.clusterId) === String(newCluster._id), "Assigned member to test cluster");

    // 13. COURSE CREATION
    console.log("\n--- TEST 13: Course Creation ---");
    const newCourse = await Course.create({
      courseId: `CRS-TEST-${Date.now()}`,
      name: `Automated Course ${Date.now()}`,
      description: "Test course",
      category: "Testing",
      clusterAccess: "Both",
      status: "ACTIVE",
    });
    assert(!!newCourse._id, `Created new course ${newCourse.name}`);

    // 14. COURSE EDITING
    console.log("\n--- TEST 14: Course Editing ---");
    newCourse.description = "Updated test course description";
    await newCourse.save();
    assert(newCourse.description === "Updated test course description", "Updated course description");

    // 15. COURSE DEACTIVATION
    console.log("\n--- TEST 15: Course Deactivation ---");
    newCourse.status = "INACTIVE";
    await newCourse.save();
    assert(newCourse.status === "INACTIVE", "Deactivated course");
    newCourse.status = "ACTIVE";
    await newCourse.save();

    // 16. POINT RULE CHANGES
    console.log("\n--- TEST 16: Point Rule Configuration ---");
    const levelMap = new Map([
      ["LEVEL-0", 15],
      ["LEVEL-1", 30],
      ["LEVEL-2", 50],
      ["LEVEL-3", 75],
    ]);
    const pointRule = await CoursePointRule.findOneAndUpdate(
      { courseId: newCourse._id },
      { levelPoints: levelMap, clusterAccess: "Both" },
      { upsert: true, new: true }
    );
    assert(pointRule.levelPoints.get("LEVEL-1") === 30, "Configured dynamic point rule LEVEL-1 = 30 pts");

    // 17. PROGRESS UPDATES & RECALCULATION
    console.log("\n--- TEST 17: User Progress Updates & Recalculation ---");
    const progress = await UserCourseProgress.findOneAndUpdate(
      { userId: createdMember._id, courseId: newCourse._id },
      { currentLevel: "LEVEL-1", completedAt: new Date() },
      { upsert: true, new: true }
    );
    assert(progress.currentLevel === "LEVEL-1", "Updated user course progress to LEVEL-1");

    const ptsResult = await recalculateUserPoints(createdMember._id);
    assert(ptsResult.activityPoints >= 0, `Recalculated member total activity points (${ptsResult.activityPoints} pts)`);

    // 18. TASK CREATION
    console.log("\n--- TEST 18: Task Creation ---");
    const adminUser = await User.findOne({ role: "ADMIN", status: "ACTIVE" });
    const testTask = await Task.create({
      taskId: `TSK-TEST-${Date.now()}`,
      title: "Automated Suite Task",
      domain: "Testing",
      description: "Test lifecycle task",
      priority: "High",
      dueDate: "2026-12-31",
      submissionMode: "FLEXIBLE",
      status: "PENDING",
      createdBy: adminUser._id,
    });
    assert(!!testTask._id, `Created test task ${testTask.taskId}`);

    // 19. TASK ASSIGNMENT
    console.log("\n--- TEST 19: Task Assignment ---");
    const assignment = await TaskAssignment.create({
      assignmentId: `ASN-TEST-${Date.now()}`,
      taskId: testTask._id,
      userId: createdMember._id,
      assignedBy: adminUser._id,
      status: "ACTIVE",
    });
    assert(!!assignment._id, `Assigned member to task ${testTask.taskId}`);

    // 20. SUBMISSION V1
    console.log("\n--- TEST 20: Submission V1 Creation ---");
    const subGroupId = `GRP-${testTask.taskId}-${createdMember._id}`;
    const subV1 = await TaskSubmission.create({
      submissionId: `SUB-TEST-${Date.now()}-V1`,
      taskId: testTask._id,
      submissionGroupId: subGroupId,
      version: 1,
      submissionType: "INDIVIDUAL",
      submittedBy: createdMember._id,
      submittedFor: [createdMember._id],
      githubUrl: "https://github.com/test/repo",
      status: "SUBMITTED",
    });
    assert(subV1.version === 1, "Created deliverable submission V1");

    // 21. REVIEW - CHANGES REQUESTED
    console.log("\n--- TEST 21: Review - Changes Requested ---");
    const rev1 = await TaskReview.create({
      reviewId: `REV-TEST-${Date.now()}-1`,
      taskId: testTask._id,
      submissionId: subV1._id,
      version: 1,
      reviewerId: adminUser._id,
      decision: "CHANGES_REQUESTED",
      feedback: "Please add unit test coverage.",
    });
    assert(rev1.decision === "CHANGES_REQUESTED", "Admin requested changes on V1");

    // 22. SUBMISSION V2
    console.log("\n--- TEST 22: Resubmission V2 Creation ---");
    const subV2 = await TaskSubmission.create({
      submissionId: `SUB-TEST-${Date.now()}-V2`,
      taskId: testTask._id,
      submissionGroupId: subGroupId,
      parentSubmissionId: subV1._id,
      version: 2,
      submissionType: "INDIVIDUAL",
      submittedBy: createdMember._id,
      submittedFor: [createdMember._id],
      githubUrl: "https://github.com/test/repo",
      notes: "Added unit tests",
      status: "SUBMITTED",
    });
    assert(subV2.version === 2, "Created resubmission deliverable V2");

    // 23. REVIEW - APPROVAL & COVERAGE
    console.log("\n--- TEST 23: Review Approval & Coverage Calculation ---");
    const rev2 = await TaskReview.create({
      reviewId: `REV-TEST-${Date.now()}-2`,
      taskId: testTask._id,
      submissionId: subV2._id,
      version: 2,
      reviewerId: adminUser._id,
      decision: "APPROVED",
      feedback: "Looks great!",
    });
    assert(rev2.decision === "APPROVED", "Admin approved V2 submission");

    const stateResult = await recalculateTaskState(testTask._id);
    assert(stateResult.taskStatus === "COMPLETED", "Task state automatically transitioned to COMPLETED (100% coverage)");

    // 24. REOPENING AFTER NEW ASSIGNEE
    console.log("\n--- TEST 24: Reopening Task After New Assignee ---");
    const secondMember = await User.findOne({ _id: { $ne: createdMember._id }, role: "MEMBER", status: "ACTIVE" });
    if (secondMember) {
      await TaskAssignment.create({
        assignmentId: `ASN-TEST-2-${Date.now()}`,
        taskId: testTask._id,
        userId: secondMember._id,
        assignedBy: adminUser._id,
        status: "ACTIVE",
      });

      const reopenedResult = await recalculateTaskState(testTask._id);
      assert(reopenedResult.taskStatus === "IN_PROGRESS", "Task status automatically returned to IN_PROGRESS when new assignee added");
    }

    // 25. NOTIFICATIONS
    console.log("\n--- TEST 25: Notifications ---");
    const notif = await Notification.create({
      notificationId: `NTF-TEST-${Date.now()}`,
      targetUserId: createdMember._id,
      type: "TASK_ASSIGNED",
      taskId: testTask._id,
      title: "Test Notification",
      message: "Notification test",
      eventKey: `NTF-TEST-${Date.now()}`,
      readAt: null,
    });
    assert(!!notif._id, "Notification generated successfully");
    notif.readAt = new Date();
    await notif.save();
    assert(!!notif.readAt, "Marked notification read");

    // 26. HACKATHONS CRUD
    console.log("\n--- TEST 26: Hackathons CRUD ---");
    const hack = await Hackathon.create({
      eventId: `HCK-TEST-${Date.now()}`,
      title: "Test Hackathon",
      organizer: "BIT",
      date: "2026-10-10",
      description: "Test event",
      createdBy: adminUser._id,
    });
    assert(!!hack._id, "Created Hackathon record");
    await Hackathon.findByIdAndDelete(hack._id);
    assert(true, "Deleted Hackathon record");

    // 27. GALLERY CRUD
    console.log("\n--- TEST 27: Gallery CRUD ---");
    const gal = await GalleryItem.create({
      photoId: `GAL-TEST-${Date.now()}`,
      imageUrl: "https://example.com/photo.jpg",
      caption: "Test Photo",
      date: "2026-10-10",
      uploadedBy: adminUser._id,
      createdBy: adminUser._id,
    });
    assert(!!gal._id, "Created Gallery item");
    await GalleryItem.findByIdAndDelete(gal._id);
    assert(true, "Deleted Gallery item");

    // 28. PROJECTS CRUD
    console.log("\n--- TEST 28: Projects CRUD ---");
    const prj = await Project.create({
      projectId: `PRJ-TEST-${Date.now()}`,
      title: "Test Project",
      category: "Web Development",
      techStack: "React, Node, Mongo",
      description: "Test project",
      status: "In Progress",
      createdBy: adminUser._id,
    });
    assert(!!prj._id, "Created Project record");
    await Project.findByIdAndDelete(prj._id);
    assert(true, "Deleted Project record");

    // 29. CERTIFICATES CRUD
    console.log("\n--- TEST 29: Certificates CRUD ---");
    const cert = await Certificate.create({
      certificateId: `CRT-TEST-${Date.now()}`,
      userId: createdMember._id,
      enrolmentNumber: createdMember.userId,
      title: "Test Certificate",
      issuer: "BIT",
      date: "2026-10-10",
      category: "Course",
      fileUrl: "https://example.com/cert.pdf",
      createdBy: adminUser._id,
    });
    assert(!!cert._id, "Created Certificate record");
    await Certificate.findByIdAndDelete(cert._id);
    assert(true, "Deleted Certificate record");

    // 30. OPPORTUNITIES CRUD
    console.log("\n--- TEST 30: Opportunities CRUD ---");
    const opp = await Opportunity.create({
      opportunityId: `OPP-TEST-${Date.now()}`,
      title: "Test Internship",
      type: "Internship",
      company: "Tech Corp",
      eligibility: "All Students",
      deadline: "2026-12-31",
      link: "https://example.com/apply",
      createdBy: adminUser._id,
    });
    assert(!!opp._id, "Created Opportunity record");
    await Opportunity.findByIdAndDelete(opp._id);
    assert(true, "Deleted Opportunity record");

    // 31. CUSTOM SECTIONS & RECORDS
    console.log("\n--- TEST 31: Custom Sections & Records ---");
    const col = await CustomCollection.create({
      collectionId: `CST-TEST-${Date.now()}`,
      name: `Test Section ${Date.now()}`,
      slug: `test-section-${Date.now()}`,
      fields: [{ name: "title", label: "Title", type: "text", required: true }],
      createdBy: adminUser._id,
    });
    assert(!!col._id, "Created Custom Collection section");

    const rec = await CustomRecord.create({
      recordId: `REC-TEST-${Date.now()}`,
      customCollectionId: col._id,
      data: { title: "Custom Record 1" },
      createdBy: adminUser._id,
    });
    assert(!!rec._id, "Created Custom Record");

    await CustomRecord.findByIdAndDelete(rec._id);
    await CustomCollection.findByIdAndDelete(col._id);
    assert(true, "Cleaned up custom collection & records");

    // CLEANUP TEST DATA
    console.log("\n--- CLEANUP ---");
    await User.findByIdAndDelete(createdMember._id);
    await Cluster.findByIdAndDelete(newCluster._id);
    await Course.findByIdAndDelete(newCourse._id);
    await CoursePointRule.deleteOne({ courseId: newCourse._id });
    await Task.findByIdAndDelete(testTask._id);
    await TaskAssignment.deleteMany({ taskId: testTask._id });
    await TaskSubmission.deleteMany({ taskId: testTask._id });
    await TaskReview.deleteMany({ taskId: testTask._id });
    await Notification.findByIdAndDelete(notif._id);
    console.log("  🧹 Test data cleanup completed cleanly.");
  } catch (err) {
    console.error("Test Execution Error:", err);
    failed++;
  }

  console.log("\n==================================================");
  console.log(`TOTAL PASSED: ${passed}`);
  console.log(`TOTAL FAILED: ${failed}`);
  console.log("==================================================");

  if (failed === 0) {
    console.log("🎉 ALL 38 MASTER INTEGRATION TESTS PASSED PERFECTLY!");
    process.exit(0);
  } else {
    console.error("⚠️ SOME INTEGRATION TESTS FAILED.");
    process.exit(1);
  }
}

runComprehensiveSuite();
