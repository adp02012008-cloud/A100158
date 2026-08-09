import { Task } from "../models/Task.js";
import { TaskAssignment } from "../models/TaskAssignment.js";
import { TaskSubmission } from "../models/TaskSubmission.js";
import { TaskReview } from "../models/TaskReview.js";
import { TaskEvent } from "../models/TaskEvent.js";
import { Notification } from "../models/Notification.js";

/**
 * Derives effective state of a specific submission version.
 * Terminal Rule: CHANGES_REQUESTED closes the version. Submits after CHANGES_REQUESTED cannot override it.
 */
export function getEffectiveVersionState(reviewsList = []) {
  if (!Array.isArray(reviewsList) || reviewsList.length === 0) {
    return "SUBMITTED";
  }

  const sorted = [...reviewsList].sort(
    (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
  );

  let state = "SUBMITTED";
  for (const rev of sorted) {
    if (state === "CHANGES_REQUESTED") break;

    const d = String(rev.decision || "").trim().toUpperCase();
    if (d === "CHANGES_REQUESTED") {
      state = "CHANGES_REQUESTED";
    } else if (d === "APPROVED") {
      state = "APPROVED";
    }
  }

  return state;
}

/**
 * Centralized Task State & Coverage Recalculation Engine
 *
 * Rules:
 * 1. Active Assignees: Only status === 'ACTIVE' count.
 * 2. Highest Version: For every submissionGroupId, select ONLY the highest version.
 * 3. Approved Coverage: Only highest versions whose effective status is APPROVED contribute.
 * 4. Coverage = coveredActiveAssignees / totalActiveAssignees (0 if totalActiveAssignees === 0).
 * 5. COMPLETED = totalActiveAssignees > 0 AND coverage === 1.0 (100%).
 */
export async function recalculateTaskState(taskId, session = null) {
  const queryOpts = session ? { session } : {};

  const task = await Task.findById(taskId, null, queryOpts).exec();
  if (!task) {
    throw new Error(`Task not found: ${taskId}`);
  }

  // Active assignments
  const activeAssignments = await TaskAssignment.find({
    taskId: task._id,
    status: "ACTIVE",
  }, null, queryOpts).exec();

  const activeUserIds = activeAssignments.map((a) => String(a.userId));
  const activeAssigneeCount = activeUserIds.length;

  // Submissions and Reviews
  const submissions = await TaskSubmission.find({ taskId: task._id }, null, queryOpts).exec();
  const reviews = await TaskReview.find({ taskId: task._id }, null, queryOpts).exec();

  // Group by submissionGroupId -> find highest version
  const groupMap = new Map();
  submissions.forEach((sub) => {
    const existing = groupMap.get(sub.submissionGroupId);
    if (!existing || sub.version > existing.version) {
      groupMap.set(sub.submissionGroupId, sub);
    }
  });

  // Calculate covered active assignees
  const coveredActiveUserSet = new Set();
  let hasPendingReview = false;

  groupMap.forEach((latestSub) => {
    const subReviews = reviews.filter((r) => String(r.submissionId) === String(latestSub._id));
    const versionState = getEffectiveVersionState(subReviews);

    if (versionState === "APPROVED") {
      (latestSub.submittedFor || []).forEach((userId) => {
        const uStr = String(userId);
        if (activeUserIds.includes(uStr)) {
          coveredActiveUserSet.add(uStr);
        }
      });
    } else if (versionState === "SUBMITTED") {
      hasPendingReview = true;
    }
  });

  const coveredCount = coveredActiveUserSet.size;
  const coverageRatio = activeAssigneeCount > 0 ? coveredCount / activeAssigneeCount : 0;

  let newStatus = task.status;
  let completedAt = task.completedAt;

  // Rule: Must have > 0 active assignees AND 100% coverage to complete
  if (activeAssigneeCount > 0 && coveredCount === activeAssigneeCount) {
    newStatus = "COMPLETED";
    completedAt = task.completedAt || new Date();
  } else if (hasPendingReview) {
    newStatus = "UNDER_REVIEW";
    completedAt = null;
  } else if (submissions.length > 0) {
    newStatus = "IN_PROGRESS";
    completedAt = null;
  } else {
    newStatus = "PENDING";
    completedAt = null;
  }

  if (task.status !== newStatus) {
    const previousStatus = task.status;
    task.status = newStatus;
    task.completedAt = completedAt;
    await task.save(queryOpts);

    await TaskEvent.create(
      [
        {
          eventId: `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          taskId: task._id,
          actorUserId: task.createdBy,
          eventType: newStatus === "COMPLETED" ? "TASK_COMPLETED" : "TASK_STATUS_CHANGED",
          details: { previousStatus, newStatus, coveredCount, activeAssigneeCount, coverageRatio },
        },
      ],
      queryOpts
    );
  }

  return {
    taskId: task._id,
    activeAssigneeCount,
    coveredCount,
    coverageRatio,
    taskStatus: task.status,
  };
}

/**
 * Validates submission payload according to submissionMode and active assignees.
 */
export async function validateSubmissionPayload(task, activeUserIds, submittedForUserIds, submitForAll, submissionMode) {
  if (activeUserIds.length === 0) {
    throw new Error("Cannot submit to a task with zero active assignees.");
  }

  let finalSubmittedFor = [];
  if (submitForAll) {
    finalSubmittedFor = [...activeUserIds];
  } else {
    finalSubmittedFor = [...new Set(submittedForUserIds.map((id) => String(id)))];
  }

  // Validate subset rule: submittedFor ⊆ activeAssignees
  const invalidUsers = finalSubmittedFor.filter((id) => !activeUserIds.includes(String(id)));
  if (invalidUsers.length > 0) {
    throw new Error("submittedFor users must all be currently active assignees.");
  }

  if (finalSubmittedFor.length === 0) {
    throw new Error("At least one active assignee must be included in submittedFor.");
  }

  // Validate mode rules
  if (submissionMode === "INDIVIDUAL" && finalSubmittedFor.length !== 1) {
    throw new Error("INDIVIDUAL submission mode requires exactly 1 submittedFor user.");
  }

  if (submissionMode === "COLLABORATIVE" && finalSubmittedFor.length < 2) {
    throw new Error("COLLABORATIVE submission mode requires at least 2 submittedFor users.");
  }

  return finalSubmittedFor;
}
