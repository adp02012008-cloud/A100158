/**
 * Centralized Authorization Service
 * Enforces role-based permissions and domain access rules server-side.
 */

export function isAdmin(user) {
  if (!user || !user.role) return false;
  return String(user.role).toUpperCase() === "ADMIN";
}

export function isActiveUser(user) {
  if (!user || !user.status) return false;
  return String(user.status).toUpperCase() === "ACTIVE";
}

export function canViewTask(user, task, isAssigned = false) {
  if (!user || !task) return false;
  if (isAdmin(user)) return true;
  if (task.status === "COMPLETED") return true;
  return Boolean(isAssigned);
}

export function canSubmit(user, task, isAssigned = false) {
  if (!user || !task) return false;
  if (!isActiveUser(user)) return false;
  // Unassigned user (member or admin) cannot submit
  return Boolean(isAssigned);
}

export function canReview(user, submission) {
  if (!user || !submission) return false;
  if (!isActiveUser(user)) return false;
  // Only ADMIN can review (Self-review authorized for assigned admins)
  return isAdmin(user);
}

export function canEditTask(user) {
  if (!user) return false;
  return isAdmin(user);
}

export function canManageDomain(user, domainName, action, resourceOwnerId = null) {
  if (!user || !isActiveUser(user)) return false;
  if (isAdmin(user)) return true;

  // Member permissions
  if (action === "READ") return true;

  // Domain-specific member actions
  if (domainName === "projects" && (action === "CREATE" || action === "UPDATE")) {
    if (action === "CREATE") return true;
    if (resourceOwnerId && String(resourceOwnerId) === String(user._id)) return true;
  }

  if (domainName === "certificates") {
    if (action === "READ_OWN" || (resourceOwnerId && String(resourceOwnerId) === String(user._id))) {
      return true;
    }
  }

  if (domainName === "gallery" && action === "CREATE") {
    return true;
  }

  return false;
}
