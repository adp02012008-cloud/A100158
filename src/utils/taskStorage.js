// src/utils/taskStorage.js
import { apiFetch } from "./api";
import { normalizeEmail, parseAssignedEmails } from "./roles";

// ── User-Scoped LocalStorage Fallback Helpers ─────────────────
function getScopedKey(prefix, userEmail) {
  const clean = normalizeEmail(userEmail);
  return clean ? `bugslayers_${prefix}_${clean}` : `bugslayers_${prefix}_anon`;
}

export function getLocalTasks(userEmail = "") {
  try {
    const key = getScopedKey("tasks", userEmail);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.map((t) => ({ ...t, assignedEmails: parseAssignedEmails(t.assignedEmails) }))
      : [];
  } catch {
    return [];
  }
}

export function saveLocalTasks(tasks, userEmail = "") {
  try {
    const key = getScopedKey("tasks", userEmail);
    localStorage.setItem(key, JSON.stringify(tasks));
  } catch (err) {
    console.error("Error saving local tasks:", err);
  }
}

export function getLocalSubmissions(userEmail = "") {
  try {
    const key = getScopedKey("submissions", userEmail);
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalSubmissions(submissions, userEmail = "") {
  try {
    const key = getScopedKey("submissions", userEmail);
    localStorage.setItem(key, JSON.stringify(submissions));
  } catch (err) {
    console.error("Error saving local submissions:", err);
  }
}

export function getLocalNotifications(userEmail = "") {
  try {
    const key = getScopedKey("notifications", userEmail);
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalNotifications(notifications, userEmail = "") {
  try {
    const key = getScopedKey("notifications", userEmail);
    localStorage.setItem(key, JSON.stringify(notifications));
  } catch (err) {
    console.error("Error saving local notifications:", err);
  }
}

// ── Notifications API (Node/Express Backend) ──────────────────
export async function getNotificationsForUser(userEmail = "") {
  const clean = normalizeEmail(userEmail);
  if (!clean) return [];

  const cutoff48h = Date.now() - 48 * 3600 * 1000;

  try {
    const data = await apiFetch("/notifications");
    if (Array.isArray(data?.notifications)) {
      const parsed = data.notifications
        .filter((n) => !n.readAt || new Date(n.readAt).getTime() >= cutoff48h)
        .map((n) => ({
          ...n,
          id: n.notificationId || n._id,
          read: Boolean(n.readAt),
        }));
      saveLocalNotifications(parsed, clean);
      return parsed;
    }
    saveLocalNotifications([], clean);
    return [];
  } catch (err) {
    console.warn("Using local notifications cache fallback due to network error:", err?.message);
  }

  const local = getLocalNotifications(clean);
  return local
    .filter((n) => !n.readAt || new Date(n.readAt).getTime() >= cutoff48h)
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

export async function markSingleNotificationRead(notificationId, userEmail = "") {
  const clean = normalizeEmail(userEmail);
  try {
    await apiFetch(`/notifications/${notificationId}/read`, { method: "PATCH" });
  } catch (err) {
    console.warn("Failed to sync single mark-read to backend:", err?.message);
  }

  const all = getLocalNotifications(clean);
  const now = new Date().toISOString();
  const updated = all.map((n) =>
    (n.id === notificationId || n.notificationId === notificationId)
      ? { ...n, readAt: n.readAt || now, read: true }
      : n
  );
  saveLocalNotifications(updated, clean);
  return updated;
}

export async function markNotificationRead(notificationId, userEmail = "") {
  return markSingleNotificationRead(notificationId, userEmail);
}

export async function markNotificationsRead(userEmail = "") {
  const clean = normalizeEmail(userEmail);
  try {
    await apiFetch("/notifications/read-all", { method: "PATCH" });
  } catch (err) {
    console.warn("Failed to sync mark-all-read to backend:", err?.message);
  }

  const all = getLocalNotifications(clean);
  const now = new Date().toISOString();
  const updated = all.map((n) => ({ ...n, readAt: n.readAt || now, read: true }));
  saveLocalNotifications(updated, clean);
  return updated;
}

export async function markAllNotificationsRead(userEmail = "") {
  return markNotificationsRead(userEmail);
}

// ── Task Management API (Node/Express Backend) ────────────────
export async function getTasks(userEmail = "") {
  const clean = normalizeEmail(userEmail);
  try {
    const data = await apiFetch("/tasks");
    if (Array.isArray(data?.tasks)) {
      const parsed = data.tasks.map((t) => ({
        ...t,
        id: t.taskId,
        assignedEmails: parseAssignedEmails(t.assignedEmails),
      }));
      // Successful backend response replaces local cache
      saveLocalTasks(parsed, clean);
      return parsed;
    }
    saveLocalTasks([], clean);
    return [];
  } catch (err) {
    console.warn("Using local tasks cache fallback due to error:", err?.message);
  }
  return getLocalTasks(clean);
}

export async function saveTask(taskData, userEmail = "") {
  const isEdit = Boolean(taskData.id || taskData.taskId);
  const taskId = taskData.id || taskData.taskId;

  const payload = {
    title: taskData.title,
    domain: taskData.domain,
    description: taskData.description || "",
    priority: taskData.priority || "Medium",
    dueDate: taskData.dueDate || "",
    submissionMode: taskData.submissionMode || "FLEXIBLE",
    status: taskData.status || "PENDING",
    assignedEmails: parseAssignedEmails(taskData.assignedEmails),
  };

  const endpoint = isEdit ? `/tasks/${taskId}` : "/tasks";
  const method = isEdit ? "PUT" : "POST";

  const res = await apiFetch(endpoint, {
    method,
    body: JSON.stringify(payload),
  });

  return res?.task ? { ...res.task, id: res.task.taskId } : getTasks(userEmail);
}

export async function deleteTask(taskId, userEmail = "") {
  const clean = normalizeEmail(userEmail);
  await apiFetch(`/tasks/${taskId}`, { method: "DELETE" });

  try {
    const localSubs = getLocalSubmissions(clean);
    const filteredSubs = localSubs.filter((s) => String(s.taskId) !== String(taskId));
    saveLocalSubmissions(filteredSubs, clean);
  } catch {
    // ignore
  }

  return getTasks(userEmail);
}

// ── Deliverables & Submissions API (Node/Express Backend) ─────
export async function getSubmissions(userEmail = "") {
  const clean = normalizeEmail(userEmail);
  try {
    const data = await apiFetch("/submissions");
    if (Array.isArray(data?.submissions)) {
      const parsed = data.submissions.map((s) => ({
        ...s,
        id: s.submissionId,
      }));
      saveLocalSubmissions(parsed, clean);
      return parsed;
    }
    saveLocalSubmissions([], clean);
    return [];
  } catch (err) {
    console.warn("Using local submissions cache fallback due to error:", err?.message);
  }
  return getLocalSubmissions(clean);
}

export async function submitDeliverable(subData) {
  const payload = {
    taskId: subData.taskId || subData.id,
    githubUrl: subData.githubUrl || "",
    demoUrl: subData.demoUrl || "",
    notes: subData.notes || "",
    files: subData.files || [],
    submitForAll: Boolean(subData.submitForAll),
    submissionGroupId: subData.submissionGroupId,
  };

  return apiFetch("/submissions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function saveSubmission(subData, userEmail = "") {
  return submitDeliverable(subData, userEmail);
}

// ── Reviews API (Node/Express Backend) ────────────────────────
export async function getReviews() {
  try {
    const data = await apiFetch("/reviews");
    return Array.isArray(data?.reviews) ? data.reviews : [];
  } catch (err) {
    console.warn("Failed to fetch task reviews:", err?.message);
  }
  return [];
}

export async function createReview(reviewData) {
  return apiFetch("/reviews", {
    method: "POST",
    body: JSON.stringify({
      submissionId: reviewData.submissionId,
      decision: reviewData.decision,
      feedback: reviewData.feedback || "",
    }),
  });
}

// ── Assignable User Roster API (Node/Express Backend) ─────────
export async function getAssignableUsers() {
  try {
    const data = await apiFetch("/users/assignable");
    return Array.isArray(data?.users) ? data.users : [];
  } catch (err) {
    console.warn("Failed to fetch assignable user roster:", err?.message);
    return [];
  }
}

export function clearUserCache() {
  try {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("bugslayers_")) {
        localStorage.removeItem(key);
      }
    });
  } catch (err) {
    console.warn("Failed to clear local user cache:", err);
  }
}
