import express from "express";
import { verifyAuthToken } from "../middleware/authMiddleware.js";
import { createReview, getReviews, rejectReviewEdit } from "../controllers/reviewController.js";

const router = express.Router();

router.use(verifyAuthToken);

router.get("/", getReviews);
router.post("/", createReview);

// Immutability rejection routes
router.put("/:id", rejectReviewEdit);
router.patch("/:id", rejectReviewEdit);
router.delete("/:id", rejectReviewEdit);

export default router;
