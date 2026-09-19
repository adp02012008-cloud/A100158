// src/utils/api.js - Production Render API integration
import { onAuthStateChanged } from "firebase/auth";
import { auth as firebaseAuth } from "../firebase";

export function getApiBaseUrl() {
  const envUrl = (import.meta.env.VITE_API_URL || "").trim();
  const isLocalhost =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname.startsWith("192.168.") ||
      window.location.hostname.endsWith(".local"));

  if (!isLocalhost) {
    if (!envUrl || envUrl.includes("localhost")) {
      return "https://a100158.onrender.com/api";
    }
  }

  return envUrl || "https://a100158.onrender.com/api";
}

export const API_BASE_URL = getApiBaseUrl();

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

// In-memory SWR (Stale-While-Revalidate) Cache & In-Flight Request Deduplication
const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const apiCache = new Map();
const inFlightRequests = new Map();

/**
 * Synchronously retrieves cached data for an endpoint if present and unexpired.
 */
export function getCachedApi(endpoint) {
  const cached = apiCache.get(endpoint);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > cached.ttl) {
    apiCache.delete(endpoint);
    return null;
  }
  return cached.data;
}

/**
 * Manually updates the cache for an endpoint.
 */
export function setCachedApi(endpoint, data, ttlMs = DEFAULT_CACHE_TTL_MS) {
  apiCache.set(endpoint, {
    data,
    timestamp: Date.now(),
    ttl: ttlMs,
  });
}

/**
 * Invalidates cached API responses by exact key, prefix, or regex.
 */
export function invalidateApiCache(pattern = null) {
  if (!pattern) {
    apiCache.clear();
    return;
  }
  for (const key of apiCache.keys()) {
    if (typeof pattern === "string" && key.includes(pattern)) {
      apiCache.delete(key);
    } else if (pattern instanceof RegExp && pattern.test(key)) {
      apiCache.delete(key);
    }
  }
}

/**
 * Low-priority background prefetcher for API endpoints.
 */
export function prefetchApi(endpoint, options = {}) {
  // If already in cache and fresh within 1 minute, don't refetch
  const cached = apiCache.get(endpoint);
  if (cached && Date.now() - cached.timestamp < 60 * 1000) {
    return Promise.resolve(cached.data);
  }
  return apiFetch(endpoint, { ...options, background: true }).catch(() => null);
}

/**
 * Universal Express API Client Wrapper with SWR Caching & Deduplication
 */
export async function apiFetch(endpoint, options = {}, isRetry = false) {
  const method = (options.method || "GET").toUpperCase();
  const isGet = method === "GET";
  const bypassCache = Boolean(options.bypassCache);

  // Return cached result immediately for GET requests if available
  if (isGet && !bypassCache) {
    const cached = apiCache.get(endpoint);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      // If cached data is older than 30s, trigger a silent background revalidation
      if (Date.now() - cached.timestamp > 30 * 1000 && !inFlightRequests.has(endpoint)) {
        apiFetch(endpoint, { ...options, bypassCache: true }).catch(() => {});
      }
      return cached.data;
    }
  }

  // Deduplicate identical in-flight GET requests
  if (isGet && inFlightRequests.has(endpoint)) {
    return inFlightRequests.get(endpoint);
  }

  const fetchPromise = (async () => {
    let token = await getIdToken();

    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const baseUrl = getApiBaseUrl();
    const url = endpoint.startsWith("http") ? endpoint : `${baseUrl}${endpoint}`;

    let body = options.body;
    if (body && typeof body === "object" && !(body instanceof FormData) && !(body instanceof Blob)) {
      body = JSON.stringify(body);
    }

    let response = await fetch(url, {
      ...options,
      headers,
      body,
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

    const data = await response.json();

    // Cache successful GET requests
    if (isGet) {
      apiCache.set(endpoint, {
        data,
        timestamp: Date.now(),
        ttl: options.cacheTtlMs || DEFAULT_CACHE_TTL_MS,
      });
    } else {
      // Invalidate relevant caches on mutation
      const cleanEndpoint = endpoint.split("?")[0].replace(/\/[0-9a-fA-F]{24}$/, "");
      invalidateApiCache(cleanEndpoint);
      if (cleanEndpoint.includes("task") || cleanEndpoint.includes("submission") || cleanEndpoint.includes("review")) {
        invalidateApiCache("/tasks");
        invalidateApiCache("/submissions");
        invalidateApiCache("/reviews");
      }
      if (cleanEndpoint.includes("cluster") || cleanEndpoint.includes("user")) {
        invalidateApiCache("/users");
        invalidateApiCache("/clusters");
      }
      if (cleanEndpoint.includes("course")) {
        invalidateApiCache("/courses");
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("bugslayers-cache-invalidated", { detail: { endpoint } }));
      }
    }

    return data;
  })();

  if (isGet) {
    inFlightRequests.set(endpoint, fetchPromise);
    fetchPromise.finally(() => {
      inFlightRequests.delete(endpoint);
    });
  }

  return fetchPromise;
}


/**
 * MongoDB Roster Helper: fetches active user roster from MongoDB backend
 */
export async function fetchSheetData(sheetName = "Sheet1") {
  try {
    const data = await apiFetch("/users/dashboard");
    if (Array.isArray(data?.users) && data.users.length > 0) {
      return data.users.map((u) => ({
        "EMAIL ID": u.email,
        "NAME": u.Name || u.name,
        "ROLE": u.ROLE || u.role || "MEMBER",
        "GITHUB URL": u.GITHUB || u.github || u.githubUrl || "",
        "ENROLMENT NUMBER": u["ENROLMENT NUMBER"] || u.enrolmentNumber || "",
        "POSITION": u.POSITION || u.position || "Member",
        "CLUSTER": u.CLUSTER || u.clusterName || "Core",
        avatar: u.avatar || u.photoURL || "",
      }));
    }
  } catch (err) {
    console.warn("Failed to fetch user dashboard roster from MongoDB:", err?.message);
  }

  try {
    const data = await apiFetch("/users/assignable");
    if (Array.isArray(data?.users)) {
      return data.users.map((u) => ({
        "EMAIL ID": u.email,
        "NAME": u.name,
        "ROLE": u.rawRole || u.role || "MEMBER",
        "GITHUB URL": u.githubUrl || "",
        "ENROLMENT NUMBER": u.enrolmentNumber || "",
        "POSITION": u.position || "Member",
        avatar: u.avatar || u.photoURL || "",
      }));
    }
  } catch (assignableErr) {
    console.warn("Failed to fetch assignable user roster from MongoDB:", assignableErr?.message);
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

export function getCachedTeamRecords(sheetName) {
  const endpointMap = {
    Tasks: "/tasks",
    TaskSubmissions: "/submissions",
    Notifications: "/notifications",
    TaskReviews: "/reviews",
    Hackathons: "/hackathons",
    Gallery: "/gallery",
    Projects: "/projects",
    Certificates: "/certificates",
    Opportunities: "/opportunities",
  };
  const ep = endpointMap[sheetName];
  if (!ep) return null;
  const cached = getCachedApi(ep);
  if (!cached) return null;
  const key = sheetName.toLowerCase();
  return cached[key] || cached.tasks || cached.submissions || cached.notifications || cached.reviews || cached.hackathons || cached.gallery || cached.projects || cached.certificates || cached.opportunities || null;
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

export async function fetchMyProfile() {
  return await apiFetch("/users/me");
}

export async function updateMyProfile(payload) {
  return await apiFetch("/users/me", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

