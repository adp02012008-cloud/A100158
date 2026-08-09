import express from "express";
import { verifyAuthToken } from "../middleware/authMiddleware.js";
import {
  getCustomCollections,
  createCustomCollection,
  updateCustomCollection,
  getCustomRecords,
  createCustomRecord,
  updateCustomRecord,
  deleteCustomRecord,
} from "../controllers/customCollectionController.js";

const router = express.Router();

router.use(verifyAuthToken);

router.get("/", getCustomCollections);
router.post("/", createCustomCollection);
router.put("/:id", updateCustomCollection);
router.get("/:slug/records", getCustomRecords);
router.post("/:slug/records", createCustomRecord);
router.put("/:slug/records/:recordId", updateCustomRecord);
router.delete("/:slug/records/:recordId", deleteCustomRecord);

export default router;
