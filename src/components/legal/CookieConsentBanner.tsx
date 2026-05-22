"use client";

import { useEffect } from "react";
import {
  COOKIE_CONSENT_STORAGE_KEY,
  parseCookieConsent,
  writeCookieConsent,
} from "@/lib/cookie-consent";

export function CookieConsentBanner() {
  useEffect(() => {
    let disposed = false;

    async function setupConsent() {
      const existing = parseCookieConsent(window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY));

      if (existing) {
        return;
      }

      const cookieConsentModule = await import("vanilla-cookieconsent");
      const CookieConsent = cookieConsentModule.default ?? cookieConsentModule;

      if (disposed) {
        return;
      }

      CookieConsent.run({
        guiOptions: {
          consentModal: {
            layout: "box wide",
            position: "bottom center",
            equalWeightButtons: true,
            flipButtons: false,
          },
          preferencesModal: {
            layout: "box",
            equalWeightButtons: true,
            flipButtons: false,
          },
        },
        categories: {
          necessary: {
            enabled: true,
            readOnly: true,
          },
          analytics: {
            enabled: false,
            autoClear: {
              cookies: [],
            },
          },
        },
        language: {
          default: "en",
          translations: {
            en: {
              consentModal: {
                title: "Your privacy choices",
                description:
                  "We use essential cookies to run AI Genius Lab and optional analytics cookies only after you say yes. You can review these choices anytime to support GDPR and Kenya's Data Protection Act 2019.",
                acceptAllBtn: "Accept All",
                acceptNecessaryBtn: "Necessary Only",
                showPreferencesBtn: "Manage Preferences",
              },
              preferencesModal: {
                title: "Manage cookie preferences",
                acceptAllBtn: "Accept All",
                acceptNecessaryBtn: "Necessary Only",
                savePreferencesBtn: "Save Preferences",
                sections: [
                  {
                    title: "Necessary cookies",
                    description:
                      "These keep the platform secure, remember sign-in state, and enable checkout and core learning features.",
                    linkedCategory: "necessary",
                  },
                  {
                    title: "Analytics cookies",
                    description:
                      "These help us understand product usage and improve the learning experience, but they stay off until you consent.",
                    linkedCategory: "analytics",
                  },
                ],
              },
            },
          },
        },
        onFirstConsent: ({ cookie }: { cookie?: { categories?: string[] } }) => {
          writeCookieConsent({
            acceptedAt: new Date().toISOString(),
            analytics: Boolean(cookie?.categories?.includes("analytics")),
          });
        },
        onConsent: ({ cookie }: { cookie?: { categories?: string[] } }) => {
          writeCookieConsent({
            acceptedAt: new Date().toISOString(),
            analytics: Boolean(cookie?.categories?.includes("analytics")),
          });
        },
        onChange: ({ cookie }: { cookie?: { categories?: string[] } }) => {
          writeCookieConsent({
            acceptedAt: new Date().toISOString(),
            analytics: Boolean(cookie?.categories?.includes("analytics")),
          });
        },
      });
    }

    void setupConsent();

    return () => {
      disposed = true;
    };
  }, []);

  return null;
}
