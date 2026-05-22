export const COOKIE_CONSENT_STORAGE_KEY = "ai-genius-lab-cookie-consent";
export const COOKIE_CONSENT_EVENT = "ai-genius-lab-cookie-consent-changed";

export type CookieConsentState = {
  acceptedAt: string;
  analytics: boolean;
};

export function parseCookieConsent(value: string | null): CookieConsentState | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<CookieConsentState>;

    if (typeof parsed.analytics !== "boolean" || typeof parsed.acceptedAt !== "string") {
      return null;
    }

    return {
      acceptedAt: parsed.acceptedAt,
      analytics: parsed.analytics,
    };
  } catch {
    return null;
  }
}

export function readCookieConsent() {
  if (typeof window === "undefined") {
    return null;
  }

  return parseCookieConsent(window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY));
}

export function writeCookieConsent(value: CookieConsentState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: value }));
}
