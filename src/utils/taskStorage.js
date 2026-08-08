// src/utils/taskStorage.js
import { scriptGet, scriptPost } from "./api";
import { normalizeEmail } from "./roles";

const TASKS_KEY = "bugslayers_tasks_v1";
const SUBMISSIONS_KEY = "bugslayers_submissions_v1";
const NOTIFICATIONS_KEY = "bugslayers_notifications_v1";

// ── Default Sample Initial Tasks ──────────────────────────────
const DEFAULT_TASKS = [
  {
    id: "TSK-101",
    title: "AI Chatbot & LLM Integration",
    domain: "Agentic AI & LLM Optimization",
    description: "Develop a domain-aware RAG pipeline and connect it with the student portal assistant.",
    priority: "High",
    dueDate: "2026-08-20",
    assignedEmails: ["dhashaprakasha.cs25@bitsathy.ac.in", "harishkarthikkbs.ad25@bitsathy.ac.in"],
    createdBy: "adp02012008@gmail.com",
    createdAt: new Date().toISOString(),
    status: "In Progress",
  },
  {
    id: "TSK-102",
    title: "Cloud Infrastructure Setup & CI/CD",
    domain: "DevOps and IT Infra",
    description: "Configure GitHub Actions workflow for automated testing and Capacitor Android APK build.",
    priority: "Medium",
    dueDate: "2026-08-25",
    assignedEmails: ["haris12768@gmail.com", "vishal02oct2007@gmail.com"],
    createdBy: "adp02012008@gmail.com",
    createdAt: new Date().toISOString(),
    status: "Pending",
  },
];

// ── Local Storage Helpers ─────────────────────────────────────
export function getLocalTasks() {
  try {
    const raw = localStorage.getItem(TASKS_KEY);
    if (!raw) {
      localStorage.setItem(TASKS_KEY, JSON.stringify(DEFAULT_TASKS));
      return DEFAULT_TASKS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_TASKS;
  }
}

export function saveLocalTasks(tasks) {
  try {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  } catch (err) {
    console.error("Error saving local tasks:", err);
  }
}

export function getLocalSubmissions() {
  try {
    const raw = localStorage.getItem(SUBMISSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalSubmissions(submissions) {
  try {
    localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(submissions));
  } catch (err) {
    console.error("Error saving local submissions:", err);
  }
}

export function getLocalNotifications() {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalNotifications(notifications) {
  try {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
  } catch (err) {
    console.error("Error saving local notifications:", err);
  }
}

// ── Task Management API ───────────────────────────────────────
export async function getTasks() {
  let local = getLocalTasks();
  try {
    const remote = await scriptGet("listTeamRecords", { sheetName: "Tasks" });
    if (Array.isArray(remote?.records) && remote.records.length > 0) {
      const parsed = remote.records.map((r) => {
        let assigned = r.assignedEmails;
        if (typeof assigned === "string") {
          try {
            assigned = JSON.parse(assigned);
          } catch {
            assigned = assigned ? [assigned] : [];
          }
        }
        return {
          ...r,
          assignedEmails: Array.isArray(assigned)
            ? assigned.map(normalizeEmail)
            : [],
        };
      });
      saveLocalTasks(parsed);
      return parsed;
    }
  } catch (err) {
    console.warn("Using local tasks cache:", err?.message);
  }
  return local;
}

export async function saveTask(taskData) {
  const tasks = getLocalTasks();
  const isEdit = Boolean(taskData.id);
  const taskId = taskData.id || `TSK-${Date.now().toString().slice(-4)}`;
  
  const now = new Date().toISOString();
  const updatedTask = {
    ...taskData,
    id: taskId,
    assignedEmails: (taskData.assignedEmails || []).map(normalizeEmail),
    createdAt: taskData.createdAt || now,
    updatedAt: now,
    status: taskData.status || "Pending",
  };

  const nextTasks = isEdit
    ? tasks.map((t) => (t.id === taskId ? updatedTask : t))
    : [updatedTask, ...tasks];

  saveLocalTasks(nextTasks);

  // Notify assigned members
  updatedTask.assignedEmails.forEach((email) => {
    addNotification({
      targetEmail: email,
      title: isEdit ? "Task Updated 📌" : "New Task Assigned! 🎯",
      message: `You were ${isEdit ? "updated on" : "assigned to"} "${updatedTask.title}" (${updatedTask.domain}).`,
      taskId: taskId,
    });
  });

  // Sync to backend sheet asynchronously
  scriptPost({
    action: isEdit ? "updateTeamRecord" : "addTeamRecord",
    sheetName: "Tasks",
    idField: "id",
    idValue: taskId,
    record: {
      ...updatedTask,
      assignedEmails: JSON.stringify(updatedTask.assignedEmails),
    },
  }).catch((err) => console.warn("Backend task sync warning:", err?.message));

  return updatedTask;
}

export async function deleteTask(taskId) {
  const tasks = getLocalTasks().filter((t) => t.id !== taskId);
  saveLocalTasks(tasks);

  scriptPost({
    action: "deleteTeamRecord",
    sheetName: "Tasks",
    idField: "id",
    idValue: taskId,
  }).catch((err) => console.warn("Backend task deletion warning:", err?.message));
}

// ── Deliverables & Submissions API ────────────────────────────
export async function getSubmissions(taskId = null) {
  let local = getLocalSubmissions();
  try {
    const remote = await scriptGet("listTeamRecords", { sheetName: "TaskSubmissions" });
    if (Array.isArray(remote?.records) && remote.records.length > 0) {
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
      saveLocalSubmissions(parsed);
      local = parsed;
    }
  } catch (err) {
    console.warn("Using local submissions cache:", err?.message);
  }

  if (taskId) {
    return local.filter((s) => s.taskId === taskId);
  }
  return local;
}

export async function saveSubmission(submissionData) {
  const submissions = getLocalSubmissions();
  const subId = submissionData.id || `SUB-${Date.now().toString().slice(-5)}`;
  const isEdit = Boolean(submissions.some((s) => s.id === subId));

  const newSub = {
    ...submissionData,
    id: subId,
    studentEmail: normalizeEmail(submissionData.studentEmail),
    submittedAt: new Date().toISOString(),
    status: submissionData.status || "Submitted",
  };

  const nextSubmissions = [newSub, ...submissions.filter((s) => s.id !== subId)];
  saveLocalSubmissions(nextSubmissions);

  // Update parent task status to In Progress / Submitted
  const tasks = getLocalTasks();
  const parentTask = tasks.find((t) => t.id === newSub.taskId);
  if (parentTask) {
    saveTask({
      ...parentTask,
      status: newSub.status === "Completed" ? "Completed" : "In Progress",
    });

    // Notify task creator/admin
    if (parentTask.createdBy) {
      addNotification({
        targetEmail: parentTask.createdBy,
        title: "Deliverable Submitted 📥",
        message: `${newSub.studentName || newSub.studentEmail} submitted work for "${parentTask.title}".`,
        taskId: parentTask.id,
      });
    }
  }

  // Sync to backend sheet
  scriptPost({
    action: isEdit ? "updateTeamRecord" : "addTeamRecord",
    sheetName: "TaskSubmissions",
    idField: "id",
    idValue: subId,
    record: {
      ...newSub,
      files: JSON.stringify(newSub.files || []),
    },
  }).catch((err) => console.warn("Backend submission sync warning:", err?.message));

  return newSub;
}

// ── Notifications API ─────────────────────────────────────────
export async function syncNotificationsRemote() {
  try {
    const remote = await scriptGet("listTeamRecords", { sheetName: "Notifications" });
    if (Array.isArray(remote?.records) && remote.records.length > 0) {
      const parsed = remote.records.map((r) => ({
        ...r,
        read: r.read === "true" || r.read === true,
      }));
      const existing = getLocalNotifications();
      const map = new Map();
      existing.forEach((item) => map.set(item.id, item));
      parsed.forEach((item) => map.set(item.id, { ...map.get(item.id), ...item }));
      const merged = Array.from(map.values());
      saveLocalNotifications(merged);
      return merged;
    }
  } catch (err) {
    console.warn("Using local notifications cache:", err?.message);
  }
  return getLocalNotifications();
}

export function getNotificationsForUser(userEmail) {
  const clean = normalizeEmail(userEmail);
  if (!clean) return [];

  // Trigger remote background sync
  syncNotificationsRemote().catch(() => {});

  const tasks = getLocalTasks();
  const allNotifs = getLocalNotifications();
  const notifIds = new Set(allNotifs.map((n) => n.id));
  const notifTaskKeys = new Set(
    allNotifs.map((n) => `${normalizeEmail(n.targetEmail)}_${n.taskId}_${n.title}`)
  );

  let addedNew = false;
  tasks.forEach((t) => {
    const assigned = (t.assignedEmails || []).map(normalizeEmail);
    if (assigned.includes(clean)) {
      const key = `${clean}_${t.id}_New Task Assigned! 🎯`;
      if (!notifTaskKeys.has(key)) {
        const derivedId = `NTF-${t.id}-${clean.replace(/[^a-zA-Z0-9]/g, "")}`;
        if (!notifIds.has(derivedId)) {
          const derived = {
            id: derivedId,
            targetEmail: clean,
            title: "New Task Assigned! 🎯",
            message: `You were assigned to "${t.title}" (${t.domain || "General"}).`,
            taskId: t.id,
            createdAt: t.createdAt || new Date().toISOString(),
            read: false,
          };
          allNotifs.unshift(derived);
          notifTaskKeys.add(key);
          notifIds.add(derivedId);
          addedNew = true;
        }
      }
    }
  });

  if (addedNew) {
    saveLocalNotifications(allNotifs);
  }

  return allNotifs
    .filter((n) => normalizeEmail(n.targetEmail) === clean)
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

export function addNotification({ targetEmail, title, message, taskId }) {
  const cleanTarget = normalizeEmail(targetEmail);
  if (!cleanTarget) return null;

  const all = getLocalNotifications();
  const notif = {
    id: `NTF-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    targetEmail: cleanTarget,
    title,
    message,
    taskId: taskId || "",
    createdAt: new Date().toISOString(),
    read: false,
  };

  const updated = [notif, ...all.filter((item) => item.id !== notif.id)];
  saveLocalNotifications(updated);

  scriptPost({
    action: "addTeamRecord",
    sheetName: "Notifications",
    idField: "id",
    idValue: notif.id,
    record: notif,
  }).catch((err) => console.warn("Backend notification sync warning:", err?.message));

  return notif;
}

export function markNotificationsRead(userEmail) {
  const clean = normalizeEmail(userEmail);
  const all = getLocalNotifications();
  const updated = all.map((n) => {
    if (normalizeEmail(n.targetEmail) === clean && !n.read) {
      const readNotif = { ...n, read: true };
      scriptPost({
        action: "updateTeamRecord",
        sheetName: "Notifications",
        idField: "id",
        idValue: n.id,
        record: readNotif,
      }).catch(() => {});
      return readNotif;
    }
    return n;
  });
  saveLocalNotifications(updated);
}
