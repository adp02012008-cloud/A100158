import { CustomCollection } from "../models/CustomCollection.js";
import { CustomRecord } from "../models/CustomRecord.js";
import { AuditLog } from "../models/AuditLog.js";
import { isAdmin } from "../services/authorizationService.js";

/**
 * GET /api/custom-collections
 * Returns active custom collection schemas.
 */
export async function getCustomCollections(req, res) {
  try {
    const filter = isAdmin(req.user) ? {} : { status: "ACTIVE", visibility: { $ne: "ADMIN" } };
    const collections = await CustomCollection.find(filter).sort({ name: 1 }).exec();
    return res.json({ success: true, count: collections.length, collections });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * POST /api/custom-collections
 * Admin creates a new custom content section (e.g. "Workshops").
 */
export async function createCustomCollection(req, res) {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ success: false, message: "Access denied. Admin access required." });
    }

    const { name, description, fields, visibility } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: "Collection name is required." });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const existing = await CustomCollection.findOne({ slug });
    if (existing) {
      return res.status(409).json({ success: false, message: `Custom section '${name}' already exists.` });
    }

    const collectionId = `CST-COL-${Date.now()}`;
    const collection = await CustomCollection.create({
      collectionId,
      name: name.trim(),
      slug,
      description: description || "",
      fields: Array.isArray(fields) ? fields : [],
      visibility: visibility || "MEMBER",
      createdBy: req.user._id,
    });

    await AuditLog.create({
      auditId: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      actorUserId: req.user._id,
      actionType: "CREATE_CUSTOM_COLLECTION",
      targetEntity: "CustomCollection",
      targetId: collection.collectionId,
      details: { name: collection.name, slug: collection.slug },
    });

    return res.status(201).json({ success: true, message: "Custom collection created successfully", collection });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * PUT /api/custom-collections/:id
 * Admin updates custom collection schema/fields (add/remove/rename/reorder fields safely).
 */
export async function updateCustomCollection(req, res) {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ success: false, message: "Access denied. Admin access required." });
    }

    const { id } = req.params;
    const { name, description, fields, visibility, status } = req.body;

    let collection = await CustomCollection.findById(id);
    if (!collection) {
      collection = await CustomCollection.findOne({ collectionId: id });
    }
    if (!collection) {
      return res.status(404).json({ success: false, message: "Custom section not found." });
    }

    if (name) collection.name = name.trim();
    if (description !== undefined) collection.description = description;
    if (Array.isArray(fields)) collection.fields = fields;
    if (visibility) collection.visibility = visibility;
    if (status) collection.status = status;

    await collection.save();

    await AuditLog.create({
      auditId: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      actorUserId: req.user._id,
      actionType: "UPDATE_CUSTOM_COLLECTION",
      targetEntity: "CustomCollection",
      targetId: collection.collectionId,
      details: { name: collection.name, fieldsCount: collection.fields.length },
    });

    return res.json({ success: true, message: "Custom section schema updated successfully", collection });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/custom-collections/:slug/records
 */
export async function getCustomRecords(req, res) {
  try {
    const { slug } = req.params;
    const collection = await CustomCollection.findOne({ slug });
    if (!collection) {
      return res.status(404).json({ success: false, message: "Custom section not found." });
    }

    if (collection.visibility === "ADMIN" && !isAdmin(req.user)) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    const records = await CustomRecord.find({ customCollectionId: collection._id })
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .exec();

    return res.json({ success: true, collection, records });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * POST /api/custom-collections/:slug/records
 */
export async function createCustomRecord(req, res) {
  try {
    const { slug } = req.params;
    const collection = await CustomCollection.findOne({ slug });
    if (!collection) {
      return res.status(404).json({ success: false, message: "Custom section not found." });
    }

    if (!isAdmin(req.user) && collection.visibility === "ADMIN") {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    const { data } = req.body;
    const recordId = `CST-REC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const record = await CustomRecord.create({
      recordId,
      customCollectionId: collection._id,
      data: data || {},
      createdBy: req.user._id,
    });

    return res.status(201).json({ success: true, message: "Custom record created", record });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * PUT /api/custom-collections/:slug/records/:recordId
 */
export async function updateCustomRecord(req, res) {
  try {
    const { slug, recordId } = req.params;
    const collection = await CustomCollection.findOne({ slug });
    if (!collection) {
      return res.status(404).json({ success: false, message: "Custom section not found." });
    }

    const record = await CustomRecord.findOne({ recordId });
    if (!record) {
      return res.status(404).json({ success: false, message: "Record not found." });
    }

    if (!isAdmin(req.user) && String(record.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "Access denied. Cannot edit record created by another user." });
    }

    const { data } = req.body;
    if (data && typeof data === "object") {
      record.data = { ...record.data, ...data };
    }
    record.updatedBy = req.user._id;
    await record.save();

    return res.json({ success: true, message: "Custom record updated successfully", record });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * DELETE /api/custom-collections/:slug/records/:recordId
 */
export async function deleteCustomRecord(req, res) {
  try {
    const { recordId } = req.params;
    const record = await CustomRecord.findOne({ recordId });
    if (!record) return res.status(404).json({ success: false, message: "Record not found." });

    if (!isAdmin(req.user) && String(record.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "Access denied. Cannot delete record created by another user." });
    }

    await CustomRecord.deleteOne({ recordId });
    return res.json({ success: true, message: "Record deleted successfully" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
