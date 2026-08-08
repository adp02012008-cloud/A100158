import { Task } from "../models/Task.js";
import { TaskAssignment } from "../models/TaskAssignment.js";
import { Notification } from "../models/Notification.js";
import { TaskEvent } from "../models/TaskEvent.js";
import { canViewTask, canModifyTask, isAdmin } from "../utils/authHelpers.js";
import { calculateTaskCoverage } from "../utils/coverageEngine.js";

/**
 * GET /api/tasks
 * Returns all tasks authorized for current user (Admins get all; Members get assigned + completed team tasks).
 */
export async function getTasks(req, res) {
  try {
    const user = req.user;
    const allTasks = await Task.find({}).sort({ createdAt: -1 }).exec();

    // Fetch all active assignments for bulk lookup
    const activeAssignments = await TaskAssignment.find({ status: "ACTIVE" }).exec();
    const assignmentMap = {};
    activeAssignments.forEach((asn) => {
      if (!assignmentMap[asn.taskId]) assignmentMap[asn.taskId] = [];
      assignmentMap[asn.taskId].push(asn.assigneeEmail.toLowerCase());
    });

    const userEmail = user.email.toLowerCase();

    // Filter tasks based on authorization rules
    const authorizedTasks = allTasks
      .filter((task) => {
        const assignedEmails = assignmentMap[task.taskId] || [];
        const isAssigned = assignedEmails.includes(userEmail);
        return canViewTask(user, task, isAssigned);
      })
      .map((task) => {
        const doc = task.toObject();
        doc.assignedEmails = assignmentMap[task.taskId] || [];
        return doc;
      });

    return res.status(200).json({ success: true, count: authorizedTasks.length, tasks: authorizedTasks });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error fetching tasks: " + error.message });
  }
}

/**
 * GET /api/tasks/:taskId
 * Returns single task details with direct ID authorization check.
 */
export async function getTaskById(req, res) {
  try {
    const user = req.user;
    const { taskId } = req.params;

    const task = await Task.findOne({ taskId: String(taskId).trim() }).exec();
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found." });
    }

    const activeAssignments = await TaskAssignment.find({ taskId: task.taskId, status: "ACTIVE" }).exec();
    const assignedEmails = activeAssignments.map((a) => a.assigneeEmail.toLowerCase());
    const isAssigned = assignedEmails.includes(user.email.toLowerCase());

    if (!canViewTask(user, task, isAssigned)) {
      return res.status(403).json({ success: false, message: "Access denied. Private task." });
    }

    const doc = task.toObject();
    doc.assignedEmails = assignedEmails;

    return res.status(200).json({ success: true, task: doc });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error fetching task: " + error.message });
  }
}

/**
 * POST /api/tasks
 * Creates a new task (Admin only).
 * createdBy derived 100% server-side from req.user.email.
 */
export async function createTask(req, res) {
  try {
    const user = req.user;
    if (!isAdmin(user)) {
      return res.status(403).json({ success: false, message: "Only admins can create tasks." });
    }

    const { title, domain, description, priority, dueDate, submissionMode, assignedEmails } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: "Task title is required." });
    }
    if (!domain || !domain.trim()) {
      return res.status(400).json({ success: false, message: "Project domain is required." });
    }

    const taskId = `TSK-${Date.now().toString().slice(-6)}`;
    const createdByEmail = user.email.toLowerCase(); // Server-derived identity

    // 1. Create Task document
    const newTask = await Task.create({
      taskId,
      title: title.trim(),
      domain: domain.trim(),
      description: (description || "").trim(),
      priority: priority || "Medium",
      dueDate: dueDate || "",
      submissionMode: submissionMode || "FLEXIBLE",
      status: "PENDING",
      createdBy: createdByEmail,
    });

    // 2. Create TaskAssignments for assigned users
    const rawAssigned = Array.isArray(assignedEmails) ? assignedEmails : [];
    const normalizedAssigned = Array.from(
      new Set(rawAssigned.map((e) => String(e).trim().toLowerCase()).filter(Boolean))
    );

    const createdAssignments = [];
    for (const assigneeEmail of normalizedAssigned) {
      const assignmentId = `ASN-${taskId}-${Math.random().toString(36).substring(2, 6)}`;
      const assignment = await TaskAssignment.create({
        assignmentId,
        taskId,
        assigneeEmail,
        assignedBy: createdByEmail,
        assignedAt: new Date(),
        status: "ACTIVE",
      });
      createdAssignments.push(assignment);

      // Create notification for assignee
      const eventKey = `NTF-ASSIGN-${taskId}-${assigneeEmail}`;
      await Notification.findOneAndUpdate(
        { eventKey },
        {
          notificationId: `NTF-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          targetEmail: assigneeEmail,
          type: "TASK_ASSIGNED",
          taskId,
          title: "New Task Assigned 🎯",
          message: `You were assigned to task "${newTask.title}" (${newTask.domain}).`,
          eventKey,
          readAt: null,
          createdAt: new Date(),
        },
        { upsert: true, new: true }
      ).exec();
    }

    // 3. Create TaskEvent log
    await TaskEvent.create({
      eventId: `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      taskId,
      actorEmail: createdByEmail,
      eventType: "TASK_CREATED",
      details: { title: newTask.title, domain: newTask.domain, assignedCount: normalizedAssigned.length },
    });

    const doc = newTask.toObject();
    doc.assignedEmails = normalizedAssigned;

    return res.status(201).json({ success: true, message: "Task created successfully.", task: doc });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error creating task: " + error.message });
  }
}

/**
 * PUT /api/tasks/:taskId
 * Updates an existing task and its assignments (Admin only).
 */
export async function updateTask(req, res) {
  try {
    const user = req.user;
    const { taskId } = req.params;

    const task = await Task.findOne({ taskId: String(taskId).trim() }).exec();
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found." });
    }

    if (!canModifyTask(user, task)) {
      return res.status(403).json({ success: false, message: "Only admins can edit tasks." });
    }

    const { title, domain, description, priority, dueDate, submissionMode, status, assignedEmails } = req.body;

    if (title) task.title = title.trim();
    if (domain) task.domain = domain.trim();
    if (description !== undefined) task.description = description.trim();
    if (priority) task.priority = priority;
    if (dueDate !== undefined) task.dueDate = dueDate;
    if (submissionMode) task.submissionMode = submissionMode;
    if (status) task.status = status.toUpperCase();

    await task.save();

    // Assignment updates if provided
    let finalAssignedEmails = [];
    if (Array.isArray(assignedEmails)) {
      const targetEmails = Array.from(
        new Set(assignedEmails.map((e) => String(e).trim().toLowerCase()).filter(Boolean))
      );

      const currentAssignments = await TaskAssignment.find({ taskId: task.taskId }).exec();
      const activeMap = new Map();
      currentAssignments.forEach((asn) => {
        if (asn.status === "ACTIVE") {
          activeMap.set(asn.assigneeEmail.toLowerCase(), asn);
        }
      });

      const actorEmail = user.email.toLowerCase();

      // Handle additions
      for (const email of targetEmails) {
        if (!activeMap.has(email)) {
          // Check if previous REMOVED assignment exists to reactivate or create new
          const existingRemoved = currentAssignments.find(
            (asn) => asn.assigneeEmail.toLowerCase() === email && asn.status === "REMOVED"
          );

          if (existingRemoved) {
            existingRemoved.status = "ACTIVE";
            existingRemoved.assignedBy = actorEmail;
            existingRemoved.assignedAt = new Date();
            existingRemoved.removedAt = null;
            await existingRemoved.save();
          } else {
            const assignmentId = `ASN-${task.taskId}-${Math.random().toString(36).substring(2, 6)}`;
            await TaskAssignment.create({
              assignmentId,
              taskId: task.taskId,
              assigneeEmail: email,
              assignedBy: actorEmail,
              assignedAt: new Date(),
              status: "ACTIVE",
            });
          }

          // Notify new assignee
          const eventKey = `NTF-ASSIGN-${task.taskId}-${email}-${Date.now()}`;
          await Notification.create({
            notificationId: `NTF-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            targetEmail: email,
            type: "TASK_ASSIGNED",
            taskId: task.taskId,
            title: "Task Assignment Updated 📌",
            message: `You were assigned to "${task.title}".`,
            eventKey,
            readAt: null,
          });
        }
      }

      // Handle removals
      for (const [email, asn] of activeMap.entries()) {
        if (!targetEmails.includes(email)) {
          asn.status = "REMOVED";
          asn.removedAt = new Date();
          await asn.save();
        }
      }

      finalAssignedEmails = targetEmails;
    } else {
      const activeAssignments = await TaskAssignment.find({ taskId: task.taskId, status: "ACTIVE" }).exec();
      finalAssignedEmails = activeAssignments.map((a) => a.assigneeEmail.toLowerCase());
    }

    // Log update event
    await TaskEvent.create({
      eventId: `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      taskId: task.taskId,
      actorEmail: user.email.toLowerCase(),
      eventType: "TASK_UPDATED",
      details: { title: task.title, status: task.status },
    });

    // Recalculate coverage and completion state after assignment changes
    await calculateTaskCoverage(task.taskId);

    const doc = task.toObject();
    doc.assignedEmails = finalAssignedEmails;

    return res.status(200).json({ success: true, message: "Task updated successfully.", task: doc });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error updating task: " + error.message });
  }
}

/**
 * DELETE /api/tasks/:taskId
 * Deletes a task (Admin only).
 */
export async function deleteTask(req, res) {
  try {
    const user = req.user;
    const { taskId } = req.params;

    const task = await Task.findOne({ taskId: String(taskId).trim() }).exec();
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found." });
    }

    if (!canModifyTask(user, task)) {
      return res.status(403).json({ success: false, message: "Only admins can delete tasks." });
    }

    await Task.deleteOne({ taskId: task.taskId }).exec();

    await TaskEvent.create({
      eventId: `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      taskId: task.taskId,
      actorEmail: user.email.toLowerCase(),
      eventType: "TASK_DELETED",
      details: { title: task.title },
    });

    return res.status(200).json({ success: true, message: "Task deleted successfully." });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error deleting task: " + error.message });
  }
}

/**
 * GET /api/tasks/:taskId/coverage
 * Returns the coverage breakdown object for a task.
 */
export async function getTaskCoverage(req, res) {
  try {
    const { taskId } = req.params;
    const coverage = await calculateTaskCoverage(taskId);
    return res.status(200).json({ success: true, coverage });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error calculating task coverage: " + error.message });
  }
}
