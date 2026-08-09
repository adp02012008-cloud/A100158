import mongoose from "mongoose";

const taskEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: [true, "Event ID is required"],
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
    submissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TaskSubmission",
      default: null,
    },
    actorUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    actorEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    eventType: {
      type: String,
      required: [true, "Event type is required"],
      trim: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    collection: "taskEvents",
  }
);

export const TaskEvent = mongoose.model("TaskEvent", taskEventSchema);
