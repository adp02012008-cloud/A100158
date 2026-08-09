import { Cluster } from "../models/Cluster.js";
import { User } from "../models/User.js";
import { AuditLog } from "../models/AuditLog.js";
import { isAdmin } from "../services/authorizationService.js";
import { withTransaction } from "../utils/dbTransaction.js";

export async function getClusters(req, res) {
  try {
    const clusters = await Cluster.find({}).sort({ name: 1 }).exec();
    return res.json({ success: true, clusters });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function createCluster(req, res) {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ success: false, message: "Access denied. Admin access required." });
    }

    const { name, description } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "Cluster name is required" });

    const clusterId = `CLS-${name.toUpperCase().replace(/\s+/g, "_")}`;
    const cluster = await Cluster.create({
      clusterId,
      name: name.trim(),
      description: description || "",
      status: "ACTIVE",
    });

    await AuditLog.create({
      auditId: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      actorUserId: req.user._id,
      actionType: "CREATE_CLUSTER",
      targetEntity: "Cluster",
      targetId: String(cluster._id),
      details: { name: cluster.name },
    });

    return res.status(201).json({ success: true, cluster });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: "Cluster already exists." });
    }
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateCluster(req, res) {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ success: false, message: "Access denied. Admin access required." });
    }

    const { id } = req.params;
    const { name, description, status } = req.body;

    const cluster = await Cluster.findById(id);
    if (!cluster) return res.status(404).json({ success: false, message: "Cluster not found" });

    if (name) cluster.name = name.trim();
    if (description !== undefined) cluster.description = description;
    if (status) cluster.status = status.toUpperCase();

    await cluster.save();

    await AuditLog.create({
      auditId: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      actorUserId: req.user._id,
      actionType: "UPDATE_CLUSTER",
      targetEntity: "Cluster",
      targetId: String(cluster._id),
      details: { name: cluster.name, status: cluster.status },
    });

    return res.json({ success: true, cluster });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function deleteCluster(req, res) {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ success: false, message: "Access denied. Admin access required." });
    }

    const { id } = req.params;
    const cluster = await Cluster.findById(id);
    if (!cluster) return res.status(404).json({ success: false, message: "Cluster not found" });

    cluster.status = "INACTIVE";
    await cluster.save();

    await AuditLog.create({
      auditId: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      actorUserId: req.user._id,
      actionType: "DEACTIVATE_CLUSTER",
      targetEntity: "Cluster",
      targetId: String(cluster._id),
      details: { name: cluster.name },
    });

    return res.json({ success: true, message: `Cluster '${cluster.name}' deactivated successfully` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function assignMemberCluster(req, res) {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ success: false, message: "Access denied. Admin access required." });
    }

    const { userId, clusterId } = req.body;
    if (!userId) return res.status(400).json({ success: false, message: "userId is required" });

    await withTransaction(async (session) => {
      const user = await User.findById(userId, null, { session });
      if (!user) throw new Error("User not found");

      if (clusterId) {
        const cluster = await Cluster.findById(clusterId, null, { session });
        if (!cluster) throw new Error("Cluster not found");
        user.clusterId = cluster._id;
        user.clusterName = cluster.name;
      } else {
        user.clusterId = null;
        user.clusterName = "";
      }

      await user.save({ session });
    });

    return res.json({ success: true, message: "Member cluster updated successfully" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
