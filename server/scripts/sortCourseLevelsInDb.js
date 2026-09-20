import dotenv from "dotenv";
import { connectDB, disconnectDB } from "../config/db.js";
import { Course } from "../models/Course.js";
import { parseLevelInfo, sortCourseLevels } from "../controllers/courseController.js";

dotenv.config();

export async function executeSortCourseLevels() {
  console.log("==================================================");
  console.log("STARTING COURSE LEVELS NATURAL SORT IN MONGODB");
  console.log("==================================================");

  await connectDB();

  const courses = await Course.find({}).exec();
  console.log(`Found ${courses.length} courses to inspect and sort.`);

  let updatedCount = 0;

  for (const course of courses) {
    if (!Array.isArray(course.levels) || course.levels.length <= 1) continue;

    const originalOrder = course.levels.map((l) => l.levelName).join(" | ");
    const sorted = sortCourseLevels(course.levels).map((lvl, idx) => ({
      ...lvl.toObject ? lvl.toObject() : lvl,
      levelNumber: idx,
    }));
    const newOrder = sorted.map((l) => l.levelName).join(" | ");

    if (originalOrder !== newOrder) {
      course.levels = sorted;
      await course.save();
      updatedCount++;
      console.log(`\nUpdated Course: "${course.name}"`);
      console.log(`  Old: ${originalOrder}`);
      console.log(`  New: ${newOrder}`);
    }
  }

  console.log("\n==================================================");
  console.log(`COMPLETE: Sorted levels in ${updatedCount} courses.`);
  console.log("==================================================");

  await disconnectDB();
}

if (process.argv[1]?.includes("sortCourseLevelsInDb.js")) {
  executeSortCourseLevels()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Migration failed:", err);
      process.exit(1);
    });
}
