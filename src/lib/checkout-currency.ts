import { env } from "@/lib/config";

export const BASE_CHECKOUT_CURRENCY = "USD" as const;

export const SUPPORTED_CHECKOUT_CURRENCIES = [
  BASE_CHECKOUT_CURRENCY,
  "KES",
  "GHS",
  "NGN",
  "ZAR",
] as const;

export type SupportedCheckoutCurrency =
  (typeof SUPPORTED_CHECKOUT_CURRENCIES)[number];

const PAYSTACK_REGIONAL_CURRENCY_BY_COUNTRY: Partial<
  Record<string, SupportedCheckoutCurrency>
> = {
  GH: "GHS",
  KE: "KES",
  NG: "NGN",
  ZA: "ZAR",
};

const PAYSTACK_MINIMUMS: Record<SupportedCheckoutCurrency, number> = {
  USD: 2,
  KES: 3,
  GHS: 0.1,
  NGN: 50,
  ZAR: 1,
};

function roundCurrencyAmount(value: number) {
  return Math.max(0, Number(value.toFixed(2)));
}

export function normalizeCheckoutCurrency(
  value?: string | null
): SupportedCheckoutCurrency {
  const normalizedValue = value?.trim().toUpperCase();

  if (
    normalizedValue &&
    SUPPORTED_CHECKOUT_CURRENCIES.includes(
      normalizedValue as SupportedCheckoutCurrency
    )
  ) {
    return normalizedValue as SupportedCheckoutCurrency;
  }

  return BASE_CHECKOUT_CURRENCY;
}

const DEFAULT_RATES: Record<string, number> = {
  KES: 129,
  GHS: 14,
  NGN: 1450,
  ZAR: 19,
};

function getUsdConversionRate(targetCurrency: SupportedCheckoutCurrency) {
  if (targetCurrency === BASE_CHECKOUT_CURRENCY) {
    return 1;
  }

  const envKey = `CHECKOUT_RATE_USD_TO_${targetCurrency}`;
  // Check process.env directly because config.ts might strip it if not in schema
  const rawValue = ((env as any)[envKey] || (process.env as any)[envKey])?.trim();
  const parsedValue = rawValue ? Number(rawValue) : NaN;

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    const defaultValue = DEFAULT_RATES[targetCurrency] ?? 1;
    console.warn(
      `[checkout-currency] ${envKey} is not set or invalid. Falling back to default rate: ${defaultValue}`
    );
    return defaultValue;
  }

  return parsedValue;
}

export function convertCheckoutAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string
) {
  const sourceCurrency = normalizeCheckoutCurrency(fromCurrency);
  const targetCurrency = normalizeCheckoutCurrency(toCurrency);

  if (sourceCurrency === targetCurrency) {
    return roundCurrencyAmount(amount);
  }

  if (sourceCurrency === BASE_CHECKOUT_CURRENCY) {
    return roundCurrencyAmount(amount * getUsdConversionRate(targetCurrency));
  }

  if (targetCurrency === BASE_CHECKOUT_CURRENCY) {
    return roundCurrencyAmount(amount / getUsdConversionRate(sourceCurrency));
  }

  const amountInUsd =
    amount / getUsdConversionRate(sourceCurrency);

  return roundCurrencyAmount(amountInUsd * getUsdConversionRate(targetCurrency));
}

export function resolveCheckoutCurrency({
  gateway,
  country,
  preferredCurrency,
  sourceCurrencies,
}: {
  gateway?: string | null;
  country?: string | null;
  preferredCurrency?: string | null;
  sourceCurrencies?: string[];
}) {
  const normalizedCountry = country?.trim().toUpperCase() || null;
  const normalizedPreferredCurrency = normalizeCheckoutCurrency(preferredCurrency);
  const normalizedSourceCurrencies = Array.from(
    new Set((sourceCurrencies ?? []).map((currency) => normalizeCheckoutCurrency(currency)))
  );

  if (gateway === "paystack") {
    const regionalCurrency = normalizedCountry
      ? PAYSTACK_REGIONAL_CURRENCY_BY_COUNTRY[normalizedCountry]
      : null;

    if (regionalCurrency) {
      return regionalCurrency;
    }

    if (normalizedPreferredCurrency !== BASE_CHECKOUT_CURRENCY) {
      return normalizedPreferredCurrency;
    }
  }

  if (normalizedSourceCurrencies.length === 1) {
    return normalizedSourceCurrencies[0];
  }

  return BASE_CHECKOUT_CURRENCY;
}

export function getSuggestedCurrencyForCountry(country?: string | null) {
  const normalizedCountry = country?.trim().toUpperCase() || null;
  return normalizedCountry
    ? PAYSTACK_REGIONAL_CURRENCY_BY_COUNTRY[normalizedCountry] ??
        BASE_CHECKOUT_CURRENCY
    : BASE_CHECKOUT_CURRENCY;
}

export function getPaystackMinimumAmount(currency: string) {
  return PAYSTACK_MINIMUMS[normalizeCheckoutCurrency(currency)];
}

export function getPaystackChannels({
  country,
  currency,
}: {
  country?: string | null;
  currency: string;
}) {
  const normalizedCountry = country?.trim().toUpperCase() || null;
  const normalizedCurrency = normalizeCheckoutCurrency(currency);

  if (
    normalizedCurrency === "KES" &&
    normalizedCountry === "KE"
  ) {
    return ["mobile_money", "card", "bank_transfer"] as const;
  }

  if (
    normalizedCurrency === "GHS" &&
    normalizedCountry === "GH"
  ) {
    return ["mobile_money", "card", "bank_transfer"] as const;
  }

  if (
    normalizedCurrency === "NGN" &&
    normalizedCountry === "NG"
  ) {
    return ["card", "bank", "bank_transfer", "ussd"] as const;
  }

  if (
    normalizedCurrency === "ZAR" &&
    normalizedCountry === "ZA"
  ) {
    return ["card", "bank_transfer", "eft"] as const;
  }

  return ["card"] as const;
}
