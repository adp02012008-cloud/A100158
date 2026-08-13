import express from "express";
import { verifyAuthToken } from "../middleware/authMiddleware.js";
import { getPointRules, updatePointRule, recalculateAllPoints } from "../controllers/pointController.js";

const router = express.Router();

router.use(verifyAuthToken);

router.get("/rules", getPointRules);
router.put("/rules/:courseId", updatePointRule);
router.post("/recalculate", recalculateAllPoints);

export default router;
