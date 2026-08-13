import express from "express";
import { verifyAuthToken } from "../middleware/authMiddleware.js";
import {
  getCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  deleteAllCourses,
  getUserCourseProgress,
  updateCourseProgress,
  bulkImportCourses,
} from "../controllers/courseController.js";

const router = express.Router();

router.use(verifyAuthToken);

router.get("/", getCourses);
router.post("/", createCourse);
router.post("/bulk-import", bulkImportCourses);
router.delete("/all", deleteAllCourses);
router.put("/:id", updateCourse);
router.delete("/:id", deleteCourse);
router.get("/progress", getUserCourseProgress);
router.post("/progress/update", updateCourseProgress);

export default router;
