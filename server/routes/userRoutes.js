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
} from "../controllers/userController.js";

const router = express.Router();

router.use(verifyAuthToken);

router.get("/", getAllUsers);
router.post("/", createUser);
router.get("/me", getCurrentUser);
router.patch("/me", updateSelfProfile);
router.put("/me", updateSelfProfile);
router.get("/assignable", getAssignableUsers);
router.get("/dashboard", getDashboardUsers);
router.put("/:id", updateUserProfile);
router.put("/:id/role", updateUserRole);
router.put("/:id/status", updateUserStatus);

export default router;
