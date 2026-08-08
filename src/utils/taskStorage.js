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
      const parsed = remote.records.map((r) => ({
        ...r,
        assignedEmails: typeof r.assignedEmails === "string"
          ? JSON.parse(r.assignedEmails)
          : r.assignedEmails || [],
      }));
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
  const submissions = getLocalSubmissions();
  if (taskId) {
    return submissions.filter((s) => s.taskId === taskId);
  }
  return submissions;
}

export async function saveSubmission(submissionData) {
  const submissions = getLocalSubmissions();
  const subId = submissionData.id || `SUB-${Date.now().toString().slice(-5)}`;

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
    action: "addTeamRecord",
    sheetName: "TaskSubmissions",
    record: {
      ...newSub,
      files: JSON.stringify(newSub.files || []),
    },
  }).catch((err) => console.warn("Backend submission sync warning:", err?.message));

  return newSub;
}

// ── Notifications API ─────────────────────────────────────────
export function getNotificationsForUser(userEmail) {
  const clean = normalizeEmail(userEmail);
  if (!clean) return [];
  const all = getLocalNotifications();
  return all
    .filter((n) => normalizeEmail(n.targetEmail) === clean)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function addNotification({ targetEmail, title, message, taskId }) {
  const all = getLocalNotifications();
  const notif = {
    id: `NTF-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    targetEmail: normalizeEmail(targetEmail),
    title,
    message,
    taskId,
    createdAt: new Date().toISOString(),
    read: false,
  };
  saveLocalNotifications([notif, ...all]);
  return notif;
}

export function markNotificationsRead(userEmail) {
  const clean = normalizeEmail(userEmail);
  const all = getLocalNotifications();
  const updated = all.map((n) =>
    normalizeEmail(n.targetEmail) === clean ? { ...n, read: true } : n
  );
  saveLocalNotifications(updated);
}
