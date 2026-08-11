import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    taskId: {
      type: String,
      required: [true, "Task ID is required"],
      unique: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
    },
    domain: {
      type: String,
      required: [true, "Domain is required"],
      trim: true,
      index: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },
    dueDate: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: {
        values: ["PENDING", "IN_PROGRESS", "UNDER_REVIEW", "CHANGES_REQUESTED", "COMPLETED", "APPROVED"],
        message: "{VALUE} is not a valid task status",
      },
      default: "PENDING",
      uppercase: true,
      index: true,
    },
    submissionMode: {
      type: String,
      enum: {
        values: ["FLEXIBLE", "INDIVIDUAL", "COLLABORATIVE"],
        message: "{VALUE} is not a valid submission mode",
      },
      default: "FLEXIBLE",
      uppercase: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "tasks",
  }
);

export const Task = mongoose.model("Task", taskSchema);
