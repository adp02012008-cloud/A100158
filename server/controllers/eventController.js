import { TaskEvent } from "../models/TaskEvent.js";

export async function getEvents(req, res) {
  try {
    const { taskId } = req.query;
    const filter = {};
    if (taskId) filter.taskId = taskId;

    const events = await TaskEvent.find(filter).sort({ createdAt: -1 }).populate("taskId actorUserId").exec();
    return res.json({ success: true, events });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
