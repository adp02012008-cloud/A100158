import { Course } from "../models/Course.js";
import { UserCourseProgress } from "../models/UserCourseProgress.js";
import { CoursePointRule } from "../models/CoursePointRule.js";
import { recalculateUserPoints } from "./pointsService.js";

/**
 * Normalizing course level text helper
 */
function normalizeStr(str) {
  return String(str || "").toLowerCase().replace(/\s+/g, "").trim();
}

/**
 * Updates a user's course progress level, validates prerequisites, and triggers points recalculation.
 */
export async function updateUserCourseLevel(userId, courseId, newLevel, session = null) {
  const queryOpts = session ? { session } : {};

  const course = await Course.findById(courseId, null, queryOpts).exec();
  if (!course) {
    throw new Error(`Course not found: ${courseId}`);
  }

  // Validate prerequisites if updating to a non-empty level
  if (newLevel && course.prerequisites && course.prerequisites.length > 0) {
    const userProgressList = await UserCourseProgress.find({ userId }, null, queryOpts).populate("courseId").exec();
    const completedCourseNames = userProgressList
      .filter((p) => p.currentLevel && !["NULL", "NIL", ""].includes(p.currentLevel.toUpperCase()))
      .map((p) => normalizeStr(p.courseId?.name));

    for (const req of course.prerequisites) {
      if (!completedCourseNames.includes(normalizeStr(req))) {
        throw new Error(`Prerequisite not met: ${req} is required before taking ${course.name}.`);
      }
    }
  }

  let progress = null;
  if (!newLevel || ["NULL", "NIL", ""].includes(String(newLevel).toUpperCase())) {
    // Delete progress record if level set to empty
    await UserCourseProgress.deleteOne({ userId, courseId }, queryOpts);
  } else {
    progress = await UserCourseProgress.findOneAndUpdate(
      { userId, courseId },
      { currentLevel: String(newLevel).trim().toUpperCase(), completedAt: new Date() },
      { upsert: true, new: true, ...queryOpts }
    );
  }

  // Recalculate points after progress update
  await recalculateUserPoints(userId, session);

  return progress;
}
