import express from "express";
import { verifyAuthToken } from "../middleware/authMiddleware.js";
import { createSubmission, getSubmissions, getSubmissionById, rejectSubmissionEdit } from "../controllers/submissionController.js";

const router = express.Router();

router.use(verifyAuthToken);

router.get("/", getSubmissions);
router.post("/", createSubmission);
router.get("/:id", getSubmissionById);

// Immutability rejection routes
router.put("/:id", rejectSubmissionEdit);
router.patch("/:id", rejectSubmissionEdit);
router.delete("/:id", rejectSubmissionEdit);

export default router;
