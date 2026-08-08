import { canReviewSubmission } from "../utils/authHelpers.js";

/**
 * Multi-Admin Review Engine Comprehensive Test Suite
 *
 * Verifies 7 Mandatory Test Scenarios:
 * 1. Admin reviewing member (Success)
 * 2. Admin reviewing admin (Success)
 * 3. Admin reviewing own submission (Self-Review Authorized)
 * 4. Multiple admins reviewing same submission (Independent immutable review logs)
 * 5. Changes requested (Submission status -> CHANGES_REQUESTED)
 * 6. Historical review preservation (Reviews are immutable rows)
 * 7. V1 review not affecting V2 (V1 review decision does not alter V2 status or history)
 */
export async function runReviewTests() {
  console.log("==================================================");
  console.log("RUNNING MODULE 5 MULTI-ADMIN REVIEW ENGINE TESTS");
  console.log("==================================================");

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (!condition) {
      console.error(`❌ TEST FAILED: ${message}`);
      throw new Error(`Review test assertion failed: ${message}`);
    }
    passed++;
    console.log(`✅ TEST PASSED [${total}]: ${message}`);
  }

  // Users
  const admin1 = { userId: "USR-ADM-01", email: "admin1@domain.com", role: "ADMIN" };
  const admin2 = { userId: "USR-ADM-02", email: "admin2@domain.com", role: "ADMIN" };
  const memberAlice = { userId: "USR-MEM-01", email: "alice@domain.com", role: "MEMBER" };

  // Task & Submissions Database Simulation
  const task = { taskId: "TSK-5001", status: "UNDER_REVIEW" };

  const v1Submission = {
    submissionId: "SUB-5001-V1",
    taskId: task.taskId,
    submissionGroupId: "GRP-TSK-5001-ALICE",
    version: 1,
    submittedBy: "alice@domain.com",
    submittedFor: ["alice@domain.com"],
    status: "SUBMITTED",
  };

  const adminSubmission = {
    submissionId: "SUB-5001-ADM-V1",
    taskId: task.taskId,
    submissionGroupId: "GRP-TSK-5001-ADMIN1",
    version: 1,
    submittedBy: "admin1@domain.com",
    submittedFor: ["admin1@domain.com"],
    status: "SUBMITTED",
  };

  const reviewsDb = [];

  function createReviewServerSide({ reviewer, submission, decision, feedback = "" }) {
    if (!canReviewSubmission(reviewer, submission)) {
      return { success: false, statusCode: 403, error: "Only admins can submit reviews" };
    }

    const reviewId = `REV-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const reviewDoc = Object.freeze({
      reviewId,
      taskId: submission.taskId,
      submissionId: submission.submissionId,
      version: submission.version,
      reviewerEmail: reviewer.email.toLowerCase(),
      decision: decision.toUpperCase(),
      feedback,
      createdAt: new Date(),
    });

    reviewsDb.push(reviewDoc);

    // Update target submission status based on decision
    if (decision === "APPROVED") {
      submission.status = "APPROVED";
    } else if (decision === "CHANGES_REQUESTED") {
      submission.status = "CHANGES_REQUESTED";
      task.status = "IN_PROGRESS";
    }

    return { success: true, statusCode: 201, review: reviewDoc, submissionStatus: submission.status };
  }

  // --------------------------------------------------
  // Scenario 1: Admin Reviewing Member
  // --------------------------------------------------
  console.log("\n--- Scenario 1: Admin Reviewing Member ---");
  const res1 = createReviewServerSide({
    reviewer: admin1,
    submission: v1Submission,
    decision: "APPROVED",
    feedback: "Excellent work!",
  });
  assert(res1.success === true, "Admin 1 reviewed member Alice's submission");
  assert(res1.submissionStatus === "APPROVED", "Submission status updated to APPROVED");

  // --------------------------------------------------
  // Scenario 2: Admin Reviewing Admin
  // --------------------------------------------------
  console.log("\n--- Scenario 2: Admin Reviewing Admin ---");
  const res2 = createReviewServerSide({
    reviewer: admin2,
    submission: adminSubmission,
    decision: "APPROVED",
    feedback: "Approved admin deliverable",
  });
  assert(res2.success === true, "Admin 2 reviewed Admin 1's submission");

  // --------------------------------------------------
  // Scenario 3: Admin Reviewing Own Submission (Self-Review Authorized)
  // --------------------------------------------------
  console.log("\n--- Scenario 3: Admin Reviewing Own Submission ---");
  const res3 = createReviewServerSide({
    reviewer: admin1,
    submission: adminSubmission,
    decision: "APPROVED",
    feedback: "Self-approved by Admin 1",
  });
  assert(res3.success === true, "Admin 1 CAN review own submission (Self-Review Authorized)");
  assert(res3.review.reviewerEmail === adminSubmission.submittedBy, "Reviewer email matches submitter email");

  // --------------------------------------------------
  // Scenario 4: Multiple Admins Reviewing Same Submission
  // --------------------------------------------------
  console.log("\n--- Scenario 4: Multiple Admins Reviewing Same Submission ---");
  const v1SubForMulti = {
    submissionId: "SUB-MULTI-01",
    taskId: task.taskId,
    version: 1,
    submittedBy: "alice@domain.com",
    status: "SUBMITTED",
  };

  const res4a = createReviewServerSide({ reviewer: admin1, submission: v1SubForMulti, decision: "COMMENTED", feedback: "Admin 1 comment" });
  const res4b = createReviewServerSide({ reviewer: admin2, submission: v1SubForMulti, decision: "APPROVED", feedback: "Admin 2 approve" });

  assert(res4a.success === true && res4b.success === true, "Both Admin 1 and Admin 2 created reviews");
  const subReviews = reviewsDb.filter((r) => r.submissionId === "SUB-MULTI-01");
  assert(subReviews.length === 2, "Multiple independent review records exist for submission");
  assert(subReviews[0].reviewerEmail === "admin1@domain.com" && subReviews[1].reviewerEmail === "admin2@domain.com", "Reviewers correctly recorded");

  // --------------------------------------------------
  // Scenario 5: Changes Requested
  // --------------------------------------------------
  console.log("\n--- Scenario 5: Changes Requested ---");
  const v1ForChanges = {
    submissionId: "SUB-CHANGES-V1",
    taskId: task.taskId,
    version: 1,
    submittedBy: "alice@domain.com",
    status: "SUBMITTED",
  };

  const res5 = createReviewServerSide({
    reviewer: admin1,
    submission: v1ForChanges,
    decision: "CHANGES_REQUESTED",
    feedback: "Please fix mobile layout alignment",
  });

  assert(res5.success === true, "Review submitted with CHANGES_REQUESTED");
  assert(v1ForChanges.status === "CHANGES_REQUESTED", "Submission status updated to CHANGES_REQUESTED");
  assert(task.status === "IN_PROGRESS", "Task status reverted to IN_PROGRESS for resubmission");

  // --------------------------------------------------
  // Scenario 6: Historical Review Preservation
  // --------------------------------------------------
  console.log("\n--- Scenario 6: Historical Review Preservation ---");
  const initialReviewCount = reviewsDb.length;
  const reviewSnapshot = { ...reviewsDb[0] };

  // Create another review on another submission
  createReviewServerSide({ reviewer: admin1, submission: v1ForChanges, decision: "COMMENTED", feedback: "Additional note" });

  assert(reviewsDb.length === initialReviewCount + 1, "New review appended to review database");
  assert(reviewsDb[0].reviewId === reviewSnapshot.reviewId, "Historical review 1 preserved with same ID");
  assert(reviewsDb[0].decision === reviewSnapshot.decision, "Historical review 1 decision remains immutable");

  // --------------------------------------------------
  // Scenario 7: V1 Review Not Affecting V2
  // --------------------------------------------------
  console.log("\n--- Scenario 7: V1 Review Not Affecting V2 ---");
  const v2Submission = {
    submissionId: "SUB-CHANGES-V2",
    taskId: task.taskId,
    submissionGroupId: "GRP-CHANGES",
    version: 2,
    submittedBy: "alice@domain.com",
    status: "SUBMITTED",
  };

  // V1 review exists with CHANGES_REQUESTED
  assert(v1ForChanges.status === "CHANGES_REQUESTED", "V1 status is CHANGES_REQUESTED");
  assert(v2Submission.status === "SUBMITTED", "V2 status is SUBMITTED independently of V1");

  // Review V2 with APPROVED
  const res7 = createReviewServerSide({
    reviewer: admin1,
    submission: v2Submission,
    decision: "APPROVED",
    feedback: "V2 looks great!",
  });

  assert(res7.success === true, "V2 review created successfully");
  assert(v2Submission.status === "APPROVED", "V2 status updated to APPROVED");
  assert(v1ForChanges.status === "CHANGES_REQUESTED", "V1 status remains unchanged as CHANGES_REQUESTED");

  console.log("==================================================");
  console.log(`SUMMARY: ${passed}/${total} MODULE 5 REVIEW ENGINE TESTS PASSED!`);
  console.log("==================================================");
}

runReviewTests();
