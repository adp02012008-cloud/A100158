import mongoose from "mongoose";

const galleryItemSchema = new mongoose.Schema(
  {
    photoId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hackathon",
      default: null,
      index: true,
    },
    eventLegacyId: {
      type: String,
      default: "",
      trim: true,
    },
    imageUrl: {
      type: String,
      required: true,
      trim: true,
    },
    caption: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: String,
      required: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "galleryItems",
  }
);

export const GalleryItem = mongoose.model("GalleryItem", galleryItemSchema);
