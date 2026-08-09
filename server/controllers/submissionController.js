import mongoose from "mongoose";
import { Task } from "../models/Task.js";
import { TaskAssignment } from "../models/TaskAssignment.js";
import { TaskSubmission } from "../models/TaskSubmission.js";
import { TaskReview } from "../models/TaskReview.js";
import { Notification } from "../models/Notification.js";
import { TaskEvent } from "../models/TaskEvent.js";
import { User } from "../models/User.js";
import { canSubmit, canManageDomain, isAdmin } from "../services/authorizationService.js";
import { recalculateTaskState, validateSubmissionPayload, findTaskByIdOrKey } from "../services/taskStateService.js";
import { withTransaction } from "../utils/dbTransaction.js";

export async function createSubmission(req, res) {
  try {
    const result = await withTransaction(async (session) => {
      const user = req.user;
      const { taskId, githubUrl, demoUrl, notes, files, submitForAll, submissionGroupId: reqGroupId, submittedFor } = req.body;

      if (!taskId) return { statusCode: 400, body: { success: false, message: "TaskId is required." } };

      const queryOpts = session ? { session } : {};
      const task = await findTaskByIdOrKey(taskId, queryOpts);
      if (!task) return { statusCode: 404, body: { success: false, message: "Task not found." } };

      const activeAssignments = await TaskAssignment.find({ taskId: { $in: [task.taskId, String(task._id)] }, status: "ACTIVE" }, null, queryOpts).exec();
      const activeUserIds = activeAssignments.map((a) => String(a.userId));
      const isAssigned = activeUserIds.includes(String(user._id));

      if (!canSubmit(user, task, isAssigned)) {
        return {
          statusCode: 403,
          body: { success: false, message: "Access denied. You must be an active assigned worker to submit deliverables." },
        };
      }

      // Determine submissionGroupId
      let groupId = reqGroupId ? String(reqGroupId).trim() : `GRP-${task.taskId}-${user.userId}`;
      const existingGroupSubs = await TaskSubmission.find({ submissionGroupId: groupId }, null, queryOpts)
        .sort({ version: -1 })
        .exec();

      // BLOCK NEW RESUBMISSIONS IF CURRENT LATEST VERSION IS APPROVED
      if (existingGroupSubs.length > 0 && existingGroupSubs[0].status === "APPROVED") {
        return {
          statusCode: 400,
          body: {
            success: false,
            message: "Deliverable for this task has already been approved and published. New resubmissions are locked.",
          },
        };
      }

      const submittedForInput = Array.isArray(submittedFor) ? submittedFor : [user._id];
      const finalSubmittedForUserIds = await validateSubmissionPayload(
        task,
        activeUserIds,
        submittedForInput,
        Boolean(submitForAll),
        task.submissionMode
      );

      let nextVersion = 1;
      let parentSubId = null;
      if (existingGroupSubs.length > 0) {
        nextVersion = existingGroupSubs[0].version + 1;
        parentSubId = existingGroupSubs[0]._id;
      }

      const subId = `SUB-${Date.now().toString().slice(-6)}-V${nextVersion}`;
      const submissionType = finalSubmittedForUserIds.length > 1 ? "COLLABORATIVE" : "INDIVIDUAL";

      const [newSubmission] = await TaskSubmission.create(
        [
          {
            submissionId: subId,
            taskId: task.taskId,
            submissionGroupId: groupId,
            parentSubmissionId: parentSubId,
            version: nextVersion,
            submissionType,
            submittedBy: user._id,
            submittedFor: finalSubmittedForUserIds,
            githubUrl: (githubUrl || "").trim(),
            demoUrl: (demoUrl || "").trim(),
            notes: (notes || "").trim(),
            files: Array.isArray(files) ? files.map((f) => String(f.url || f)) : [],
            status: "SUBMITTED",
            submittedAt: new Date(),
          },
        ],
        queryOpts
      );

      // Recalculate task state
      await recalculateTaskState(task.taskId, session);

      // Log TaskEvent
      await TaskEvent.create(
        [
          {
            eventId: `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            taskId: task.taskId,
            submissionId: newSubmission._id,
            actorUserId: user._id,
            eventType: nextVersion > 1 ? "RESUBMISSION_CREATED" : "SUBMISSION_CREATED",
            details: { version: nextVersion, submissionType, submittedForCount: finalSubmittedForUserIds.length },
          },
        ],
        queryOpts
      );

      // Notify admins
      const adminUsers = await User.find({ role: "ADMIN", status: "ACTIVE" }, null, queryOpts).exec();
      for (const adm of adminUsers) {
        const eventKey = `NTF-SUBMIT-${newSubmission._id}-${adm._id}`;
        const title = nextVersion > 1 ? "Corrected Deliverable Resubmitted 📥" : "Deliverable Submitted 📥";
        const message = nextVersion > 1
          ? `${user.name} submitted corrected Version V${nextVersion} for "${task.title}" following your review feedback.`
          : `${user.name} submitted V${nextVersion} for "${task.title}".`;

        await Notification.findOneAndUpdate(
          { targetUserId: adm._id, eventKey },
          {
            notificationId: `NTF-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            targetUserId: adm._id,
            targetEmail: (adm.email || "").toLowerCase().trim(),
            type: nextVersion > 1 ? "RESUBMISSION_DELIVERED" : "NEW_SUBMISSION",
            taskId: task.taskId,
            submissionId: newSubmission._id,
            title,
            message,
            eventKey,
            readAt: null,
            createdAt: new Date(),
          },
          { upsert: true, new: true, ...queryOpts }
        ).exec();
      }

      return {
        statusCode: 201,
        body: { success: true, message: `Deliverable V${nextVersion} submitted successfully.`, submission: newSubmission },
      };
    });

    return res.status(result.statusCode).json(result.body);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "Duplicate submission version conflict." });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * POST /api/submissions/direct
 * Admin directly publishes a project to the showcase without review procedures.
 */
export async function createDirectProject(req, res) {
  try {
    const user = req.user;
    if (!isAdmin(user)) {
      return res.status(403).json({ success: false, message: "Access denied. Only Admins can directly publish projects." });
    }

    const { title, domain, githubUrl, demoUrl, notes, submittedBy, submittedFor } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: "Project title is required." });
    }

    const taskIdStr = `TSK-PRJ-${Date.now().toString().slice(-6)}`;
    const task = await Task.create({
      taskId: taskIdStr,
      title: title.trim(),
      domain: domain || "Core",
      description: notes || `Direct Published Project: ${title}`,
      priority: "Medium",
      status: "COMPLETED",
      createdBy: user._id,
    });

    const submitterId = submittedBy || user._id;
    const teamUserIds = Array.isArray(submittedFor) && submittedFor.length > 0 ? submittedFor : [submitterId];

    const subId = `SUB-DIR-${Date.now().toString().slice(-6)}-V1`;
    const submission = await TaskSubmission.create({
      submissionId: subId,
      taskId: task.taskId,
      submissionGroupId: `GRP-${task.taskId}-${user.userId}`,
      version: 1,
      submissionType: teamUserIds.length > 1 ? "COLLABORATIVE" : "INDIVIDUAL",
      submittedBy: submitterId,
      submittedFor: teamUserIds,
      githubUrl: (githubUrl || "").trim(),
      demoUrl: (demoUrl || "").trim(),
      notes: (notes || "").trim(),
      status: "APPROVED",
      submittedAt: new Date(),
    });

    // Automatically create APPROVED review record
    await TaskReview.create({
      reviewId: `REV-DIR-${Date.now().toString().slice(-6)}`,
      submissionId: submission._id,
      taskId: task.taskId,
      reviewerId: user._id,
      decision: "APPROVED",
      feedback: "Directly published by Administrator.",
      version: 1,
      reviewedAt: new Date(),
    });

    await recalculateTaskState(task.taskId);

    const populatedRaw = await TaskSubmission.findById(submission._id).populate("submittedBy submittedFor").exec();
    const populated = populatedRaw.toObject();
    populated.taskId = task;

    return res.status(201).json({
      success: true,
      message: "Project published directly to showcase successfully!",
      submission: populated,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function getSubmissions(req, res) {
  try {
    const user = req.user;
    const { taskId, status, publicView } = req.query;
    const filter = {};
    if (taskId) filter.taskId = taskId;
    if (status) filter.status = String(status).toUpperCase();

    const rawSubmissions = await TaskSubmission.find(filter)
      .sort({ submittedAt: -1 })
      .populate("submittedBy submittedFor")
      .exec();

    // Populate taskId Task model documents manually by business string key
    const taskIds = [...new Set(rawSubmissions.map((s) => s.taskId).filter(Boolean))];
    const objectIds = taskIds.filter((id) => mongoose.Types.ObjectId.isValid(id));

    const tasks = await Task.find({
      $or: [
        { taskId: { $in: taskIds } },
        ...(objectIds.length > 0 ? [{ _id: { $in: objectIds } }] : []),
      ],
    }).exec();

    const taskMap = new Map();
    tasks.forEach((t) => {
      taskMap.set(t.taskId, t);
      taskMap.set(String(t._id), t);
    });

    const submissions = rawSubmissions.map((s) => {
      const doc = s.toObject();
      doc.taskId = taskMap.get(s.taskId) || { taskId: s.taskId, title: `Task ${s.taskId}`, domain: "Core" };
      return doc;
    });

    const authorized = submissions.filter((sub) => {
      if (isAdmin(user) || publicView === "true" || sub.status === "APPROVED") return true;
      const isCreator = String(sub.submittedBy?._id || sub.submittedBy) === String(user._id);
      const isFor = (sub.submittedFor || []).some((u) => String(u._id || u) === String(user._id));
      return isCreator || isFor;
    });

    // DEDUPLICATE APPROVED SHOWCASE SUBMISSIONS BY SUBMISSION GROUP ID SO MULTIPLE VERSIONS NEVER PRODUCE DUPLICATE CARDS
    let finalSubmissions = authorized;
    if (publicView === "true" || status === "APPROVED") {
      const groupMap = new Map();
      authorized.forEach((sub) => {
        const key = sub.submissionGroupId || sub.taskId?.taskId || sub.taskId;
        const existing = groupMap.get(key);
        if (!existing || sub.version > existing.version) {
          groupMap.set(key, sub);
        }
      });
      finalSubmissions = Array.from(groupMap.values());
    }

    return res.json({ success: true, count: finalSubmissions.length, submissions: finalSubmissions });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function getSubmissionById(req, res) {
  try {
    const { id } = req.params;
    const rawSub = await TaskSubmission.findById(id).populate("submittedBy submittedFor").exec();
    if (!rawSub) return res.status(404).json({ success: false, message: "Submission not found." });

    const submission = rawSub.toObject();
    const task = await findTaskByIdOrKey(submission.taskId);
    submission.taskId = task || { taskId: submission.taskId, title: `Task ${submission.taskId}`, domain: "Core" };

    return res.json({ success: true, submission });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * PUT /api/submissions/:id
 * Admin OR Authorized assigned member (with active memberEditUntil window) updates submission.
 */
export async function updateSubmission(req, res) {
  try {
    const { id } = req.params;
    const user = req.user;
    const { githubUrl, demoUrl, notes, files, status, memberEditUntil, editHours } = req.body;

    const submission = await TaskSubmission.findById(id).exec();
    if (!submission) {
      return res.status(404).json({ success: false, message: "Submission not found." });
    }

    const isUserAdmin = isAdmin(user);
    const isCreator = String(submission.submittedBy) === String(user._id);
    const isFor = (submission.submittedFor || []).some((u) => String(u) === String(user._id));
    const isOwner = isCreator || isFor;

    const isEditWindowActive = submission.memberEditUntil && new Date(submission.memberEditUntil) > new Date();

    if (!isUserAdmin && (!isOwner || !isEditWindowActive)) {
      return res.status(403).json({
        success: false,
        message: "Editing locked. Only Admins or assigned team members with an active edit window permission can update this submission.",
      });
    }

    if (githubUrl !== undefined) submission.githubUrl = String(githubUrl).trim();
    if (demoUrl !== undefined) submission.demoUrl = String(demoUrl).trim();
    if (notes !== undefined) submission.notes = String(notes).trim();
    if (Array.isArray(files)) submission.files = files.map((f) => String(f.url || f));

    // Admin-only fields
    if (isUserAdmin) {
      if (status) submission.status = String(status).toUpperCase();
      if (editHours !== undefined) {
        const hrs = Number(editHours) || 0;
        submission.memberEditUntil = hrs > 0 ? new Date(Date.now() + hrs * 3600 * 1000) : null;
      } else if (memberEditUntil !== undefined) {
        submission.memberEditUntil = memberEditUntil ? new Date(memberEditUntil) : null;
      }
    }

    await submission.save();

    if (submission.taskId) {
      await recalculateTaskState(submission.taskId);
    }

    const updatedRaw = await TaskSubmission.findById(id).populate("submittedBy submittedFor").exec();
    const updated = updatedRaw.toObject();
    const task = await findTaskByIdOrKey(updated.taskId);
    updated.taskId = task || { taskId: updated.taskId, title: `Task ${updated.taskId}`, domain: "Core" };

    return res.json({
      success: true,
      message: "Submission updated successfully.",
      submission: updated,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * DELETE /api/submissions/:id
 * Admin permanently deletes a published project deliverable.
 */
export async function deleteSubmission(req, res) {
  try {
    const { id } = req.params;
    const user = req.user;

    if (!isAdmin(user)) {
      return res.status(403).json({ success: false, message: "Access denied. Only Admins can delete published projects." });
    }

    const submission = await TaskSubmission.findById(id).exec();
    if (!submission) {
      return res.status(404).json({ success: false, message: "Project deliverable not found." });
    }

    const taskId = submission.taskId;

    await TaskSubmission.deleteOne({ _id: submission._id }).exec();
    await TaskReview.deleteMany({ submissionId: submission._id }).exec();

    if (taskId) {
      await recalculateTaskState(taskId);
    }

    return res.json({ success: true, message: "Project deliverable deleted successfully." });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
