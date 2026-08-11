import { Task } from "../models/Task.js";
import { TaskAssignment } from "../models/TaskAssignment.js";
import { TaskSubmission } from "../models/TaskSubmission.js";
import { TaskReview } from "../models/TaskReview.js";
import { Notification } from "../models/Notification.js";
import { TaskEvent } from "../models/TaskEvent.js";
import { User } from "../models/User.js";
import { canViewTask, canModifyTask, isAdmin } from "../utils/authHelpers.js";
import { calculateTaskCoverage } from "../utils/coverageEngine.js";
import { withTransaction } from "../utils/dbTransaction.js";
import { findTaskByIdOrKey } from "../services/taskStateService.js";

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
 * Creates a new task and assigns workers (Admin only) inside a MongoDB Transaction.
 */
export async function createTask(req, res) {
  try {
    const result = await withTransaction(async (session) => {
      const user = req.user;
      if (!isAdmin(user)) {
        return { statusCode: 403, body: { success: false, message: "Only admins can create tasks." } };
      }

      const { title, domain, description, priority, dueDate, submissionMode, assignedEmails } = req.body;

      if (!title || !title.trim()) {
        return { statusCode: 400, body: { success: false, message: "Task title is required." } };
      }
      if (!domain || !domain.trim()) {
        return { statusCode: 400, body: { success: false, message: "Project domain is required." } };
      }

      const taskId = `TSK-${Date.now().toString().slice(-6)}`;
      const createdByEmail = user.email.toLowerCase();
      const queryOpts = session ? { session } : {};

      // 1. Create Task document inside transaction
      const [newTask] = await Task.create(
        [
          {
            taskId,
            title: title.trim(),
            domain: domain.trim(),
            description: (description || "").trim(),
            priority: priority || "Medium",
            dueDate: dueDate || "",
            submissionMode: submissionMode || "FLEXIBLE",
            status: "PENDING",
            createdBy: user._id,
          },
        ],
        queryOpts
      );

      // 2. Validate assignedEmails against active User records in MongoDB
      const rawAssigned = Array.isArray(assignedEmails) ? assignedEmails : [];
      const normalizedAssigned = Array.from(
        new Set(rawAssigned.map((e) => String(e).trim().toLowerCase()).filter(Boolean))
      );

      let validUsers = [];
      if (normalizedAssigned.length > 0) {
        validUsers = await User.find(
          {
            email: { $in: normalizedAssigned },
            status: "ACTIVE",
          },
          null,
          queryOpts
        ).exec();
        const validUserEmails = new Set(validUsers.map((u) => u.email.toLowerCase()));

        const invalidEmails = normalizedAssigned.filter((e) => !validUserEmails.has(e));
        if (invalidEmails.length > 0) {
          return {
            statusCode: 400,
            body: {
              success: false,
              message: `Cannot assign nonexistent or inactive user(s): ${invalidEmails.join(", ")}`,
            },
          };
        }
      }

      const createdAssignments = [];
      for (const assigneeEmail of normalizedAssigned) {
        const assigneeUser = validUsers.find((u) => u.email.toLowerCase() === assigneeEmail);
        const assignmentId = `ASN-${taskId}-${Math.random().toString(36).substring(2, 6)}`;
        const [assignment] = await TaskAssignment.create(
          [
            {
              assignmentId,
              taskId,
              userId: assigneeUser ? assigneeUser._id : user._id,
              assigneeEmail,
              assignedBy: user._id,
              assignedAt: new Date(),
              status: "ACTIVE",
            },
          ],
          queryOpts
        );
        createdAssignments.push(assignment);

        // Create notification for assignee
        const eventKey = `NTF-ASSIGN-${taskId}-${assigneeEmail}`;
        await Notification.findOneAndUpdate(
          { eventKey },
          {
            notificationId: `NTF-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            targetUserId: assigneeUser ? assigneeUser._id : null,
            targetEmail: assigneeEmail,
            type: "TASK_ASSIGNED",
            taskId,
            title: "New Task Assigned 🎯",
            message: `You were assigned to task "${newTask.title}" (${newTask.domain}).`,
            eventKey,
            readAt: null,
            createdAt: new Date(),
          },
          { upsert: true, new: true, ...queryOpts }
        ).exec();
      }

      // 3. Create TaskEvent log inside transaction
      await TaskEvent.create(
        [
          {
            eventId: `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            taskId,
            actorEmail: createdByEmail,
            eventType: "TASK_CREATED",
            details: { title: newTask.title, domain: newTask.domain, assignedCount: normalizedAssigned.length },
          },
        ],
        queryOpts
      );

      const doc = newTask.toObject();
      doc.assignedEmails = normalizedAssigned;

      return { statusCode: 201, body: { success: true, message: "Task created successfully.", task: doc } };
    });

    return res.status(result.statusCode).json(result.body);
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error creating task: " + error.message });
  }
}

/**
 * PUT /api/tasks/:taskId
 * Updates an existing task and its assignments (Admin only) inside a MongoDB Transaction.
 */
export async function updateTask(req, res) {
  try {
    const result = await withTransaction(async (session) => {
      const user = req.user;
      const { taskId } = req.params;
      const queryOpts = session ? { session } : {};

      const task = await Task.findOne({ taskId: String(taskId).trim() }, null, queryOpts).exec();
      if (!task) {
        return { statusCode: 404, body: { success: false, message: "Task not found." } };
      }

      if (!canModifyTask(user, task)) {
        return { statusCode: 403, body: { success: false, message: "Only admins can edit tasks." } };
      }

      const { title, domain, description, priority, dueDate, submissionMode, status, assignedEmails } = req.body;

      if (title) task.title = title.trim();
      if (domain) task.domain = domain.trim();
      if (description !== undefined) task.description = description.trim();
      if (priority) task.priority = priority;
      if (dueDate !== undefined) task.dueDate = dueDate;
      if (submissionMode) task.submissionMode = submissionMode;

      // Backend controls COMPLETED and UNDER_REVIEW statuses via coverage engine
      if (status) {
        const cleanStatus = status.toUpperCase().trim();
        if (cleanStatus !== "COMPLETED" && cleanStatus !== "UNDER_REVIEW") {
          task.status = cleanStatus;
        }
      }

      await task.save(queryOpts);

      // Assignment updates if provided
      let finalAssignedEmails = [];
      if (Array.isArray(assignedEmails)) {
        const targetEmails = Array.from(
          new Set(assignedEmails.map((e) => String(e).trim().toLowerCase()).filter(Boolean))
        );

        // Validate targetEmails against active User records in MongoDB
        if (targetEmails.length > 0) {
          const validUsers = await User.find(
            {
              email: { $in: targetEmails },
              status: "ACTIVE",
            },
            null,
            queryOpts
          ).exec();
          const validUserEmails = new Set(validUsers.map((u) => u.email.toLowerCase()));

          const invalidEmails = targetEmails.filter((e) => !validUserEmails.has(e));
          if (invalidEmails.length > 0) {
            return {
              statusCode: 400,
              body: {
                success: false,
                message: `Cannot assign nonexistent or inactive user(s): ${invalidEmails.join(", ")}`,
              },
            };
          }
        }

        const currentAssignments = await TaskAssignment.find({ taskId: task.taskId }, null, queryOpts).exec();
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
            const existingRemoved = currentAssignments.find(
              (asn) => asn.assigneeEmail.toLowerCase() === email && asn.status === "REMOVED"
            );

            if (existingRemoved) {
              existingRemoved.status = "ACTIVE";
              existingRemoved.assignedBy = user._id;
              existingRemoved.assignedAt = new Date();
              existingRemoved.removedAt = null;
              await existingRemoved.save(queryOpts);
            } else {
              const assigneeUser = validUsers.find((u) => u.email.toLowerCase() === email);
              const assignmentId = `ASN-${task.taskId}-${Math.random().toString(36).substring(2, 6)}`;
              await TaskAssignment.create(
                [
                  {
                    assignmentId,
                    taskId: task.taskId,
                    userId: assigneeUser ? assigneeUser._id : user._id,
                    assigneeEmail: email,
                    assignedBy: user._id,
                    assignedAt: new Date(),
                    status: "ACTIVE",
                  },
                ],
                queryOpts
              );
            }

            // Log ASSIGNMENT_ADDED TaskEvent inside transaction
            await TaskEvent.create(
              [
                {
                  eventId: `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                  taskId: task.taskId,
                  actorEmail: actorEmail,
                  eventType: "ASSIGNMENT_ADDED",
                  details: { assigneeEmail: email },
                },
              ],
              queryOpts
            );

            // Notify new assignee
            const eventKey = `NTF-ASSIGN-${task.taskId}-${email}-${Date.now()}`;
            await Notification.create(
              [
                {
                  notificationId: `NTF-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                  targetEmail: email,
                  type: "TASK_ASSIGNED",
                  taskId: task.taskId,
                  title: "Task Assignment Updated 📌",
                  message: `You were assigned to "${task.title}".`,
                  eventKey,
                  readAt: null,
                },
              ],
              queryOpts
            );
          }
        }

        // Handle removals (mark REMOVED, preserve history)
        for (const [email, asn] of activeMap.entries()) {
          if (!targetEmails.includes(email)) {
            asn.status = "REMOVED";
            asn.removedAt = new Date();
            await asn.save(queryOpts);

            // Log ASSIGNMENT_REMOVED TaskEvent inside transaction
            await TaskEvent.create(
              [
                {
                  eventId: `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                  taskId: task.taskId,
                  actorEmail: actorEmail,
                  eventType: "ASSIGNMENT_REMOVED",
                  details: { assigneeEmail: email },
                },
              ],
              queryOpts
            );
          }
        }

        finalAssignedEmails = targetEmails;
      } else {
        const activeAssignments = await TaskAssignment.find({ taskId: task.taskId, status: "ACTIVE" }, null, queryOpts).exec();
        finalAssignedEmails = activeAssignments.map((a) => a.assigneeEmail.toLowerCase());
      }

      // Log update event inside transaction
      await TaskEvent.create(
        [
          {
            eventId: `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            taskId: task.taskId,
            actorEmail: user.email.toLowerCase(),
            eventType: "TASK_UPDATED",
            details: { title: task.title, status: task.status },
          },
        ],
        queryOpts
      );

      // Recalculate coverage and completion state after assignment changes
      await calculateTaskCoverage(task.taskId, session);

      const doc = task.toObject();
      doc.assignedEmails = finalAssignedEmails;

      return { statusCode: 200, body: { success: true, message: "Task updated successfully.", task: doc } };
    });

    return res.status(result.statusCode).json(result.body);
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

    const task = await findTaskByIdOrKey(taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found." });
    }

    if (!canModifyTask(user, task)) {
      return res.status(403).json({ success: false, message: "Only admins can delete tasks." });
    }

    await Task.deleteOne({ _id: task._id }).exec();
    await TaskAssignment.deleteMany({ taskId: { $in: [task.taskId, String(task._id)] } }).exec();
    await TaskSubmission.deleteMany({ taskId: { $in: [task.taskId, String(task._id)] } }).exec();
    await TaskReview.deleteMany({ taskId: { $in: [task.taskId, String(task._id)] } }).exec();
    await Notification.deleteMany({ taskId: { $in: [task.taskId, String(task._id)] } }).exec();

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
