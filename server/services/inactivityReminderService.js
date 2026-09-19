import { User } from "../models/User.js";
import { Notification } from "../models/Notification.js";
import { sendInactivityReminderEmail } from "./emailService.js";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Scans all active members who haven't logged in for the last 7 days
 * and dispatches reminder emails and in-app notifications.
 */
export async function checkAndSendInactivityReminders() {
  console.log("🔍 [InactivityCheck] Scanning active members for 7-day inactivity...");

  try {
    const now = Date.now();
    const cutoffDate = new Date(now - SEVEN_DAYS_MS);

    // Fetch all active members
    const members = await User.find({
      role: "MEMBER",
      status: "ACTIVE",
    }).exec();

    let remindedCount = 0;
    let skippedCount = 0;
    const errors = [];

    const siteUrl = process.env.APP_URL || process.env.SITE_URL || process.env.VITE_API_URL?.replace("/api", "") || "https://a100158.onrender.com";

    for (const member of members) {
      const email = member.email || member.bitEmail || member.personalEmail;
      if (!email) {
        skippedCount++;
        continue;
      }

      // Determine the member's last active date
      const lastActiveTime = member.lastLogin
        ? new Date(member.lastLogin).getTime()
        : (member.updatedAt ? new Date(member.updatedAt).getTime() : new Date(member.createdAt).getTime());

      // If user has been active within the last 7 days, skip
      if (lastActiveTime > now - SEVEN_DAYS_MS) {
        skippedCount++;
        continue;
      }

      // Check if we already sent a reminder email within the last 7 days to avoid spamming
      if (member.lastInactivityEmailSentAt) {
        const lastSentTime = new Date(member.lastInactivityEmailSentAt).getTime();
        if (now - lastSentTime < SEVEN_DAYS_MS) {
          skippedCount++;
          continue;
        }
      }

      // Dispatch Email
      try {
        console.log(`✉️ [InactivityCheck] Dispatching 7-day reminder to member ${member.name} (${email})...`);
        await sendInactivityReminderEmail({
          email,
          name: member.name,
          siteUrl,
        });

        // Also create In-App Notification (auto-expires in 7 days per notification policy)
        await Notification.create({
          notificationId: `NOTIF-INACT-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          recipientEmail: email.toLowerCase().trim(),
          recipientRole: "MEMBER",
          type: "REMINDER",
          title: "Profile & Course Update Reminder 🚀",
          message: "You haven't logged in during the last 7 days. Please take a moment to update your courses, activity points, and reward points!",
          targetPage: "profile",
          isRead: false,
        });

        // Mark timestamp on user record
        member.lastInactivityEmailSentAt = new Date(now);
        await member.save();

        remindedCount++;
      } catch (err) {
        console.error(`❌ [InactivityCheck] Failed sending reminder to ${email}:`, err.message);
        errors.push({ email, error: err.message });
      }
    }

    console.log(`✅ [InactivityCheck Complete] Total Members: ${members.length} | Reminded: ${remindedCount} | Active/Recently Reminded: ${skippedCount}`);
    return {
      success: true,
      totalMembers: members.length,
      remindedCount,
      skippedCount,
      errors,
    };
  } catch (error) {
    console.error("❌ [InactivityCheck Critical Error]:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Initializes the automated periodic background scheduler.
 * Runs once after a 30s delay on startup, and every 24 hours thereafter.
 */
export function startInactivityReminderScheduler() {
  // Initial run 30 seconds after server boot
  setTimeout(() => {
    checkAndSendInactivityReminders().catch((err) =>
      console.warn("⚠️ Initial inactivity check failed:", err.message)
    );
  }, 30 * 1000);

  // Daily recurring check (every 24 hours)
  setInterval(() => {
    checkAndSendInactivityReminders().catch((err) =>
      console.warn("⚠️ Scheduled inactivity check failed:", err.message)
    );
  }, 24 * 60 * 60 * 1000);

  console.log("🕒 [InactivityScheduler] 7-Day Inactivity Reminder scheduler initialized (Daily cycle).");
}
