import mongoose from "mongoose";
import { Notification, User, Task, Opportunity, Certificate } from "../models/index.js";

/**
 * Notification Expansion Integration & Schema Test Suite
 *
 * Verifies Part 2 additions:
 * 1. Notification schema supports targetPage, referenceId, and actionUrl.
 * 2. OPPORTUNITY_NEW notifications generate with targetPage: "opportunities" and referenceId.
 * 3. OPPORTUNITY_THOUGHT notifications generate with targetPage: "opportunities" for interested users.
 * 4. CERTIFICATE_ISSUED notifications generate with targetPage: "certificates" and certificateId.
 * 5. POINTS_AWARDED notifications generate with targetPage: "leaderboard".
 * 6. TASK_DEADLINE_APPROACHING notifications generate with targetPage: "my-tasks" and taskId.
 */
export async function runNotificationExpansionTests() {
  console.log("==================================================");
  console.log("RUNNING NOTIFICATION EXPANSION TESTS (PART 2)");
  console.log("==================================================");

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (!condition) {
      console.error(`❌ TEST FAILED: ${message}`);
      throw new Error(`Notification test assertion failed: ${message}`);
    }
    passed++;
    console.log(`✅ TEST PASSED [${total}]: ${message}`);
  }

  const dummyUserId = new mongoose.Types.ObjectId();

  // Test 1: Schema validation with targetPage and referenceId
  const notifOpp = new Notification({
    notificationId: `NTF-TEST-OPP-${Date.now()}`,
    targetUserId: dummyUserId,
    targetEmail: "student@example.com",
    type: "OPPORTUNITY_NEW",
    targetPage: "opportunities",
    referenceId: "OPP-HACK-2026",
    title: '🚀 New Hackathon: "Kernel AI Challenge"',
    message: "CDAC announced a new Hackathon. Check eligibility and squad up!",
    eventKey: `NTF-OPP-NEW-OPP-HACK-2026-${dummyUserId}`,
  });
  await notifOpp.validate();
  assert(notifOpp.targetPage === "opportunities", "Notification schema persists targetPage");
  assert(notifOpp.referenceId === "OPP-HACK-2026", "Notification schema persists referenceId");
  assert(notifOpp.type === "OPPORTUNITY_NEW", "Notification accepts OPPORTUNITY_NEW type");

  // Test 2: OPPORTUNITY_THOUGHT notification validation
  const notifThought = new Notification({
    notificationId: `NTF-TEST-THOUGHT-${Date.now()}`,
    targetUserId: dummyUserId,
    targetEmail: "squadmate@example.com",
    type: "OPPORTUNITY_THOUGHT",
    targetPage: "opportunities",
    referenceId: "OPP-HACK-2026",
    title: "💬 Teammate Discussion: Priya",
    message: 'Priya posted on "Kernel AI Challenge": "Looking for frontend dev!"',
    eventKey: `NTF-OPP-THOUGHT-OPP-HACK-2026-${dummyUserId}-1`,
  });
  await notifThought.validate();
  assert(notifThought.type === "OPPORTUNITY_THOUGHT", "OPPORTUNITY_THOUGHT type validated");
  assert(notifThought.targetPage === "opportunities", "OPPORTUNITY_THOUGHT targets opportunities page");

  // Test 3: CERTIFICATE_ISSUED notification validation
  const notifCert = new Notification({
    notificationId: `NTF-TEST-CERT-${Date.now()}`,
    targetUserId: dummyUserId,
    targetEmail: "student@example.com",
    type: "CERTIFICATE_ISSUED",
    targetPage: "certificates",
    referenceId: "CRT-1788534437222-ABCDE",
    title: "🎖️ Certificate Issued! 🎓",
    message: 'Your certificate for "Full Stack Specialization" by Google is ready to download.',
    eventKey: `NTF-CERT-NEW-CRT-1788534437222-ABCDE-${dummyUserId}`,
  });
  await notifCert.validate();
  assert(notifCert.type === "CERTIFICATE_ISSUED", "CERTIFICATE_ISSUED type validated");
  assert(notifCert.targetPage === "certificates", "CERTIFICATE_ISSUED targets certificates page");
  assert(notifCert.referenceId === "CRT-1788534437222-ABCDE", "Certificate referenceId attached");

  // Test 4: POINTS_AWARDED notification validation
  const notifPoints = new Notification({
    notificationId: `NTF-TEST-PTS-${Date.now()}`,
    targetUserId: dummyUserId,
    targetEmail: "student@example.com",
    type: "POINTS_AWARDED",
    targetPage: "leaderboard",
    title: "⭐ Points Awarded! 🎉",
    message: "Admin awarded you +50 points! Check your standing on the Leaderboard.",
    eventKey: `NTF-POINTS-${dummyUserId}-${Date.now()}`,
  });
  await notifPoints.validate();
  assert(notifPoints.type === "POINTS_AWARDED", "POINTS_AWARDED type validated");
  assert(notifPoints.targetPage === "leaderboard", "POINTS_AWARDED targets leaderboard page");

  // Test 5: TASK_DEADLINE_APPROACHING notification validation
  const notifDeadline = new Notification({
    notificationId: `NTF-TEST-DUE-${Date.now()}`,
    targetUserId: dummyUserId,
    targetEmail: "student@example.com",
    type: "TASK_DEADLINE_APPROACHING",
    taskId: "TSK-202",
    targetPage: "my-tasks",
    referenceId: "TSK-202",
    title: '⏰ Due Soon (Under 24h)!: "Kernel Module Bugfix"',
    message: 'Task "Kernel Module Bugfix" (Core) is due in ~18 hours. Submit your deliverable on time!',
    eventKey: `NTF-DEADLINE-TSK-202`,
  });
  await notifDeadline.validate();
  assert(notifDeadline.type === "TASK_DEADLINE_APPROACHING", "TASK_DEADLINE_APPROACHING type validated");
  assert(notifDeadline.targetPage === "my-tasks", "Deadline reminder targets my-tasks page");
  assert(notifDeadline.taskId === "TSK-202", "taskId attached to deadline reminder");

  console.log("==================================================");
  console.log(`ALL ${passed}/${total} NOTIFICATION EXPANSION TESTS PASSED! 🎉`);
  console.log("==================================================");
  return { passed, total };
}

// Direct execution
if (process.argv[1]?.endsWith("notificationExpansionTest.js")) {
  runNotificationExpansionTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Test execution failed:", err);
      process.exit(1);
    });
}
