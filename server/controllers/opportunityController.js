import { Opportunity } from "../models/Opportunity.js";
import { Notification } from "../models/Notification.js";
import { User } from "../models/User.js";
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
      company: b.company || b.organizer || b.COMPANY || b.ORGANIZER || "",
      organizer: b.organizer || b.company || b.ORGANIZER || b.COMPANY || "",
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

    // Broadcast notification to all active team users
    try {
      const activeUsers = await User.find({ status: "ACTIVE" }).select("_id email").lean();
      const oppTitle = opportunity.title;
      const org = opportunity.organizer || opportunity.company || "Innovation Hub";
      const oppType = opportunity.type || "Opportunity";

      const notifsToInsert = activeUsers
        .filter((u) => String(u._id) !== String(req.user?._id))
        .map((u) => ({
          notificationId: `NTF-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          targetUserId: u._id,
          targetEmail: (u.email || "").toLowerCase().trim(),
          type: "OPPORTUNITY_NEW",
          targetPage: "opportunities",
          referenceId: opportunity.opportunityId,
          title: `🚀 New ${oppType}: "${oppTitle}"`,
          message: `${org} announced a new ${oppType}. Check eligibility, guidelines, and squad up!`,
          eventKey: `NTF-OPP-NEW-${opportunity.opportunityId}-${u._id}`,
          readAt: null,
          createdAt: new Date(),
        }));

      if (notifsToInsert.length > 0) {
        await Notification.insertMany(notifsToInsert, { ordered: false });
      }
    } catch (notifErr) {
      console.warn("Opportunity broadcast notification error:", notifErr?.message);
    }

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
    const orgName = b.organizer || b.company || b.ORGANIZER || b.COMPANY || "";
    if (b.company !== undefined || b.organizer !== undefined || b.COMPANY !== undefined || b.ORGANIZER !== undefined) {
      opportunity.company = orgName;
      opportunity.organizer = orgName;
    }
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

    const userIdStr = req.user?._id ? String(req.user._id) : "";
    const userEmailStr = (req.user?.email || "").toLowerCase().trim();
    const existingIndex = (opportunity.interestedUsers || []).findIndex(
      (u) =>
        (userIdStr && String(u.userId?._id || u.userId) === userIdStr) ||
        (userEmailStr && (u.email || "").toLowerCase().trim() === userEmailStr)
    );

    let isInterested = false;
    if (existingIndex >= 0) {
      opportunity.interestedUsers.splice(existingIndex, 1);
      isInterested = false;
    } else {
      opportunity.interestedUsers.push({
        userId: req.user?._id,
        name: req.user?.name || req.user?.Name || req.user?.email?.split("@")[0] || "Squad Member",
        email: req.user?.email || "",
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
    const body = req.body || {};
    const content = (body.content || body.text || "").trim();
    const tag = body.tag || "Looking for Team";

    if (!content) {
      return res.status(400).json({ success: false, message: "Thought content cannot be empty." });
    }

    const query = resolveQuery(id);
    const opportunity = await Opportunity.findOne(query);
    if (!opportunity) return res.status(404).json({ success: false, message: "Opportunity not found" });

    const newThought = {
      userId: req.user?._id,
      userName: req.user?.name || req.user?.Name || req.user?.email?.split("@")[0] || "Squad Member",
      userEmail: req.user?.email || "",
      content,
      tag,
      createdAt: new Date(),
    };

    if (!Array.isArray(opportunity.thoughts)) {
      opportunity.thoughts = [];
    }

    opportunity.thoughts.push(newThought);
    await opportunity.save();

    // Notify users who marked "Interested" in this opportunity
    try {
      const interestedList = opportunity.interestedUsers || [];
      const currentUserId = String(req.user?._id || "");
      const currentUserEmail = (req.user?.email || "").toLowerCase().trim();
      const authorName = newThought.userName;
      const snippet = content.length > 70 ? content.slice(0, 67) + "..." : content;

      const notifsToNotify = [];
      for (const item of interestedList) {
        const targetUId = item.userId ? String(item.userId._id || item.userId) : null;
        const targetEmail = (item.email || "").toLowerCase().trim();

        if (targetUId && targetUId === currentUserId) continue;
        if (targetEmail && targetEmail === currentUserEmail) continue;

        notifsToNotify.push({
          notificationId: `NTF-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          targetUserId: targetUId,
          targetEmail: targetEmail,
          type: "OPPORTUNITY_THOUGHT",
          targetPage: "opportunities",
          referenceId: opportunity.opportunityId,
          title: `💬 Teammate Discussion: ${authorName}`,
          message: `${authorName} posted on "${opportunity.title}": "${snippet}"`,
          eventKey: `NTF-OPP-THOUGHT-${opportunity.opportunityId}-${targetEmail || targetUId}-${Date.now()}`,
          readAt: null,
          createdAt: new Date(),
        });
      }

      if (notifsToNotify.length > 0) {
        await Notification.insertMany(notifsToNotify, { ordered: false });
      }
    } catch (notifErr) {
      console.warn("Thought notification error:", notifErr?.message);
    }

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
