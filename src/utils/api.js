// src/utils/api.js
import { onAuthStateChanged } from "firebase/auth";
import { Capacitor } from "@capacitor/core";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";
import { auth as firebaseAuth } from "../firebase";

export const API_BASE_URL = import.meta.env.VITE_API_URL || "https://a100158.onrender.com/api";

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
 * Universal Express API Client Wrapper
 * Handles 401 token refresh retry, status code attribution (401, 403, 404, 409, 422, 500),
 * and MongoDB backend API routing.
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
    let errMsg = `API error ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson.message) errMsg = errJson.message;
    } catch {
      // Ignore JSON parse error
    }
    const error = new Error(errMsg);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

/**
 * MongoDB Roster Helper: fetches active user roster from MongoDB backend
 */
export async function fetchSheetData(sheetName = "Sheet1") {
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
    console.warn("Failed to fetch assignable user roster from MongoDB:", err?.message);
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
  if (sheetName === "Hackathons") {
    const res = await apiFetch("/hackathons");
    return res.hackathons || [];
  }
  if (sheetName === "Gallery") {
    const res = await apiFetch("/gallery");
    return res.gallery || [];
  }
  if (sheetName === "Projects") {
    const res = await apiFetch("/projects");
    return res.projects || [];
  }
  if (sheetName === "Certificates") {
    const res = await apiFetch("/certificates");
    return res.certificates || [];
  }
  if (sheetName === "Opportunities") {
    const res = await apiFetch("/opportunities");
    return res.opportunities || [];
  }
  return fetchSheetData(sheetName);
}

export async function addTeamRecord(sheetName, record) {
  const endpointMap = {
    Tasks: "/tasks",
    TaskSubmissions: "/submissions",
    TaskReviews: "/reviews",
    Hackathons: "/hackathons",
    Gallery: "/gallery",
    Projects: "/projects",
    Certificates: "/certificates",
    Opportunities: "/opportunities",
  };
  const ep = endpointMap[sheetName];
  if (ep) {
    return apiFetch(ep, { method: "POST", body: JSON.stringify(record) });
  }
  return { success: true };
}

export async function updateTeamRecord(sheetName, idField, idValue, record) {
  const endpointMap = {
    Tasks: `/tasks/${idValue}`,
    Hackathons: `/hackathons/${idValue}`,
    Gallery: `/gallery/${idValue}`,
    Projects: `/projects/${idValue}`,
    Certificates: `/certificates/${idValue}`,
    Opportunities: `/opportunities/${idValue}`,
  };
  const ep = endpointMap[sheetName];
  if (ep) {
    return apiFetch(ep, { method: "PUT", body: JSON.stringify(record) });
  }
  return { success: true };
}

export async function deleteTeamRecord(sheetName, idField, idValue) {
  const endpointMap = {
    Tasks: `/tasks/${idValue}`,
    Hackathons: `/hackathons/${idValue}`,
    Gallery: `/gallery/${idValue}`,
    Projects: `/projects/${idValue}`,
    Certificates: `/certificates/${idValue}`,
    Opportunities: `/opportunities/${idValue}`,
  };
  const ep = endpointMap[sheetName];
  if (ep) {
    return apiFetch(ep, { method: "DELETE" });
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
