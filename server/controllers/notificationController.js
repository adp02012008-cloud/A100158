import mongoose from "mongoose";
import { Notification } from "../models/Notification.js";
import { Task } from "../models/Task.js";
import { TaskAssignment } from "../models/TaskAssignment.js";

// Cache last check time per user to avoid database overhead on rapid 5s polling
const lastDeadlineCheckMap = new Map();

async function checkUpcomingDeadlines(user) {
  if (!user || !user._id) return;
  const now = Date.now();
  const lastCheck = lastDeadlineCheckMap.get(String(user._id)) || 0;
  // Check at most once every 60 seconds per user
  if (now - lastCheck < 60000) return;
  lastDeadlineCheckMap.set(String(user._id), now);

  try {
    const activeAssignments = await TaskAssignment.find({
      userId: user._id,
      status: "ACTIVE",
    }).select("taskId").lean();

    if (!activeAssignments.length) return;
    const taskIds = activeAssignments.map((a) => a.taskId);

    const activeTasks = await Task.find({
      taskId: { $in: taskIds },
      status: { $in: ["PENDING", "IN_PROGRESS", "CHANGES_REQUESTED"] },
      dueDate: { $exists: true, $ne: "" },
    }).select("taskId title dueDate domain").lean();

    const userEmail = (user.email || "").toLowerCase().trim();

    for (const task of activeTasks) {
      if (!task.dueDate) continue;
      const dueTime = new Date(task.dueDate).getTime();
      if (isNaN(dueTime)) continue;

      const diffHours = (dueTime - now) / (1000 * 3600);
      // Remind if due within 48 hours and not past due by more than 12 hours
      if (diffHours > -12 && diffHours <= 48) {
        const dateKey = new Date(dueTime).toISOString().split("T")[0];
        const eventKey = `NTF-DEADLINE-${task.taskId}-${user._id}-${dateKey}`;

        const urgencyPrefix = diffHours <= 24 ? "⏰ Due Soon (Under 24h)!" : "⏳ Deadline Approaching";
        const hoursLeftMsg = diffHours > 0 ? `due in ~${Math.round(diffHours)} hours` : "due today";

        await Notification.findOneAndUpdate(
          { eventKey },
          {
            notificationId: `NTF-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            targetUserId: user._id,
            targetEmail: userEmail,
            type: "TASK_DEADLINE_APPROACHING",
            taskId: task.taskId,
            targetPage: "my-tasks",
            referenceId: task.taskId,
            title: `${urgencyPrefix}: "${task.title}"`,
            message: `Task "${task.title}" (${task.domain}) is ${hoursLeftMsg}. Submit your deliverable on time!`,
            eventKey,
            readAt: null,
            createdAt: new Date(),
          },
          { upsert: true, new: true }
        ).exec();
      }
    }
  } catch (err) {
    console.warn("Deadline check warning:", err?.message);
  }
}

/**
 * GET /api/notifications
 * Retrieves unread notifications + read notifications that were read within the last 48 hours.
 * Automatically excludes read notifications older than 48 hours.
 */
export async function getNotifications(req, res) {
  try {
    const user = req.user;
    const cleanEmail = user.email ? user.email.toLowerCase().trim() : null;

    // Run throttled deadline check for active tasks
    await checkUpcomingDeadlines(user);

    // 7-Day Cutoff for Read Notifications (disappears 7 days after viewed)
    const cutoff7d = new Date(Date.now() - 7 * 24 * 3600 * 1000);

    const userFilter = [
      { targetUserId: user._id },
      ...(cleanEmail ? [{ targetEmail: cleanEmail }] : []),
    ];

    const readStateFilter = [
      { readAt: null },
      { readAt: { $gte: cutoff7d } },
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
