"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteFaqAction, saveFaqAction, saveSiteSettingsAction } from "@/app/admin/actions";
import { MediaUploader } from "@/components/admin/media-uploader";
import { SiteLogo } from "@/components/layout/SiteLogo";
import {
  AdminButton,
  AdminCard,
  AdminInput,
  AdminModal,
  AdminPageIntro,
  AdminSwitch,
  AdminTextarea,
  CreateButton,
  FieldLabel,
  StatusPill,
} from "@/components/admin/ui";
import { useToast } from "@/components/ui/ToastProvider";

type SettingsState = {
  siteName: string;
  logoUrl: string;
  logoPath: string;
  faviconUrl: string;
  faviconPath: string;
  supportEmail: string;
  supportPhone: string;
  adminEmail: string;
  supportAddress: string;
  maintenanceMode: boolean;
  socialLinks: Record<string, string>;
};

type FaqRow = {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
  isActive: boolean;
};

const tabs = ["general", "contact", "social", "about", "footer-support", "faq"] as const;

export function SettingsManager({
  initialSettings,
  faqs,
}: {
  initialSettings: SettingsState;
  faqs: FaqRow[];
}) {
  const [tab, setTab] = useState<(typeof tabs)[number]>("general");
  const [settings, setSettings] = useState(initialSettings);
  const [busy, setBusy] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);
  const [faqForm, setFaqForm] = useState({
    id: "",
    question: "",
    answer: "",
    sortOrder: 0,
    isActive: true,
  });
  const router = useRouter();
  const { toast } = useToast();

  function readSocial(key: string) {
    return settings.socialLinks?.[key] || "";
  }

  function updateSocial(key: string, value: string) {
    setSettings((current) => ({
      ...current,
      socialLinks: {
        ...current.socialLinks,
        [key]: value,
      },
    }));
  }

  function handleSaveSettings() {
    setBusy(true);
    startTransition(async () => {
      try {
        if (tab === "footer-support") {
          const response = await fetch("/api/admin/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              settings: {
                supportEmail: settings.supportEmail,
                supportPhone: settings.supportPhone,
                whatsappNumber: readSocial("whatsapp"),
                physicalAddress: settings.supportAddress,
                facebookUrl: readSocial("facebook"),
                twitterUrl: readSocial("x") || readSocial("twitter"),
                instagramUrl: readSocial("instagram"),
                linkedInUrl: readSocial("linkedin"),
                youtubeUrl: readSocial("youtube"),
                tiktokUrl: readSocial("tiktok"),
              },
            }),
          });
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data?.error || "Unable to save footer support settings.");
          }
          toast(data?.message || "Footer support settings saved.", "success");
          router.refresh();
          return;
        }

        const result = await saveSiteSettingsAction(settings);
        toast(result.message, result.success ? "success" : "error");
        if (result.success) {
          router.refresh();
        }
      } catch (error) {
        toast(error instanceof Error ? error.message : "Unable to save settings right now.", "error");
      } finally {
        setBusy(false);
      }
    });
  }

  function openFaq(faq?: FaqRow) {
    setFaqForm(
      faq
        ? {
            id: faq.id,
            question: faq.question,
            answer: faq.answer,
            sortOrder: faq.sortOrder,
            isActive: faq.isActive,
          }
        : {
            id: "",
            question: "",
            answer: "",
            sortOrder: faqs.length,
            isActive: true,
          }
    );
    setFaqOpen(true);
  }

  function handleSaveFaq() {
    setBusy(true);
    startTransition(async () => {
      const result = await saveFaqAction({
        ...faqForm,
        id: faqForm.id || undefined,
      });
      setBusy(false);
      toast(result.message, result.success ? "success" : "error");
      if (result.success) {
        setFaqOpen(false);
        router.refresh();
      }
    });
  }

  function handleDeleteFaq(id: string) {
    const confirmed = window.confirm("Delete this FAQ?");
    if (!confirmed) return;

    setBusy(true);
    startTransition(async () => {
      const result = await deleteFaqAction(id);
      setBusy(false);
      toast(result.message, result.success ? "success" : "error");
      if (result.success) {
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <AdminPageIntro
        title="Settings"
        description="Manage your platform identity, About page content, support channels, social links, and frequently asked questions."
        actions={
          tab === "faq" ? (
            <CreateButton onClick={() => openFaq()}>New FAQ</CreateButton>
          ) : (
            <AdminButton onClick={handleSaveSettings} busy={busy}>
              Save Settings
            </AdminButton>
          )
        }
      />

      <div className="flex flex-wrap gap-2">
        {tabs.map((entry) => (
          <button
            key={entry}
            type="button"
            onClick={() => setTab(entry)}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold capitalize ${
              tab === entry
                ? "bg-blue-600 text-white"
                : "border border-border bg-background text-muted-foreground hover:border-blue-300 hover:text-foreground"
            }`}
          >
            {entry}
          </button>
        ))}
      </div>

      {tab === "general" ? (
        <AdminCard className="grid gap-5 p-6 md:grid-cols-2">
          <div className="md:col-span-2">
            <FieldLabel>Platform Name</FieldLabel>
            <AdminInput value={settings.siteName} onChange={(event) => setSettings((current) => ({ ...current, siteName: event.target.value }))} />
          </div>
          <div>
            <MediaUploader
              label="Official Logo"
              hint="Upload a transparent SVG/PNG wordmark or symbol. The live header now caps logo space so navigation and the brand name stay readable."
              folder="branding"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              value={{
                url: settings.logoUrl || undefined,
                path: settings.logoPath || undefined,
                fileName:
                  settings.logoPath.split("/").pop() ||
                  settings.logoUrl.split("/").pop() ||
                  "logo",
                mimeType: settings.logoUrl.endsWith(".svg") ? "image/svg+xml" : "image/*",
              }}
              onUploaded={(file) =>
                setSettings((current) => ({
                  ...current,
                  logoUrl: file.url,
                  logoPath: file.path,
                  socialLinks: {
                    ...current.socialLinks,
                    brandLogoPath: file.path,
                  },
                }))
              }
              onRemoved={() =>
                setSettings((current) => ({
                  ...current,
                  logoUrl: "",
                  logoPath: "",
                  socialLinks: {
                    ...current.socialLinks,
                    brandLogoPath: "",
                  },
                }))
              }
            />
          </div>
          <div>
            <MediaUploader
              label="Favicon / Site Icon"
              hint="Upload a square icon for tabs, bookmarks, and metadata. Browsers usually render favicons at 16x16 or 32x32, so simple artwork works best."
              folder="branding"
              accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon"
              value={{
                url: settings.faviconUrl || undefined,
                path: settings.faviconPath || undefined,
                fileName:
                  settings.faviconPath.split("/").pop() ||
                  settings.faviconUrl.split("/").pop() ||
                  "favicon",
                mimeType: settings.faviconUrl.endsWith(".svg") ? "image/svg+xml" : "image/*",
              }}
              onUploaded={(file) =>
                setSettings((current) => ({
                  ...current,
                  faviconUrl: file.url,
                  faviconPath: file.path,
                  socialLinks: {
                    ...current.socialLinks,
                    brandFaviconPath: file.path,
                  },
                }))
              }
              onRemoved={() =>
                setSettings((current) => ({
                  ...current,
                  faviconUrl: "",
                  faviconPath: "",
                  socialLinks: {
                    ...current.socialLinks,
                    brandFaviconPath: "",
                  },
                }))
              }
            />
          </div>
          <div className="md:col-span-2">
            <AdminCard className="grid gap-5 border border-blue-500/20 bg-blue-500/5 p-5 md:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)]">
              <div>
                <p className="text-sm font-semibold text-foreground">Brand asset preview</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Strong product platforms keep header branding compact so the logo never swallows navigation or hides the site name. This preview shows the capped storefront treatment and a browser-tab favicon sample.
                </p>
                <div className="mt-4 rounded-3xl border border-white/10 bg-[#050811] p-4 shadow-[0_24px_60px_-44px_rgba(15,23,42,0.9)]">
                  <div className="flex min-h-[76px] items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/95 px-4 text-slate-950 shadow-[0_18px_44px_-36px_rgba(15,23,42,0.45)]">
                    <SiteLogo
                      siteName={settings.siteName || "AI GENIUS LAB"}
                      logoUrl={settings.logoUrl || undefined}
                      textClassName="text-[14px] text-slate-950"
                    />
                    <div className="hidden text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 sm:block">
                      Header preview
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Tab icon preview</p>
                <div className="mt-4 rounded-[24px] border border-white/10 bg-[#02050b] p-4 text-white shadow-[0_24px_60px_-44px_rgba(15,23,42,0.9)]">
                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-3 py-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-white">
                      {settings.faviconUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={settings.faviconUrl}
                          alt="Favicon preview"
                          className="h-full w-full scale-110 object-contain"
                        />
                      ) : (
                        <span className="text-xs font-black text-slate-900">AI</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        {settings.siteName || "AI GENIUS LAB"} | Practical AI Education
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Square favicons stay sharp in tabs, bookmarks, and pinned shortcuts.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </AdminCard>
          </div>
          <div>
            <FieldLabel>Support Email</FieldLabel>
            <AdminInput value={settings.supportEmail} onChange={(event) => setSettings((current) => ({ ...current, supportEmail: event.target.value }))} />
          </div>
          <div>
            <FieldLabel>Support Phone</FieldLabel>
            <AdminInput value={settings.supportPhone} onChange={(event) => setSettings((current) => ({ ...current, supportPhone: event.target.value }))} />
          </div>
          <div>
            <FieldLabel>Admin Notification Email</FieldLabel>
            <AdminInput value={settings.adminEmail} onChange={(event) => setSettings((current) => ({ ...current, adminEmail: event.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <AdminSwitch
              checked={settings.maintenanceMode}
              onChange={(value) => setSettings((current) => ({ ...current, maintenanceMode: value }))}
              label="Maintenance Mode"
              hint="Enable this to temporarily pause the storefront while you work on updates."
            />
          </div>
        </AdminCard>
      ) : null}

      {tab === "contact" ? (
        <AdminCard className="grid gap-5 p-6 md:grid-cols-2">
          <div className="md:col-span-2">
            <FieldLabel>Support Address</FieldLabel>
            <AdminInput value={settings.supportAddress} onChange={(event) => setSettings((current) => ({ ...current, supportAddress: event.target.value }))} placeholder="123 Learning Avenue, Nairobi" />
          </div>
          <div>
            <FieldLabel>Support Email</FieldLabel>
            <AdminInput value={settings.supportEmail} onChange={(event) => setSettings((current) => ({ ...current, supportEmail: event.target.value }))} />
          </div>
          <div>
            <FieldLabel>Support Phone</FieldLabel>
            <AdminInput value={settings.supportPhone} onChange={(event) => setSettings((current) => ({ ...current, supportPhone: event.target.value }))} />
          </div>
          <div>
            <FieldLabel>WhatsApp Number</FieldLabel>
            <AdminInput
              value={settings.socialLinks?.whatsapp || ""}
              placeholder="+254712345678"
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  socialLinks: { ...current.socialLinks, whatsapp: event.target.value },
                }))
              }
            />
          </div>
        </AdminCard>
      ) : null}

      {tab === "social" ? (
        <AdminCard className="grid gap-5 p-6 md:grid-cols-2">
          {["x", "linkedin", "youtube", "instagram", "tiktok", "facebook", "github", "whatsapp"].map((platform) => (
            <div key={platform}>
              <FieldLabel>{platform.toUpperCase()}</FieldLabel>
              <AdminInput
                value={settings.socialLinks[platform] || ""}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    socialLinks: {
                      ...current.socialLinks,
                      [platform]: event.target.value,
                    },
                  }))
                }
                placeholder={`https://${platform}.com/yourbrand`}
              />
            </div>
          ))}
        </AdminCard>
      ) : null}

      {tab === "about" ? (
        <AdminCard className="grid gap-5 p-6">
          <div>
            <FieldLabel>About Eyebrow</FieldLabel>
            <AdminInput
              value={readSocial("aboutEyebrow")}
              onChange={(event) => updateSocial("aboutEyebrow", event.target.value)}
              placeholder="About AI GENIUS LAB"
            />
          </div>
          <div>
            <FieldLabel>About Headline</FieldLabel>
            <AdminTextarea
              rows={3}
              value={readSocial("aboutTitle")}
              onChange={(event) => updateSocial("aboutTitle", event.target.value)}
              placeholder="Practical AI education for people building real careers."
            />
          </div>
          <div>
            <FieldLabel>About Subtitle</FieldLabel>
            <AdminTextarea
              rows={4}
              value={readSocial("aboutSubtitle")}
              onChange={(event) => updateSocial("aboutSubtitle", event.target.value)}
              placeholder="Brief summary shown in the hero section."
            />
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            <div>
              <FieldLabel>Stat One Value</FieldLabel>
              <AdminInput value={readSocial("aboutStatOneValue")} onChange={(event) => updateSocial("aboutStatOneValue", event.target.value)} placeholder="24/7" />
            </div>
            <div>
              <FieldLabel>Stat One Label</FieldLabel>
              <AdminInput value={readSocial("aboutStatOneLabel")} onChange={(event) => updateSocial("aboutStatOneLabel", event.target.value)} placeholder="Access on desktop and mobile" />
            </div>
            <div>
              <FieldLabel>Stat Two Value</FieldLabel>
              <AdminInput value={readSocial("aboutStatTwoValue")} onChange={(event) => updateSocial("aboutStatTwoValue", event.target.value)} placeholder="Hands-on" />
            </div>
            <div>
              <FieldLabel>Stat Two Label</FieldLabel>
              <AdminInput value={readSocial("aboutStatTwoLabel")} onChange={(event) => updateSocial("aboutStatTwoLabel", event.target.value)} placeholder="Coursework built for real application" />
            </div>
            <div>
              <FieldLabel>Stat Three Value</FieldLabel>
              <AdminInput value={readSocial("aboutStatThreeValue")} onChange={(event) => updateSocial("aboutStatThreeValue", event.target.value)} placeholder="Global" />
            </div>
            <div>
              <FieldLabel>Stat Three Label</FieldLabel>
              <AdminInput value={readSocial("aboutStatThreeLabel")} onChange={(event) => updateSocial("aboutStatThreeLabel", event.target.value)} placeholder="Built for learners everywhere" />
            </div>
          </div>
          <div>
            <FieldLabel>Mission</FieldLabel>
            <AdminTextarea
              rows={4}
              value={readSocial("aboutMission")}
              onChange={(event) => updateSocial("aboutMission", event.target.value)}
              placeholder="Describe the mission of the platform."
            />
          </div>
          <div>
            <FieldLabel>Story</FieldLabel>
            <AdminTextarea
              rows={4}
              value={readSocial("aboutStory")}
              onChange={(event) => updateSocial("aboutStory", event.target.value)}
              placeholder="Describe the story or operating philosophy behind the platform."
            />
          </div>
          <div>
            <FieldLabel>Promise</FieldLabel>
            <AdminTextarea
              rows={4}
              value={readSocial("aboutPromise")}
              onChange={(event) => updateSocial("aboutPromise", event.target.value)}
              placeholder="Describe what learners can expect from the experience."
            />
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            <div>
              <FieldLabel>Value Card One Title</FieldLabel>
              <AdminInput value={readSocial("aboutValueOneTitle")} onChange={(event) => updateSocial("aboutValueOneTitle", event.target.value)} placeholder="Practical first" />
            </div>
            <div className="md:col-span-2">
              <FieldLabel>Value Card One Body</FieldLabel>
              <AdminTextarea rows={3} value={readSocial("aboutValueOneBody")} onChange={(event) => updateSocial("aboutValueOneBody", event.target.value)} placeholder="Explain the first value statement." />
            </div>
            <div>
              <FieldLabel>Value Card Two Title</FieldLabel>
              <AdminInput value={readSocial("aboutValueTwoTitle")} onChange={(event) => updateSocial("aboutValueTwoTitle", event.target.value)} placeholder="Structured progress" />
            </div>
            <div className="md:col-span-2">
              <FieldLabel>Value Card Two Body</FieldLabel>
              <AdminTextarea rows={3} value={readSocial("aboutValueTwoBody")} onChange={(event) => updateSocial("aboutValueTwoBody", event.target.value)} placeholder="Explain the second value statement." />
            </div>
            <div>
              <FieldLabel>Value Card Three Title</FieldLabel>
              <AdminInput value={readSocial("aboutValueThreeTitle")} onChange={(event) => updateSocial("aboutValueThreeTitle", event.target.value)} placeholder="Career-minded quality" />
            </div>
            <div className="md:col-span-2">
              <FieldLabel>Value Card Three Body</FieldLabel>
              <AdminTextarea rows={3} value={readSocial("aboutValueThreeBody")} onChange={(event) => updateSocial("aboutValueThreeBody", event.target.value)} placeholder="Explain the third value statement." />
            </div>
          </div>
        </AdminCard>
      ) : null}

      {tab === "footer-support" ? (
        <AdminCard className="grid gap-5 p-6 md:grid-cols-2">
          <div>
            <FieldLabel>Support Email</FieldLabel>
            <AdminInput
              value={settings.supportEmail}
              onChange={(event) => setSettings((current) => ({ ...current, supportEmail: event.target.value }))}
              placeholder="support@aigeniuslab.com"
            />
          </div>
          <div>
            <FieldLabel>Support Phone</FieldLabel>
            <AdminInput
              value={settings.supportPhone}
              onChange={(event) => setSettings((current) => ({ ...current, supportPhone: event.target.value }))}
              placeholder="+1 555 123 4567"
            />
          </div>
          <div>
            <FieldLabel>WhatsApp Number</FieldLabel>
            <AdminInput
              value={readSocial("whatsapp")}
              onChange={(event) => updateSocial("whatsapp", event.target.value)}
              placeholder="+254712345678"
            />
          </div>
          <div className="md:col-span-2">
            <FieldLabel>Physical Address</FieldLabel>
            <textarea
              value={settings.supportAddress}
              onChange={(event) => setSettings((current) => ({ ...current, supportAddress: event.target.value }))}
              className="min-h-[120px] w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm text-foreground outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-400/15"
              placeholder="123 Learning Avenue, Nairobi"
            />
          </div>
          <div>
            <FieldLabel>Facebook URL</FieldLabel>
            <AdminInput value={readSocial("facebook")} onChange={(event) => updateSocial("facebook", event.target.value)} />
          </div>
          <div>
            <FieldLabel>Twitter/X URL</FieldLabel>
            <AdminInput value={readSocial("x")} onChange={(event) => updateSocial("x", event.target.value)} />
          </div>
          <div>
            <FieldLabel>Instagram URL</FieldLabel>
            <AdminInput value={readSocial("instagram")} onChange={(event) => updateSocial("instagram", event.target.value)} />
          </div>
          <div>
            <FieldLabel>LinkedIn URL</FieldLabel>
            <AdminInput value={readSocial("linkedin")} onChange={(event) => updateSocial("linkedin", event.target.value)} />
          </div>
          <div>
            <FieldLabel>YouTube URL</FieldLabel>
            <AdminInput value={readSocial("youtube")} onChange={(event) => updateSocial("youtube", event.target.value)} />
          </div>
          <div>
            <FieldLabel>TikTok URL</FieldLabel>
            <AdminInput value={readSocial("tiktok")} onChange={(event) => updateSocial("tiktok", event.target.value)} />
          </div>
        </AdminCard>
      ) : null}

      {tab === "faq" ? (
        <div className="space-y-4">
          {faqs.length === 0 ? (
            <AdminCard className="p-8 text-center">
              <p className="text-lg font-bold text-foreground">No FAQs yet</p>
              <p className="mt-2 text-sm text-muted-foreground">Create frequently asked questions to support your learners and reduce support load.</p>
            </AdminCard>
          ) : (
            faqs.map((faq) => (
              <AdminCard key={faq.id} className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <StatusPill tone={faq.isActive ? "success" : "neutral"}>{faq.isActive ? "Active" : "Inactive"}</StatusPill>
                      <span className="text-xs text-muted-foreground">Order {faq.sortOrder}</span>
                    </div>
                    <p className="text-base font-bold text-foreground">{faq.question}</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{faq.answer}</p>
                  </div>
                  <div className="flex gap-2">
                    <AdminButton type="button" variant="secondary" onClick={() => openFaq(faq)}>
                      Edit
                    </AdminButton>
                    <AdminButton type="button" variant="ghost" onClick={() => handleDeleteFaq(faq.id)}>
                      Delete
                    </AdminButton>
                  </div>
                </div>
              </AdminCard>
            ))
          )}
        </div>
      ) : null}

      <AdminModal
        open={faqOpen}
        onClose={() => setFaqOpen(false)}
        title="FAQ Entry"
        description="Write a clear question and a helpful answer for learners."
        footer={
          <div className="flex justify-end gap-3">
            <AdminButton type="button" variant="secondary" onClick={() => setFaqOpen(false)}>
              Cancel
            </AdminButton>
            <AdminButton type="button" busy={busy} onClick={handleSaveFaq}>
              Save FAQ
            </AdminButton>
          </div>
        }
      >
        <div className="grid gap-5">
          <div>
            <FieldLabel>Question</FieldLabel>
            <AdminInput value={faqForm.question} onChange={(event) => setFaqForm((current) => ({ ...current, question: event.target.value }))} />
          </div>
          <div>
            <FieldLabel>Answer</FieldLabel>
            <textarea
              value={faqForm.answer}
              onChange={(event) => setFaqForm((current) => ({ ...current, answer: event.target.value }))}
              className="min-h-[160px] w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm text-foreground outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-400/15"
            />
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <FieldLabel>Sort Order</FieldLabel>
              <AdminInput type="number" value={String(faqForm.sortOrder)} onChange={(event) => setFaqForm((current) => ({ ...current, sortOrder: Number(event.target.value) }))} />
            </div>
            <div className="flex items-end">
              <AdminSwitch
                checked={faqForm.isActive}
                onChange={(value) => setFaqForm((current) => ({ ...current, isActive: value }))}
                label="Active FAQ"
              />
            </div>
          </div>
        </div>
      </AdminModal>
    </div>
  );
}

