import express from "express";
import { verifyAuthToken, requireAdmin } from "../middleware/authMiddleware.js";
import {
  getOpportunities,
  createOpportunity,
  updateOpportunity,
  deleteOpportunity,
  toggleInterest,
  addThought,
  deleteThought,
} from "../controllers/opportunityController.js";

const router = express.Router();

router.use(verifyAuthToken);

router.get("/", getOpportunities);
router.post("/", requireAdmin, createOpportunity);
router.put("/:id", requireAdmin, updateOpportunity);
router.delete("/:id", requireAdmin, deleteOpportunity);

// Social Collaboration: Interest RSVP & Thoughts Discussion
router.post("/:id/interest", toggleInterest);
router.post("/:id/thoughts", addThought);
router.delete("/:id/thoughts/:thoughtId", deleteThought);

export default router;
