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
      enum: ["Both", "Core", "Computer Cluster"],
      default: "Both",
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
      uppercase: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "courses",
  }
);

export const Course = mongoose.model("Course", courseSchema);
