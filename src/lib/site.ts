export const DEFAULT_SITE_NAME = "AI GENIUS LAB";
export const DEFAULT_SITE_DESCRIPTION =
  "AI GENIUS LAB is a premium AI learning platform for practical machine learning, LLM engineering, and career-focused upskilling.";
export const DEFAULT_SUPPORT_EMAIL = "support@aigeniuslab.com";
export const DEFAULT_ASK_AI_NAME = "Ask AI";

const LEGACY_SITE_NAME_PATTERN = /^ai[-_\s]*learning[-_\s]*class$/i;

export type BillingCycle = "monthly" | "yearly";

export function getBillingCycleLabel(cycle: BillingCycle) {
  return cycle === "yearly" ? "Yearly" : "Monthly";
}

export function resolveYearlyPrice(monthlyPrice: number, yearlyPrice?: number | null) {
  if (typeof yearlyPrice === "number" && Number.isFinite(yearlyPrice) && yearlyPrice > 0) {
    return yearlyPrice;
  }

  if (typeof monthlyPrice !== "number" || !Number.isFinite(monthlyPrice) || monthlyPrice <= 0) {
    return null;
  }

  return Number((monthlyPrice * 10).toFixed(2));
}

export function getYearlyMonthlyEquivalent(yearlyPrice?: number | null) {
  const resolvedYearlyPrice = resolveYearlyPrice(0, yearlyPrice);

  if (
    typeof resolvedYearlyPrice !== "number" ||
    !Number.isFinite(resolvedYearlyPrice) ||
    resolvedYearlyPrice <= 0
  ) {
    return null;
  }

  return resolvedYearlyPrice / 12;
}

export function getYearlySavings(monthlyPrice: number, yearlyPrice?: number | null) {
  const resolvedYearlyPrice = resolveYearlyPrice(monthlyPrice, yearlyPrice);
  const monthlyEquivalent =
    typeof resolvedYearlyPrice === "number" ? resolvedYearlyPrice / 12 : null;

  if (
    typeof monthlyPrice !== "number" ||
    !Number.isFinite(monthlyPrice) ||
    monthlyPrice <= 0 ||
    resolvedYearlyPrice == null ||
    monthlyEquivalent == null ||
    monthlyEquivalent >= monthlyPrice
  ) {
    return null;
  }

  const yearlyCostAtMonthlyRate = monthlyPrice * 12;
  const savingsAmount = Math.max(0, yearlyCostAtMonthlyRate - resolvedYearlyPrice);
  const savingsPercent = yearlyCostAtMonthlyRate > 0 ? Math.round((savingsAmount / yearlyCostAtMonthlyRate) * 100) : 0;

  return {
    monthlyEquivalent,
    savingsAmount,
    savingsPercent,
  };
}

export function clampPercentage(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(value)));
}

export function normalizeSiteName(siteName?: string | null) {
  const trimmedSiteName = siteName?.trim();

  if (!trimmedSiteName) {
    return DEFAULT_SITE_NAME;
  }

  return LEGACY_SITE_NAME_PATTERN.test(trimmedSiteName)
    ? DEFAULT_SITE_NAME
    : trimmedSiteName;
}
