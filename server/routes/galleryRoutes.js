import express from "express";
import { verifyAuthToken, requireAdmin } from "../middleware/authMiddleware.js";
import { getGalleryItems, createGalleryItem, updateGalleryItem, deleteGalleryItem } from "../controllers/galleryController.js";

const router = express.Router();

router.use(verifyAuthToken);

router.get("/", getGalleryItems);
router.post("/", createGalleryItem);
router.put("/:id", requireAdmin, updateGalleryItem);
router.delete("/:id", requireAdmin, deleteGalleryItem);

export default router;
