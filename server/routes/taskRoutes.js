import express from "express";
import { verifyAuthToken } from "../middleware/authMiddleware.js";
import {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  getTaskCoverage,
} from "../controllers/taskController.js";

const router = express.Router();

// Apply auth middleware to all task routes
router.use(verifyAuthToken);

router.get("/", getTasks);
router.get("/:taskId", getTaskById);
router.get("/:taskId/coverage", getTaskCoverage);
router.post("/", createTask);
router.put("/:taskId", updateTask);
router.delete("/:taskId", deleteTask);

export default router;
