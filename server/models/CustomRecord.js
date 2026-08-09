import mongoose from "mongoose";

const customRecordSchema = new mongoose.Schema(
  {
    recordId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    customCollectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CustomCollection",
      required: true,
      index: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      default: {},
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    collection: "customRecords",
  }
);

export const CustomRecord = mongoose.model("CustomRecord", customRecordSchema);
