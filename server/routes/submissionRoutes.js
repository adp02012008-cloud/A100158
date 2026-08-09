import express from "express";
import { verifyAuthToken } from "../middleware/authMiddleware.js";
import {
  createSubmission,
  getSubmissions,
  getSubmissionById,
  updateSubmission,
} from "../controllers/submissionController.js";

const router = express.Router();

router.use(verifyAuthToken);

router.get("/", getSubmissions);
router.post("/", createSubmission);
router.get("/:id", getSubmissionById);
router.put("/:id", updateSubmission);
router.patch("/:id", updateSubmission);

export default router;
