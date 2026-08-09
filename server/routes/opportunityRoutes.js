import express from "express";
import { verifyAuthToken, requireAdmin } from "../middleware/authMiddleware.js";
import { getOpportunities, createOpportunity, updateOpportunity, deleteOpportunity } from "../controllers/opportunityController.js";

const router = express.Router();

router.use(verifyAuthToken);

router.get("/", getOpportunities);
router.post("/", requireAdmin, createOpportunity);
router.put("/:id", requireAdmin, updateOpportunity);
router.delete("/:id", requireAdmin, deleteOpportunity);

export default router;
