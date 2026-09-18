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
 * Updates a user's course progress level independently without prerequisite gating.
 * Supports independent level completion/undo tracking via completedLevels array.
 */
export async function updateUserCourseLevel(userId, courseId, levelName, isCompleted = true, session = null) {
  const queryOpts = session ? { session } : {};

  const course = await Course.findById(courseId, null, queryOpts).exec();
  if (!course) {
    throw new Error(`Course not found: ${courseId}`);
  }

  // Levels and courses are completely independent — no prerequisite barriers

  let progress = await UserCourseProgress.findOne({ userId, courseId }, null, queryOpts).exec();

  if (!levelName || ["NULL", "NIL", ""].includes(String(levelName).toUpperCase())) {
    if (!isCompleted) {
      await UserCourseProgress.deleteOne({ userId, courseId }, queryOpts);
      await recalculateUserPoints(userId, session);
      return null;
    }
  }

  const cleanLevelName = String(levelName || "").trim();

  if (!progress) {
    if (!isCompleted) return null;
    progress = new UserCourseProgress({
      userId,
      courseId,
      currentLevel: cleanLevelName,
      completedLevels: cleanLevelName ? [cleanLevelName] : [],
      completedAt: new Date(),
    });
    await progress.save(queryOpts);
  } else {
    let completedLevels = Array.isArray(progress.completedLevels) ? [...progress.completedLevels] : [];
    if (completedLevels.length === 0 && progress.currentLevel) {
      completedLevels.push(progress.currentLevel);
    }

    const normTarget = normalizeStr(cleanLevelName);
    const existingIdx = completedLevels.findIndex((lvl) => normalizeStr(lvl) === normTarget);

    if (isCompleted) {
      if (existingIdx === -1 && cleanLevelName) {
        completedLevels.push(cleanLevelName);
      }
    } else {
      if (existingIdx !== -1) {
        completedLevels.splice(existingIdx, 1);
      }
    }

    if (completedLevels.length === 0) {
      await UserCourseProgress.deleteOne({ _id: progress._id }, queryOpts);
      progress = null;
    } else {
      progress.completedLevels = completedLevels;
      progress.currentLevel = completedLevels[completedLevels.length - 1] || "";
      progress.completedAt = new Date();
      await progress.save(queryOpts);
    }
  }

  await recalculateUserPoints(userId, session);
  return progress;
}
