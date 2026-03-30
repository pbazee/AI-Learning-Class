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
import { useToast } from "@/components/ui/toaster";

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

const tabs = ["general", "contact", "social", "faq"] as const;

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

  function handleSaveSettings() {
    setBusy(true);
    startTransition(async () => {
      const result = await saveSiteSettingsAction(settings);
      setBusy(false);
      toast(result.message, result.success ? "success" : "error");
      if (result.success) {
        router.refresh();
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
        </AdminCard>
      ) : null}

      {tab === "social" ? (
        <AdminCard className="grid gap-5 p-6 md:grid-cols-2">
          {["x", "linkedin", "youtube", "instagram", "tiktok", "facebook", "github"].map((platform) => (
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
