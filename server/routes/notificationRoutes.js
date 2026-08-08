import express from "express";
import { verifyAuthToken } from "../middleware/authMiddleware.js";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from "../controllers/notificationController.js";

const router = express.Router();

router.use(verifyAuthToken);

router.get("/", getNotifications);
router.get("/unread-count", getUnreadCount);
router.patch("/read-all", markAllAsRead);
router.patch("/:notificationId/read", markAsRead);

export default router;
