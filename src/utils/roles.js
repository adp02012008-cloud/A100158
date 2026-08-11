// src/utils/roles.js

export const ADMIN_EMAILS = [
  "dhashaprakasha.cs25@bitsathy.ac.in",
  "harishkarthikkbs.ad25@bitsathy.ac.in",
  "adp02012008@gmail.com",
  "mithunnb.cs25@bitsathy.ac.in",
];

export const SUPER_ADMIN_EMAILS = [
  "adp02012008@gmail.com",
];

export function isSuperAdminEmail(email = "") {
  const clean = normalizeEmail(email);
  return SUPER_ADMIN_EMAILS.map(normalizeEmail).includes(clean);
}

export function normalizeEmail(email = "") {
  return String(email).trim().toLowerCase();
}

export function isAdminEmail(email) {
  return ADMIN_EMAILS.map(normalizeEmail).includes(normalizeEmail(email));
}

export function extractStudentEmails(student) {
  if (!student || typeof student !== "object") return [];
  const emails = [];

  Object.keys(student).forEach((key) => {
    const normKey = key.trim().toLowerCase().replace(/[^a-z]/g, "");
    if (normKey.includes("mail") || normKey.includes("email")) {
      const val = normalizeEmail(student[key]);
      if (val && val.includes("@")) {
        emails.push(val);
      }
    }
  });

  if (emails.length === 0) {
    Object.values(student).forEach((val) => {
      if (typeof val === "string" && val.includes("@")) {
        const cleaned = normalizeEmail(val);
        if (cleaned && !emails.includes(cleaned)) {
          emails.push(cleaned);
        }
      }
    });
  }

  return Array.from(new Set(emails));
}

export function getUserRole(email, students = []) {
  const clean = normalizeEmail(email);
  if (!clean) return "public";

  const found = students.find((s) => extractStudentEmails(s).includes(clean));
  if (found) {
    const r = String(found.ROLE || found.role || "").toUpperCase();
    if (r === "ADMIN" || r === "SYSTEM ADMIN") {
      return "admin";
    }
    return "student";
  }

  if (isAdminEmail(clean)) return "admin";

  return "public";
}

// Given an email and a students array, find the student record that owns the email
export function findStudentByEmail(email, students = []) {
  const clean = normalizeEmail(email);
  return students.find((s) => extractStudentEmails(s).includes(clean)) || null;
}

// Check if a user's email (or any associated email/name for that student) is in the assignedEmails array
export function parseAssignedEmails(raw) {
  if (Array.isArray(raw)) {
    return raw.map(normalizeEmail).filter(Boolean);
  }
  if (!raw || typeof raw !== "string") return [];
  const trimmed = raw.trim();
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map(normalizeEmail).filter(Boolean);
      }
    } catch {
      // Fall through to regex email matching
    }
  }

  const matches = trimmed.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
  if (matches && matches.length > 0) {
    return Array.from(new Set(matches.map(normalizeEmail)));
  }

  return trimmed
    .split(/[\s,;]+/)
    .map(normalizeEmail)
    .filter(Boolean);
}

export function isUserAssignedToTask(userEmail, taskAssignedEmails, students = []) {
  const cleanUser = normalizeEmail(userEmail);
  if (!cleanUser) return false;

  const taskEmails = parseAssignedEmails(taskAssignedEmails);

  // 1. Direct user email match
  if (taskEmails.includes(cleanUser)) return true;

  // 2. Student email alias match (PERSONAL MAIL, BIT MAIL, etc.)
  const student = findStudentByEmail(cleanUser, students);
  if (student) {
    const studentEmails = extractStudentEmails(student);
    if (studentEmails.some((e) => taskEmails.includes(e))) {
      return true;
    }

    // 3. Name match fallback
    const studentName = String(student.Name || "").trim().toLowerCase();
    if (studentName) {
      const rawAssigned = Array.isArray(taskAssignedEmails)
        ? taskAssignedEmails.join(" ").toLowerCase()
        : String(taskAssignedEmails || "").toLowerCase();
      if (rawAssigned.includes(studentName)) {
        return true;
      }
    }
  }

  return false;
}

// Combine students from Sheet1 and configured ADMIN_EMAILS into a single assignable user list
export function getAllAssignableUsers(students = []) {
  const map = new Map();

  // 1. Add students from Sheet1
  students.forEach((st) => {
    const emails = extractStudentEmails(st);
    if (emails.some(isSuperAdminEmail)) return;
    const primaryEmail = emails[0] || "";
    if (!primaryEmail || isSuperAdminEmail(primaryEmail)) return;

    const stRole = String(st.ROLE || st.role || "").toUpperCase();
    const isAdm = isAdminEmail(primaryEmail) || stRole === "ADMIN" || stRole === "SYSTEM ADMIN";

    map.set(primaryEmail, {
      email: primaryEmail,
      name: st.Name || st.name || primaryEmail.split("@")[0],
      role: isAdm ? "Admin" : (st.POSITION || st.position || "Team Member"),
      studentObj: st,
    });
  });

  // 2. Ensure configured ADMIN_EMAILS are selectable even if not in Sheet1 (excluding Super Admin)
  ADMIN_EMAILS.forEach((adminEmail) => {
    const clean = normalizeEmail(adminEmail);
    if (!clean || isSuperAdminEmail(clean)) return;
    if (!map.has(clean)) {
      const name = clean.split("@")[0];
      map.set(clean, {
        email: clean,
        name: `Admin (${name})`,
        role: "System Admin",
        studentObj: null,
      });
    }
  });

  return Array.from(map.values());
}
