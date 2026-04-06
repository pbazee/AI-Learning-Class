"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

type ActivePopup = {
  id: string;
  title: string;
  content: string;
  imageUrl?: string | null;
  buttonText?: string | null;
  link?: string | null;
  delaySeconds: number;
};

const POPUP_RESPONSE_TTL_MS = 60_000;

function getDismissalStorageKey(id: string) {
  return `popup-dismissed:${id}`;
}

function getPopupResponseStorageKey(pathname: string) {
  return `popup-response:${pathname}`;
}

export function PopupCampaigns() {
  const pathname = usePathname();
  const [popup, setPopup] = useState<ActivePopup | null>(null);
  const [visible, setVisible] = useState(false);
  const popupLink = useMemo(() => popup?.link || "/courses", [popup?.link]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    function applyPopup(nextPopup: ActivePopup | null) {
      setPopup(null);
      setVisible(false);

      if (!nextPopup) {
        return;
      }

      if (sessionStorage.getItem(getDismissalStorageKey(nextPopup.id)) === "1") {
        return;
      }

      setPopup(nextPopup);
    }

    async function loadPopup() {
      const storageKey = getPopupResponseStorageKey(pathname || "/");

      try {
        const cachedPayload = localStorage.getItem(storageKey);

        if (cachedPayload) {
          const parsed = JSON.parse(cachedPayload) as {
            expiresAt?: number;
            popup?: ActivePopup | null;
          };

          if ((parsed.expiresAt ?? 0) > Date.now()) {
            applyPopup(parsed.popup ?? null);
            return;
          }
        }
      } catch {
        // Ignore cache parse/storage issues and fall back to network.
      }

      applyPopup(null);

      try {
        const response = await fetch(
          `/api/popups/active?path=${encodeURIComponent(pathname || "/")}`,
          {
            cache: "force-cache",
            signal: controller.signal,
          }
        );
        const payload = (await response.json().catch(() => null)) as
          | { popup?: ActivePopup | null }
          | null;

        if (!response.ok || cancelled) {
          return;
        }

        try {
          localStorage.setItem(
            storageKey,
            JSON.stringify({
              expiresAt: Date.now() + POPUP_RESPONSE_TTL_MS,
              popup: payload?.popup ?? null,
            })
          );
        } catch {
          // Ignore storage quota or serialization errors.
        }

        applyPopup(payload?.popup ?? null);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error("[popup-campaigns] Unable to load popup.", error);
        }
      }
    }

    void loadPopup();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [pathname]);

  useEffect(() => {
    if (!popup) {
      setVisible(false);
      return;
    }

    const timer = window.setTimeout(
      () => setVisible(true),
      Math.max(0, popup.delaySeconds) * 1000
    );

    return () => window.clearTimeout(timer);
  }, [popup]);

  function handleDismiss() {
    if (popup) {
      sessionStorage.setItem(getDismissalStorageKey(popup.id), "1");
    }
    setVisible(false);
  }

  if (!popup || !visible) {
    return null;
  }

  const isExternal = /^https?:\/\//i.test(popupLink);

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-950/70 px-4 py-8 backdrop-blur-sm">
      <div className="relative w-full max-w-xl overflow-hidden rounded-[30px] border border-white/10 bg-[#071121] text-white shadow-[0_40px_140px_-60px_rgba(2,6,23,0.98)]">
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-4 top-4 z-10 rounded-full border border-white/10 bg-black/30 p-2 text-white/75 transition hover:bg-white/10 hover:text-white"
          aria-label="Close popup"
        >
          <X className="h-4 w-4" />
        </button>

        {popup.imageUrl ? (
          <div className="h-52 w-full overflow-hidden border-b border-white/10">
            <img
              src={popup.imageUrl}
              alt={popup.title}
              className="h-full w-full object-cover"
            />
          </div>
        ) : null}

        <div className="p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8db4ff]">
            Featured update
          </p>
          <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
            {popup.title}
          </h2>
          <p className="mt-4 text-sm leading-7 text-white/75 sm:text-base">
            {popup.content}
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <a
              href={popupLink}
              target={isExternal ? "_blank" : undefined}
              rel={isExternal ? "noreferrer" : undefined}
              onClick={handleDismiss}
              className="inline-flex items-center justify-center rounded-2xl bg-primary-blue px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-blue/90"
            >
              {popup.buttonText || "Explore now"}
            </a>
            <button
              type="button"
              onClick={handleDismiss}
              className="inline-flex items-center justify-center rounded-2xl border border-white/15 px-5 py-3 text-sm font-semibold text-white/78 transition hover:bg-white/10 hover:text-white"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
