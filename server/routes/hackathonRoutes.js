import express from "express";
import { verifyAuthToken, requireAdmin } from "../middleware/authMiddleware.js";
import { getHackathons, createHackathon, updateHackathon, deleteHackathon } from "../controllers/hackathonController.js";

const router = express.Router();

router.use(verifyAuthToken);

router.get("/", getHackathons);
router.post("/", requireAdmin, createHackathon);
router.put("/:id", requireAdmin, updateHackathon);
router.delete("/:id", requireAdmin, deleteHackathon);

export default router;
