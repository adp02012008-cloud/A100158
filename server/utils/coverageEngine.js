import { Task } from "../models/Task.js";
import { TaskAssignment } from "../models/TaskAssignment.js";
import { TaskSubmission } from "../models/TaskSubmission.js";
import { TaskReview } from "../models/TaskReview.js";
import { TaskEvent } from "../models/TaskEvent.js";
import { getEffectiveSubmissionVersionState } from "./authHelpers.js";

/**
 * Centralized Task Coverage & Completion Calculation Engine
 *
 * Rules:
 * 1. Active Assignees: Only ACTIVE assignments count. REMOVED assignments do not count.
 * 2. Highest Version: For every submissionGroupId, select ONLY the highest integer version.
 * 3. Approved Coverage: Only highest versions whose current effective status is APPROVED contribute.
 * 4. Coverage Union: Takes the union of submittedFor across approved highest-version submission groups.
 * 5. Completion: Task = COMPLETED if activeAssignees > 0 AND unique approved covered users == active assignees.
 * 6. Zero Assignees: 0 active assignees defaults to NOT COMPLETED.
 */
export async function calculateTaskCoverage(taskId, session = null) {
  const cleanTaskId = String(taskId).trim();

  // 1. Fetch Task
  const queryOpts = session ? { session } : {};
  const task = await Task.findOne({ taskId: cleanTaskId }, null, queryOpts).exec();
  if (!task) {
    throw new Error(`Task with ID ${cleanTaskId} not found.`);
  }

  // 2. Fetch Active Task Assignments
  const activeAssignments = await TaskAssignment.find({
    taskId: cleanTaskId,
    status: "ACTIVE",
  }, null, queryOpts).exec();

  const activeAssigneeEmails = Array.from(
    new Set(activeAssignments.map((a) => a.assigneeEmail.toLowerCase()))
  );
  const assigneeCount = activeAssigneeEmails.length;

  // 3. Fetch All Submissions & Reviews for Task
  const allSubmissions = await TaskSubmission.find({ taskId: cleanTaskId }, null, queryOpts).exec();
  const allReviews = await TaskReview.find({ taskId: cleanTaskId }, null, queryOpts).exec();

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
    const versionReviews = allReviews.filter((r) => r.submissionId === latestSub.submissionId);
    const effectiveState = getEffectiveSubmissionVersionState(versionReviews);

    if (effectiveState === "APPROVED") {
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

  // 5. Evaluate Task Status Transitions
  const isFullyCovered = assigneeCount > 0 && coveredCount === assigneeCount;

  let hasPendingReview = false;
  groupMap.forEach((latestSub) => {
    const versionReviews = allReviews.filter((r) => r.submissionId === latestSub.submissionId);
    const effectiveState = getEffectiveSubmissionVersionState(versionReviews);
    if (effectiveState === "SUBMITTED") {
      hasPendingReview = true;
    }
  });

  let newStatus = task.status;
  let completedAt = task.completedAt;

  if (isFullyCovered) {
    newStatus = "COMPLETED";
    completedAt = task.completedAt || new Date();
  } else if (hasPendingReview) {
    newStatus = "UNDER_REVIEW";
    completedAt = null;
  } else if (allSubmissions.length > 0) {
    newStatus = "IN_PROGRESS";
    completedAt = null;
  } else {
    newStatus = "PENDING";
    completedAt = null;
  }

  // Persist status change if different
  if (task.status !== newStatus) {
    const previousStatus = task.status;
    task.status = newStatus;
    task.completedAt = completedAt;
    await task.save(queryOpts);

    // Log TaskEvent
    const eventType = newStatus === "COMPLETED" ? "TASK_COMPLETED" : previousStatus === "COMPLETED" ? "TASK_REOPENED" : "TASK_UPDATED";
    await TaskEvent.create([{
      eventId: `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      taskId: cleanTaskId,
      actorEmail: "system@coverage-engine",
      eventType,
      details: { previousStatus, newStatus, coveredCount, assigneeCount, coveragePercentage },
    }], queryOpts);
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
