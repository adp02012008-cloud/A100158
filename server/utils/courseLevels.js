/**
 * server/utils/courseLevels.js
 * Canonical helper for parsing and natural sorting of course levels.
 */

export function parseLevelInfo(name = "") {
  const str = String(name || "").trim();
  const isTraining = /training/i.test(str);

  let num = 999;
  let sub = "";

  // 1. Match "level" followed by number and optional letter (e.g. Level 0, Level 1A, Level 2 Training)
  const levelMatch = str.match(/level\s*[-–:]?\s*([0-9]+(?:\.[0-9]+)?)\s*([a-z]?)/i);
  if (levelMatch) {
    num = parseFloat(levelMatch[1]);
    sub = (levelMatch[2] || "").toLowerCase();
  } else {
    // 2. Match "training" followed by number (e.g. Training 1)
    const trainingMatch = str.match(/training\s*[-–:]?\s*([0-9]+(?:\.[0-9]+)?)\s*([a-z]?)/i);
    if (trainingMatch) {
      num = parseFloat(trainingMatch[1]);
      sub = (trainingMatch[2] || "").toLowerCase();
    } else {
      // 3. Fallback to any standalone number
      const fallbackMatch = str.match(/\b([0-9]+(?:\.[0-9]+)?)\s*([a-z]?)\b/i);
      if (fallbackMatch) {
        num = parseFloat(fallbackMatch[1]);
        sub = (fallbackMatch[2] || "").toLowerCase();
      }
    }
  }

  return {
    num,
    sub,
    isTraining: isTraining ? 0 : 1, // Training (0) comes before Regular/Exam (1)
  };
}

export function sortCourseLevels(levels = []) {
  if (!Array.isArray(levels) || levels.length === 0) return [];

  return [...levels].sort((a, b) => {
    const nameA = a?.levelName || "";
    const nameB = b?.levelName || "";

    const pA = parseLevelInfo(nameA);
    const pB = parseLevelInfo(nameB);

    // Primary: Base level number (e.g. 0 before 1, 1 before 2)
    if (pA.num !== pB.num) {
      return pA.num - pB.num;
    }
    // Secondary: Training comes before regular level (e.g. Level 1 Training before Level 1)
    if (pA.isTraining !== pB.isTraining) {
      return pA.isTraining - pB.isTraining;
    }
    // Tertiary: Sub-level / letter tier (e.g. Level 1A before Level 1B)
    if (pA.sub !== pB.sub) {
      return pA.sub.localeCompare(pB.sub);
    }
    return (nameA || "").localeCompare(nameB || "");
  });
}
