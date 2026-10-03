import { Course } from "../models/Course.js";
import { UserCourseProgress } from "../models/UserCourseProgress.js";
import { CoursePointRule } from "../models/CoursePointRule.js";
import { recalculateUserPoints } from "./pointsService.js";
import { sortCourseLevels } from "../utils/courseLevels.js";

/**
 * Normalizing course level text helper
 */
function normalizeStr(str) {
  return String(str || "").toLowerCase().replace(/\s+/g, "").trim();
}

/**
 * Updates a user's course progress level.
 * Rule: When a user completes a level (e.g. Level 3), all preceding levels in that course
 * (e.g. Level 0, Level 1, Level 2, Level 3) according to canonical sorting are automatically marked as completed.
 * Conversely, unchecking a level uncompletes that level and any subsequent levels dependent on it.
 */
export async function updateUserCourseLevel(userId, courseId, levelName, isCompleted = true, session = null, levelIndex = null) {
  const queryOpts = session ? { session } : {};

  const course = await Course.findById(courseId, null, queryOpts).exec();
  if (!course) {
    throw new Error(`Course not found: ${courseId}`);
  }

  let progress = await UserCourseProgress.findOne({ userId, courseId }, null, queryOpts).exec();

  if (!levelName || ["NULL", "NIL", ""].includes(String(levelName).toUpperCase())) {
    if (!isCompleted) {
      await UserCourseProgress.deleteOne({ userId, courseId }, queryOpts);
      return null;
    }
  }

  const cleanLevelName = String(levelName || "").trim();
  const sortedLevels = sortCourseLevels(course.levels || []);
  const normTarget = normalizeStr(cleanLevelName);

  // Find index of the target level within canonical sorted course levels
  let targetIdx = -1;
  if (levelIndex !== undefined && levelIndex !== null && Number(levelIndex) >= 0 && Number(levelIndex) < sortedLevels.length) {
    targetIdx = Number(levelIndex);
  } else {
    targetIdx = sortedLevels.findIndex((lvl) => {
      const lName = lvl?.levelName || "";
      return (
        normalizeStr(lName) === normTarget ||
        normalizeStr(`${course.name}-${lName}`) === normTarget ||
        normalizeStr(lName) === normalizeStr(`Level ${lvl?.levelNumber}`)
      );
    });
  }

  let completedLevels = progress && Array.isArray(progress.completedLevels) ? [...progress.completedLevels] : [];
  if (progress && completedLevels.length === 0 && progress.currentLevel) {
    completedLevels.push(progress.currentLevel);
  }

  if (isCompleted) {
    // Rule: Auto-select all previous levels up to target level as completed
    if (targetIdx !== -1) {
      const previousAndTargetLevels = sortedLevels.slice(0, targetIdx + 1);
      previousAndTargetLevels.forEach((lvl) => {
        const nameToAdd = lvl.levelName || `Level ${lvl.levelNumber}`;
        const normAdd = normalizeStr(nameToAdd);
        if (!completedLevels.some((existing) => normalizeStr(existing) === normAdd)) {
          completedLevels.push(nameToAdd);
        }
      });
    } else if (cleanLevelName) {
      if (!completedLevels.some((existing) => normalizeStr(existing) === normTarget)) {
        completedLevels.push(cleanLevelName);
      }
    }
  } else {
    // Rule: Unchecking a level removes that level and any subsequent levels dependent on it
    if (targetIdx !== -1) {
      const levelsToRemove = sortedLevels.slice(targetIdx).map((lvl) => normalizeStr(lvl.levelName || `Level ${lvl.levelNumber}`));
      completedLevels = completedLevels.filter((existing) => !levelsToRemove.includes(normalizeStr(existing)));
    } else {
      completedLevels = completedLevels.filter((existing) => normalizeStr(existing) !== normTarget);
    }
  }

  if (!progress) {
    if (!isCompleted || completedLevels.length === 0) return null;
    const latestLevel = targetIdx !== -1 && sortedLevels[targetIdx]
      ? (sortedLevels[targetIdx].levelName || cleanLevelName)
      : cleanLevelName;

    progress = new UserCourseProgress({
      userId,
      courseId,
      currentLevel: latestLevel,
      completedLevels,
      completedAt: new Date(),
    });
    await progress.save(queryOpts);
  } else {
    if (completedLevels.length === 0) {
      await UserCourseProgress.deleteOne({ _id: progress._id }, queryOpts);
      progress = null;
    } else {
      // Find highest completed level among sortedLevels
      let highestLevel = cleanLevelName;
      if (sortedLevels.length > 0) {
        for (let i = sortedLevels.length - 1; i >= 0; i--) {
          const lNorm = normalizeStr(sortedLevels[i].levelName || `Level ${sortedLevels[i].levelNumber}`);
          if (completedLevels.some((c) => normalizeStr(c) === lNorm)) {
            highestLevel = sortedLevels[i].levelName || `Level ${sortedLevels[i].levelNumber}`;
            break;
          }
        }
      }
      progress.completedLevels = completedLevels;
      progress.currentLevel = highestLevel || completedLevels[completedLevels.length - 1] || "";
      progress.completedAt = new Date();
      await progress.save(queryOpts);
    }
  }

  return progress;
}
