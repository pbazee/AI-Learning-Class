"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteFaqAction, saveFaqAction, saveSiteSettingsAction } from "@/app/admin/actions";
import {
  AdminButton,
  AdminCard,
  AdminInput,
  AdminModal,
  AdminPageIntro,
  AdminSwitch,
  CreateButton,
  FieldLabel,
  StatusPill,
} from "@/components/admin/ui";
import { useToast } from "@/components/ui/ToastProvider";

type SettingsState = {
  siteName: string;
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

const tabs = ["general", "contact", "social", "footer-support", "faq"] as const;

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
        description="Manage your platform identity, support channels, social links, and frequently asked questions."
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
          <div>
            <FieldLabel>Platform Name</FieldLabel>
            <AdminInput value={settings.siteName} onChange={(event) => setSettings((current) => ({ ...current, siteName: event.target.value }))} />
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

      {tab === "footer-support" ? (
        <AdminCard className="grid gap-5 p-6 md:grid-cols-2">
          <div>
            <FieldLabel>Support Email</FieldLabel>
            <AdminInput
              value={settings.supportEmail}
              onChange={(event) => setSettings((current) => ({ ...current, supportEmail: event.target.value }))}
              placeholder="support@ailearningclass.com"
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
