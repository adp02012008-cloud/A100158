import mongoose from "mongoose";

const taskSubmissionSchema = new mongoose.Schema(
  {
    submissionId: {
      type: String,
      required: [true, "Submission ID is required"],
      unique: true,
      trim: true,
      index: true,
    },
    taskId: {
      type: String,
      required: [true, "Task reference is required"],
      trim: true,
      index: true,
    },
    submissionGroupId: {
      type: String,
      required: [true, "Submission Group ID is required"],
      trim: true,
      index: true,
    },
    parentSubmissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TaskSubmission",
      default: null,
    },
    version: {
      type: Number,
      required: true,
      min: 1,
    },
    submissionType: {
      type: String,
      enum: ["INDIVIDUAL", "COLLABORATIVE"],
      default: "INDIVIDUAL",
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "SubmittedBy user is required"],
      index: true,
    },
    submittedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },
    ],
    githubUrl: {
      type: String,
      default: "",
      trim: true,
    },
    demoUrl: {
      type: String,
      default: "",
      trim: true,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
    files: [
      {
        type: String,
        trim: true,
      },
    ],
    status: {
      type: String,
      enum: ["SUBMITTED", "APPROVED", "CHANGES_REQUESTED"],
      default: "SUBMITTED",
      uppercase: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: "taskSubmissions",
  }
);

// Compound Unique Index: (submissionGroupId, version)
taskSubmissionSchema.index({ submissionGroupId: 1, version: 1 }, { unique: true });

export const TaskSubmission = mongoose.model("TaskSubmission", taskSubmissionSchema);
