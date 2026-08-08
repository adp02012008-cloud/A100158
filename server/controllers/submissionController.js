import { Task } from "../models/Task.js";
import { TaskAssignment } from "../models/TaskAssignment.js";
import { TaskSubmission } from "../models/TaskSubmission.js";
import { Notification } from "../models/Notification.js";
import { TaskEvent } from "../models/TaskEvent.js";
import { User } from "../models/User.js";
import {
  canSubmitToTask,
  canViewSubmission,
  isAdmin,
} from "../utils/authHelpers.js";
import { calculateTaskCoverage } from "../utils/coverageEngine.js";
import { withTransaction } from "../utils/dbTransaction.js";

/**
 * POST /api/submissions
 * Creates an immutable deliverable submission (V1, V2, etc.) inside a MongoDB Transaction.
 */
export async function createSubmission(req, res) {
  try {
    const result = await withTransaction(async (session) => {
      const user = req.user;
      const {
        taskId,
        githubUrl,
        demoUrl,
        notes,
        files,
        submitForAll,
        submissionGroupId: reqGroupId,
      } = req.body;

      if (!taskId || !String(taskId).trim()) {
        return { statusCode: 400, body: { success: false, message: "TaskId is required." } };
      }

      const cleanTaskId = String(taskId).trim();
      const queryOpts = session ? { session } : {};

      // 1. Fetch Task
      const task = await Task.findOne({ taskId: cleanTaskId }, null, queryOpts).exec();
      if (!task) {
        return { statusCode: 404, body: { success: false, message: "Task not found." } };
      }

      // 2. Query Active Task Assignments to verify authorization & construct submittedFor
      const activeAssignments = await TaskAssignment.find({
        taskId: cleanTaskId,
        status: "ACTIVE",
      }, null, queryOpts).exec();

      const activeAssigneeEmails = activeAssignments.map((a) => a.assigneeEmail.toLowerCase());
      const cleanUserEmail = user.email.toLowerCase();
      const isAssigned = activeAssigneeEmails.includes(cleanUserEmail);

      // Rule: Must be an active assignee to submit. Unassigned admins & members cannot submit.
      if (!canSubmitToTask(user, task, isAssigned)) {
        return {
          statusCode: 403,
          body: {
            success: false,
            message: "Submission failed: You must be an active assigned worker on this task to submit deliverables.",
          },
        };
      }

      // 3. Enforce Submission Mode & Server-Authoritative submittedFor Construction
      const mode = task.submissionMode || "FLEXIBLE";
      let finalSubmissionType = "INDIVIDUAL";
      let finalSubmittedFor = [cleanUserEmail];

      if (mode === "INDIVIDUAL") {
        if (Boolean(submitForAll)) {
          return {
            statusCode: 400,
            body: {
              success: false,
              message: "Task is set to INDIVIDUAL mode and does not permit submitForAll collaboration.",
            },
          };
        }
        finalSubmissionType = "INDIVIDUAL";
        finalSubmittedFor = [cleanUserEmail];
      } else if (mode === "COLLABORATIVE") {
        finalSubmissionType = "COLLABORATIVE";
        finalSubmittedFor = Boolean(submitForAll) ? activeAssigneeEmails : [cleanUserEmail];
      } else {
        // FLEXIBLE mode: Worker selects individual vs collaborative
        if (Boolean(submitForAll)) {
          finalSubmissionType = "COLLABORATIVE";
          finalSubmittedFor = activeAssigneeEmails;
        } else {
          finalSubmissionType = "INDIVIDUAL";
          finalSubmittedFor = [cleanUserEmail];
        }
      }

      // Security Rule: Reject if client provided a conflicting/forged submittedFor array
      if (req.body.submittedFor && Array.isArray(req.body.submittedFor)) {
        const clientEmails = req.body.submittedFor.map((e) => String(e).trim().toLowerCase());
        const hasUnauthorizedClientEmail = clientEmails.some((e) => !activeAssigneeEmails.includes(e));
        if (hasUnauthorizedClientEmail) {
          return {
            statusCode: 400,
            body: {
              success: false,
              message: "Forbidden: submittedFor contains unassigned or forged email addresses.",
            },
          };
        }
      }

      // 4. Versioning & Submission Group Management
      let groupId = reqGroupId ? String(reqGroupId).trim() : "";
      let nextVersion = 1;
      let parentSubId = "";

      if (!groupId) {
        groupId = `GRP-${cleanTaskId}-${finalSubmissionType === "COLLABORATIVE" ? "TEAM" : cleanUserEmail}`;
      }

      // Find previous submissions under this group ID to calculate version using MAX(version)
      const existingGroupSubs = await TaskSubmission.find({ submissionGroupId: groupId }, null, queryOpts)
        .sort({ version: -1 })
        .exec();

      if (existingGroupSubs.length > 0) {
        const latestSub = existingGroupSubs[0];
        nextVersion = latestSub.version + 1;
        parentSubId = latestSub.submissionId;
      }

      const subId = `SUB-${Date.now().toString().slice(-6)}-V${nextVersion}`;

      // Format Files
      const formattedFiles = Array.isArray(files)
        ? files.map((f) => ({
            name: String(f.name || "deliverable"),
            url: String(f.url || ""),
            dataUrl: String(f.dataUrl || ""),
            type: String(f.type || ""),
            size: Number(f.size || 0),
          }))
        : [];

      // 5. Create Immutable TaskSubmission Document inside Transaction
      const [newSubmission] = await TaskSubmission.create(
        [
          {
            submissionId: subId,
            taskId: cleanTaskId,
            submissionGroupId: groupId,
            parentSubmissionId: parentSubId,
            version: nextVersion,
            submissionType: finalSubmissionType,
            submittedBy: cleanUserEmail,
            submittedFor: finalSubmittedFor,
            githubUrl: (githubUrl || "").trim(),
            demoUrl: (demoUrl || "").trim(),
            notes: (notes || "").trim(),
            files: formattedFiles,
            status: "SUBMITTED",
            submittedAt: new Date(),
          },
        ],
        queryOpts
      );

      // 6. Recalculate Task Coverage & Task Status Atomically
      await calculateTaskCoverage(cleanTaskId, session);

      // 7. Create Server TaskEvent Log inside Transaction
      await TaskEvent.create(
        [
          {
            eventId: `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            taskId: cleanTaskId,
            submissionId: subId,
            actorEmail: cleanUserEmail,
            eventType: nextVersion > 1 ? "RESUBMISSION_CREATED" : "SUBMISSION_CREATED",
            details: {
              version: nextVersion,
              submissionType: finalSubmissionType,
              submittedForCount: finalSubmittedFor.length,
            },
          },
        ],
        queryOpts
      );

      // 8. Notify Admins of New Deliverable Submission inside Transaction
      const adminUsers = await User.find({ role: "ADMIN", status: "ACTIVE" }, null, queryOpts).exec();
      for (const adm of adminUsers) {
        const eventKey = `NTF-SUBMIT-${subId}-${adm.email.toLowerCase()}`;
        await Notification.findOneAndUpdate(
          { eventKey },
          {
            notificationId: `NTF-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            targetEmail: adm.email.toLowerCase(),
            type: "NEW_SUBMISSION",
            taskId: cleanTaskId,
            submissionId: subId,
            title: "Deliverable Submitted 📥",
            message: `${cleanUserEmail} submitted V${nextVersion} deliverable for "${task.title}".`,
            eventKey,
            readAt: null,
            createdAt: new Date(),
          },
          { upsert: true, new: true, ...queryOpts }
        ).exec();
      }

      return {
        statusCode: 201,
        body: {
          success: true,
          message: `Deliverable V${nextVersion} submitted successfully.`,
          submission: newSubmission,
        },
      };
    });

    return res.status(result.statusCode).json(result.body);
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error submitting deliverable: " + error.message });
  }
}

/**
 * GET /api/submissions
 * Fetches submissions with authorization filtering.
 * Admins get all submissions; Members get only submissions where they are submittedBy or in submittedFor.
 */
export async function getSubmissions(req, res) {
  try {
    const user = req.user;
    const { taskId } = req.query;

    const filter = {};
    if (taskId) filter.taskId = String(taskId).trim();

    const allSubmissions = await TaskSubmission.find(filter).sort({ submittedAt: -1 }).exec();

    // Filter by authorization helper
    const authorizedSubmissions = allSubmissions.filter((sub) => canViewSubmission(user, sub));

    return res.status(200).json({
      success: true,
      count: authorizedSubmissions.length,
      submissions: authorizedSubmissions,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error fetching submissions: " + error.message });
  }
}

/**
 * GET /api/submissions/:submissionId
 * Direct-ID fetch for a single submission (enforces canViewSubmission authorization).
 */
export async function getSubmissionById(req, res) {
  try {
    const user = req.user;
    const { submissionId } = req.params;

    const submission = await TaskSubmission.findOne({ submissionId: String(submissionId).trim() }).exec();
    if (!submission) {
      return res.status(404).json({ success: false, message: "Submission not found." });
    }

    if (!canViewSubmission(user, submission)) {
      return res.status(403).json({ success: false, message: "Access denied. Private submission." });
    }

    return res.status(200).json({ success: true, submission });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error fetching submission: " + error.message });
  }
}
