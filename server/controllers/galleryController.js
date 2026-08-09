import { GalleryItem } from "../models/GalleryItem.js";

export async function getGalleryItems(req, res) {
  try {
    const items = await GalleryItem.find({}).sort({ date: -1 }).populate("eventId uploadedBy createdBy").exec();
    return res.json({ success: true, gallery: items });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function createGalleryItem(req, res) {
  try {
    const photoId = `IMG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const item = await GalleryItem.create({
      ...req.body,
      photoId,
      uploadedBy: req.user._id,
      createdBy: req.user._id,
    });
    return res.status(201).json({ success: true, item });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateGalleryItem(req, res) {
  try {
    const { id } = req.params;
    const item = await GalleryItem.findByIdAndUpdate(id, req.body, { new: true });
    if (!item) return res.status(404).json({ success: false, message: "Gallery item not found" });
    return res.json({ success: true, item });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function deleteGalleryItem(req, res) {
  try {
    const { id } = req.params;
    const item = await GalleryItem.findByIdAndDelete(id);
    if (!item) return res.status(404).json({ success: false, message: "Gallery item not found" });
    return res.json({ success: true, message: "Gallery item deleted" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
