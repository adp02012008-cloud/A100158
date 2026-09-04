import { Opportunity } from "../models/Opportunity.js";

export async function getOpportunities(req, res) {
  try {
    const opportunities = await Opportunity.find({}).sort({ deadline: 1 }).populate("createdBy").exec();
    return res.json({ success: true, opportunities });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function createOpportunity(req, res) {
  try {
    const opportunityId = `OPP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const opportunity = await Opportunity.create({
      ...req.body,
      opportunityId,
      createdBy: req.user._id,
    });
    return res.status(201).json({ success: true, opportunity });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateOpportunity(req, res) {
  try {
    const { id } = req.params;
    let opportunity = null;
    if (id && String(id).match(/^[0-9a-fA-F]{24}$/)) {
      opportunity = await Opportunity.findByIdAndUpdate(id, req.body, { new: true });
    }
    if (!opportunity) {
      opportunity = await Opportunity.findOneAndUpdate({ opportunityId: id }, req.body, { new: true });
    }
    if (!opportunity) return res.status(404).json({ success: false, message: "Opportunity not found" });
    return res.json({ success: true, opportunity });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function deleteOpportunity(req, res) {
  try {
    const { id } = req.params;
    let opportunity = null;
    if (id && String(id).match(/^[0-9a-fA-F]{24}$/)) {
      opportunity = await Opportunity.findByIdAndDelete(id);
    }
    if (!opportunity) {
      opportunity = await Opportunity.findOneAndDelete({ opportunityId: id });
    }
    if (!opportunity) return res.status(404).json({ success: false, message: "Opportunity not found" });
    return res.json({ success: true, message: "Opportunity deleted" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
