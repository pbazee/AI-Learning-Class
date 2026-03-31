const PERSONAL_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "outlook.com",
  "hotmail.com",
  "yahoo.com",
  "icloud.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "live.com",
]);

export function getEmailDomain(email?: string | null) {
  if (!email) {
    return "";
  }

  return email.split("@")[1]?.trim().toLowerCase() ?? "";
}

export function createRewardCode(prefix: string, seed: string) {
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${seed.slice(-6).toUpperCase()}-${suffix}`;
}

export function buildAffiliateTrackingLink(origin: string, affiliateCode: string, redirect = "/courses") {
  return `${origin}/api/affiliate/track?code=${affiliateCode}&redirect=${encodeURIComponent(redirect)}`;
}

export function formatPayoutMethodLabel(method: string) {
  switch (method) {
    case "mpesa":
      return "M-Pesa";
    case "bank":
      return "Bank Transfer";
    case "paypal":
      return "PayPal";
    default:
      return method;
  }
}

export function evaluateReferralFraud({
  referrerEmail,
  referredEmail,
  recentReferralCount,
  enabled,
}: {
  referrerEmail?: string | null;
  referredEmail?: string | null;
  recentReferralCount: number;
  enabled: boolean;
}) {
  if (!enabled) {
    return { fraudStatus: "clear", fraudReason: null as string | null };
  }

  const referrerDomain = getEmailDomain(referrerEmail);
  const referredDomain = getEmailDomain(referredEmail);

  if (
    referrerDomain &&
    referredDomain &&
    referrerDomain === referredDomain &&
    !PERSONAL_EMAIL_DOMAINS.has(referrerDomain)
  ) {
    return {
      fraudStatus: "flagged",
      fraudReason: "Matching company email domains require manual review.",
    };
  }

  if (recentReferralCount >= 8) {
    return {
      fraudStatus: "flagged",
      fraudReason: "High-volume referral activity triggered the fraud review threshold.",
    };
  }

  return { fraudStatus: "clear", fraudReason: null as string | null };
}

export function evaluateAffiliateFraud({
  affiliateEmail,
  customerEmail,
  enabled,
}: {
  affiliateEmail?: string | null;
  customerEmail?: string | null;
  enabled: boolean;
}) {
  if (!enabled) {
    return { fraudStatus: "clear", fraudReason: null as string | null };
  }

  if (
    affiliateEmail &&
    customerEmail &&
    affiliateEmail.trim().toLowerCase() === customerEmail.trim().toLowerCase()
  ) {
    return {
      fraudStatus: "flagged",
      fraudReason: "Affiliate email matches the purchasing customer email.",
    };
  }

  return { fraudStatus: "clear", fraudReason: null as string | null };
}
