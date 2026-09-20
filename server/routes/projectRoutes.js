import express from "express";
import { verifyAuthToken } from "../middleware/authMiddleware.js";
import { getProjects, createProject, updateProject, deleteProject } from "../controllers/projectController.js";

const router = express.Router();

router.use(verifyAuthToken);

router.get("/", getProjects);
router.post("/", createProject);
router.put("/:id", updateProject);
router.delete("/:id", deleteProject);

export default router;
