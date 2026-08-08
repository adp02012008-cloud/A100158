import mongoose from "mongoose";

const taskReviewSchema = new mongoose.Schema(
  {
    reviewId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    taskId: {
      type: String,
      required: [true, "Task ID is required"],
      trim: true,
      index: true,
    },
    submissionId: {
      type: String,
      required: [true, "Submission ID is required"],
      trim: true,
      index: true,
    },
    version: {
      type: Number,
      required: [true, "Submission version is required"],
      min: 1,
      index: true,
    },
    reviewerEmail: {
      type: String,
      required: [true, "Reviewer email is required"],
      lowercase: true,
      trim: true,
      index: true,
    },
    decision: {
      type: String,
      enum: {
        values: ["COMMENTED", "APPROVED", "CHANGES_REQUESTED"],
        message: "{VALUE} is not a valid review decision",
      },
      required: true,
      uppercase: true,
    },
    feedback: {
      type: String,
      default: "",
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false, // Immutable: no updatedAt
    collection: "taskReviews",
  }
);

// Indexes
taskReviewSchema.index({ submissionId: 1, version: 1 });
taskReviewSchema.index({ taskId: 1, createdAt: -1 });

taskReviewSchema.pre("save", function (next) {
  if (this.reviewerEmail) this.reviewerEmail = this.reviewerEmail.trim().toLowerCase();
  next();
});

export const TaskReview = mongoose.model("TaskReview", taskReviewSchema);
