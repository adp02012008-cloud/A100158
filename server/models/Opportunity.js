import mongoose from "mongoose";

const opportunitySchema = new mongoose.Schema(
  {
    opportunityId: {
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
    type: {
      type: String,
      required: true,
      enum: ["Internship", "Hackathon", "Coding Contest", "Workshop", "Scholarship", "Certification", "College Event", "Other"],
    },
    company: {
      type: String,
      required: true,
      trim: true,
    },
    eligibility: {
      type: String,
      required: true,
      trim: true,
    },
    deadline: {
      type: String,
      required: true,
    },
    link: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["Open", "Interested", "Applied", "Selected", "Rejected", "Completed", "Closed"],
      default: "Open",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "opportunities",
  }
);

export const Opportunity = mongoose.model("Opportunity", opportunitySchema);
