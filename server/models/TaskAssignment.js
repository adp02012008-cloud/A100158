import mongoose from "mongoose";

const taskAssignmentSchema = new mongoose.Schema(
  {
    assignmentId: {
      type: String,
      required: [true, "Assignment ID is required"],
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
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
      index: true,
    },
    assigneeEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
    removedAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: {
        values: ["ACTIVE", "REMOVED"],
        message: "{VALUE} is not a valid assignment status",
      },
      default: "ACTIVE",
      uppercase: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "taskAssignments",
  }
);

// Partial Unique Index for (taskId, userId) where status === 'ACTIVE'
taskAssignmentSchema.index(
  { taskId: 1, userId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "ACTIVE" },
  }
);

export const TaskAssignment = mongoose.model("TaskAssignment", taskAssignmentSchema);
