// src/utils/roles.js

export const ADMIN_EMAILS = [
  "dhashaprakasha.cs25@bitsathy.ac.in",
  "harishkarthikkbs.ad25@bitsathy.ac.in",
  "adp02012008@gmail.com",
];

export function normalizeEmail(email = "") {
  return String(email).trim().toLowerCase();
}

export function isAdminEmail(email) {
  return ADMIN_EMAILS.map(normalizeEmail).includes(normalizeEmail(email));
}

export function extractStudentEmails(student) {
  return [
    student["PERSONAL MAIL"],
    student["BIT MAIL"],
    student["Personal Mail"],
    student["Bit Mail"],
    student["PERSONALMAIL"],
    student["BITMAIL"],
  ]
    .filter(Boolean)
    .map(normalizeEmail)
    .filter(Boolean);
}

export function getUserRole(email, students = []) {
  const clean = normalizeEmail(email);
  if (!clean) return "public";
  if (isAdminEmail(clean)) return "admin";
  const found = students.some((s) => extractStudentEmails(s).includes(clean));
  return found ? "student" : "public";
}

// Given an email and a students array, find the student record that owns the email
export function findStudentByEmail(email, students = []) {
  const clean = normalizeEmail(email);
  return students.find((s) => extractStudentEmails(s).includes(clean)) || null;
}

// Check if a user's email (or any associated email for that student) is in the assignedEmails array
export function isUserAssignedToTask(userEmail, taskAssignedEmails, students = []) {
  const cleanUser = normalizeEmail(userEmail);
  if (!cleanUser) return false;

  const taskEmails = (taskAssignedEmails || []).map(normalizeEmail);
  if (taskEmails.includes(cleanUser)) return true;

  const student = findStudentByEmail(cleanUser, students);
  if (student) {
    const studentEmails = extractStudentEmails(student);
    if (studentEmails.some((e) => taskEmails.includes(e))) {
      return true;
    }
  }

  return false;
}
