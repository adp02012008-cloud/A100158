import mongoose from "mongoose";

const clusterSchema = new mongoose.Schema(
  {
    clusterId: {
      type: String,
      required: [true, "Cluster ID is required"],
      unique: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Cluster name is required"],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
      uppercase: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "clusters",
  }
);

export const Cluster = mongoose.model("Cluster", clusterSchema);
