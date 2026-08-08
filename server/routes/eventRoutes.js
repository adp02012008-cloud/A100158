import express from "express";
import { verifyAuthToken } from "../middleware/authMiddleware.js";
import { getEvents } from "../controllers/eventController.js";

const router = express.Router();

router.use(verifyAuthToken);

router.get("/", getEvents);

export default router;
