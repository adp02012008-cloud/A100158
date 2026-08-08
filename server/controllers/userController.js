import { User } from "../models/User.js";

/**
 * GET /api/users/assignable
 * Returns array of assignable users for admin task assignment selection.
 */
export async function getAssignableUsers(req, res) {
  try {
    const users = await User.find({ status: "ACTIVE" }).sort({ name: 1 }).exec();
    const formatted = users.map((u) => ({
      email: u.email,
      name: u.name,
      role: u.role === "ADMIN" ? "System Admin" : "Team Member",
      githubUrl: u.githubUrl || "",
    }));

    return res.status(200).json({ success: true, count: formatted.length, users: formatted });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error fetching users: " + error.message });
  }
}
