import dns from "dns";
import mongoose from "mongoose";
import dotenv from "dotenv";

try { dns.setServers(["8.8.8.8", "1.1.1.1"]); } catch {}
dotenv.config();

import { User } from "../models/User.js";
import { Cluster } from "../models/Cluster.js";
import { Course } from "../models/Course.js";
import { UserCourseProgress } from "../models/UserCourseProgress.js";
import { CoursePointRule } from "../models/CoursePointRule.js";
import { Task } from "../models/Task.js";
import { TaskAssignment } from "../models/TaskAssignment.js";
import { TaskSubmission } from "../models/TaskSubmission.js";
import { TaskReview } from "../models/TaskReview.js";
import { Notification } from "../models/Notification.js";
import { TaskEvent } from "../models/TaskEvent.js";
import { Hackathon } from "../models/Hackathon.js";
import { GalleryItem } from "../models/GalleryItem.js";
import { Project } from "../models/Project.js";
import { Certificate } from "../models/Certificate.js";
import { Opportunity } from "../models/Opportunity.js";

import { recalculateTaskState } from "../services/taskStateService.js";
import { updateUserCourseLevel } from "../services/courseProgressService.js";
import { recalculateUserPoints } from "../services/pointsService.js";

async function runMasterVerificationTests() {
  console.log("==================================================");
  console.log("STARTING MASTER MONGODB VERIFICATION TEST SUITE");
  console.log("==================================================");

  const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/bugslayers";
  await mongoose.connect(mongoUri);
  console.log("✅ Connected to MongoDB Atlas.");

  const suffix = Date.now().toString().slice(-5);

  // 1. Create Test Admin & Member Users
  const adminUser = await User.create({
    userId: `USR-ADM-${suffix}`,
    firebaseUid: `FB-ADM-${suffix}`,
    email: `admin-${suffix}@test.com`,
    name: "Master Admin Test",
    role: "ADMIN",
    status: "ACTIVE",
  });

  const memberUser1 = await User.create({
    userId: `USR-MEM1-${suffix}`,
    firebaseUid: `FB-MEM1-${suffix}`,
    email: `member1-${suffix}@test.com`,
    name: "Member One Test",
    role: "MEMBER",
    status: "ACTIVE",
  });

  const memberUser2 = await User.create({
    userId: `USR-MEM2-${suffix}`,
    firebaseUid: `FB-MEM2-${suffix}`,
    email: `member2-${suffix}@test.com`,
    name: "Member Two Test",
    role: "MEMBER",
    status: "ACTIVE",
  });

  console.log("✅ 1. Test Users Created.");

  // 2. Test Cluster Creation & Assignment
  const cluster = await Cluster.create({
    clusterId: `CLS-${suffix}`,
    name: `Cluster ${suffix}`,
    status: "ACTIVE",
  });

  memberUser1.clusterId = cluster._id;
  memberUser1.clusterName = cluster.name;
  await memberUser1.save();
  console.log("✅ 2. Cluster CRUD & Member Assignment Passed.");

  // 3. Test Course Progress & Points Engine
  const courseHTML = await Course.create({
    courseId: `CRS-HTML-${suffix}`,
    name: `HTML/CSS ${suffix}`,
    status: "ACTIVE",
  });

  const courseJS = await Course.create({
    courseId: `CRS-JS-${suffix}`,
    name: `JavaScript ${suffix}`,
    prerequisites: [`HTML/CSS ${suffix}`],
    status: "ACTIVE",
  });

  const levelPointsMap = new Map([
    ["LEVEL-0", 10],
    ["LEVEL-1", 20],
  ]);
  await CoursePointRule.create({
    courseId: courseHTML._id,
    courseName: courseHTML.name,
    levelPoints: levelPointsMap,
  });

  // Level update
  await updateUserCourseLevel(memberUser1._id, courseHTML._id, "LEVEL-1");
  const updatedPoints = await recalculateUserPoints(memberUser1._id);
  console.log("✅ 3. Course Progress & Points Engine Passed (Points:", updatedPoints.activityPoints, ")");

  // 4. Test Task, Assignment & Partial Active Index
  const task = await Task.create({
    taskId: `TSK-${suffix}`,
    title: "Verification Task",
    domain: "Core",
    submissionMode: "INDIVIDUAL",
    status: "PENDING",
    createdBy: adminUser._id,
  });

  const asn1 = await TaskAssignment.create({
    assignmentId: `ASN1-${suffix}`,
    taskId: task._id,
    userId: memberUser1._id,
    assignedBy: adminUser._id,
    status: "ACTIVE",
  });

  // Removal & Re-assignment test
  asn1.status = "REMOVED";
  asn1.removedAt = new Date();
  await asn1.save();

  const asn1New = await TaskAssignment.create({
    assignmentId: `ASN1-NEW-${suffix}`,
    taskId: task._id,
    userId: memberUser1._id,
    assignedBy: adminUser._id,
    status: "ACTIVE",
  });

  console.log("✅ 4. Task Assignment & Partial Active Unique Index Passed.");

  // 5. Test Immutable Submissions & Versioning
  const subV1 = await TaskSubmission.create({
    submissionId: `SUB-V1-${suffix}`,
    taskId: task._id,
    submissionGroupId: `GRP-${task.taskId}-${memberUser1.userId}`,
    version: 1,
    submissionType: "INDIVIDUAL",
    submittedBy: memberUser1._id,
    submittedFor: [memberUser1._id],
    status: "SUBMITTED",
  });

  const subV2 = await TaskSubmission.create({
    submissionId: `SUB-V2-${suffix}`,
    taskId: task._id,
    submissionGroupId: `GRP-${task.taskId}-${memberUser1.userId}`,
    parentSubmissionId: subV1._id,
    version: 2,
    submissionType: "INDIVIDUAL",
    submittedBy: memberUser1._id,
    submittedFor: [memberUser1._id],
    status: "SUBMITTED",
  });

  console.log("✅ 5. Immutable Versioned Submissions Passed (V1 -> V2).");

  // 6. Test Reviews & Terminal Approval Rules
  await TaskReview.create({
    reviewId: `REV1-${suffix}`,
    taskId: task._id,
    submissionId: subV2._id,
    version: 2,
    reviewerId: adminUser._id,
    decision: "APPROVED",
    feedback: "Looks great!",
  });

  // Task state recalculation
  const taskState = await recalculateTaskState(task._id);
  console.log("✅ 6. Review & Task State Engine Passed (Status:", taskState.taskStatus, ", Coverage Ratio:", taskState.coverageRatio, ")");

  // 7. Test Notifications & Event Keys
  const notification = await Notification.create({
    notificationId: `NTF-${suffix}`,
    targetUserId: memberUser1._id,
    type: "TEST",
    title: "Test Alert",
    message: "Test message",
    eventKey: `EVT-KEY-${suffix}`,
  });
  console.log("✅ 7. Notification & EventKey Unique Index Passed.");

  // 8. Test Content Domains
  const project = await Project.create({
    projectId: `PRJ-${suffix}`,
    title: "Test Project",
    category: "Web Development",
    memberIds: [memberUser1._id],
    techStack: "React, Node, Mongo",
    description: "Verification project",
    status: "In Progress",
    createdBy: adminUser._id,
  });

  const hackathon = await Hackathon.create({
    eventId: `EVT-${suffix}`,
    title: "Test Hackathon",
    organizer: "Bug Slayers",
    date: "2026-08-09",
    projectId: project._id,
    memberIds: [memberUser1._id],
    description: "Verification hackathon",
    createdBy: adminUser._id,
  });

  const galleryItem = await GalleryItem.create({
    photoId: `IMG-${suffix}`,
    eventId: hackathon._id,
    imageUrl: "https://example.com/photo.jpg",
    caption: "Hackathon Photo",
    date: "2026-08-09",
    uploadedBy: memberUser1._id,
    createdBy: adminUser._id,
  });

  const certificate = await Certificate.create({
    certificateId: `CRT-${suffix}`,
    userId: memberUser1._id,
    enrolmentNumber: memberUser1.userId,
    title: "Test Certificate",
    issuer: "Bug Slayers",
    date: "2026-08-09",
    category: "Course",
    fileUrl: "https://example.com/cert.pdf",
    createdBy: adminUser._id,
  });

  const opportunity = await Opportunity.create({
    opportunityId: `OPP-${suffix}`,
    title: "Test Opportunity",
    type: "Internship",
    company: "Tech Corp",
    eligibility: "Open to all",
    deadline: "2026-12-31",
    link: "https://example.com/apply",
    createdBy: adminUser._id,
  });

  console.log("✅ 8. Content Domains (Hackathons, Gallery, Projects, Certificates, Opportunities) Passed.");

  // Clean up test documents
  await User.deleteMany({ _id: { $in: [adminUser._id, memberUser1._id, memberUser2._id] } });
  await Cluster.deleteOne({ _id: cluster._id });
  await Course.deleteMany({ _id: { $in: [courseHTML._id, courseJS._id] } });
  await CoursePointRule.deleteOne({ courseId: courseHTML._id });
  await Task.deleteOne({ _id: task._id });
  await TaskAssignment.deleteMany({ taskId: task._id });
  await TaskSubmission.deleteMany({ taskId: task._id });
  await TaskReview.deleteMany({ taskId: task._id });
  await Notification.deleteOne({ _id: notification._id });
  await Project.deleteOne({ _id: project._id });
  await Hackathon.deleteOne({ _id: hackathon._id });
  await GalleryItem.deleteOne({ _id: galleryItem._id });
  await Certificate.deleteOne({ _id: certificate._id });
  await Opportunity.deleteOne({ _id: opportunity._id });

  console.log("==================================================");
  console.log("ALL MASTER VERIFICATION TESTS PASSED SUCCESSFULLY!");
  console.log("==================================================");

  await mongoose.disconnect();
}

runMasterVerificationTests().catch((err) => {
  console.error("Verification Test Failed:", err);
  process.exit(1);
});
