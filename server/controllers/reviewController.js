import { Task } from "../models/Task.js";
import { TaskSubmission } from "../models/TaskSubmission.js";
import { TaskReview } from "../models/TaskReview.js";
import { Notification } from "../models/Notification.js";
import { TaskEvent } from "../models/TaskEvent.js";
import { canReviewSubmission, getEffectiveSubmissionVersionState, isAdmin } from "../utils/authHelpers.js";
import { calculateTaskCoverage } from "../utils/coverageEngine.js";
import { withTransaction } from "../utils/dbTransaction.js";

/**
 * POST /api/reviews
 * Creates an immutable admin review record inside a MongoDB Transaction.
 */
export async function createReview(req, res) {
  try {
    const result = await withTransaction(async (session) => {
      const user = req.user;
      if (!isAdmin(user)) {
        return { statusCode: 403, body: { success: false, message: "Only admins can submit reviews." } };
      }

      const { submissionId, decision, feedback } = req.body;

      if (!submissionId || !String(submissionId).trim()) {
        return { statusCode: 400, body: { success: false, message: "SubmissionId is required." } };
      }

      const validDecisions = ["APPROVED", "CHANGES_REQUESTED", "COMMENTED"];
      const cleanDecision = String(decision || "").trim().toUpperCase();

      if (!validDecisions.includes(cleanDecision)) {
        return {
          statusCode: 400,
          body: {
            success: false,
            message: `Invalid review decision. Allowed values: ${validDecisions.join(", ")}`,
          },
        };
      }

      const queryOpts = session ? { session } : {};

      // 1. Fetch target TaskSubmission
      const cleanSubId = String(submissionId).trim();
      const submission = await TaskSubmission.findOne({ submissionId: cleanSubId }, null, queryOpts).exec();
      if (!submission) {
        return { statusCode: 404, body: { success: false, message: "Target submission not found." } };
      }

      // Authorization check
      if (!canReviewSubmission(user, submission)) {
        return { statusCode: 403, body: { success: false, message: "Forbidden from reviewing this submission." } };
      }

      const reviewerEmail = user.email.toLowerCase();
      const reviewId = `REV-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 6)}`;

      // 2. Create Immutable TaskReview Record inside Transaction
      const [newReview] = await TaskReview.create(
        [
          {
            reviewId,
            taskId: submission.taskId,
            submissionId: cleanSubId,
            version: submission.version,
            reviewerEmail,
            decision: cleanDecision,
            feedback: (feedback || "").trim(),
            createdAt: new Date(),
          },
        ],
        queryOpts
      );

      // 3. Update Submission Status based on authoritative getEffectiveSubmissionVersionState
      const allVersionReviews = await TaskReview.find({ submissionId: cleanSubId }, null, queryOpts).exec();
      const effectiveState = getEffectiveSubmissionVersionState(allVersionReviews);

      submission.status = effectiveState;
      await submission.save(queryOpts);

      // 4. Recalculate Task Coverage & Update Task Status Atomically
      await calculateTaskCoverage(submission.taskId, session);

      // 5. Log TaskEvent inside Transaction
      await TaskEvent.create(
        [
          {
            eventId: `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            taskId: submission.taskId,
            submissionId: cleanSubId,
            actorEmail: reviewerEmail,
            eventType: `REVIEW_${cleanDecision}`,
            details: {
              version: submission.version,
              decision: cleanDecision,
              isSelfReview: reviewerEmail === submission.submittedBy.toLowerCase(),
            },
          },
        ],
        queryOpts
      );

      // 6. Notify Submitting & Represented Members inside Transaction
      const recipients = Array.from(
        new Set([submission.submittedBy, ...(submission.submittedFor || [])])
      ).map((e) => e.toLowerCase());

      const isSelfReview = reviewerEmail === submission.submittedBy.toLowerCase();

      for (const targetEmail of recipients) {
        const eventKey = `NTF-REV-${reviewId}-${targetEmail}`;
        const title =
          cleanDecision === "APPROVED"
            ? "Deliverable Approved! ✅"
            : cleanDecision === "CHANGES_REQUESTED"
            ? "Changes Requested ⚠️"
            : "New Review Feedback 💬";

        await Notification.findOneAndUpdate(
          { eventKey },
          {
            notificationId: `NTF-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            targetEmail,
            type: "REVIEW",
            taskId: submission.taskId,
            submissionId: cleanSubId,
            title,
            message: `${reviewerEmail} ${isSelfReview ? "(Self-Review)" : ""} reviewed V${submission.version}: ${cleanDecision}`,
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
          message: "Review submitted successfully.",
          review: newReview,
          submissionStatus: submission.status,
        },
      };
    });

    return res.status(result.statusCode).json(result.body);
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error submitting review: " + error.message });
  }
}

/**
 * GET /api/reviews
 * Fetches review log records for a given submission or task.
 */
export async function getReviews(req, res) {
  try {
    const { submissionId, taskId } = req.query;
    const filter = {};

    if (submissionId) filter.submissionId = String(submissionId).trim();
    if (taskId) filter.taskId = String(taskId).trim();

    const reviews = await TaskReview.find(filter).sort({ createdAt: -1 }).exec();

    return res.status(200).json({ success: true, count: reviews.length, reviews });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error fetching reviews: " + error.message });
  }
}
