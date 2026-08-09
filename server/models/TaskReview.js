import mongoose from "mongoose";

const taskReviewSchema = new mongoose.Schema(
  {
    reviewId: {
      type: String,
      required: [true, "Review ID is required"],
      unique: true,
      trim: true,
      index: true,
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: [true, "Task reference is required"],
      index: true,
    },
    submissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TaskSubmission",
      required: [true, "Submission reference is required"],
      index: true,
    },
    version: {
      type: Number,
      required: true,
    },
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Reviewer user reference is required"],
      index: true,
    },
    decision: {
      type: String,
      enum: {
        values: ["COMMENTED", "APPROVED", "CHANGES_REQUESTED"],
        message: "{VALUE} is not a valid review decision",
      },
      required: [true, "Review decision is required"],
      uppercase: true,
    },
    feedback: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: "taskReviews",
  }
);

export const TaskReview = mongoose.model("TaskReview", taskReviewSchema);
