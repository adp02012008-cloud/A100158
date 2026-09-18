import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { connectDB, disconnectDB } from "../config/db.js";
import { Course } from "../models/Course.js";
import { CoursePointRule } from "../models/CoursePointRule.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Load complete parsed dataset from student's college portal
const coursesJsonPath = path.join(__dirname, "parsedCourses.json");
const ALL_COURSES = JSON.parse(fs.readFileSync(coursesJsonPath, "utf-8"));

async function runSeed() {
  try {
    console.log("Connecting to MongoDB…");
    await connectDB();
    console.log(`Connected. Processing ${ALL_COURSES.length} courses from college portal…`);

    let inserted = 0;
    let updated = 0;

    for (const item of ALL_COURSES) {
      const courseName = item.name.trim();
      const category = item.category || "General";
      const description = item.description || `Comprehensive multi-level curriculum for ${courseName}.`;
      const clusterAccess = item.clusterAccess || (category === "Hardware" ? "Core" : "Both");
      const levels = item.levels || [];

      // Check if course already exists
      let course = await Course.findOne({
        name: { $regex: new RegExp(`^${courseName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
      });

      const courseId = course?.courseId || `CRS-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

      if (course) {
        course.category = category;
        course.description = description;
        course.clusterAccess = clusterAccess;
        course.levels = levels;
        course.status = "ACTIVE";
        await course.save();
        updated++;
      } else {
        course = await Course.create({
          courseId,
          name: courseName,
          category,
          description,
          clusterAccess,
          status: "ACTIVE",
          levels,
        });
        inserted++;
      }

      // Sync CoursePointRule
      const sanitizedLevelPoints = {};
      levels.forEach((lvl) => {
        const safeK = String(lvl.levelName).replace(/\.0\b/g, "").replace(/\./g, "-");
        sanitizedLevelPoints[safeK] = Number(lvl.rewardPoints) || 100;
      });

      await CoursePointRule.findOneAndUpdate(
        { courseId: course._id },
        {
          courseId: course._id,
          courseName: course.name,
          levelPoints: sanitizedLevelPoints,
          clusterAccess: course.clusterAccess,
        },
        { upsert: true, new: true }
      );
    }

    console.log(`\n🎉 SEED COMPLETED SUCCESSFULLY!`);
    console.log(`Total courses processed: ${inserted + updated} (${inserted} created, ${updated} updated)`);
    console.log(`Total database courses in MongoDB: ${await Course.countDocuments()}`);

    await disconnectDB();
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  }
}

runSeed();
