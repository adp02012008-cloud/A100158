export const ADMIN_EMAILS = [
  "dhashaprakasha.cs25@bitsathy.ac.in",
  "harishkarthikkbs.ad25@bitsathy.ac.in",
  "adp02012008@gmail.com",
];

export function isAdminEmail(email = "") {
  const clean = String(email).trim().toLowerCase();
  return ADMIN_EMAILS.map((e) => e.trim().toLowerCase()).includes(clean);
}
