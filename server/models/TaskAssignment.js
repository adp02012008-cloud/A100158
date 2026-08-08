import mongoose from "mongoose";

const taskAssignmentSchema = new mongoose.Schema(
  {
    assignmentId: {
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
    assigneeEmail: {
      type: String,
      required: [true, "Assignee email is required"],
      lowercase: true,
      trim: true,
      index: true,
    },
    assignedBy: {
      type: String,
      required: [true, "AssignedBy email is required"],
      lowercase: true,
      trim: true,
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
    },
  },
  {
    timestamps: true,
    collection: "taskAssignments",
  }
);

// Indexes
taskAssignmentSchema.index({ taskId: 1, assigneeEmail: 1, status: 1 });

// Ensure unique ACTIVE assignment per task and assignee
taskAssignmentSchema.index(
  { taskId: 1, assigneeEmail: 1 },
  { unique: true, partialFilterExpression: { status: "ACTIVE" } }
);

taskAssignmentSchema.pre("save", function (next) {
  if (this.assigneeEmail) this.assigneeEmail = this.assigneeEmail.trim().toLowerCase();
  if (this.assignedBy) this.assignedBy = this.assignedBy.trim().toLowerCase();
  next();
});

export const TaskAssignment = mongoose.model("TaskAssignment", taskAssignmentSchema);
