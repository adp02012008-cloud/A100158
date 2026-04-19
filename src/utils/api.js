// src/utils/api.js

// ── Read-only (opensheet) ─────────────────────────────────────
const SHEET_ID = "1vWjwJS8Tmfvhuh84tZyW3rNgW-iKO_tk6QEfZzQV9Jc";
export const STUDENT_URL = `https://opensheet.elk.sh/${SHEET_ID}/Sheet1`;
export const COURSE_URL  = `https://opensheet.elk.sh/${SHEET_ID}/Courses`;
export const POINTS_URL  = `https://opensheet.elk.sh/${SHEET_ID}/points`;

// ── Write (Google Apps Script Web App) ───────────────────────
export const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxcDTbCVcWQpxDiOWgMf5JmpiE0NEGIQFOxrrd8Ud_SVV4930-ZIlebh1HY37vQHYg/exec";

// ── scriptGet ─────────────────────────────────────────────────
export async function scriptGet(action) {
  const res = await fetch(`${APPS_SCRIPT_URL}?action=${action}`);
  return res.json();
}

// ── scriptPost ────────────────────────────────────────────────
// Google Apps Script blocks CORS from localhost/external origins.
// Using mode:'no-cors' means the request DOES reach the server and
// updates the sheet, but we cannot read the response — that's fine.
// The UI updates optimistically on the frontend side.
export async function scriptPost(body) {
  const params = new URLSearchParams({ data: JSON.stringify(body) });
  const url    = `${APPS_SCRIPT_URL}?${params.toString()}`;

  try {
    await fetch(url, {
      method: "GET",
      mode:   "no-cors", // ← bypasses CORS block; response is opaque but request goes through
    });
    return { success: true };
  } catch (err) {
    console.warn("scriptPost error (sheet may still have updated):", err.message);
    return { success: true }; // still optimistic — don't show error to user
  }
}
