import express from "express";
import { verifyAuthToken, requireAdmin } from "../middleware/authMiddleware.js";
import { getCourses, createCourse, updateCourse, getUserCourseProgress, updateCourseProgress } from "../controllers/courseController.js";

const router = express.Router();

router.use(verifyAuthToken);

router.get("/", getCourses);
router.post("/", requireAdmin, createCourse);
router.put("/:id", requireAdmin, updateCourse);
router.get("/progress", getUserCourseProgress);
router.post("/progress/update", updateCourseProgress);

export default router;
