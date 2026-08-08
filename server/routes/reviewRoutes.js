import express from "express";
import { verifyAuthToken, requireAdmin } from "../middleware/authMiddleware.js";
import { createReview, getReviews } from "../controllers/reviewController.js";

const router = express.Router();

router.use(verifyAuthToken);

router.post("/", requireAdmin, createReview);
router.get("/", getReviews);

export default router;
