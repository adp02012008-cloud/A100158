import { Opportunity } from "../models/Opportunity.js";
import { isAdmin } from "../services/authorizationService.js";

function resolveQuery(id) {
  if (id && String(id).match(/^[0-9a-fA-F]{24}$/)) {
    return { $or: [{ _id: id }, { opportunityId: id }] };
  }
  return { opportunityId: id };
}

export async function getOpportunities(req, res) {
  try {
    const opportunities = await Opportunity.find({})
      .sort({ createdAt: -1 })
      .populate("createdBy interestedUsers.userId")
      .exec();
    return res.json({ success: true, opportunities });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function createOpportunity(req, res) {
  try {
    const b = req.body || {};
    const opportunityId = b.opportunityId || b.OPPORTUNITY_ID || `OPP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const opportunity = await Opportunity.create({
      opportunityId,
      title: b.title || b.TITLE || "Upcoming Hackathon / Opportunity",
      type: b.type || b.TYPE || "Hackathon",
      company: b.company || b.COMPANY || "",
      description: b.description || b.DESCRIPTION || "",
      eligibility: b.eligibility || b.ELIGIBILITY || "",
      pskillEligibility: b.pskillEligibility || b.PSKILL_ELIGIBILITY || "",
      deadline: b.deadline || b.DEADLINE || "",
      eventLevel: b.eventLevel || b.EVENT_LEVEL || "National",
      teamSize: b.teamSize || b.TEAM_SIZE || "2-5 Members",
      registrationFee: b.registrationFee || b.REGISTRATION_FEE || "Free",
      link: b.link || b.LINK || b.url || "",
      guidelinesUrl: b.guidelinesUrl || b.GUIDELINES_URL || "",
      internalFormUrl: b.internalFormUrl || b.INTERNAL_FORM_URL || "",
      tracks: Array.isArray(b.tracks) ? b.tracks : (b.tracks ? [b.tracks] : []),
      schedule: b.schedule || b.SCHEDULE || "",
      prizes: b.prizes || b.PRIZES || "",
      rewardPoints: b.rewardPoints || b.REWARD_POINTS || "",
      facultyMentor: b.facultyMentor || b.FACULTY_MENTOR || "",
      contactInfo: b.contactInfo || b.CONTACT_INFO || "",
      bannerImage: b.bannerImage || b.BANNER_IMAGE || b.image || "",
      status: b.status || b.STATUS || "Open",
      createdBy: req.user?._id,
      interestedUsers: [],
      thoughts: [],
    });

    return res.status(201).json({ success: true, opportunity });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateOpportunity(req, res) {
  try {
    const { id } = req.params;
    const query = resolveQuery(id);
    const opportunity = await Opportunity.findOne(query);
    if (!opportunity) return res.status(404).json({ success: false, message: "Opportunity not found" });

    const b = req.body || {};
    if (b.title !== undefined || b.TITLE !== undefined) opportunity.title = b.title || b.TITLE || "";
    if (b.type !== undefined || b.TYPE !== undefined) opportunity.type = b.type || b.TYPE || "Hackathon";
    if (b.company !== undefined || b.COMPANY !== undefined) opportunity.company = b.company || b.COMPANY || "";
    if (b.description !== undefined || b.DESCRIPTION !== undefined) opportunity.description = b.description || b.DESCRIPTION || "";
    if (b.eligibility !== undefined || b.ELIGIBILITY !== undefined) opportunity.eligibility = b.eligibility || b.ELIGIBILITY || "";
    if (b.pskillEligibility !== undefined || b.PSKILL_ELIGIBILITY !== undefined) opportunity.pskillEligibility = b.pskillEligibility || b.PSKILL_ELIGIBILITY || "";
    if (b.deadline !== undefined || b.DEADLINE !== undefined) opportunity.deadline = b.deadline || b.DEADLINE || "";
    if (b.eventLevel !== undefined) opportunity.eventLevel = b.eventLevel;
    if (b.teamSize !== undefined) opportunity.teamSize = b.teamSize;
    if (b.registrationFee !== undefined) opportunity.registrationFee = b.registrationFee;
    if (b.link !== undefined || b.LINK !== undefined) opportunity.link = b.link || b.LINK || "";
    if (b.guidelinesUrl !== undefined) opportunity.guidelinesUrl = b.guidelinesUrl;
    if (b.internalFormUrl !== undefined) opportunity.internalFormUrl = b.internalFormUrl;
    if (b.tracks !== undefined) opportunity.tracks = Array.isArray(b.tracks) ? b.tracks : [b.tracks];
    if (b.schedule !== undefined) opportunity.schedule = b.schedule;
    if (b.prizes !== undefined) opportunity.prizes = b.prizes;
    if (b.rewardPoints !== undefined) opportunity.rewardPoints = b.rewardPoints;
    if (b.facultyMentor !== undefined) opportunity.facultyMentor = b.facultyMentor;
    if (b.contactInfo !== undefined) opportunity.contactInfo = b.contactInfo;
    if (b.bannerImage !== undefined) opportunity.bannerImage = b.bannerImage;
    if (b.status !== undefined || b.STATUS !== undefined) opportunity.status = b.status || b.STATUS || "Open";

    await opportunity.save();
    return res.json({ success: true, opportunity });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function deleteOpportunity(req, res) {
  try {
    const { id } = req.params;
    const query = resolveQuery(id);
    const opportunity = await Opportunity.findOne(query);
    if (!opportunity) return res.status(404).json({ success: false, message: "Opportunity not found" });

    await Opportunity.deleteOne({ _id: opportunity._id });
    return res.json({ success: true, message: "Opportunity deleted" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * POST /api/opportunities/:id/interest
 * Toggle current user's interest in this opportunity
 */
export async function toggleInterest(req, res) {
  try {
    const { id } = req.params;
    const query = resolveQuery(id);
    const opportunity = await Opportunity.findOne(query);
    if (!opportunity) return res.status(404).json({ success: false, message: "Opportunity not found" });

    const userIdStr = String(req.user._id);
    const existingIndex = (opportunity.interestedUsers || []).findIndex(
      (u) => String(u.userId?._id || u.userId) === userIdStr
    );

    let isInterested = false;
    if (existingIndex >= 0) {
      opportunity.interestedUsers.splice(existingIndex, 1);
      isInterested = false;
    } else {
      opportunity.interestedUsers.push({
        userId: req.user._id,
        name: req.user.name || req.user.email.split("@")[0],
        email: req.user.email,
        createdAt: new Date(),
      });
      isInterested = true;
    }

    await opportunity.save();
    return res.json({
      success: true,
      isInterested,
      interestedCount: opportunity.interestedUsers.length,
      interestedUsers: opportunity.interestedUsers,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * POST /api/opportunities/:id/thoughts
 * Post a thought, comment, or teammate request
 */
export async function addThought(req, res) {
  try {
    const { id } = req.params;
    const { content, tag } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: "Thought content cannot be empty." });
    }

    const query = resolveQuery(id);
    const opportunity = await Opportunity.findOne(query);
    if (!opportunity) return res.status(404).json({ success: false, message: "Opportunity not found" });

    const newThought = {
      userId: req.user._id,
      userName: req.user.name || req.user.email.split("@")[0],
      userEmail: req.user.email,
      content: content.trim(),
      tag: tag || "General",
      createdAt: new Date(),
    };

    opportunity.thoughts.push(newThought);
    await opportunity.save();

    return res.status(201).json({
      success: true,
      message: "Thought posted successfully",
      thought: opportunity.thoughts[opportunity.thoughts.length - 1],
      thoughts: opportunity.thoughts,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * DELETE /api/opportunities/:id/thoughts/:thoughtId
 * Remove a thought
 */
export async function deleteThought(req, res) {
  try {
    const { id, thoughtId } = req.params;
    const query = resolveQuery(id);
    const opportunity = await Opportunity.findOne(query);
    if (!opportunity) return res.status(404).json({ success: false, message: "Opportunity not found" });

    const thought = opportunity.thoughts.id(thoughtId);
    if (!thought) return res.status(404).json({ success: false, message: "Thought not found" });

    const isAuthor = String(thought.userId) === String(req.user._id);
    if (!isAuthor && !isAdmin(req.user)) {
      return res.status(403).json({ success: false, message: "Access denied. Cannot delete another user's thought." });
    }

    thought.deleteOne();
    await opportunity.save();

    return res.json({ success: true, message: "Thought deleted", thoughts: opportunity.thoughts });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
