import mongoose from "mongoose";

const hackathonSchema = new mongoose.Schema(
  {
    eventId: {
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
    organizer: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: String,
      required: true,
    },
    location: {
      type: String,
      default: "",
      trim: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
      index: true,
    },
    projectTitle: {
      type: String,
      default: "",
      trim: true,
    },
    theme: {
      type: String,
      default: "",
      trim: true,
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
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: ["Participated", "Shortlisted", "Finalist", "Winner", "Runner-up", "Completed"],
      default: "Participated",
    },
    position: {
      type: String,
      default: "",
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
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
    ppt: {
      type: String,
      default: "",
      trim: true,
    },
    driveFolder: {
      type: String,
      default: "",
      trim: true,
    },
    coverImage: {
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
    collection: "hackathons",
  }
);

export const Hackathon = mongoose.model("Hackathon", hackathonSchema);
