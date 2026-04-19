// src/utils/api.js
import { auth as firebaseAuth } from "../firebase";

const SHEET_ID = "1vWjwJS8Tmfvhuh84tZyW3rNgW-iKO_tk6QEfZzQV9Jc";
export const STUDENT_URL = `https://opensheet.elk.sh/${SHEET_ID}/Sheet1`;
export const COURSE_URL  = `https://opensheet.elk.sh/${SHEET_ID}/Courses`;
export const POINTS_URL  = `https://opensheet.elk.sh/${SHEET_ID}/points`;
export const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxcDTbCVcWQpxDiOWgMf5JmpiE0NEGIQFOxrrd8Ud_SVV4930-ZIlebh1HY37vQHYg/exec";

async function getIdToken() {
  try {
    const user = firebaseAuth.currentUser;
    if (!user) return "";
    return await user.getIdToken(true);
  } catch (e) {
    console.warn("getIdToken failed:", e.message);
    return "";
  }
}

export async function scriptPost(body) {
  const token   = await getIdToken();
  const payload = { ...body, idToken: token };
  const params  = new URLSearchParams({ data: JSON.stringify(payload) });
  const url     = `${APPS_SCRIPT_URL}?${params.toString()}`;
  try {
    await fetch(url, { method: "GET", mode: "no-cors" });
    return { success: true };
  } catch (err) {
    console.warn("scriptPost error:", err.message);
    return { success: true };
  }
}

export async function scriptGet(action) {
  const res = await fetch(`${APPS_SCRIPT_URL}?action=${action}`);
  return res.json();
}