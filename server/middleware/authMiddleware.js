import { User } from "../models/User.js";
import { isAdminEmail } from "../config/adminEmails.js";

/**
 * Server-side Firebase ID Token Verification Middleware & Identity Attachment
 *
 * Verifies Firebase ID Token, normalizes email, queries MongoDB for authoritative role,
 * creates missing user records if needed, and attaches verified user object to req.user.
 */
export async function verifyAuthToken(req, res, next) {
  try {
    let token = "";

    // 1. Extract Bearer token from headers
    if (req.headers && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split("Bearer ")[1].trim();
    } else if (req.query && req.query.token) {
      token = req.query.token;
    } else if (req.body && req.body.token) {
      token = req.body.token;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: "Authentication required. Missing token." });
    }

    // 2. Decode/Verify Firebase Token
    // We attempt verification via Firebase Admin SDK if initialized, or via Firebase Identity Toolkit REST endpoint
    let decodedToken = null;

    try {
      // Identity Toolkit REST API verification (fallback/standalone)
      const apiKey = process.env.FIREBASE_WEB_API_KEY || "AIzaSyA-IZJElov16omfcApWpfWEVNA-F8ILX78";
      const lookupUrl = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`;

      const response = await fetch(lookupUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: token }),
      });

      if (!response.ok) {
        throw new Error("Invalid or expired Firebase ID token.");
      }

      const data = await response.json();
      const fbUser = data?.users?.[0];
      if (!fbUser || !fbUser.email) {
        throw new Error("Could not resolve authenticated user identity from Firebase token.");
      }

      decodedToken = {
        uid: fbUser.localId,
        email: fbUser.email.trim().toLowerCase(),
        displayName: fbUser.displayName || fbUser.email.split("@")[0],
      };
    } catch (err) {
      return res.status(401).json({ success: false, message: "Authentication failed: " + err.message });
    }

    const cleanEmail = decodedToken.email.trim().toLowerCase();

    // 3. Find or Upsert MongoDB User record for authoritative role determination
    let dbUser = await User.findOne({ email: cleanEmail }).exec();

    if (!dbUser) {
      const initialRole = isAdminEmail(cleanEmail) ? "ADMIN" : "MEMBER";
      dbUser = await User.create({
        userId: `USR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        email: cleanEmail,
        name: decodedToken.displayName || cleanEmail.split("@")[0],
        role: initialRole,
        status: "ACTIVE",
      });
    }

    if (dbUser.status !== "ACTIVE") {
      return res.status(403).json({ success: false, message: "Account is inactive. Access denied." });
    }

    // 4. Attach server-derived, authoritative user identity to request context
    req.user = {
      _id: dbUser._id,
      userId: dbUser.userId,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role.toUpperCase(),
      status: dbUser.status,
    };

    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal Auth Error: " + error.message });
  }
}

/**
 * Middleware: Require ADMIN role
 */
export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "ADMIN") {
    return res.status(403).json({ success: false, message: "Access denied. Admin role required." });
  }
  next();
}
