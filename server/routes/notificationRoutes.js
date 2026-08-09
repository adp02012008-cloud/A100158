import express from "express";
import { verifyAuthToken } from "../middleware/authMiddleware.js";
import { getNotifications, markNotificationRead, markAllNotificationsRead } from "../controllers/notificationController.js";

const router = express.Router();

router.use(verifyAuthToken);

router.get("/", getNotifications);
router.patch("/read-all", markAllNotificationsRead);
router.patch("/:id/read", markNotificationRead);

export default router;
