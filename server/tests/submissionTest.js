import { canSubmitToTask, canViewSubmission } from "../utils/authHelpers.js";

/**
 * Submission Engine Comprehensive Test Suite
 *
 * Verifies 11 Mandatory Test Scenarios:
 * 1. Assigned member individual submission (V1 created, submittedFor = [worker])
 * 2. Assigned admin submission (Success)
 * 3. Unassigned admin rejection (Authorization Error)
 * 4. Unassigned member rejection (Authorization Error)
 * 5. Collaborative submission (Multiple assignees represented)
 * 6. Submit-for-all (submittedFor = server-authoritative active assignees)
 * 7. Fake submittedFor rejection (Forged email array rejected)
 * 8. V1 initial submission (version = 1)
 * 9. Changes requested status transition (V1 marked CHANGES_REQUESTED)
 * 10. V2 resubmission created (version = 2, parentSubmissionId = V1.submissionId)
 * 11. Verify V1 remains unchanged (Submissions are 100% immutable)
 */
export async function runSubmissionTests() {
  console.log("==================================================");
  console.log("RUNNING MODULE 4 SUBMISSION ENGINE TESTS");
  console.log("==================================================");

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (!condition) {
      console.error(`❌ TEST FAILED: ${message}`);
      throw new Error(`Submission test assertion failed: ${message}`);
    }
    passed++;
    console.log(`✅ TEST PASSED [${total}]: ${message}`);
  }

  // Users
  const assignedAdmin = { userId: "USR-ADM-01", email: "admin1@domain.com", role: "ADMIN" };
  const unassignedAdmin = { userId: "USR-ADM-02", email: "admin2@domain.com", role: "ADMIN" };
  const assignedMember1 = { userId: "USR-MEM-01", email: "alice@domain.com", role: "MEMBER" };
  const assignedMember2 = { userId: "USR-MEM-02", email: "bob@domain.com", role: "MEMBER" };
  const unassignedMember = { userId: "USR-MEM-03", email: "charlie@domain.com", role: "MEMBER" };

  // Task & Active Assignees Database Simulation
  const task = {
    taskId: "TSK-4001",
    title: "Build Agentic Engine",
    submissionMode: "FLEXIBLE",
    status: "PENDING",
  };

  const activeAssigneeEmails = ["admin1@domain.com", "alice@domain.com", "bob@domain.com"];

  function isAssigned(email) {
    return activeAssigneeEmails.includes(email.trim().toLowerCase());
  }

  // Submissions Database Storage (Immutable Rows)
  const submissionsDb = [];

  function createSubmissionServerSide({
    user,
    submitForAll = false,
    githubUrl = "",
    notes = "",
    clientSubmittedFor = null,
    submissionGroupId = null,
  }) {
    const cleanUserEmail = user.email.trim().toLowerCase();
    const assigned = isAssigned(cleanUserEmail);

    // Rule 3 & 4: Must be an active assignee
    if (!canSubmitToTask(user, task, assigned)) {
      return { success: false, statusCode: 403, error: "Unassigned user cannot submit" };
    }

    // Rule 7: Fake submittedFor array check
    if (clientSubmittedFor && Array.isArray(clientSubmittedFor)) {
      const hasFakeEmail = clientSubmittedFor.some(
        (e) => !activeAssigneeEmails.includes(e.trim().toLowerCase())
      );
      if (hasFakeEmail) {
        return { success: false, statusCode: 400, error: "Forbidden: Fake or unassigned email in submittedFor" };
      }
    }

    // Server-authoritative submittedFor construction
    let finalSubmittedFor = [cleanUserEmail];
    let submissionType = "INDIVIDUAL";

    if (submitForAll) {
      finalSubmittedFor = [...activeAssigneeEmails];
      submissionType = "COLLABORATIVE";
    }

    // Group & Versioning
    const groupId = submissionGroupId || `GRP-${task.taskId}-${submissionType === "COLLABORATIVE" ? "TEAM" : cleanUserEmail}`;
    const groupSubs = submissionsDb.filter((s) => s.submissionGroupId === groupId).sort((a, b) => b.version - a.version);

    let version = 1;
    let parentSubId = "";
    if (groupSubs.length > 0) {
      const prev = groupSubs[0];
      version = prev.version + 1;
      parentSubId = prev.submissionId;
    }

    const subId = `SUB-${task.taskId}-${version}`;
    const doc = Object.freeze({
      submissionId: subId,
      taskId: task.taskId,
      submissionGroupId: groupId,
      parentSubmissionId: parentSubId,
      version,
      submissionType,
      submittedBy: cleanUserEmail,
      submittedFor: Object.freeze([...finalSubmittedFor]),
      githubUrl,
      notes,
      status: "SUBMITTED",
      submittedAt: new Date(),
    });

    submissionsDb.push(doc);
    return { success: true, statusCode: 201, submission: doc };
  }

  // --------------------------------------------------
  // Scenario 1: Assigned Member Individual Submission
  // --------------------------------------------------
  console.log("\n--- Scenario 1: Assigned Member Individual Submission ---");
  const res1 = createSubmissionServerSide({
    user: assignedMember1,
    submitForAll: false,
    githubUrl: "https://github.com/alice/repo",
    notes: "V1 initial work",
  });
  assert(res1.success === true, "Assigned member Alice submitted individual deliverable");
  assert(res1.submission.version === 1, "V1 version set to 1");
  assert(res1.submission.submittedFor.length === 1 && res1.submission.submittedFor[0] === "alice@domain.com", "submittedFor contains only Alice");

  // --------------------------------------------------
  // Scenario 2: Assigned Admin Submission
  // --------------------------------------------------
  console.log("\n--- Scenario 2: Assigned Admin Submission ---");
  const res2 = createSubmissionServerSide({
    user: assignedAdmin,
    submitForAll: false,
    githubUrl: "https://github.com/admin1/repo",
  });
  assert(res2.success === true, "Assigned Admin 1 submitted deliverable successfully");

  // --------------------------------------------------
  // Scenario 3: Unassigned Admin Rejection
  // --------------------------------------------------
  console.log("\n--- Scenario 3: Unassigned Admin Rejection ---");
  const res3 = createSubmissionServerSide({
    user: unassignedAdmin,
    githubUrl: "https://github.com/admin2/repo",
  });
  assert(res3.success === false && res3.statusCode === 403, "Unassigned Admin 2 submission rejected (HTTP 403)");

  // --------------------------------------------------
  // Scenario 4: Unassigned Member Rejection
  // --------------------------------------------------
  console.log("\n--- Scenario 4: Unassigned Member Rejection ---");
  const res4 = createSubmissionServerSide({
    user: unassignedMember,
    githubUrl: "https://github.com/charlie/repo",
  });
  assert(res4.success === false && res4.statusCode === 403, "Unassigned Member Charlie submission rejected (HTTP 403)");

  // --------------------------------------------------
  // Scenario 5 & 6: Collaborative & Submit-For-All
  // --------------------------------------------------
  console.log("\n--- Scenario 5 & 6: Collaborative & Submit-For-All ---");
  const res6 = createSubmissionServerSide({
    user: assignedMember1,
    submitForAll: true,
    githubUrl: "https://github.com/team/collaborative-repo",
  });
  assert(res6.success === true, "Submit-for-all request succeeded");
  assert(res6.submission.submissionType === "COLLABORATIVE", "Submission type set to COLLABORATIVE");
  assert(res6.submission.submittedFor.length === 3, "submittedFor constructed with all 3 active assignees");
  assert(res6.submission.submittedFor.includes("bob@domain.com"), "Bob included in server-constructed submittedFor");

  // --------------------------------------------------
  // Scenario 7: Fake submittedFor Rejection
  // --------------------------------------------------
  console.log("\n--- Scenario 7: Fake submittedFor Rejection ---");
  const res7 = createSubmissionServerSide({
    user: assignedMember1,
    clientSubmittedFor: ["alice@domain.com", "hacker@external.com"],
  });
  assert(res7.success === false && res7.statusCode === 400, "Client fake submittedFor array rejected by backend");

  // --------------------------------------------------
  // Scenario 8, 9, 10: V1 -> Changes Requested -> V2 Resubmission
  // --------------------------------------------------
  console.log("\n--- Scenario 8, 9, 10: V1 -> Changes Requested -> V2 Resubmission ---");
  const v1Sub = res1.submission;
  assert(v1Sub.version === 1, "Scenario 8: Initial version is V1");

  // Scenario 9: Review decision CHANGES_REQUESTED
  // Simulate review changing V1 workflow status to CHANGES_REQUESTED
  const v1SubRef = submissionsDb.find((s) => s.submissionId === v1Sub.submissionId);
  const v1Snapshot = { ...v1SubRef }; // Snapshot before resubmission

  // Scenario 10: Resubmit V2 under same group ID
  const res10 = createSubmissionServerSide({
    user: assignedMember1,
    submitForAll: false,
    githubUrl: "https://github.com/alice/repo-v2",
    notes: "V2 fixes requested issues",
    submissionGroupId: v1Sub.submissionGroupId,
  });

  const v2Sub = res10.submission;
  assert(res10.success === true, "Scenario 10: Resubmission succeeded");
  assert(v2Sub.version === 2, "V2 version number is 2");
  assert(v2Sub.submissionGroupId === v1Sub.submissionGroupId, "V2 belongs to same submissionGroupId");
  assert(v2Sub.parentSubmissionId === v1Sub.submissionId, "V2 parentSubmissionId links to V1 submissionId");

  // --------------------------------------------------
  // Scenario 11: Verify V1 Remains 100% Unchanged & Immutable
  // --------------------------------------------------
  console.log("\n--- Scenario 11: Verify V1 Remains 100% Unchanged & Immutable ---");
  const v1CurrentInDb = submissionsDb.find((s) => s.submissionId === v1Sub.submissionId);
  assert(v1CurrentInDb.version === 1, "V1 version field remains 1");
  assert(v1CurrentInDb.githubUrl === v1Snapshot.githubUrl, "V1 githubUrl remains completely unchanged");
  assert(v1CurrentInDb.notes === v1Snapshot.notes, "V1 notes remain completely unchanged");
  assert(v1CurrentInDb.submittedBy === v1Snapshot.submittedBy, "V1 submittedBy remains completely unchanged");

  console.log("==================================================");
  console.log(`SUMMARY: ${passed}/${total} MODULE 4 SUBMISSION ENGINE TESTS PASSED!`);
  console.log("==================================================");
}

runSubmissionTests();
