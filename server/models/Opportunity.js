import mongoose from "mongoose";

const opportunitySchema = new mongoose.Schema(
  {
    opportunityId: {
      type: String,
      default: () => `OPP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      unique: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      default: "Untitled Opportunity",
      trim: true,
    },
    type: {
      type: String,
      default: "Hackathon",
      trim: true,
    },
    company: {
      type: String,
      default: "",
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    eligibility: {
      type: String,
      default: "",
      trim: true,
    },
    pskillEligibility: {
      type: String,
      default: "",
      trim: true,
    },
    deadline: {
      type: String,
      default: "",
      trim: true,
    },
    eventLevel: {
      type: String,
      default: "National",
      trim: true,
    },
    teamSize: {
      type: String,
      default: "2-5 Members",
      trim: true,
    },
    registrationFee: {
      type: String,
      default: "Free",
      trim: true,
    },
    link: {
      type: String,
      default: "",
      trim: true,
    },
    guidelinesUrl: {
      type: String,
      default: "",
      trim: true,
    },
    internalFormUrl: {
      type: String,
      default: "",
      trim: true,
    },
    tracks: {
      type: mongoose.Schema.Types.Mixed,
      default: [],
    },
    schedule: {
      type: mongoose.Schema.Types.Mixed,
      default: "",
    },
    prizes: {
      type: String,
      default: "",
      trim: true,
    },
    rewardPoints: {
      type: String,
      default: "",
      trim: true,
    },
    facultyMentor: {
      type: String,
      default: "",
      trim: true,
    },
    contactInfo: {
      type: String,
      default: "",
      trim: true,
    },
    bannerImage: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      default: "Open",
      trim: true,
    },
    // Social Features: Interested Members
    interestedUsers: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        name: String,
        email: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    // Social Features: Community Thoughts & Discussion
    thoughts: [
      {
        _id: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        userName: String,
        userEmail: String,
        content: String,
        tag: { type: String, default: "General" }, // "Looking for Team", "Interested", "Idea", "Question", "General"
        createdAt: { type: Date, default: Date.now },
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    collection: "opportunities",
  }
);

export const Opportunity = mongoose.model("Opportunity", opportunitySchema);
