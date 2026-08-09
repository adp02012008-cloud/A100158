import express from "express";
import { verifyAuthToken } from "../middleware/authMiddleware.js";
import {
  getAllUsers,
  getCurrentUser,
  updateSelfProfile,
  getAssignableUsers,
  getDashboardUsers,
  createUser,
  updateUserProfile,
  updateUserRole,
  updateUserStatus,
  deleteUser,
} from "../controllers/userController.js";

const router = express.Router();

// 1. Public route for Dashboard & Leaderboard view
router.get("/dashboard", getDashboardUsers);

// 2. Protected user management & profile routes
router.use(verifyAuthToken);

router.get("/", getAllUsers);
router.post("/", createUser);
router.get("/me", getCurrentUser);
router.patch("/me", updateSelfProfile);
router.put("/me", updateSelfProfile);
router.get("/assignable", getAssignableUsers);
router.put("/:id", updateUserProfile);
router.put("/:id/role", updateUserRole);
router.put("/:id/status", updateUserStatus);
router.delete("/:id", deleteUser);

export default router;
