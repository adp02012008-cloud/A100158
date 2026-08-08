import express from "express";
import { verifyAuthToken } from "../middleware/authMiddleware.js";
import { createReview, getReviews } from "../controllers/reviewController.js";

const router = express.Router();

router.use(verifyAuthToken);

router.post("/", createReview);
router.get("/", getReviews);

export default router;
