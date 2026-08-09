import express from "express";
import { verifyAuthToken } from "../middleware/authMiddleware.js";
import {
  createSubmission,
  createDirectProject,
  getSubmissions,
  getSubmissionById,
  updateSubmission,
  deleteSubmission,
} from "../controllers/submissionController.js";

const router = express.Router();

router.use(verifyAuthToken);

router.get("/", getSubmissions);
router.post("/", createSubmission);
router.post("/direct", createDirectProject);
router.get("/:id", getSubmissionById);
router.put("/:id", updateSubmission);
router.patch("/:id", updateSubmission);
router.delete("/:id", deleteSubmission);

export default router;
