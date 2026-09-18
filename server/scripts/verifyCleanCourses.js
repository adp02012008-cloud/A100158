import dotenv from "dotenv";
import { connectDB, disconnectDB } from "../config/db.js";
import { Course } from "../models/Course.js";
import { UserCourseProgress } from "../models/UserCourseProgress.js";
import { CoursePointRule } from "../models/CoursePointRule.js";

dotenv.config();

async function verify() {
  await connectDB();

  const totalCourses = await Course.countDocuments();
  const parentCourses = await Course.find({ "levels.0": { $exists: true } }).sort({ name: 1 }).lean();
  const levelSuffixRegex = /\s*[-–]?\s*level\s*[-–]?\s*([0-9]+(?:\.[0-9]+)?[A-Z]?|[A-Z][0-9]*).*/i;
  const legacyLevelDuplicates = await Course.find({
    name: { $regex: /level/i },
    $or: [{ levels: { $size: 0 } }, { levels: { $exists: false } }],
  }).lean();

  console.log("=========================================");
  console.log("FINAL DATABASE VERIFICATION");
  console.log("=========================================");
  console.log(`Total Courses in MongoDB:               ${totalCourses}`);
  console.log(`Parent Courses with Integrated Levels: ${parentCourses.length}`);
  console.log(`Legacy Separate-Level Duplicates:     ${legacyLevelDuplicates.length}`);

  // Check progress records
  const allProgress = await UserCourseProgress.find({}).populate("courseId").lean();
  const orphanedProgress = allProgress.filter(p => !p.courseId);
  console.log(`Total UserCourseProgress Records:     ${allProgress.length}`);
  console.log(`Orphaned Progress Records:            ${orphanedProgress.length}`);

  console.log("\nFirst 10 Courses:");
  parentCourses.slice(0, 10).forEach((c, idx) => {
    console.log(`${idx + 1}. "${c.name}" | Category: ${c.category} | Levels Count: ${c.levels?.length}`);
  });

  await disconnectDB();
  process.exit(0);
}

verify().catch(e => {
  console.error(e);
  process.exit(1);
});
