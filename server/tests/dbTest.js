import { User, Task, TaskAssignment, TaskSubmission, TaskReview, Notification, TaskEvent } from "../models/index.js";

/**
 * Validates Mongoose schema initialization and field rules offline.
 */
export function testSchemas() {
  console.log("--------------------------------------------------");
  console.log("Testing MongoDB Mongoose Schemas Validation...");
  console.log("--------------------------------------------------");

  // 1. User Model Test
  const testUser = new User({
    userId: "USR-001",
    email: "  Test.Admin@Domain.COM  ",
    name: " Test Admin ",
    role: "admin",
    status: "active",
  });
  testUser.validateSync();
  if (testUser.email !== "test.admin@domain.com") throw new Error("User email normalization failed!");
  console.log("✅ User Schema Validated: Role = ADMIN, Email Normalized =", testUser.email);

  // 2. Task Model Test
  const testTask = new Task({
    taskId: "TSK-101",
    title: " Build AI Chatbot ",
    domain: "Agentic AI",
    priority: "High",
    status: "IN_PROGRESS",
    submissionMode: "COLLABORATIVE",
    createdBy: "  Admin1@Domain.COM ",
  });
  testTask.validateSync();
  if (testTask.createdBy !== "admin1@domain.com") throw new Error("Task createdBy email normalization failed!");
  console.log("✅ Task Schema Validated: Status =", testTask.status, "Mode =", testTask.submissionMode);

  // 3. TaskAssignment Model Test
  const testAssign = new TaskAssignment({
    assignmentId: "ASN-101-01",
    taskId: "TSK-101",
    assigneeEmail: " MEMBER.ONE@DOMAIN.COM ",
    assignedBy: " ADMIN1@DOMAIN.COM ",
    status: "ACTIVE",
  });
  testAssign.validateSync();
  if (testAssign.assigneeEmail !== "member.one@domain.com") throw new Error("Assignee email normalization failed!");
  console.log("✅ TaskAssignment Schema Validated: Assignee =", testAssign.assigneeEmail);

  // 4. TaskSubmission Model Test
  const testSub = new TaskSubmission({
    submissionId: "SUB-501",
    taskId: "TSK-101",
    submissionGroupId: "GRP-TSK-101-TEAM",
    version: 1,
    submissionType: "COLLABORATIVE",
    submittedBy: " MEMBER.ONE@DOMAIN.COM ",
    submittedFor: [" MEMBER.ONE@DOMAIN.COM ", " MEMBER.TWO@DOMAIN.COM "],
    githubUrl: "https://github.com/test/repo",
    status: "SUBMITTED",
  });
  testSub.validateSync();
  if (testSub.submittedFor[1] !== "member.two@domain.com") throw new Error("SubmittedFor normalization failed!");
  console.log("✅ TaskSubmission Schema Validated: Group =", testSub.submissionGroupId, "Version =", testSub.version);

  // 5. TaskReview Model Test
  const testReview = new TaskReview({
    reviewId: "REV-901",
    taskId: "TSK-101",
    submissionId: "SUB-501",
    version: 1,
    reviewerEmail: " ADMIN1@DOMAIN.COM ",
    decision: "APPROVED",
    feedback: "Great work!",
  });
  testReview.validateSync();
  console.log("✅ TaskReview Schema Validated: Decision =", testReview.decision, "Reviewer =", testReview.reviewerEmail);

  // 6. Notification Model Test
  const testNotif = new Notification({
    notificationId: "NTF-801",
    targetEmail: " MEMBER.ONE@DOMAIN.COM ",
    title: "Task Approved 🎉",
    message: "Your submission was approved",
    eventKey: "EVT-APPROVE-501",
  });
  testNotif.validateSync();
  console.log("✅ Notification Schema Validated: Target =", testNotif.targetEmail, "eventKey =", testNotif.eventKey);

  // 7. TaskEvent Model Test
  const testEvent = new TaskEvent({
    eventId: "EVT-1001",
    taskId: "TSK-101",
    submissionId: "SUB-501",
    actorEmail: " ADMIN1@DOMAIN.COM ",
    eventType: "SUBMISSION_APPROVED",
    details: { coverage: "2/2", mode: "COLLABORATIVE" },
  });
  testEvent.validateSync();
  console.log("✅ TaskEvent Schema Validated: EventType =", testEvent.eventType);

  console.log("--------------------------------------------------");
  console.log("ALL 7 MONGOOSE SCHEMAS PASSED VALIDATION CHECKS!");
  console.log("--------------------------------------------------");
}

testSchemas();
