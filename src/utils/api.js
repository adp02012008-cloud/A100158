// src/utils/api.js
import { onAuthStateChanged } from "firebase/auth";
import { Capacitor } from "@capacitor/core";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";
import { auth as firebaseAuth } from "../firebase";

export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const SHEET_ID = "1vWjwJS8Tmfvhuh84tZyW3rNgW-iKO_tk6QEfZzQV9Jc";
export const STUDENT_URL = `https://opensheet.elk.sh/${SHEET_ID}/Sheet1`;
export const COURSE_URL = `https://opensheet.elk.sh/${SHEET_ID}/Courses`;
export const POINTS_URL = `https://opensheet.elk.sh/${SHEET_ID}/points`;

async function waitForFirebaseUser(timeoutMs = 8000) {
  if (firebaseAuth.currentUser) return firebaseAuth.currentUser;

  return new Promise((resolve, reject) => {
    let settled = false;
    let timer;

    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      if (settled || !user) return;
      settled = true;
      if (timer) clearTimeout(timer);
      unsubscribe();
      resolve(user);
    });

    timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      unsubscribe();
      reject(new Error("Your Google sign-in session is not ready. Log out and sign in again."));
    }, timeoutMs);
  });
}

export async function getIdToken(forceRefresh = false) {
  if (Capacitor.isNativePlatform()) {
    try {
      const result = await FirebaseAuthentication.getIdToken();
      if (result?.token) return result.token;
    } catch {
      // Fall back to web SDK
    }
  }

  if (firebaseAuth.currentUser) {
    try {
      return await firebaseAuth.currentUser.getIdToken(forceRefresh);
    } catch {
      return "";
    }
  }

  try {
    const user = await waitForFirebaseUser(2000);
    return user ? await user.getIdToken(forceRefresh) : "";
  } catch {
    return "";
  }
}

/**
 * Universal Node/Express API Client Wrapper with automatic token refresh
 */
export async function apiFetch(endpoint, options = {}, isRetry = false) {
  let token = await getIdToken();

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;

  let response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle Token Expiry / 401 Unauthorized with token force-refresh retry
  if (response.status === 401 && !isRetry) {
    console.warn("Received 401 Unauthorized. Retrying request with refreshed Firebase ID Token...");
    try {
      token = await getIdToken(true);
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
        response = await fetch(url, {
          ...options,
          headers,
        });
      }
    } catch (refreshErr) {
      console.error("Token force-refresh failed:", refreshErr.message);
    }
  }

  if (!response.ok) {
    let errMsg = `Request failed with status ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson.message) errMsg = errJson.message;
    } catch {
      // Ignore JSON parse error on non-JSON response
    }
    throw new Error(errMsg);
  }

  return response.json();
}

/**
 * Backward-compatible helper for user roster lookup mapping to MongoDB backend
 */
export async function fetchSheetData(sheetName = "Sheet1") {
  if (sheetName === "Sheet1" || sheetName === "Users") {
    try {
      const data = await apiFetch("/users/assignable");
      if (Array.isArray(data?.users)) {
        return data.users.map((u) => ({
          "EMAIL ID": u.email,
          "NAME": u.name,
          "ROLE": u.role,
          "GITHUB URL": u.githubUrl || "",
        }));
      }
    } catch (err) {
      console.warn("Failed to fetch assignable roster from MongoDB:", err?.message);
    }
  }

  try {
    const opensheetUrl = `https://opensheet.elk.sh/${SHEET_ID}/${sheetName}`;
    const response = await fetch(opensheetUrl);
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data)) return data;
    }
  } catch {
    // Ignore fallback failure
  }

  return [];
}

export async function listTeamRecords(sheetName) {
  if (sheetName === "Tasks") {
    const res = await apiFetch("/tasks");
    return res.tasks || [];
  }
  if (sheetName === "TaskSubmissions") {
    const res = await apiFetch("/submissions");
    return res.submissions || [];
  }
  if (sheetName === "Notifications") {
    const res = await apiFetch("/notifications");
    return res.notifications || [];
  }
  if (sheetName === "TaskReviews") {
    const res = await apiFetch("/reviews");
    return res.reviews || [];
  }
  return fetchSheetData(sheetName);
}

export async function addTeamRecord(sheetName, record) {
  if (sheetName === "Tasks") {
    return apiFetch("/tasks", { method: "POST", body: JSON.stringify(record) });
  }
  if (sheetName === "TaskSubmissions") {
    return apiFetch("/submissions", { method: "POST", body: JSON.stringify(record) });
  }
  if (sheetName === "TaskReviews") {
    return apiFetch("/reviews", { method: "POST", body: JSON.stringify(record) });
  }
  return { success: true };
}

export async function updateTeamRecord(sheetName, idField, idValue, record) {
  if (sheetName === "Tasks") {
    return apiFetch(`/tasks/${idValue}`, { method: "PUT", body: JSON.stringify(record) });
  }
  return { success: true };
}

export async function deleteTeamRecord(sheetName, idField, idValue) {
  if (sheetName === "Tasks") {
    return apiFetch(`/tasks/${idValue}`, { method: "DELETE" });
  }
  return { success: true };
}

export async function scriptPost(body = {}) {
  const { action, record, taskId, submissionId, decision, feedback } = body;
  if (action === "createTask") {
    return addTeamRecord("Tasks", record);
  }
  if (action === "updateTask") {
    return updateTeamRecord("Tasks", "id", body.idValue || taskId, record);
  }
  if (action === "deleteTask") {
    return deleteTeamRecord("Tasks", "id", body.idValue || taskId);
  }
  if (action === "submitDeliverable") {
    return apiFetch("/submissions", { method: "POST", body: JSON.stringify(record || body) });
  }
  if (action === "createReview") {
    return apiFetch("/reviews", { method: "POST", body: JSON.stringify({ submissionId, decision, feedback }) });
  }
  if (action === "markNotificationsRead") {
    return apiFetch("/notifications/read-all", { method: "PATCH" });
  }
  return { success: true };
}

export async function scriptGet(action, params = {}) {
  if (action === "listTeamRecords") {
    return { success: true, records: await listTeamRecords(params.sheetName) };
  }
  return { success: true };
}
