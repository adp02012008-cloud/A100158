import express from "express";
import { verifyAuthToken } from "../middleware/authMiddleware.js";
import { getNotifications, markNotificationRead, markAllNotificationsRead } from "../controllers/notificationController.js";
import { checkAndSendInactivityReminders } from "../services/inactivityReminderService.js";
import { strictRateLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

router.use(verifyAuthToken);

router.get("/", getNotifications);
router.patch("/read-all", markAllNotificationsRead);
router.patch("/:id/read", markNotificationRead);

// Admin-triggered 7-day inactivity email & notification scan (rate-limited)
router.post("/trigger-inactivity-reminders", strictRateLimiter, async (req, res) => {
  try {
    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Admin access required." });
    }
    const result = await checkAndSendInactivityReminders();
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
