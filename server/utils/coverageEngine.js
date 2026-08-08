import { Task } from "../models/Task.js";
import { TaskAssignment } from "../models/TaskAssignment.js";
import { TaskSubmission } from "../models/TaskSubmission.js";
import { TaskEvent } from "../models/TaskEvent.js";

/**
 * Centralized Task Coverage & Completion Calculation Engine
 *
 * Rules:
 * 1. Active Assignees: Only ACTIVE assignments count. REMOVED assignments do not count.
 * 2. Highest Version: For every submissionGroupId, select ONLY the highest integer version.
 * 3. Approved Coverage: Only highest versions whose current status is APPROVED contribute.
 * 4. Coverage Union: Takes the union of submittedFor across approved highest-version submission groups.
 * 5. Completion: Task = COMPLETED if activeAssignees > 0 AND unique approved covered users == active assignees.
 * 6. Zero Assignees: 0 active assignees defaults to NOT COMPLETED.
 */
export async function calculateTaskCoverage(taskId) {
  const cleanTaskId = String(taskId).trim();

  // 1. Fetch Task
  const task = await Task.findOne({ taskId: cleanTaskId }).exec();
  if (!task) {
    throw new Error(`Task with ID ${cleanTaskId} not found.`);
  }

  // 2. Fetch Active Task Assignments
  const activeAssignments = await TaskAssignment.find({
    taskId: cleanTaskId,
    status: "ACTIVE",
  }).exec();

  const activeAssigneeEmails = Array.from(
    new Set(activeAssignments.map((a) => a.assigneeEmail.toLowerCase()))
  );
  const assigneeCount = activeAssigneeEmails.length;

  // 3. Fetch All Submissions for Task
  const allSubmissions = await TaskSubmission.find({ taskId: cleanTaskId }).exec();

  // Group submissions by submissionGroupId to find highest version per group
  const groupMap = new Map();
  allSubmissions.forEach((sub) => {
    const existing = groupMap.get(sub.submissionGroupId);
    if (!existing || sub.version > existing.version) {
      groupMap.set(sub.submissionGroupId, sub);
    }
  });

  // 4. Calculate Approved Coverage Union from Highest-Version Submissions
  const coveredUsersSet = new Set();

  groupMap.forEach((latestSub) => {
    if (latestSub.status === "APPROVED") {
      const submittedForList = Array.isArray(latestSub.submittedFor) ? latestSub.submittedFor : [];
      submittedForList.forEach((email) => {
        const cleanE = String(email).trim().toLowerCase();
        // Only count if user is currently an active assignee
        if (activeAssigneeEmails.includes(cleanE)) {
          coveredUsersSet.add(cleanE);
        }
      });
    }
  });

  const coveredUsers = Array.from(coveredUsersSet);
  const coveredCount = coveredUsers.length;
  const uncoveredUsers = activeAssigneeEmails.filter((email) => !coveredUsersSet.has(email));

  const coveragePercentage =
    assigneeCount > 0 ? Math.round((coveredCount / assigneeCount) * 10000) / 100 : 0;

  // 5. Evaluate Task Completion State
  const isFullyCovered = assigneeCount > 0 && coveredCount === assigneeCount;
  let updatedTaskStatus = task.status;
  let completedAt = task.completedAt;

  if (isFullyCovered) {
    if (task.status !== "COMPLETED") {
      updatedTaskStatus = "COMPLETED";
      completedAt = new Date();
      task.status = "COMPLETED";
      task.completedAt = completedAt;
      await task.save();

      // Log TaskEvent
      await TaskEvent.create({
        eventId: `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        taskId: cleanTaskId,
        actorEmail: "system@coverage-engine",
        eventType: "TASK_COMPLETED",
        details: { coveredCount, assigneeCount, coveragePercentage: 100 },
      });
    }
  } else {
    // If task was previously COMPLETED but is no longer fully covered (e.g. assignee added or changes requested)
    if (task.status === "COMPLETED") {
      updatedTaskStatus = "IN_PROGRESS";
      completedAt = null;
      task.status = "IN_PROGRESS";
      task.completedAt = null;
      await task.save();

      // Log TaskEvent
      await TaskEvent.create({
        eventId: `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        taskId: cleanTaskId,
        actorEmail: "system@coverage-engine",
        eventType: "TASK_REOPENED",
        details: { coveredCount, assigneeCount, coveragePercentage },
      });
    }
  }

  return {
    taskId: cleanTaskId,
    coveredCount,
    assigneeCount,
    coveragePercentage,
    coveredUsers,
    uncoveredUsers,
    taskStatus: updatedTaskStatus,
    completedAt,
  };
}
