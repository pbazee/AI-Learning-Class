const DEFAULT_ADMIN_EMAIL = "peterkinuthia726@gmail.com";
const PLACEHOLDER_ADMIN_EMAIL = "admin@yourdomain.com";

export function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() ?? "";
}

export function getPrimaryAdminEmail() {
  const configuredAdminEmail = normalizeEmail(process.env.ADMIN_EMAIL);

  if (configuredAdminEmail && configuredAdminEmail !== PLACEHOLDER_ADMIN_EMAIL) {
    return configuredAdminEmail;
  }

  return DEFAULT_ADMIN_EMAIL;
}
