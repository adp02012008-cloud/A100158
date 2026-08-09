import mongoose from "mongoose";

const userCourseProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    currentLevel: {
      type: String,
      required: true,
      trim: true,
    },
    completedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: "userCourseProgress",
  }
);

// Compound unique index (userId, courseId)
userCourseProgressSchema.index({ userId: 1, courseId: 1 }, { unique: true });

export const UserCourseProgress = mongoose.model("UserCourseProgress", userCourseProgressSchema);
