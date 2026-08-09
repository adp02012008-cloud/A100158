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
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: [true, "Task reference is required"],
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
      required: true,
      index: true,
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
