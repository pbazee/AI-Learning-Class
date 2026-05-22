"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { COOKIE_CONSENT_EVENT, readCookieConsent, type CookieConsentState } from "@/lib/cookie-consent";

export function AnalyticsScripts({ measurementId }: { measurementId?: string }) {
  const [consent, setConsent] = useState<CookieConsentState | null>(null);

  useEffect(() => {
    setConsent(readCookieConsent());

    function handleConsentChange(event: Event) {
      const nextConsent = (event as CustomEvent<CookieConsentState>).detail ?? readCookieConsent();
      setConsent(nextConsent);
    }

    window.addEventListener(COOKIE_CONSENT_EVENT, handleConsentChange);
    return () => {
      window.removeEventListener(COOKIE_CONSENT_EVENT, handleConsentChange);
    };
  }, []);

  if (!measurementId || !consent?.analytics) {
    return null;
  }

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} strategy="afterInteractive" />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
  gtag('consent', 'default', { analytics_storage: 'denied' });
          gtag('config', '${measurementId}', { anonymize_ip: true });
        `}
      </Script>
    </>
  );
}
