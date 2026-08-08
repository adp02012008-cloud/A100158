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
        read: r.read === "true" || r.read === true,
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

export async function addNotification({ targetEmail, title, message, taskId }) {
  const cleanTarget = normalizeEmail(targetEmail);
  if (!cleanTarget) return null;

  const notif = {
    id: `NTF-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    targetEmail: cleanTarget,
    title,
    message,
    taskId: taskId || "",
    createdAt: new Date().toISOString(),
    read: false,
  };

  await scriptPost({
    action: "addTeamRecord",
    sheetName: "Notifications",
    idField: "id",
    idValue: notif.id,
    record: notif,
  });

  return notif;
}

export async function markNotificationsRead(userEmail = "") {
  const clean = normalizeEmail(userEmail);
  const all = getLocalNotifications(clean);
  const unread = all.filter((n) => !n.read);

  for (const n of unread) {
    const readNotif = { ...n, read: true };
    await scriptPost({
      action: "updateTeamRecord",
      sheetName: "Notifications",
      idField: "id",
      idValue: n.id,
      record: readNotif,
    });
  }

  const updated = all.map((n) => ({ ...n, read: true }));
  saveLocalNotifications(updated, clean);
  return updated;
}

// ── Task Management API ───────────────────────────────────────
export async function getTasks(userEmail = "") {
  try {
    const remote = await scriptGet("listTeamRecords", { sheetName: "Tasks" });
    if (Array.isArray(remote?.records)) {
      const parsed = remote.records.map((r) => ({
        ...r,
        assignedEmails: parseAssignedEmails(r.assignedEmails),
      }));
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
    createdAt: taskData.createdAt || now,
    updatedAt: now,
    status: taskData.status || "Pending",
  };

  // 1. Await backend confirmation first
  await scriptPost({
    action: isEdit ? "updateTeamRecord" : "addTeamRecord",
    sheetName: "Tasks",
    idField: "id",
    idValue: taskId,
    record: {
      ...updatedTask,
      assignedEmails: updatedTask.assignedEmails.join(", "),
    },
  });

  // 2. Notify assigned members
  for (const email of updatedTask.assignedEmails) {
    try {
      await addNotification({
        targetEmail: email,
        title: isEdit ? "Task Updated 📌" : "New Task Assigned! 🎯",
        message: `You were ${isEdit ? "updated on" : "assigned to"} "${updatedTask.title}" (${updatedTask.domain || "General"}).`,
        taskId: taskId,
      });
    } catch (e) {
      console.warn("Notification delivery warning:", e?.message);
    }
  }

  return getTasks(userEmail);
}

export async function deleteTask(taskId, userEmail = "") {
  await scriptPost({
    action: "deleteTeamRecord",
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
        return {
          ...r,
          files: Array.isArray(files) ? files : [],
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

export async function saveSubmission(subData, userEmail = "") {
  const isEdit = Boolean(subData.id);
  const subId = subData.id || `SUB-${Date.now().toString().slice(-5)}`;
  const now = new Date().toISOString();

  const newSub = {
    ...subData,
    id: subId,
    studentEmail: normalizeEmail(subData.studentEmail),
    submittedAt: subData.submittedAt || now,
    status: subData.status || "Submitted",
  };

  // Await backend write confirmation first
  await scriptPost({
    action: isEdit ? "updateTeamRecord" : "addTeamRecord",
    sheetName: "TaskSubmissions",
    idField: "id",
    idValue: subId,
    record: {
      ...newSub,
      files: JSON.stringify(newSub.files || []),
    },
  });

  return getSubmissions(userEmail);
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
