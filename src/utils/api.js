// src/utils/api.js
import { onAuthStateChanged } from "firebase/auth";
import { auth as firebaseAuth } from "../firebase";

// Existing read-only sheets used by Dashboard and Leaderboard.
const SHEET_ID = "1vWjwJS8Tmfvhuh84tZyW3rNgW-iKO_tk6QEfZzQV9Jc";
export const STUDENT_URL = `https://opensheet.elk.sh/${SHEET_ID}/Sheet1`;
export const COURSE_URL = `https://opensheet.elk.sh/${SHEET_ID}/Courses`;
export const POINTS_URL = `https://opensheet.elk.sh/${SHEET_ID}/points`;

// Paste the Apps Script Web App URL ending with /exec.
export const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxcDTbCVcWQpxDiOWgMf5JmpiE0NEGIQFOxrrd8Ud_SVV4930-ZIlebh1HY37vQHYg/exec";

function assertConfigured() {
  if (!APPS_SCRIPT_URL.startsWith("https://script.google.com/macros/s/")) {
    throw new Error(
      "Google Apps Script is not configured. Paste the Web App /exec URL in src/utils/api.js."
    );
  }
}

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
      reject(
        new Error(
          "Your Google sign-in session is not ready. Log out and sign in again."
        )
      );
    }, timeoutMs);
  });
}

async function getIdToken() {
  const user = await waitForFirebaseUser();
  return user.getIdToken();
}

export async function scriptGet(action, params = {}) {
  assertConfigured();
  const token = await getIdToken();

  const query = new URLSearchParams({
    action,
    token,
    ...Object.fromEntries(
      Object.entries(params).filter(
        ([, value]) => value !== undefined && value !== null
      )
    ),
  });

  const response = await fetch(`${APPS_SCRIPT_URL}?${query.toString()}`, {
    method: "GET",
    redirect: "follow",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}.`);
  }

  const data = await response.json();
  if (!data.success) throw new Error(data.message || "Request failed.");
  return data;
}

// text/plain avoids a CORS preflight. Apps Script POST responses can be opaque,
// therefore every page refreshes its records after a write.
export async function scriptPost(body) {
  assertConfigured();
  const token = await getIdToken();

  await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ ...body, token }),
  });

  return { success: true };
}

export async function listTeamRecords(sheetName) {
  const result = await scriptGet("listTeamRecords", { sheetName });
  return Array.isArray(result.records) ? result.records : [];
}

export async function addTeamRecord(sheetName, record) {
  return scriptPost({ action: "addTeamRecord", sheetName, record });
}

export async function updateTeamRecord(
  sheetName,
  idField,
  idValue,
  record
) {
  return scriptPost({
    action: "updateTeamRecord",
    sheetName,
    idField,
    idValue,
    record,
  });
}

export async function deleteTeamRecord(sheetName, idField, idValue) {
  return scriptPost({
    action: "deleteTeamRecord",
    sheetName,
    idField,
    idValue,
  });
}
