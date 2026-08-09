import express from "express";
import { verifyAuthToken, requireAdmin } from "../middleware/authMiddleware.js";
import { getClusters, createCluster, updateCluster, deleteCluster, assignMemberCluster } from "../controllers/clusterController.js";

const router = express.Router();

router.use(verifyAuthToken);

router.get("/", getClusters);
router.post("/", requireAdmin, createCluster);
router.put("/:id", requireAdmin, updateCluster);
router.delete("/:id", requireAdmin, deleteCluster);
router.patch("/assign-member", requireAdmin, assignMemberCluster);

export default router;
