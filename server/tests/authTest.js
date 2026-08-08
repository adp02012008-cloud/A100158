import {
  isAdmin,
  canViewTask,
  canSubmitToTask,
  canViewSubmission,
  canReviewSubmission,
  canViewNotification,
  canModifyTask,
  canAssignTask,
} from "../utils/authHelpers.js";

/**
 * Exhaustive Authorization & Security Rule Test Suite
 *
 * Verifies 7 Mandatory Test Scenarios:
 * 1. Admin unassigned
 * 2. Admin assigned
 * 3. Member assigned
 * 4. Member unassigned
 * 5. Admin self-review
 * 6. Direct-ID unauthorized access
 * 7. Private task isolation
 */
export async function runAuthTests() {
  console.log("==================================================");
  console.log("RUNNING MODULE 2 AUTH & AUTHORIZATION TEST SUITE");
  console.log("==================================================");

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (!condition) {
      console.error(`❌ TEST FAILED: ${message}`);
      throw new Error(`Test assertion failed: ${message}`);
    }
    passed++;
    console.log(`✅ TEST PASSED [${total}]: ${message}`);
  }

  // Define User Objects (Simulating req.user derived server-side)
  const adminUser = {
    _id: "usr_admin_1",
    userId: "USR-ADM-01",
    email: "admin1@domain.com",
    name: "Admin One",
    role: "ADMIN",
    status: "ACTIVE",
  };

  const memberUser1 = {
    _id: "usr_mem_1",
    userId: "USR-MEM-01",
    email: "alice@domain.com",
    name: "Alice Member",
    role: "MEMBER",
    status: "ACTIVE",
  };

  const memberUser2 = {
    _id: "usr_mem_2",
    userId: "USR-MEM-02",
    email: "bob@domain.com",
    name: "Bob Unassigned",
    role: "MEMBER",
    status: "ACTIVE",
  };

  // Define Mock Tasks
  const privateTask = {
    taskId: "TSK-001",
    title: "Build Agentic AI Module",
    status: "PENDING",
    submissionMode: "COLLABORATIVE",
    createdBy: "admin1@domain.com",
  };

  const completedTask = {
    taskId: "TSK-002",
    title: "Setup CI/CD Pipeline",
    status: "COMPLETED",
    submissionMode: "INDIVIDUAL",
    createdBy: "admin1@domain.com",
  };

  // Define Mock Submissions
  const aliceSubmission = {
    submissionId: "SUB-101",
    taskId: "TSK-001",
    submissionGroupId: "GRP-TSK-001-ALICE",
    version: 1,
    submittedBy: "alice@domain.com",
    submittedFor: ["alice@domain.com"],
    status: "SUBMITTED",
  };

  const adminSubmission = {
    submissionId: "SUB-102",
    taskId: "TSK-001",
    submissionGroupId: "GRP-TSK-001-ADMIN",
    version: 1,
    submittedBy: "admin1@domain.com",
    submittedFor: ["admin1@domain.com"],
    status: "SUBMITTED",
  };

  // --------------------------------------------------
  // Scenario 1: Admin Unassigned
  // --------------------------------------------------
  console.log("\n--- Scenario 1: Admin Unassigned ---");
  const adminIsAssigned = false;
  assert(isAdmin(adminUser) === true, "adminUser has ADMIN role");
  assert(canViewTask(adminUser, privateTask, adminIsAssigned) === true, "Unassigned Admin CAN view private task");
  assert(canSubmitToTask(adminUser, privateTask, adminIsAssigned) === false, "Unassigned Admin CANNOT submit deliverables");
  assert(canReviewSubmission(adminUser, aliceSubmission) === true, "Unassigned Admin CAN review member submission");
  assert(canModifyTask(adminUser, privateTask) === true, "Unassigned Admin CAN modify task metadata");

  // --------------------------------------------------
  // Scenario 2: Admin Assigned
  // --------------------------------------------------
  console.log("\n--- Scenario 2: Admin Assigned ---");
  const adminIsAssigned2 = true;
  assert(canViewTask(adminUser, privateTask, adminIsAssigned2) === true, "Assigned Admin CAN view task");
  assert(canSubmitToTask(adminUser, privateTask, adminIsAssigned2) === true, "Assigned Admin CAN submit deliverables");
  assert(canReviewSubmission(adminUser, aliceSubmission) === true, "Assigned Admin CAN review submission");

  // --------------------------------------------------
  // Scenario 3: Member Assigned
  // --------------------------------------------------
  console.log("\n--- Scenario 3: Member Assigned ---");
  const aliceIsAssigned = true;
  assert(isAdmin(memberUser1) === false, "memberUser1 is not ADMIN");
  assert(canViewTask(memberUser1, privateTask, aliceIsAssigned) === true, "Assigned Member CAN view active assigned task");
  assert(canSubmitToTask(memberUser1, privateTask, aliceIsAssigned) === true, "Assigned Member CAN submit deliverables");
  assert(canReviewSubmission(memberUser1, aliceSubmission) === false, "Assigned Member CANNOT review submission");
  assert(canModifyTask(memberUser1, privateTask) === false, "Assigned Member CANNOT modify task");

  // --------------------------------------------------
  // Scenario 4: Member Unassigned
  // --------------------------------------------------
  console.log("\n--- Scenario 4: Member Unassigned ---");
  const bobIsAssigned = false;
  assert(canViewTask(memberUser2, privateTask, bobIsAssigned) === false, "Unassigned Member CANNOT view private task");
  assert(canSubmitToTask(memberUser2, privateTask, bobIsAssigned) === false, "Unassigned Member CANNOT submit deliverable");
  assert(canReviewSubmission(memberUser2, aliceSubmission) === false, "Unassigned Member CANNOT review submission");
  // Team-visible completed task check
  assert(canViewTask(memberUser2, completedTask, bobIsAssigned) === true, "Unassigned Member CAN view completed team task");

  // --------------------------------------------------
  // Scenario 5: Admin Self-Review
  // --------------------------------------------------
  console.log("\n--- Scenario 5: Admin Self-Review ---");
  assert(canReviewSubmission(adminUser, adminSubmission) === true, "Admin CAN review their own submission (Self-Review Authorized)");

  // --------------------------------------------------
  // Scenario 6: Direct-ID Unauthorized Access
  // --------------------------------------------------
  console.log("\n--- Scenario 6: Direct-ID Unauthorized Access ---");
  assert(canViewSubmission(adminUser, aliceSubmission) === true, "Admin CAN view any submission using direct ID");
  assert(canViewSubmission(memberUser1, aliceSubmission) === true, "Submitting Member CAN view their submission");
  assert(canViewSubmission(memberUser2, aliceSubmission) === false, "Unrelated Member CANNOT view private submission via direct ID");

  // --------------------------------------------------
  // Scenario 7: Private Task Isolation
  // --------------------------------------------------
  console.log("\n--- Scenario 7: Private Task Isolation ---");
  assert(canViewTask(memberUser2, privateTask, false) === false, "Private task ISOLATED from unrelated member (Direct-ID Access Denied)");

  console.log("==================================================");
  console.log(`SUMMARY: ${passed}/${total} AUTHORIZATION TESTS PASSED CLEANLY!`);
  console.log("==================================================");
}

runAuthTests();
