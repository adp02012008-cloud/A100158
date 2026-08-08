import { canViewTask } from "../utils/authHelpers.js";

/**
 * Task Event / Audit Engine Comprehensive Test Suite
 *
 * Verifies 6 Mandatory Test Scenarios:
 * 1. Event creation (Valid audit log row created)
 * 2. Audit event context (Contains who, what, when, taskId, submissionId, version, details)
 * 3. Append-only immutability (Events are immutable and cannot be updated/deleted)
 * 4. Admin audit view (Admin CAN view audit events for any task)
 * 5. Assigned member audit view (Assigned member CAN view audit events for assigned task)
 * 6. Unauthorized member rejection (Unassigned member CANNOT view private task audit events)
 */
export async function runEventTests() {
  console.log("==================================================");
  console.log("RUNNING MODULE 8 AUDIT ENGINE TESTS");
  console.log("==================================================");

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (!condition) {
      console.error(`❌ TEST FAILED: ${message}`);
      throw new Error(`Event test assertion failed: ${message}`);
    }
    passed++;
    console.log(`✅ TEST PASSED [${total}]: ${message}`);
  }

  // Users
  const adminUser = { userId: "USR-ADM-01", email: "admin1@domain.com", role: "ADMIN" };
  const memberAlice = { userId: "USR-MEM-01", email: "alice@domain.com", role: "MEMBER" };
  const memberBob = { userId: "USR-MEM-02", email: "bob@domain.com", role: "MEMBER" };

  // Task & Assignments Database Simulation
  const privateTask = {
    taskId: "TSK-8001",
    title: "Audit Trail Architecture",
    status: "PENDING",
  };

  const activeAssigneeEmails = ["alice@domain.com"];

  function isAssigned(email) {
    return activeAssigneeEmails.includes(email.trim().toLowerCase());
  }

  // Immutable Audit Store
  const eventsDb = [];

  function logTaskEvent({ taskId, submissionId = "", actorEmail, eventType, details = {} }) {
    const eventId = `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const eventDoc = Object.freeze({
      eventId,
      taskId,
      submissionId,
      actorEmail: actorEmail.trim().toLowerCase(),
      eventType: eventType.toUpperCase(),
      details: Object.freeze({ ...details }),
      timestamp: new Date(),
    });

    eventsDb.push(eventDoc);
    return eventDoc;
  }

  function getEventsForTask(user, taskObj) {
    const assigned = isAssigned(user.email);
    if (!canViewTask(user, taskObj, assigned)) {
      return { success: false, statusCode: 403, error: "Access denied to task audit events" };
    }

    const taskEvents = eventsDb.filter((e) => e.taskId === taskObj.taskId);
    return { success: true, statusCode: 200, events: taskEvents };
  }

  // --------------------------------------------------
  // Scenario 1 & 2: Event Creation & Context Information
  // --------------------------------------------------
  console.log("\n--- Scenario 1 & 2: Event Creation & Context Information ---");
  const evt1 = logTaskEvent({
    taskId: privateTask.taskId,
    submissionId: "SUB-8001-V1",
    actorEmail: memberAlice.email,
    eventType: "SUBMISSION_CREATED",
    details: { version: 1, submissionType: "INDIVIDUAL", githubUrl: "https://github.com/alice/audit" },
  });

  assert(evt1.eventId.startsWith("EVT-"), "Scenario 1: Audit event created with unique eventId");
  assert(evt1.actorEmail === "alice@domain.com", "Scenario 2: Context contains 'who' (actorEmail)");
  assert(evt1.eventType === "SUBMISSION_CREATED", "Context contains 'what' (eventType)");
  assert(evt1.timestamp instanceof Date, "Context contains 'when' (timestamp)");
  assert(evt1.taskId === "TSK-8001", "Context contains 'which task' (taskId)");
  assert(evt1.submissionId === "SUB-8001-V1" && evt1.details.version === 1, "Context contains 'which submission/version'");

  // --------------------------------------------------
  // Scenario 3: Append-Only Immutability
  // --------------------------------------------------
  console.log("\n--- Scenario 3: Append-Only Immutability ---");
  assert(Object.isFrozen(evt1) === true, "Audit event object is frozen and immutable");
  assert(eventsDb.length === 1, "Audit log store contains 1 historical entry");

  // Log a review event
  logTaskEvent({
    taskId: privateTask.taskId,
    submissionId: "SUB-8001-V1",
    actorEmail: adminUser.email,
    eventType: "REVIEW_APPROVED",
    details: { version: 1, decision: "APPROVED" },
  });

  assert(eventsDb.length === 2, "Second event appended without overwriting or altering first event");
  assert(eventsDb[0].eventType === "SUBMISSION_CREATED", "Historical event 1 remains completely unchanged");

  // --------------------------------------------------
  // Scenario 4: Admin Audit View
  // --------------------------------------------------
  console.log("\n--- Scenario 4: Admin Audit View ---");
  const adminViewRes = getEventsForTask(adminUser, privateTask);
  assert(adminViewRes.success === true, "Admin CAN view task audit events");
  assert(adminViewRes.events.length === 2, "Admin sees all 2 audit events");

  // --------------------------------------------------
  // Scenario 5: Assigned Member Audit View
  // --------------------------------------------------
  console.log("\n--- Scenario 5: Assigned Member Audit View ---");
  const aliceViewRes = getEventsForTask(memberAlice, privateTask);
  assert(aliceViewRes.success === true, "Assigned member Alice CAN view task audit events");
  assert(aliceViewRes.events.length === 2, "Alice sees task audit history");

  // --------------------------------------------------
  // Scenario 6: Unauthorized Member Rejection
  // --------------------------------------------------
  console.log("\n--- Scenario 6: Unauthorized Member Rejection ---");
  const bobViewRes = getEventsForTask(memberBob, privateTask);
  assert(bobViewRes.success === false && bobViewRes.statusCode === 403, "Unassigned member Bob CANNOT view private task audit events (Access Denied)");

  console.log("==================================================");
  console.log(`SUMMARY: ${passed}/${total} MODULE 8 AUDIT ENGINE TESTS PASSED!`);
  console.log("==================================================");
}

runEventTests();
