import { Certificate } from "../models/Certificate.js";
import { isAdmin } from "../services/authorizationService.js";

export async function getCertificates(req, res) {
  try {
    const filter = isAdmin(req.user) ? {} : { userId: req.user._id };
    const certificates = await Certificate.find(filter).sort({ date: -1 }).populate("userId createdBy").exec();
    return res.json({ success: true, certificates });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function createCertificate(req, res) {
  try {
    const certificateId = `CRT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const targetUserId = isAdmin(req.user) && req.body.userId ? req.body.userId : req.user._id;

    const certificate = await Certificate.create({
      ...req.body,
      certificateId,
      userId: targetUserId,
      createdBy: req.user._id,
    });

    return res.status(201).json({ success: true, certificate });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateCertificate(req, res) {
  try {
    const { id } = req.params;
    const certificate = await Certificate.findById(id);
    if (!certificate) return res.status(404).json({ success: false, message: "Certificate not found" });

    if (!isAdmin(req.user) && String(certificate.userId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "Access denied. Cannot update another user's certificate." });
    }

    Object.assign(certificate, req.body);
    await certificate.save();
    return res.json({ success: true, certificate });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function deleteCertificate(req, res) {
  try {
    const { id } = req.params;
    const certificate = await Certificate.findById(id);
    if (!certificate) return res.status(404).json({ success: false, message: "Certificate not found" });

    if (!isAdmin(req.user) && String(certificate.userId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    await Certificate.findByIdAndDelete(id);
    return res.json({ success: true, message: "Certificate deleted" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
