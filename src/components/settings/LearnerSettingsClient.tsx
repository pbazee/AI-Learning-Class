"use client";

import { useMemo, useState, useTransition } from "react";
import { CheckCircle2, Globe2, Loader2, Save, UserRound } from "lucide-react";
import { CountryCombobox } from "@/components/checkout/CountryCombobox";
import { getSupabaseClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type LearnerSettingsClientProps = {
  initialProfile: {
    email: string;
    name: string;
    bio: string;
    countryCode: string;
    countryName: string;
    preferredCurrency: string;
    role: string;
    joinedAt: string;
  };
};

const inputClass = "input-surface w-full bg-background dark:bg-slate-950";

const supportedCurrencies = [
  { code: "USD", label: "US Dollar" },
  { code: "KES", label: "Kenyan Shilling" },
  { code: "GHS", label: "Ghanaian Cedi" },
  { code: "NGN", label: "Nigerian Naira" },
  { code: "ZAR", label: "South African Rand" },
] as const;

export function LearnerSettingsClient({
  initialProfile,
}: LearnerSettingsClientProps) {
  const [formData, setFormData] = useState({
    name: initialProfile.name,
    bio: initialProfile.bio,
    countryCode: initialProfile.countryCode,
    preferredCurrency: initialProfile.preferredCurrency || "USD",
  });
  const [savedProfile, setSavedProfile] = useState(initialProfile);
  const [status, setStatus] = useState<{
    tone: "idle" | "success" | "error";
    message: string;
  }>({ tone: "idle", message: "" });
  const [isPending, startTransition] = useTransition();

  const joinedAtLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(new Date(savedProfile.joinedAt)),
    [savedProfile.joinedAt]
  );

  function updateField<K extends keyof typeof formData>(
    field: K,
    value: (typeof formData)[K]
  ) {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
    setStatus({ tone: "idle", message: "" });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = formData.name.trim();
    const trimmedBio = formData.bio.trim();

    if (trimmedName.length < 2) {
      setStatus({
        tone: "error",
        message: "Add at least 2 characters for your display name.",
      });
      return;
    }

    startTransition(() => {
      void (async () => {
        try {
          const supabase = getSupabaseClient();
          const { error: authError } = await supabase.auth.updateUser({
            data: {
              full_name: trimmedName,
              name: trimmedName,
            },
          });

          if (authError) {
            throw new Error(authError.message);
          }

          const response = await fetch("/api/account/profile", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: trimmedName,
              bio: trimmedBio,
              countryCode: formData.countryCode,
              preferredCurrency: formData.preferredCurrency,
            }),
          });
          const payload = await response.json().catch(() => null);

          if (!response.ok || !payload?.profile) {
            throw new Error(
              payload?.error || "Unable to save your profile right now."
            );
          }

          setSavedProfile((current) => ({
            ...current,
            name: payload.profile.name ?? "",
            bio: payload.profile.bio ?? "",
            countryCode: payload.profile.countryCode ?? "",
            countryName: payload.profile.country ?? "",
            preferredCurrency:
              payload.profile.preferredCurrency ?? current.preferredCurrency,
          }));
          setFormData({
            name: payload.profile.name ?? "",
            bio: payload.profile.bio ?? "",
            countryCode: payload.profile.countryCode ?? "",
            preferredCurrency: payload.profile.preferredCurrency ?? "USD",
          });
          setStatus({
            tone: "success",
            message:
              "Profile updated. Checkout and learner dashboards will use your latest details.",
          });
        } catch (error) {
          setStatus({
            tone: "error",
            message:
              error instanceof Error
                ? error.message
                : "Unable to save your profile right now.",
          });
        }
      })();
    });
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[32px] border border-border bg-card px-6 py-7 shadow-sm sm:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary-blue/20 bg-primary-blue/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary-blue">
              Learner settings
            </div>
            <h1 className="mt-4 text-3xl font-black text-foreground">
              Profile settings dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Update your public learner details, location, and billing
              preference so checkout and your classroom stay in sync.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-background/70 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Joined
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {joinedAtLabel}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-background/70 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Account role
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {savedProfile.role}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
        <form
          onSubmit={handleSubmit}
          className="rounded-[28px] border border-border bg-card p-6 shadow-sm sm:p-8"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-blue/10 text-primary-blue">
              <UserRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Personal details
              </h2>
              <p className="text-sm text-muted-foreground">
                Keep your learner identity and checkout profile current.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Display name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(event) => updateField("name", event.target.value)}
                className={inputClass}
                maxLength={120}
                placeholder="Your full name"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Email address
              </label>
              <input
                type="email"
                value={savedProfile.email}
                readOnly
                className={cn(inputClass, "cursor-not-allowed opacity-75")}
              />
            </div>

            <div className="sm:col-span-2">
              <CountryCombobox
                value={formData.countryCode}
                onChange={(countryCode) => updateField("countryCode", countryCode)}
                label="Country"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Short bio
              </label>
              <textarea
                rows={4}
                value={formData.bio}
                onChange={(event) => updateField("bio", event.target.value)}
                className={cn(inputClass, "resize-none")}
                maxLength={500}
                placeholder="Tell other learners a little about your goals."
              />
            </div>
          </div>

          <div className="mt-8 flex items-center gap-3 border-t border-border pt-6">
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-blue px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-blue/90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save profile
                </>
              )}
            </button>

            {status.message ? (
              <p
                className={cn(
                  "text-sm",
                  status.tone === "success"
                    ? "text-emerald-600"
                    : "text-rose-500"
                )}
              >
                {status.message}
              </p>
            ) : null}
          </div>
        </form>

        <div className="space-y-6">
          <section className="rounded-[28px] border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-blue/10 text-primary-blue">
                <Globe2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  Billing preference
                </h2>
                <p className="text-sm text-muted-foreground">
                  Used to personalize checkout where regional gateways allow it.
                </p>
              </div>
            </div>

            <div className="mt-6">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Preferred currency
              </label>
              <select
                value={formData.preferredCurrency}
                onChange={(event) =>
                  updateField("preferredCurrency", event.target.value)
                }
                className={inputClass}
              >
                {supportedCurrencies.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code} - {currency.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-5 rounded-2xl border border-primary-blue/15 bg-primary-blue/5 p-4 text-sm leading-6 text-muted-foreground">
              Paystack can show regional methods like mobile money when the
              checkout country, enabled channels, and settlement currency line
              up. Kenya and Ghana now switch into local checkout currencies when
              your rates are configured.
            </div>
          </section>

          <section className="rounded-[28px] border border-border bg-card p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-500" />
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  What updates here
                </h2>
                <div className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground">
                  <p>
                    Your learner dashboard greeting and profile menu use your
                    saved name.
                  </p>
                  <p>
                    Your country now feeds Paystack currency selection for
                    supported regions.
                  </p>
                  <p>
                    Your preferred currency is stored on your account for future
                    checkout defaults.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
