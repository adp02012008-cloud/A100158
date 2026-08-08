import admin from "firebase-admin";
import { User } from "../models/User.js";
import { isAdminEmail } from "../config/adminEmails.js";

let firebaseAdminApp = null;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    firebaseAdminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else if (admin.apps.length > 0) {
    firebaseAdminApp = admin.apps[0];
  }
} catch {
  // Gracefully fallback to REST API token verification if service account key is absent
}

/**
 * Server-side Firebase ID Token Verification Middleware & Identity Attachment
 *
 * Verifies Firebase ID Token via Firebase Admin SDK verifyIdToken() or Identity Toolkit API fallback,
 * normalizes email, queries MongoDB for authoritative role, creates missing user records if needed,
 * and attaches verified user object to req.user.
 */
export async function verifyAuthToken(req, res, next) {
  try {
    let token = "";

    // 1. Extract Bearer token from headers or query/body fallback
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

    let decodedToken = null;

    // 2. Try Firebase Admin SDK verifyIdToken if app is initialized
    if (firebaseAdminApp) {
      try {
        const decoded = await admin.auth().verifyIdToken(token);
        decodedToken = {
          uid: decoded.uid,
          email: (decoded.email || "").trim().toLowerCase(),
          displayName: decoded.name || (decoded.email ? decoded.email.split("@")[0] : "User"),
        };
      } catch (adminErr) {
        console.warn("Firebase Admin verifyIdToken failed, falling back to REST lookup:", adminErr.message);
      }
    }

    // 3. Fallback: Identity Toolkit REST API verification
    if (!decodedToken) {
      try {
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
    }

    const cleanEmail = decodedToken.email.trim().toLowerCase();

    // 4. Find or Upsert MongoDB User record for authoritative role determination
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

    // 5. Attach server-derived, authoritative user identity to request context
    req.user = {
      _id: dbUser._id,
      userId: dbUser.userId,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role.toUpperCase(),
      status: dbUser.status,
      uid: decodedToken.uid,
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
