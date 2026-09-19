/**
 * NoSQL Injection Sanitization Middleware
 * Recursively strips keys containing MongoDB operators (e.g. "$gt", "$ne", "$where")
 * or prohibited dots from req.body, req.query, and req.params.
 */
function sanitizeObject(obj) {
  if (!obj || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const clean = {};
  for (const key of Object.keys(obj)) {
    // If the key starts with '$' (Mongo operator) or contains '.', strip it
    if (key.startsWith("$") || key.includes(".")) {
      console.warn(`🛡️ [Security] Blocked potential NoSQL injection key: "${key}"`);
      continue;
    }
    clean[key] = sanitizeObject(obj[key]);
  }
  return clean;
}

export function mongoSanitize(req, res, next) {
  try {
    if (req.body) req.body = sanitizeObject(req.body);
    if (req.query) req.query = sanitizeObject(req.query);
    if (req.params) req.params = sanitizeObject(req.params);
  } catch (err) {
    console.warn("⚠️ Mongo sanitization error:", err.message);
  }
  next();
}
