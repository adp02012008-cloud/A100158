import { TaskAssignment } from "../models/TaskAssignment.js";

/**
 * Checks if the user has ADMIN role.
 */
export function isAdmin(user) {
  if (!user || !user.role) return false;
  return String(user.role).toUpperCase() === "ADMIN";
}

/**
 * Checks if a user is actively assigned to a task in taskAssignments.
 */
export async function isAssignedToTask(userEmail, taskId) {
  if (!userEmail || !taskId) return false;
  const cleanEmail = String(userEmail).trim().toLowerCase();
  
  const assignment = await TaskAssignment.findOne({
    taskId: String(taskId).trim(),
    assigneeEmail: cleanEmail,
    status: "ACTIVE",
  }).exec();

  return Boolean(assignment);
}

/**
 * Task Visibility Authorization:
 * - ADMIN: Can view all tasks.
 * - MEMBER: Can view active assigned tasks OR completed team-visible tasks.
 *   Cannot view unrelated private tasks.
 */
export function canViewTask(user, task, isAssigned = false) {
  if (!user || !task) return false;
  if (isAdmin(user)) return true;

  // Completed tasks are team-visible
  if (task.status === "COMPLETED") return true;

  // Active assigned private task
  return Boolean(isAssigned);
}

/**
 * Submission Authorization:
 * - User MUST be an active task assignee.
 * - Unassigned admin: CANNOT submit.
 * - Unassigned member: CANNOT submit.
 * - Assigned admin: CAN submit.
 * - Assigned member: CAN submit.
 */
export function canSubmitToTask(user, task, isAssigned = false) {
  if (!user || !task) return false;
  return Boolean(isAssigned);
}

/**
 * Submission Visibility Authorization:
 * - ADMIN: Can view all submissions.
 * - MEMBER: Can view only submissions where they are submittedBy or in submittedFor.
 */
export function canViewSubmission(user, submission) {
  if (!user || !submission) return false;
  if (isAdmin(user)) return true;

  const cleanUserEmail = String(user.email).trim().toLowerCase();
  const cleanSubmittedBy = String(submission.submittedBy || "").trim().toLowerCase();
  const submittedForList = (submission.submittedFor || []).map((e) => String(e).trim().toLowerCase());

  return cleanSubmittedBy === cleanUserEmail || submittedForList.includes(cleanUserEmail);
}

/**
 * Review Authorization:
 * - Only ADMIN can create reviews.
 * - Admin assignment status does not matter (assigned or unassigned admins can review).
 * - Admin CAN review own submission (Self-Review Authorized).
 * - Members CANNOT review.
 */
export function canReviewSubmission(user, submission) {
  if (!user || !submission) return false;
  return isAdmin(user);
}

/**
 * Notification Visibility Authorization:
 * - User can only view notifications targeted to their normalized email.
 */
export function canViewNotification(user, notification) {
  if (!user || !notification) return false;
  const cleanUserEmail = String(user.email).trim().toLowerCase();
  const cleanTargetEmail = String(notification.targetEmail || "").trim().toLowerCase();
  return cleanUserEmail === cleanTargetEmail;
}

/**
 * Task Modification Authorization:
 * - Only ADMIN can edit or delete tasks.
 */
export function canModifyTask(user, task) {
  if (!user || !task) return false;
  return isAdmin(user);
}

/**
 * Task Assignment Authorization:
 * - Only ADMIN can assign tasks to members or other admins.
 */
export function canAssignTask(user, task) {
  if (!user || !task) return false;
  return isAdmin(user);
}
