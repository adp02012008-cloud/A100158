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
    const b = req.body || {};
    const photoId = b.photoId || b.PHOTO_ID || `IMG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const caption = b.caption || b.CAPTION || b.title || b.TITLE || b.description || b.DESCRIPTION || "Gallery Item";
    const imageUrl = b.imageUrl || b.IMAGE_URL || b.COVER_IMAGE || b.coverImage || b.fileUrl || b.FILE_URL || b.url || b.URL || "https://drive.google.com";
    const date = b.date || b.DATE || new Date().toISOString().split("T")[0];

    const item = await GalleryItem.create({
      ...b,
      photoId,
      caption,
      imageUrl,
      date,
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
    const b = req.body || {};
    const updateData = { ...b };
    if (b.caption || b.CAPTION || b.title || b.TITLE) {
      updateData.caption = b.caption || b.CAPTION || b.title || b.TITLE;
    }
    if (b.imageUrl || b.IMAGE_URL || b.COVER_IMAGE || b.coverImage) {
      updateData.imageUrl = b.imageUrl || b.IMAGE_URL || b.COVER_IMAGE || b.coverImage;
    }
    if (b.date || b.DATE) {
      updateData.date = b.date || b.DATE;
    }

    let item;
    if (id && id.match(/^[0-9a-fA-F]{24}$/)) {
      item = await GalleryItem.findByIdAndUpdate(id, updateData, { new: true });
    }
    if (!item) {
      item = await GalleryItem.findOneAndUpdate({ photoId: id }, updateData, { new: true });
    }
    if (!item) return res.status(404).json({ success: false, message: "Gallery item not found" });
    return res.json({ success: true, item });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function deleteGalleryItem(req, res) {
  try {
    const { id } = req.params;
    let item;
    if (id && id.match(/^[0-9a-fA-F]{24}$/)) {
      item = await GalleryItem.findByIdAndDelete(id);
    }
    if (!item) {
      item = await GalleryItem.findOneAndDelete({ photoId: id });
    }
    if (!item) return res.status(404).json({ success: false, message: "Gallery item not found" });
    return res.json({ success: true, message: "Gallery item deleted" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
