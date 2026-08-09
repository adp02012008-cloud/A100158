import { Notification } from "../models/Notification.js";

/**
 * GET /api/notifications
 * Retrieves unread notifications + read notifications that were read within the last 48 hours.
 * Automatically excludes read notifications older than 48 hours.
 */
export async function getNotifications(req, res) {
  try {
    const user = req.user;
    const cleanEmail = user.email ? user.email.toLowerCase().trim() : null;

    // 48-Hour Cutoff for Read Notifications
    const cutoff48h = new Date(Date.now() - 48 * 3600 * 1000);

    const filter = {
      $or: [
        { targetUserId: user._id },
        ...(cleanEmail ? [{ targetEmail: cleanEmail }] : []),
      ],
      $or: [
        { readAt: null },
        { readAt: { $gte: cutoff48h } },
      ],
    };

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .exec();

    return res.json({ success: true, count: notifications.length, notifications });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * PATCH /api/notifications/:id/read
 * Marks a single notification as read for the authenticated user.
 */
export async function markNotificationRead(req, res) {
  try {
    const { id } = req.params;
    const user = req.user;
    const cleanEmail = user.email ? user.email.toLowerCase().trim() : null;

    const notification = await Notification.findOneAndUpdate(
      {
        $or: [{ _id: id }, { notificationId: id }],
        $or: [
          { targetUserId: user._id },
          ...(cleanEmail ? [{ targetEmail: cleanEmail }] : []),
        ],
      },
      { readAt: new Date() },
      { new: true }
    ).exec();

    if (!notification) return res.status(404).json({ success: false, message: "Notification not found" });
    return res.json({ success: true, notification });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * PATCH /api/notifications/read-all
 * Marks all unread notifications as read for the authenticated user.
 */
export async function markAllNotificationsRead(req, res) {
  try {
    const user = req.user;
    const cleanEmail = user.email ? user.email.toLowerCase().trim() : null;

    await Notification.updateMany(
      {
        $or: [
          { targetUserId: user._id },
          ...(cleanEmail ? [{ targetEmail: cleanEmail }] : []),
        ],
        readAt: null,
      },
      { readAt: new Date() }
    ).exec();

    return res.json({ success: true, message: "All notifications marked as read." });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
