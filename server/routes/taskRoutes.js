import express from "express";
import { verifyAuthToken, requireAdmin } from "../middleware/authMiddleware.js";
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
router.post("/", requireAdmin, createTask);
router.put("/:taskId", requireAdmin, updateTask);
router.delete("/:taskId", requireAdmin, deleteTask);

export default router;
