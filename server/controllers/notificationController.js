import { Notification } from "../models/Notification.js";

export async function getNotifications(req, res) {
  try {
    const notifications = await Notification.find({ targetUserId: req.user._id })
      .sort({ createdAt: -1 })
      .exec();
    return res.json({ success: true, notifications });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function markNotificationRead(req, res) {
  try {
    const { id } = req.params;
    const notification = await Notification.findOneAndUpdate(
      { _id: id, targetUserId: req.user._id },
      { readAt: new Date() },
      { new: true }
    );
    if (!notification) return res.status(404).json({ success: false, message: "Notification not found" });
    return res.json({ success: true, notification });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function markAllNotificationsRead(req, res) {
  try {
    await Notification.updateMany({ targetUserId: req.user._id, readAt: null }, { readAt: new Date() });
    return res.json({ success: true, message: "All notifications marked as read." });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
