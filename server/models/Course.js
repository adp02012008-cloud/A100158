import mongoose from "mongoose";

const courseSchema = new mongoose.Schema(
  {
    courseId: {
      type: String,
      required: [true, "Course ID is required"],
      unique: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Course name is required"],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    category: {
      type: String,
      default: "General",
      trim: true,
    },
    prerequisites: [
      {
        type: String,
        trim: true,
      },
    ],
    clusterAccess: {
      type: String,
      default: "Both",
      trim: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
      uppercase: true,
      index: true,
    },
    levels: [
      {
        levelNumber: { type: Number, default: 0 },
        levelName: { type: String, default: "Level 0" },
        rewardPoints: { type: Number, default: 100 },
        prerequisites: { type: String, default: "" },
        assessmentType: { type: String, default: "MCQ" },
        topics: [{ type: String, trim: true }],
      },
    ],
  },
  {
    timestamps: true,
    collection: "courses",
  }
);

export const Course = mongoose.model("Course", courseSchema);
