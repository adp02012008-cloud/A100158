import mongoose from "mongoose";

const coursePointRuleSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      unique: true,
      index: true,
    },
    courseName: {
      type: String,
      required: true,
      trim: true,
    },
    levelPoints: {
      type: Map,
      of: Number,
      default: {},
    },
    clusterAccess: {
      type: String,
      default: "Both",
    },
  },
  {
    timestamps: true,
    collection: "coursePointRules",
  }
);

export const CoursePointRule = mongoose.model("CoursePointRule", coursePointRuleSchema);
