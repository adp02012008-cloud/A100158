/**
 * Custom Security Headers Middleware (Zero-dependency Helmet alternative)
 * Applies essential HTTP defensive headers to prevent common web attacks.
 */
export function securityHeaders(req, res, next) {
  // Prevent MIME type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");

  // Prevent clickjacking by denying framing on foreign sites
  res.setHeader("X-Frame-Options", "SAMEORIGIN");

  // Cross-site scripting (XSS) filter for legacy browsers
  res.setHeader("X-XSS-Protection", "1; mode=block");

  // Protect referrer information across domains
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Force HTTPS for all connections (1 year HSTS with subdomains)
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");

  // Permissions Policy: restrict unused browser features
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  // Hide server identity to deter reconnaissance
  res.removeHeader("X-Powered-By");

  next();
}
