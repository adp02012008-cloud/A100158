import express from "express";
import { verifyAuthToken } from "../middleware/authMiddleware.js";
import {
  createSubmission,
  getSubmissions,
  getSubmissionById,
} from "../controllers/submissionController.js";

const router = express.Router();

router.use(verifyAuthToken);

router.post("/", createSubmission);
router.get("/", getSubmissions);
router.get("/:submissionId", getSubmissionById);

export default router;
