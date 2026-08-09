import { Task } from "../models/Task.js";
import { TaskSubmission } from "../models/TaskSubmission.js";
import { TaskReview } from "../models/TaskReview.js";
import { Notification } from "../models/Notification.js";
import { TaskEvent } from "../models/TaskEvent.js";
import { canReview, isAdmin } from "../services/authorizationService.js";
import { recalculateTaskState } from "../services/taskStateService.js";
import { recalculateUserPoints } from "../services/pointsService.js";
import { withTransaction } from "../utils/dbTransaction.js";

export async function createReview(req, res) {
  try {
    const result = await withTransaction(async (session) => {
      const user = req.user;
      const { submissionId, decision, feedback } = req.body;

      if (!submissionId || !decision) {
        return { statusCode: 400, body: { success: false, message: "submissionId and decision are required." } };
      }

      const queryOpts = session ? { session } : {};
      const submission = await TaskSubmission.findById(submissionId, null, queryOpts).exec();
      if (!submission) {
        return { statusCode: 404, body: { success: false, message: "Submission not found." } };
      }

      if (!canReview(user, submission)) {
        return { statusCode: 403, body: { success: false, message: "Access denied. Only Admins can review submissions." } };
      }

      const cleanDecision = String(decision).trim().toUpperCase();
      if (!["COMMENTED", "APPROVED", "CHANGES_REQUESTED"].includes(cleanDecision)) {
        return { statusCode: 400, body: { success: false, message: "Invalid review decision." } };
      }

      const reviewId = `REV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const [newReview] = await TaskReview.create(
        [
          {
            reviewId,
            taskId: submission.taskId,
            submissionId: submission._id,
            version: submission.version,
            reviewerId: user._id,
            decision: cleanDecision,
            feedback: (feedback || "").trim(),
          },
        ],
        queryOpts
      );

      // Recalculate Task State & Coverage
      await recalculateTaskState(submission.taskId, session);

      // Recalculate submitter points if approved
      if (cleanDecision === "APPROVED") {
        for (const targetUserId of submission.submittedFor) {
          await recalculateUserPoints(targetUserId, session);
        }
      }

      // Log TaskEvent
      await TaskEvent.create(
        [
          {
            eventId: `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            taskId: submission.taskId,
            submissionId: submission._id,
            actorUserId: user._id,
            eventType: "REVIEW_CREATED",
            details: { decision: cleanDecision, version: submission.version },
          },
        ],
        queryOpts
      );

      // Notify submittedFor users
      for (const targetUserId of submission.submittedFor) {
        const eventKey = `NTF-REV-${newReview._id}-${targetUserId}`;
        const title = cleanDecision === "APPROVED" ? "Submission Approved! 🎉" : cleanDecision === "CHANGES_REQUESTED" ? "Changes Requested ⚠️" : "New Review Comment 💬";
        const message = `Admin ${user.name} reviewed your V${submission.version} submission (${cleanDecision}).`;

        await Notification.findOneAndUpdate(
          { targetUserId, eventKey },
          {
            notificationId: `NTF-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            targetUserId,
            type: "REVIEW_DECISION",
            taskId: submission.taskId,
            submissionId: submission._id,
            title,
            message,
            eventKey,
            readAt: null,
          },
          { upsert: true, new: true, ...queryOpts }
        ).exec();
      }

      return {
        statusCode: 201,
        body: { success: true, message: `Review (${cleanDecision}) submitted successfully.`, review: newReview },
      };
    });

    return res.status(result.statusCode).json(result.body);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function getReviews(req, res) {
  try {
    const { taskId, submissionId } = req.query;
    const filter = {};
    if (taskId) filter.taskId = taskId;
    if (submissionId) filter.submissionId = submissionId;

    const reviews = await TaskReview.find(filter).sort({ createdAt: -1 }).populate("taskId submissionId reviewerId").exec();
    return res.json({ success: true, reviews });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function rejectReviewEdit(req, res) {
  return res.status(403).json({
    success: false,
    message: "Immutable Collection: Reviews cannot be modified or deleted.",
  });
}
