import { Task } from "../models/Task.js";
import { TaskSubmission } from "../models/TaskSubmission.js";
import { TaskReview } from "../models/TaskReview.js";
import { Notification } from "../models/Notification.js";
import { TaskEvent } from "../models/TaskEvent.js";
import { canReviewSubmission, isAdmin } from "../utils/authHelpers.js";

/**
 * POST /api/reviews
 * Creates an immutable admin review record.
 *
 * Rules:
 * - Only ADMIN can create reviews.
 * - Admin can review any task/submission, including their own (Self-Review Authorized).
 * - Decisions: APPROVED, CHANGES_REQUESTED, COMMENTED.
 * - Bound to specific submissionId and version.
 * - Updates target submission status accordingly.
 */
export async function createReview(req, res) {
  try {
    const user = req.user;
    if (!isAdmin(user)) {
      return res.status(403).json({ success: false, message: "Only admins can submit reviews." });
    }

    const { submissionId, decision, feedback } = req.body;

    if (!submissionId || !String(submissionId).trim()) {
      return res.status(400).json({ success: false, message: "SubmissionId is required." });
    }

    const validDecisions = ["APPROVED", "CHANGES_REQUESTED", "COMMENTED"];
    const cleanDecision = String(decision || "").trim().toUpperCase();

    if (!validDecisions.includes(cleanDecision)) {
      return res.status(400).json({
        success: false,
        message: `Invalid review decision. Allowed values: ${validDecisions.join(", ")}`,
      });
    }

    // 1. Fetch target TaskSubmission
    const cleanSubId = String(submissionId).trim();
    const submission = await TaskSubmission.findOne({ submissionId: cleanSubId }).exec();
    if (!submission) {
      return res.status(404).json({ success: false, message: "Target submission not found." });
    }

    // Authorization check
    if (!canReviewSubmission(user, submission)) {
      return res.status(403).json({ success: false, message: "Forbidden from reviewing this submission." });
    }

    const reviewerEmail = user.email.toLowerCase(); // Derived server-side
    const reviewId = `REV-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 6)}`;

    // 2. Create Immutable TaskReview Record
    const newReview = await TaskReview.create({
      reviewId,
      taskId: submission.taskId,
      submissionId: cleanSubId,
      version: submission.version,
      reviewerEmail,
      decision: cleanDecision,
      feedback: (feedback || "").trim(),
      createdAt: new Date(),
    });

    // 3. Update Submission Status based on decision
    if (cleanDecision === "APPROVED") {
      submission.status = "APPROVED";
      await submission.save();
    } else if (cleanDecision === "CHANGES_REQUESTED") {
      submission.status = "CHANGES_REQUESTED";
      await submission.save();

      // Update Task status back to IN_PROGRESS so workers know to resubmit
      const task = await Task.findOne({ taskId: submission.taskId }).exec();
      if (task && task.status === "UNDER_REVIEW") {
        task.status = "IN_PROGRESS";
        await task.save();
      }
    }

    // 4. Log TaskEvent
    await TaskEvent.create({
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
    });

    // 5. Notify Submitting & Represented Members
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
        { upsert: true, new: true }
      ).exec();
    }

    return res.status(201).json({
      success: true,
      message: "Review submitted successfully.",
      review: newReview,
      submissionStatus: submission.status,
    });
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
