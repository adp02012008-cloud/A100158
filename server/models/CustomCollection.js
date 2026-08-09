import mongoose from "mongoose";

const customFieldSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    type: {
      type: String,
      required: true,
      enum: [
        "text",
        "longtext",
        "number",
        "boolean",
        "date",
        "url",
        "imageurl",
        "fileurl",
        "select",
        "multiselect",
        "userref",
        "clusterref",
      ],
      default: "text",
    },
    required: { type: Boolean, default: false },
    options: [{ type: String, trim: true }],
    defaultValue: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { _id: false }
);

const customCollectionSchema = new mongoose.Schema(
  {
    collectionId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      default: "",
    },
    fields: [customFieldSchema],
    visibility: {
      type: String,
      enum: ["PUBLIC", "MEMBER", "ADMIN"],
      default: "MEMBER",
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "customCollections",
  }
);

export const CustomCollection = mongoose.model("CustomCollection", customCollectionSchema);
