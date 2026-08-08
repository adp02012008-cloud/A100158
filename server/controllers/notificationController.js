import { Notification } from "../models/Notification.js";
import { canViewNotification } from "../utils/authHelpers.js";

/**
 * GET /api/notifications
 * Returns authenticated user's notifications (sorted by createdAt desc).
 */
export async function getNotifications(req, res) {
  try {
    const user = req.user;
    const cleanUserEmail = user.email.toLowerCase();
    const { unreadOnly } = req.query;

    const filter = { targetEmail: cleanUserEmail };
    if (String(unreadOnly) === "true") {
      filter.readAt = null;
    }

    const notifications = await Notification.find(filter).sort({ createdAt: -1 }).exec();

    // User isolation verification
    const authorized = notifications.filter((n) => canViewNotification(user, n));

    return res.status(200).json({ success: true, count: authorized.length, notifications: authorized });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error fetching notifications: " + error.message });
  }
}

/**
 * GET /api/notifications/unread-count
 * Returns exact unread notification count for current user.
 */
export async function getUnreadCount(req, res) {
  try {
    const user = req.user;
    const cleanUserEmail = user.email.toLowerCase();

    const count = await Notification.countDocuments({
      targetEmail: cleanUserEmail,
      readAt: null,
    }).exec();

    return res.status(200).json({ success: true, unreadCount: count });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error counting unread notifications: " + error.message });
  }
}

/**
 * PATCH /api/notifications/:notificationId/read
 * Marks a notification as read (updates readAt timestamp; NEVER deletes document).
 */
export async function markAsRead(req, res) {
  try {
    const user = req.user;
    const { notificationId } = req.params;
    const cleanUserEmail = user.email.toLowerCase();

    const notification = await Notification.findOne({
      notificationId: String(notificationId).trim(),
    }).exec();

    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found." });
    }

    // User isolation check
    if (!canViewNotification(user, notification)) {
      return res.status(403).json({ success: false, message: "Access denied to private notification." });
    }

    if (!notification.readAt) {
      notification.readAt = new Date();
      await notification.save();
    }

    return res.status(200).json({
      success: true,
      message: "Notification marked as read.",
      notification,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error marking notification as read: " + error.message });
  }
}

/**
 * PATCH /api/notifications/read-all
 * Marks all unread notifications for current user as read.
 */
export async function markAllAsRead(req, res) {
  try {
    const user = req.user;
    const cleanUserEmail = user.email.toLowerCase();

    const result = await Notification.updateMany(
      { targetEmail: cleanUserEmail, readAt: null },
      { $set: { readAt: new Date() } }
    ).exec();

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read.",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error marking all notifications read: " + error.message });
  }
}
