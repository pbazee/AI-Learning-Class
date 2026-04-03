export const EntitlementScope = {
  ALL_COURSES: "ALL_COURSES",
  FREE_COURSES: "FREE_COURSES",
} as const;

export type EntitlementScope =
  (typeof EntitlementScope)[keyof typeof EntitlementScope];

export const EntitlementSource = {
  SUBSCRIPTION: "SUBSCRIPTION",
  TEAM: "TEAM",
} as const;

export type EntitlementSource =
  (typeof EntitlementSource)[keyof typeof EntitlementSource];

export const EntitlementStatus = {
  ACTIVE: "ACTIVE",
  CANCELLED: "CANCELLED",
  EXPIRED: "EXPIRED",
  REVOKED: "REVOKED",
} as const;

export type EntitlementStatus =
  (typeof EntitlementStatus)[keyof typeof EntitlementStatus];

export const TeamWorkspaceRole = {
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  MEMBER: "MEMBER",
} as const;

export type TeamWorkspaceRole =
  (typeof TeamWorkspaceRole)[keyof typeof TeamWorkspaceRole];

export const TeamWorkspaceMemberStatus = {
  ACTIVE: "ACTIVE",
  REVOKED: "REVOKED",
} as const;

export type TeamWorkspaceMemberStatus =
  (typeof TeamWorkspaceMemberStatus)[keyof typeof TeamWorkspaceMemberStatus];

export const TeamWorkspaceInviteStatus = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  REVOKED: "REVOKED",
  EXPIRED: "EXPIRED",
} as const;

export type TeamWorkspaceInviteStatus =
  (typeof TeamWorkspaceInviteStatus)[keyof typeof TeamWorkspaceInviteStatus];

function parseDomainValue<T extends Record<string, string>>(
  values: T,
  value: string,
  label: string
): T[keyof T] {
  if (Object.values(values).includes(value)) {
    return value as T[keyof T];
  }

  throw new Error(`Unexpected ${label}: ${value}`);
}

export function parseTeamWorkspaceRole(value: string): TeamWorkspaceRole {
  return parseDomainValue(TeamWorkspaceRole, value, "team workspace role");
}

export function parseTeamWorkspaceMemberStatus(value: string): TeamWorkspaceMemberStatus {
  return parseDomainValue(
    TeamWorkspaceMemberStatus,
    value,
    "team workspace member status"
  );
}

export function parseTeamWorkspaceInviteStatus(value: string): TeamWorkspaceInviteStatus {
  return parseDomainValue(
    TeamWorkspaceInviteStatus,
    value,
    "team workspace invite status"
  );
}
