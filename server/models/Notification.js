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
      default: null,
      index: true,
    },
    targetEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
    },
    taskId: {
      type: String,
      default: null,
      trim: true,
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

export const Notification = mongoose.model("Notification", notificationSchema);
