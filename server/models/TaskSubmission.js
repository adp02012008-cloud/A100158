import mongoose from "mongoose";

const fileItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    url: { type: String, default: "" },
    dataUrl: { type: String, default: "" },
    type: { type: String, default: "" },
    size: { type: Number, default: 0 },
  },
  { _id: false }
);

const taskSubmissionSchema = new mongoose.Schema(
  {
    submissionId: {
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
    submissionGroupId: {
      type: String,
      required: [true, "Submission Group ID is required"],
      trim: true,
      index: true,
    },
    parentSubmissionId: {
      type: String,
      default: "",
      trim: true,
    },
    version: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },
    submissionType: {
      type: String,
      enum: ["INDIVIDUAL", "COLLABORATIVE"],
      default: "INDIVIDUAL",
      uppercase: true,
    },
    submittedBy: {
      type: String,
      required: [true, "SubmittedBy email is required"],
      lowercase: true,
      trim: true,
      index: true,
    },
    submittedFor: {
      type: [{ type: String, lowercase: true, trim: true, index: true }],
      default: [],
    },
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
    files: {
      type: [fileItemSchema],
      default: [],
    },
    status: {
      type: String,
      enum: {
        values: ["SUBMITTED", "APPROVED", "CHANGES_REQUESTED"],
        message: "{VALUE} is not a valid submission status",
      },
      default: "SUBMITTED",
      uppercase: true,
      index: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false, // Immutable: no updatedAt
    collection: "taskSubmissions",
  }
);

// Indexes
taskSubmissionSchema.index({ submissionGroupId: 1, version: -1 });
taskSubmissionSchema.index({ submissionGroupId: 1, version: 1 }, { unique: true });

taskSubmissionSchema.pre("save", function (next) {
  if (this.submittedBy) this.submittedBy = this.submittedBy.trim().toLowerCase();
  if (Array.isArray(this.submittedFor)) {
    this.submittedFor = this.submittedFor.map((e) => String(e).trim().toLowerCase());
  }
  next();
});

export const TaskSubmission = mongoose.model("TaskSubmission", taskSubmissionSchema);
