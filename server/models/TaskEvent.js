import mongoose from "mongoose";

const taskEventSchema = new mongoose.Schema(
  {
    eventId: {
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
      default: "",
      trim: true,
    },
    actorEmail: {
      type: String,
      required: [true, "Actor email is required"],
      lowercase: true,
      trim: true,
    },
    eventType: {
      type: String,
      required: [true, "EventType is required"],
      uppercase: true,
      trim: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false, // Append-only audit history
    collection: "taskEvents",
  }
);

// Indexes
taskEventSchema.index({ taskId: 1, createdAt: -1 });
taskEventSchema.index({ actorEmail: 1, createdAt: -1 });

taskEventSchema.pre("save", function (next) {
  if (this.actorEmail) this.actorEmail = this.actorEmail.trim().toLowerCase();
  next();
});

export const TaskEvent = mongoose.model("TaskEvent", taskEventSchema);
