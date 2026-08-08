import express from "express";
import { verifyAuthToken } from "../middleware/authMiddleware.js";
import { getAssignableUsers } from "../controllers/userController.js";

const router = express.Router();

router.use(verifyAuthToken);
router.get("/assignable", getAssignableUsers);

export default router;
