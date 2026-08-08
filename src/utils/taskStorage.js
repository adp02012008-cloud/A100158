// src/utils/taskStorage.js
import { scriptGet, scriptPost } from "./api";
import { normalizeEmail, parseAssignedEmails } from "./roles";

// ── User-Scoped LocalStorage Helpers ──────────────────────────
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

// ── Notifications API ─────────────────────────────────────────
export async function getNotificationsForUser(userEmail = "") {
  const clean = normalizeEmail(userEmail);
  if (!clean) return [];

  try {
    const remote = await scriptGet("listTeamRecords", { sheetName: "Notifications" });
    if (Array.isArray(remote?.records)) {
      const parsed = remote.records.map((r) => ({
        ...r,
        read: Boolean(r.readAt),
      }));
      saveLocalNotifications(parsed, clean);
      return parsed.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }
  } catch (err) {
    console.warn("Using local notifications cache fallback:", err?.message);
  }

  const local = getLocalNotifications(clean);
  return local.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

export async function markNotificationsRead(userEmail = "") {
  const clean = normalizeEmail(userEmail);
  const now = new Date().toISOString();

  await scriptPost({
    action: "markNotificationsRead",
  });

  const all = getLocalNotifications(clean);
  const updated = all.map((n) => ({ ...n, readAt: n.readAt || now, read: true }));
  saveLocalNotifications(updated, clean);
  return updated;
}

// ── Task Management API ───────────────────────────────────────
export async function getTasks(userEmail = "") {
  try {
    const [tasksRes, assignmentsRes] = await Promise.all([
      scriptGet("listTeamRecords", { sheetName: "Tasks" }),
      scriptGet("listTeamRecords", { sheetName: "TaskAssignments" }).catch(() => ({ records: [] })),
    ]);

    if (Array.isArray(tasksRes?.records)) {
      const assignments = Array.isArray(assignmentsRes?.records) ? assignmentsRes.records : [];
      const assignmentMap = {};
      assignments.forEach((a) => {
        if (a.status !== "REMOVED") {
          if (!assignmentMap[a.taskId]) assignmentMap[a.taskId] = [];
          assignmentMap[a.taskId].push(a.assigneeEmail);
        }
      });

      const parsed = tasksRes.records.map((r) => {
        const assigned = assignmentMap[r.id] || parseAssignedEmails(r.assignedEmails);
        return {
          ...r,
          assignedEmails: assigned,
        };
      });

      saveLocalTasks(parsed, userEmail);
      return parsed;
    }
  } catch (err) {
    console.warn("Using local tasks cache fallback due to error:", err?.message);
  }
  return getLocalTasks(userEmail);
}

export async function saveTask(taskData, userEmail = "") {
  const isEdit = Boolean(taskData.id);
  const taskId = taskData.id || `TSK-${Date.now().toString().slice(-4)}`;
  
  const now = new Date().toISOString();
  const updatedTask = {
    ...taskData,
    id: taskId,
    assignedEmails: parseAssignedEmails(taskData.assignedEmails),
    submissionMode: taskData.submissionMode || "FLEXIBLE",
    createdAt: taskData.createdAt || now,
    updatedAt: now,
    status: taskData.status || "PENDING",
  };

  const response = await scriptPost({
    action: isEdit ? "updateTask" : "createTask",
    sheetName: "Tasks",
    idField: "id",
    idValue: taskId,
    record: {
      ...updatedTask,
      assignedEmails: updatedTask.assignedEmails.join(", "),
    },
  });

  return response?.task || getTasks(userEmail);
}

export async function deleteTask(taskId, userEmail = "") {
  await scriptPost({
    action: "deleteTask",
    sheetName: "Tasks",
    idField: "id",
    idValue: taskId,
  });
  return getTasks(userEmail);
}

// ── Deliverables & Submissions API ────────────────────────────
export async function getSubmissions(userEmail = "") {
  try {
    const remote = await scriptGet("listTeamRecords", { sheetName: "TaskSubmissions" });
    if (Array.isArray(remote?.records)) {
      const parsed = remote.records.map((r) => {
        let files = r.files;
        if (typeof files === "string") {
          try {
            files = JSON.parse(files);
          } catch {
            files = [];
          }
        }
        let submittedFor = r.submittedFor;
        if (typeof submittedFor === "string") {
          try {
            submittedFor = JSON.parse(submittedFor);
          } catch {
            submittedFor = [r.submittedBy];
          }
        }
        return {
          ...r,
          files: Array.isArray(files) ? files : [],
          submittedFor: Array.isArray(submittedFor) ? submittedFor : [r.submittedBy],
        };
      });
      saveLocalSubmissions(parsed, userEmail);
      return parsed;
    }
  } catch (err) {
    console.warn("Using local submissions cache fallback due to error:", err?.message);
  }
  return getLocalSubmissions(userEmail);
}

export async function submitDeliverable(subData, userEmail = "") {
  const response = await scriptPost({
    action: "submitDeliverable",
    taskId: subData.taskId,
    submitForAll: Boolean(subData.submitForAll),
    record: subData,
  });

  return response;
}

export async function saveSubmission(subData, userEmail = "") {
  return submitDeliverable(subData, userEmail);
}

// ── Reviews API ───────────────────────────────────────────────
export async function getReviews(userEmail = "") {
  try {
    const remote = await scriptGet("listTeamRecords", { sheetName: "TaskReviews" });
    if (Array.isArray(remote?.records)) {
      return remote.records;
    }
  } catch (err) {
    console.warn("Failed to fetch task reviews:", err?.message);
  }
  return [];
}

export async function createReview(reviewData, userEmail = "") {
  const response = await scriptPost({
    action: "createReview",
    submissionId: reviewData.submissionId,
    decision: reviewData.decision,
    feedback: reviewData.feedback || "",
  });

  return response;
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
