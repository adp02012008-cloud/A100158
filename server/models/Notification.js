import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    notificationId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    targetEmail: {
      type: String,
      required: [true, "Target email is required"],
      lowercase: true,
      trim: true,
      index: true,
    },
    type: {
      type: String,
      default: "TASK",
      uppercase: true,
    },
    taskId: {
      type: String,
      default: "",
      trim: true,
    },
    submissionId: {
      type: String,
      default: "",
      trim: true,
    },
    title: {
      type: String,
      required: [true, "Notification title is required"],
      trim: true,
    },
    message: {
      type: String,
      required: [true, "Notification message is required"],
      trim: true,
    },
    eventKey: {
      type: String,
      required: [true, "EventKey is required for deduplication"],
      unique: true,
      trim: true,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
    collection: "notifications",
  }
);

// Indexes
notificationSchema.index({ targetEmail: 1, readAt: 1 });
notificationSchema.index({ targetEmail: 1, createdAt: -1 });

notificationSchema.pre("save", function (next) {
  if (this.targetEmail) this.targetEmail = this.targetEmail.trim().toLowerCase();
  next();
});

export const Notification = mongoose.model("Notification", notificationSchema);
