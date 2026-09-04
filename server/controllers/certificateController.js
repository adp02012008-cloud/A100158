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
    const b = req.body || {};
    const certificateId = b.certificateId || b.CERTIFICATE_ID || `CRT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const targetUserId = isAdmin(req.user) && b.userId ? b.userId : req.user._id;

    const certificate = await Certificate.create({
      ...b,
      certificateId,
      userId: targetUserId,
      enrolmentNumber: b.enrolmentNumber || b.ENROLMENT_NUMBER || req.user.enrolmentNumber || "N/A",
      title: b.title || b.TITLE || "Certificate Record",
      issuer: b.issuer || b.ISSUER || "Organization",
      date: b.date || b.DATE || new Date().toISOString().split("T")[0],
      category: b.category || b.CATEGORY || "Course",
      fileUrl: b.fileUrl || b.FILE_URL || b.url || b.imageUrl || "https://drive.google.com",
      status: b.status || b.STATUS || "Completed",
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
    let certificate = null;
    if (id && String(id).match(/^[0-9a-fA-F]{24}$/)) {
      certificate = await Certificate.findById(id);
    }
    if (!certificate) {
      certificate = await Certificate.findOne({ certificateId: id });
    }
    if (!certificate) return res.status(404).json({ success: false, message: "Certificate not found" });

    if (!isAdmin(req.user) && String(certificate.userId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "Access denied. Cannot update another user's certificate." });
    }

    const b = req.body || {};
    const updateData = { ...b };
    if (b.enrolmentNumber || b.ENROLMENT_NUMBER) updateData.enrolmentNumber = b.enrolmentNumber || b.ENROLMENT_NUMBER;
    if (b.title || b.TITLE) updateData.title = b.title || b.TITLE;
    if (b.issuer || b.ISSUER) updateData.issuer = b.issuer || b.ISSUER;
    if (b.date || b.DATE) updateData.date = b.date || b.DATE;
    if (b.category || b.CATEGORY) updateData.category = b.category || b.CATEGORY;
    if (b.fileUrl || b.FILE_URL) updateData.fileUrl = b.fileUrl || b.FILE_URL;
    if (b.status || b.STATUS) updateData.status = b.status || b.STATUS;

    Object.assign(certificate, updateData);
    await certificate.save();
    return res.json({ success: true, certificate });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function deleteCertificate(req, res) {
  try {
    const { id } = req.params;
    let certificate = null;
    if (id && String(id).match(/^[0-9a-fA-F]{24}$/)) {
      certificate = await Certificate.findById(id);
    }
    if (!certificate) {
      certificate = await Certificate.findOne({ certificateId: id });
    }
    if (!certificate) return res.status(404).json({ success: false, message: "Certificate not found" });

    if (!isAdmin(req.user) && String(certificate.userId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    await Certificate.deleteOne({ _id: certificate._id });
    return res.json({ success: true, message: "Certificate deleted" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
