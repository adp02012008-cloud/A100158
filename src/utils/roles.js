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
