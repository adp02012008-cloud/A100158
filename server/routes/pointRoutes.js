import express from "express";
import { verifyAuthToken, requireAdmin } from "../middleware/authMiddleware.js";
import { getPointRules, updatePointRule, recalculateAllPoints, syncRewardPointsFromSheet } from "../controllers/pointController.js";

const router = express.Router();

router.use(verifyAuthToken);

router.get("/rules", getPointRules);
router.put("/rules/:courseId", requireAdmin, updatePointRule);
router.post("/recalculate", requireAdmin, recalculateAllPoints);
router.post("/sync-sheet-rewards", requireAdmin, syncRewardPointsFromSheet);

export default router;
