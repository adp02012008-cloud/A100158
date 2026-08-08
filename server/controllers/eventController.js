import { TaskEvent } from "../models/TaskEvent.js";
import { Task } from "../models/Task.js";
import { TaskAssignment } from "../models/TaskAssignment.js";
import { canViewTask } from "../utils/authHelpers.js";

/**
 * GET /api/events
 * Returns append-only task audit events with authorization filtering.
 */
export async function getEvents(req, res) {
  try {
    const user = req.user;
    const { taskId, eventType } = req.query;

    const filter = {};
    if (taskId) filter.taskId = String(taskId).trim();
    if (eventType) filter.eventType = String(eventType).trim().toUpperCase();

    // If specific taskId is provided, perform direct task authorization check
    if (taskId) {
      const task = await Task.findOne({ taskId: String(taskId).trim() }).exec();
      if (!task) {
        return res.status(404).json({ success: false, message: "Task not found." });
      }

      const activeAssignments = await TaskAssignment.find({
        taskId: task.taskId,
        status: "ACTIVE",
      }).exec();

      const isAssigned = activeAssignments.some(
        (a) => a.assigneeEmail.toLowerCase() === user.email.toLowerCase()
      );

      if (!canViewTask(user, task, isAssigned)) {
        return res.status(403).json({ success: false, message: "Access denied to task audit events." });
      }
    }

    const events = await TaskEvent.find(filter).sort({ timestamp: -1 }).exec();

    // Bulk filter events for general query
    if (!taskId && user.role !== "ADMIN") {
      const userEmail = user.email.toLowerCase();
      const activeAssignments = await TaskAssignment.find({
        assigneeEmail: userEmail,
        status: "ACTIVE",
      }).exec();
      const assignedTaskIds = new Set(activeAssignments.map((a) => a.taskId));

      const completedTasks = await Task.find({ status: "COMPLETED" }).exec();
      const completedTaskIds = new Set(completedTasks.map((t) => t.taskId));

      const authorizedEvents = events.filter(
        (e) => assignedTaskIds.has(e.taskId) || completedTaskIds.has(e.taskId)
      );

      return res.status(200).json({ success: true, count: authorizedEvents.length, events: authorizedEvents });
    }

    return res.status(200).json({ success: true, count: events.length, events });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error fetching task events: " + error.message });
  }
}
