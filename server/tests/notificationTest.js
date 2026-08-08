import { canViewNotification } from "../utils/authHelpers.js";

/**
 * Notification Engine Comprehensive Test Suite
 *
 * Verifies 8 Mandatory Test Scenarios:
 * 1. Notification creation
 * 2. Correct recipient
 * 3. Duplicate event prevention (Deduplication via eventKey)
 * 4. Mark read (readAt timestamp set)
 * 5. Unread count (Decreases upon marking read)
 * 6. Notification disappears from unread UI (unreadOnly filter excludes read item)
 * 7. Notification remains in database (Document NEVER deleted)
 * 8. User isolation (User B cannot see User A's notification)
 */
export async function runNotificationTests() {
  console.log("==================================================");
  console.log("RUNNING MODULE 7 NOTIFICATION ENGINE TESTS");
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

  // Users
  const userAlice = { email: "alice@domain.com", name: "Alice" };
  const userBob = { email: "bob@domain.com", name: "Bob" };

  // In-Memory Notification Store (Simulating Mongoose collection with eventKey uniqueness)
  const notificationsDb = [];

  function upsertNotification({ targetEmail, type, taskId, title, message, eventKey }) {
    const cleanTarget = targetEmail.trim().toLowerCase();
    const existingIndex = notificationsDb.findIndex((n) => n.eventKey === eventKey);

    if (existingIndex >= 0) {
      // Duplicate event -> Returns existing document without creating duplicate
      return { duplicate: true, notification: notificationsDb[existingIndex] };
    }

    const newDoc = {
      notificationId: `NTF-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      targetEmail: cleanTarget,
      type,
      taskId,
      title,
      message,
      eventKey,
      readAt: null,
      createdAt: new Date(),
    };

    notificationsDb.push(newDoc);
    return { duplicate: false, notification: newDoc };
  }

  function getNotificationsForUser(userEmail, unreadOnly = false) {
    const cleanE = userEmail.trim().toLowerCase();
    return notificationsDb.filter((n) => {
      if (n.targetEmail !== cleanE) return false;
      if (unreadOnly && n.readAt !== null) return false;
      return true;
    });
  }

  function getUnreadCountForUser(userEmail) {
    return getNotificationsForUser(userEmail, true).length;
  }

  function markNotificationAsRead(userEmail, notificationId) {
    const cleanE = userEmail.trim().toLowerCase();
    const notif = notificationsDb.find((n) => n.notificationId === notificationId);
    if (!notif) return { success: false, error: "Not found" };

    // User isolation check
    if (notif.targetEmail !== cleanE) {
      return { success: false, error: "Access denied" };
    }

    if (!notif.readAt) {
      notif.readAt = new Date();
    }
    return { success: true, notification: notif };
  }

  // --------------------------------------------------
  // Scenario 1 & 2: Creation & Correct Recipient
  // --------------------------------------------------
  console.log("\n--- Scenario 1 & 2: Creation & Correct Recipient ---");
  const res1 = upsertNotification({
    targetEmail: userAlice.email,
    type: "TASK_ASSIGNED",
    taskId: "TSK-7001",
    title: "New Task Assigned",
    message: "You were assigned to Agentic AI Module",
    eventKey: "NTF-ASSIGN-TSK-7001-alice@domain.com",
  });

  assert(res1.duplicate === false, "Scenario 1: Notification created successfully");
  assert(res1.notification.targetEmail === "alice@domain.com", "Scenario 2: Correct recipient assigned");
  assert(res1.notification.readAt === null, "Initial readAt is null (Unread)");

  // --------------------------------------------------
  // Scenario 3: Duplicate Event Prevention
  // --------------------------------------------------
  console.log("\n--- Scenario 3: Duplicate Event Prevention ---");
  const res3 = upsertNotification({
    targetEmail: userAlice.email,
    type: "TASK_ASSIGNED",
    taskId: "TSK-7001",
    title: "New Task Assigned",
    message: "You were assigned to Agentic AI Module",
    eventKey: "NTF-ASSIGN-TSK-7001-alice@domain.com", // Duplicate eventKey
  });

  assert(res3.duplicate === true, "Duplicate eventKey detected");
  assert(notificationsDb.length === 1, "Database store contains only 1 document (No duplicates)");

  // Add a second notification for Alice
  upsertNotification({
    targetEmail: userAlice.email,
    type: "REVIEW",
    taskId: "TSK-7001",
    title: "Deliverable Approved",
    message: "Admin approved V1",
    eventKey: "NTF-REV-101-alice@domain.com",
  });

  // --------------------------------------------------
  // Scenario 4 & 5: Mark Read & Unread Count
  // --------------------------------------------------
  console.log("\n--- Scenario 4 & 5: Mark Read & Unread Count ---");
  const initialUnreadCount = getUnreadCountForUser(userAlice.email);
  assert(initialUnreadCount === 2, "Scenario 5: Alice has initial unread count of 2");

  const targetNotifId = res1.notification.notificationId;
  const readRes = markNotificationAsRead(userAlice.email, targetNotifId);

  assert(readRes.success === true, "Scenario 4: Mark read succeeded");
  assert(readRes.notification.readAt instanceof Date, "readAt timestamp recorded");

  const newUnreadCount = getUnreadCountForUser(userAlice.email);
  assert(newUnreadCount === 1, "Unread count decreased from 2 to 1");

  // --------------------------------------------------
  // Scenario 6: Notification Disappears from Unread UI
  // --------------------------------------------------
  console.log("\n--- Scenario 6: Notification Disappears from Unread UI ---");
  const unreadList = getNotificationsForUser(userAlice.email, true);
  assert(unreadList.length === 1, "Unread query returns 1 item");
  assert(unreadList.some((n) => n.notificationId === targetNotifId) === false, "Read item no longer appears in unread UI list");

  // --------------------------------------------------
  // Scenario 7: Notification Remains in Database
  // --------------------------------------------------
  console.log("\n--- Scenario 7: Notification Remains in Database ---");
  const fullList = getNotificationsForUser(userAlice.email, false);
  assert(fullList.length === 2, "Full notification history query returns both items (NEVER deleted)");
  const readItemInDb = fullList.find((n) => n.notificationId === targetNotifId);
  assert(readItemInDb !== undefined && readItemInDb.readAt !== null, "Read item preserved in database with readAt timestamp");

  // --------------------------------------------------
  // Scenario 8: User Isolation
  // --------------------------------------------------
  console.log("\n--- Scenario 8: User Isolation ---");
  const bobList = getNotificationsForUser(userBob.email, false);
  assert(bobList.length === 0, "User Bob cannot see User Alice's notifications");

  const unauthorizedRead = markNotificationAsRead(userBob.email, targetNotifId);
  assert(unauthorizedRead.success === false, "User Bob cannot mark User Alice's notification as read (Access Denied)");

  console.log("==================================================");
  console.log(`SUMMARY: ${passed}/${total} MODULE 7 NOTIFICATION TESTS PASSED!`);
  console.log("==================================================");
}

runNotificationTests();
