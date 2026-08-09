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
  // Fallback to REST API token verification
}

/**
 * Authoritative Server-side Firebase Authentication Middleware
 *
 * Verifies Firebase ID Token, extracts firebaseUid, resolves authoritative User document by firebaseUid,
 * and attaches server-derived req.user context.
 */
export async function verifyAuthToken(req, res, next) {
  try {
    let token = "";

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

    if (firebaseAdminApp) {
      try {
        const decoded = await admin.auth().verifyIdToken(token);
        decodedToken = {
          uid: decoded.uid,
          email: (decoded.email || "").trim().toLowerCase(),
          displayName: decoded.name || (decoded.email ? decoded.email.split("@")[0] : "User"),
        };
      } catch (adminErr) {
        console.warn("Firebase Admin verifyIdToken failed, using REST lookup fallback:", adminErr.message);
      }
    }

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
        if (!fbUser || !fbUser.localId) {
          throw new Error("Could not resolve authenticated identity from Firebase token.");
        }

        decodedToken = {
          uid: fbUser.localId,
          email: (fbUser.email || "").trim().toLowerCase(),
          displayName: fbUser.displayName || (fbUser.email ? fbUser.email.split("@")[0] : "User"),
        };
      } catch (err) {
        return res.status(401).json({ success: false, message: "Authentication failed: " + err.message });
      }
    }

    const firebaseUid = decodedToken.uid;
    const cleanEmail = decodedToken.email;

    // Resolve user by firebaseUid first, then email fallback
    let dbUser = await User.findOne({ firebaseUid }).exec();

    if (!dbUser && cleanEmail) {
      dbUser = await User.findOne({ email: cleanEmail }).exec();
      if (dbUser) {
        // Link firebaseUid to existing user record
        dbUser.firebaseUid = firebaseUid;
        await dbUser.save();
      }
    }

    if (!dbUser && cleanEmail) {
      const initialRole = isAdminEmail(cleanEmail) ? "ADMIN" : "MEMBER";
      dbUser = await User.create({
        userId: `USR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        firebaseUid,
        email: cleanEmail,
        name: decodedToken.displayName || cleanEmail.split("@")[0],
        role: initialRole,
        status: "ACTIVE",
      });
    }

    if (!dbUser) {
      return res.status(401).json({ success: false, message: "Could not resolve user identity in database." });
    }

    if (dbUser.status !== "ACTIVE") {
      return res.status(403).json({ success: false, message: "Account is inactive. Access denied." });
    }

    req.user = {
      _id: dbUser._id,
      userId: dbUser.userId,
      firebaseUid: dbUser.firebaseUid,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role.toUpperCase(),
      status: dbUser.status,
      clusterId: dbUser.clusterId,
    };

    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal Auth Error: " + error.message });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "ADMIN") {
    return res.status(403).json({ success: false, message: "Access denied. Admin role required." });
  }
  next();
}
