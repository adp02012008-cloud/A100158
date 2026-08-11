export const ADMIN_EMAILS = [
  "dhashaprakasha.cs25@bitsathy.ac.in",
  "harishkarthikkbs.ad25@bitsathy.ac.in",
  "adp02012008@gmail.com",
];

export const SUPER_ADMIN_EMAILS = [
  "adp02012008@gmail.com",
];

export function isSuperAdminEmail(email = "") {
  const clean = String(email).trim().toLowerCase();
  return SUPER_ADMIN_EMAILS.map((e) => e.trim().toLowerCase()).includes(clean);
}

export function isAdminEmail(email = "") {
  const clean = String(email).trim().toLowerCase();
  return ADMIN_EMAILS.map((e) => e.trim().toLowerCase()).includes(clean);
}

