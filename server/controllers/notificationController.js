import mongoose from "mongoose";
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

    const userFilter = [
      { targetUserId: user._id },
      ...(cleanEmail ? [{ targetEmail: cleanEmail }] : []),
    ];

    const readStateFilter = [
      { readAt: null },
      { readAt: { $gte: cutoff48h } },
    ];

    const filter = {
      $and: [
        { $or: userFilter },
        { $or: readStateFilter },
      ],
    };

    const rawNotifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .exec();

    // Map read boolean property for clean frontend consumption
    const notifications = rawNotifications.map((n) => {
      const doc = n.toObject();
      doc.read = Boolean(doc.readAt);
      return doc;
    });

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

    const userFilter = [
      { targetUserId: user._id },
      ...(cleanEmail ? [{ targetEmail: cleanEmail }] : []),
    ];

    const isObjId = mongoose.Types.ObjectId.isValid(id);

    const notification = await Notification.findOneAndUpdate(
      {
        $and: [
          { $or: [ ...(isObjId ? [{ _id: id }] : []), { notificationId: id } ] },
          { $or: userFilter },
        ],
      },
      { readAt: new Date() },
      { new: true }
    ).exec();

    if (!notification) return res.status(404).json({ success: false, message: "Notification not found" });

    const doc = notification.toObject();
    doc.read = true;
    return res.json({ success: true, notification: doc });
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

    const userFilter = [
      { targetUserId: user._id },
      ...(cleanEmail ? [{ targetEmail: cleanEmail }] : []),
    ];

    await Notification.updateMany(
      {
        $or: userFilter,
        readAt: null,
      },
      { readAt: new Date() }
    ).exec();

    return res.json({ success: true, message: "All notifications marked as read." });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
