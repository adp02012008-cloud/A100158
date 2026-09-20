import express from "express";
import { verifyAuthToken } from "../middleware/authMiddleware.js";
import { getGalleryItems, createGalleryItem, updateGalleryItem, deleteGalleryItem } from "../controllers/galleryController.js";

const router = express.Router();

router.use(verifyAuthToken);

router.get("/", getGalleryItems);
router.post("/", createGalleryItem);
router.put("/:id", updateGalleryItem);
router.delete("/:id", deleteGalleryItem);

export default router;
