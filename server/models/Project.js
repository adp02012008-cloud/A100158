import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    projectId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: ["Web Development", "Mobile Application", "Artificial Intelligence", "Data Science", "Internet of Things", "Cybersecurity", "Cloud", "Open Innovation", "Other"],
    },
    memberIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    memberNames: {
      type: String,
      default: "",
      trim: true,
    },
    techStack: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["Idea", "Planning", "In Progress", "Prototype", "Completed", "Deployed"],
    },
    github: {
      type: String,
      default: "",
      trim: true,
    },
    demo: {
      type: String,
      default: "",
      trim: true,
    },
    image: {
      type: String,
      default: "",
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "projects",
  }
);

export const Project = mongoose.model("Project", projectSchema);
