import { User } from "../models/User.js";
import { UserCourseProgress } from "../models/UserCourseProgress.js";
import { CoursePointRule } from "../models/CoursePointRule.js";
import { TaskSubmission } from "../models/TaskSubmission.js";
import { TaskReview } from "../models/TaskReview.js";
import { getEffectiveVersionState } from "./taskStateService.js";

/**
 * Calculates authoritative Activity & Reward Points for a user based on MongoDB data models.
 */
export async function recalculateUserPoints(userId, session = null) {
  const queryOpts = session ? { session } : {};

  const user = await User.findById(userId, null, queryOpts).exec();
  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  // 1. Course Progress Points
  const userProgressList = await UserCourseProgress.find({ userId: user._id }, null, queryOpts).exec();
  const pointRules = await CoursePointRule.find({}, null, queryOpts).exec();

  const ruleMap = new Map();
  pointRules.forEach((rule) => ruleMap.set(String(rule.courseId), rule));

  let courseActivityPoints = 0;

  userProgressList.forEach((prog) => {
    const rule = ruleMap.get(String(prog.courseId));
    if (rule && rule.levelPoints && prog.currentLevel) {
      const sanitizedLvl = prog.currentLevel.replace(/\.0\b/g, "").replace(/\./g, "-");
      const pts = rule.levelPoints.get(prog.currentLevel) ||
                  rule.levelPoints.get(sanitizedLvl) ||
                  rule.levelPoints.get(prog.currentLevel.replace("-", " ")) || 0;
      courseActivityPoints += Number(pts) || 0;
    }
  });

  // 2. Approved Task Submissions Points (10 pts per approved task submission)
  const submissions = await TaskSubmission.find({ submittedFor: user._id }, null, queryOpts).exec();
  let taskActivityPoints = 0;

  for (const sub of submissions) {
    const reviews = await TaskReview.find({ submissionId: sub._id }, null, queryOpts).exec();
    const versionState = getEffectiveVersionState(reviews);
    if (versionState === "APPROVED") {
      taskActivityPoints += 10;
    }
  }

  const totalActivity = user.activityPoints || 0;
  const totalReward = user.rewardPoints || 0;

  return {
    userId: user._id,
    activityPoints: totalActivity,
    rewardPoints: totalReward,
  };
}
