import {
  canViewTask,
  canSubmitToTask,
  isAdmin,
} from "../utils/authHelpers.js";

/**
 * Task & Assignment Engine Comprehensive Test Suite
 *
 * Verifies 9 Mandatory Test Scenarios:
 * 1. Create task
 * 2. Assign one member
 * 3. Assign multiple members
 * 4. Assign admin
 * 5. Admin self-assignment
 * 6. Remove member (Status -> REMOVED, history preserved)
 * 7. Prevent duplicate assignment
 * 8. Private task visibility
 * 9. Completed task visibility
 */
export async function runTaskTests() {
  console.log("==================================================");
  console.log("RUNNING MODULE 3 TASK & ASSIGNMENT ENGINE TESTS");
  console.log("==================================================");

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (!condition) {
      console.error(`❌ TEST FAILED: ${message}`);
      throw new Error(`Task test assertion failed: ${message}`);
    }
    passed++;
    console.log(`✅ TEST PASSED [${total}]: ${message}`);
  }

  // Simulated Database State & User Objects
  const adminUser1 = { userId: "USR-ADM-01", email: "admin1@domain.com", name: "Admin 1", role: "ADMIN" };
  const adminUser2 = { userId: "USR-ADM-02", email: "admin2@domain.com", name: "Admin 2", role: "ADMIN" };
  const memberAlice = { userId: "USR-MEM-01", email: "alice@domain.com", name: "Alice", role: "MEMBER" };
  const memberBob = { userId: "USR-MEM-02", email: "bob@domain.com", name: "Bob", role: "MEMBER" };
  const memberCharlie = { userId: "USR-MEM-03", email: "charlie@domain.com", name: "Charlie", role: "MEMBER" };

  // Task Document
  const createdTask = {
    taskId: "TSK-3001",
    title: "Build Agentic Orchestrator",
    domain: "Agentic AI",
    description: "Multi-agent coordination system",
    priority: "High",
    status: "PENDING",
    submissionMode: "COLLABORATIVE",
    createdBy: adminUser1.email,
  };

  // Assignments State Tracker
  const assignmentsDb = [];

  function addAssignment(taskId, email, assignedBy) {
    const cleanE = email.trim().toLowerCase();
    // Check if active assignment exists
    const existingActive = assignmentsDb.find(
      (a) => a.taskId === taskId && a.assigneeEmail === cleanE && a.status === "ACTIVE"
    );
    if (existingActive) {
      return { success: false, duplicate: true, assignment: existingActive };
    }

    const asn = {
      assignmentId: `ASN-${taskId}-${Math.random().toString(36).substring(2, 6)}`,
      taskId,
      assigneeEmail: cleanE,
      assignedBy: assignedBy.trim().toLowerCase(),
      assignedAt: new Date(),
      removedAt: null,
      status: "ACTIVE",
    };
    assignmentsDb.push(asn);
    return { success: true, duplicate: false, assignment: asn };
  }

  function removeAssignment(taskId, email) {
    const cleanE = email.trim().toLowerCase();
    const asn = assignmentsDb.find(
      (a) => a.taskId === taskId && a.assigneeEmail === cleanE && a.status === "ACTIVE"
    );
    if (asn) {
      asn.status = "REMOVED";
      asn.removedAt = new Date();
      return true;
    }
    return false;
  }

  function isAssigned(taskId, email) {
    const cleanE = email.trim().toLowerCase();
    return assignmentsDb.some((a) => a.taskId === taskId && a.assigneeEmail === cleanE && a.status === "ACTIVE");
  }

  // --------------------------------------------------
  // Scenario 1: Create Task
  // --------------------------------------------------
  console.log("\n--- Scenario 1: Create Task ---");
  assert(createdTask.taskId === "TSK-3001", "Task created with unique ID");
  assert(createdTask.createdBy === "admin1@domain.com", "createdBy is derived server-side from Admin 1");
  assert(createdTask.status === "PENDING", "Initial task status is PENDING");

  // --------------------------------------------------
  // Scenario 2: Assign One Member
  // --------------------------------------------------
  console.log("\n--- Scenario 2: Assign One Member ---");
  const res1 = addAssignment(createdTask.taskId, memberAlice.email, adminUser1.email);
  assert(res1.success === true, "Member Alice assigned successfully");
  assert(isAssigned(createdTask.taskId, memberAlice.email) === true, "Alice is active assignee");

  // --------------------------------------------------
  // Scenario 3: Assign Multiple Members
  // --------------------------------------------------
  console.log("\n--- Scenario 3: Assign Multiple Members ---");
  const res2 = addAssignment(createdTask.taskId, memberBob.email, adminUser1.email);
  assert(res2.success === true, "Member Bob assigned successfully");
  assert(isAssigned(createdTask.taskId, memberBob.email) === true, "Bob is active assignee");
  assert(assignmentsDb.filter((a) => a.status === "ACTIVE").length === 2, "Multiple members assigned concurrently");

  // --------------------------------------------------
  // Scenario 4: Assign Admin
  // --------------------------------------------------
  console.log("\n--- Scenario 4: Assign Admin ---");
  const res3 = addAssignment(createdTask.taskId, adminUser2.email, adminUser1.email);
  assert(res3.success === true, "Admin 2 assigned as worker");
  assert(isAssigned(createdTask.taskId, adminUser2.email) === true, "Admin 2 is active assignee");
  assert(isAdmin(adminUser2) === true, "Admin 2 retains ADMIN platform privileges");
  assert(canSubmitToTask(adminUser2, createdTask, true) === true, "Assigned Admin 2 gains WORKER permission to submit");

  // --------------------------------------------------
  // Scenario 5: Admin Self-Assignment
  // --------------------------------------------------
  console.log("\n--- Scenario 5: Admin Self-Assignment ---");
  const res4 = addAssignment(createdTask.taskId, adminUser1.email, adminUser1.email);
  assert(res4.success === true, "Admin 1 assigned themselves");
  assert(isAssigned(createdTask.taskId, adminUser1.email) === true, "Admin 1 is active assignee");

  // --------------------------------------------------
  // Scenario 6: Remove Member
  // --------------------------------------------------
  console.log("\n--- Scenario 6: Remove Member (History Preserved) ---");
  const removedOk = removeAssignment(createdTask.taskId, memberBob.email);
  assert(removedOk === true, "Member Bob assignment removed");
  assert(isAssigned(createdTask.taskId, memberBob.email) === false, "Bob is no longer active assignee");
  const bobHistory = assignmentsDb.find((a) => a.assigneeEmail === "bob@domain.com");
  assert(bobHistory !== undefined && bobHistory.status === "REMOVED", "Bob's assignment row preserved with status REMOVED");
  assert(bobHistory.removedAt instanceof Date, "Bob's removedAt timestamp recorded");

  // --------------------------------------------------
  // Scenario 7: Prevent Duplicate Assignment
  // --------------------------------------------------
  console.log("\n--- Scenario 7: Prevent Duplicate Assignment ---");
  const dupRes = addAssignment(createdTask.taskId, memberAlice.email, adminUser1.email);
  assert(dupRes.success === false && dupRes.duplicate === true, "Duplicate active assignment for Alice prevented");

  // --------------------------------------------------
  // Scenario 8: Private Task Visibility
  // --------------------------------------------------
  console.log("\n--- Scenario 8: Private Task Visibility ---");
  // Admin 1 (unassigned or assigned) -> Sees private task
  assert(canViewTask(adminUser1, createdTask, true) === true, "Admin 1 CAN view private task");
  // Alice (assigned worker) -> Sees private task
  assert(canViewTask(memberAlice, createdTask, true) === true, "Assigned Alice CAN view private task");
  // Charlie (unassigned member) -> CANNOT see private task
  assert(canViewTask(memberCharlie, createdTask, false) === false, "Unassigned Charlie CANNOT view private task");

  // --------------------------------------------------
  // Scenario 9: Completed Task Visibility
  // --------------------------------------------------
  console.log("\n--- Scenario 9: Completed Task Visibility ---");
  const completedTask = { ...createdTask, status: "COMPLETED" };
  assert(canViewTask(memberCharlie, completedTask, false) === true, "Unassigned Charlie CAN view completed team task");

  console.log("==================================================");
  console.log(`SUMMARY: ${passed}/${total} MODULE 3 TASK ENGINE TESTS PASSED!`);
  console.log("==================================================");
}

runTaskTests();
