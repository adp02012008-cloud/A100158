import express from "express";
import { verifyAuthToken } from "../middleware/authMiddleware.js";
import { getHackathons, createHackathon, updateHackathon, deleteHackathon } from "../controllers/hackathonController.js";

const router = express.Router();

router.use(verifyAuthToken);

router.get("/", getHackathons);
router.post("/", createHackathon);
router.put("/:id", updateHackathon);
router.delete("/:id", deleteHackathon);

export default router;
