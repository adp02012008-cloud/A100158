import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    notificationId: {
      type: String,
      required: [true, "Notification ID is required"],
      unique: true,
      trim: true,
      index: true,
    },
    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Target user reference is required"],
      index: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      default: null,
    },
    submissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TaskSubmission",
      default: null,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    eventKey: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "notifications",
  }
);

// Compound Unique Index: (targetUserId, eventKey)
notificationSchema.index({ targetUserId: 1, eventKey: 1 }, { unique: true });

export const Notification = mongoose.model("Notification", notificationSchema);
