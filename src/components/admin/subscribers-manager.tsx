"use client";

import { startTransition, useMemo, useState } from "react";
import { Download, Mail, PauseCircle, PlayCircle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { deleteSubscriberAction, sendNewsletterAction, toggleSubscriberStatusAction } from "@/app/admin/actions";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import {
  AdminButton,
  AdminCard,
  AdminInput,
  AdminModal,
  AdminPageIntro,
  AdminStatCard,
  AdminStatGrid,
  EmptyState,
  FieldLabel,
  StatusPill,
} from "@/components/admin/ui";
import { useToast } from "@/components/ui/ToastProvider";

type SubscriberRow = {
  id: string;
  email: string;
  subscribedAt: string;
  isActive: boolean;
};

function downloadCsv(rows: SubscriberRow[]) {
  const lines = [
    ["Email", "Subscribed Date", "Status"].join(","),
    ...rows.map((row) =>
      [`"${row.email}"`, `"${row.subscribedAt}"`, `"${row.isActive ? "Active" : "Paused"}"`].join(",")
    ),
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "subscribers.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

export function SubscribersManager({ subscribers }: { subscribers: SubscriberRow[] }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [newsletterOpen, setNewsletterOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [html, setHtml] = useState("<p>Share your latest launch, article, or offer with subscribers.</p>");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const activeCount = useMemo(
    () => subscribers.filter((subscriber) => subscriber.isActive).length,
    [subscribers]
  );

  function toggleSelection(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]
    );
  }

  function toggleAll() {
    if (selectedIds.length === subscribers.length) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds(subscribers.map((subscriber) => subscriber.id));
  }

  function handleStatus(id: string, nextStatus: boolean) {
    setBusy(true);
    startTransition(async () => {
      const result = await toggleSubscriberStatusAction(id, nextStatus);
      setBusy(false);
      toast(result.message, result.success ? "success" : "error");
      if (result.success) {
        router.refresh();
      }
    });
  }

  function handleDelete(id: string) {
    const confirmed = window.confirm("Remove this subscriber?");
    if (!confirmed) return;

    setBusy(true);
    startTransition(async () => {
      const result = await deleteSubscriberAction(id);
      setBusy(false);
      toast(result.message, result.success ? "success" : "error");
      if (result.success) {
        router.refresh();
      }
    });
  }

  function handleSendNewsletter() {
    setBusy(true);
    startTransition(async () => {
      const result = await sendNewsletterAction({
        subject,
        previewText,
        html,
        subscriberIds: selectedIds,
      });
      setBusy(false);
      toast(result.message, result.success ? "success" : "error");
      if (result.success) {
        setNewsletterOpen(false);
        setSelectedIds([]);
      }
    });
  }

  return (
    <div className="space-y-6">
      <AdminPageIntro
        title="Subscribers"
        description="Track newsletter sign-ups, export your list, and send bulk updates to active subscribers."
        actions={
          <>
            <AdminButton type="button" variant="secondary" icon={<Download className="h-4 w-4" />} onClick={() => downloadCsv(subscribers)}>
              Export CSV
            </AdminButton>
            <AdminButton type="button" icon={<Mail className="h-4 w-4" />} onClick={() => setNewsletterOpen(true)}>
              Send Newsletter
            </AdminButton>
          </>
        }
      />

      <AdminStatGrid>
        <AdminStatCard label="Total Subscribers" value={subscribers.length} />
        <AdminStatCard label="Active" value={activeCount} />
        <AdminStatCard label="Paused" value={subscribers.length - activeCount} />
        <AdminStatCard label="Selected" value={selectedIds.length} detail="Used for bulk newsletter sends" />
      </AdminStatGrid>

      {subscribers.length === 0 ? (
        <EmptyState
          title="No subscribers yet"
          description="Newsletter sign-ups from the storefront will appear here automatically."
        />
      ) : (
        <AdminCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left">
                    <input type="checkbox" checked={selectedIds.length === subscribers.length} onChange={toggleAll} />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Subscribed</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {subscribers.map((subscriber) => (
                  <tr key={subscriber.id} className="hover:bg-muted/20">
                    <td className="px-4 py-4">
                      <input type="checkbox" checked={selectedIds.includes(subscriber.id)} onChange={() => toggleSelection(subscriber.id)} />
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-foreground">{subscriber.email}</p>
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">{subscriber.subscribedAt}</td>
                    <td className="px-4 py-4">
                      <StatusPill tone={subscriber.isActive ? "success" : "neutral"}>
                        {subscriber.isActive ? "Active" : "Paused"}
                      </StatusPill>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <AdminButton
                          type="button"
                          variant="ghost"
                          icon={subscriber.isActive ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                          onClick={() => handleStatus(subscriber.id, !subscriber.isActive)}
                        >
                          {subscriber.isActive ? "Pause" : "Activate"}
                        </AdminButton>
                        <AdminButton type="button" variant="ghost" icon={<Trash2 className="h-4 w-4" />} onClick={() => handleDelete(subscriber.id)}>
                          Delete
                        </AdminButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminCard>
      )}

      <AdminModal
        open={newsletterOpen}
        onClose={() => setNewsletterOpen(false)}
        title="Send Newsletter"
        description={selectedIds.length ? `Sending to ${selectedIds.length} selected subscribers.` : "No rows selected, so this will send to all active subscribers."}
        size="xl"
        footer={
          <div className="flex justify-end gap-3">
            <AdminButton type="button" variant="secondary" onClick={() => setNewsletterOpen(false)}>
              Cancel
            </AdminButton>
            <AdminButton type="button" busy={busy} icon={<Mail className="h-4 w-4" />} onClick={handleSendNewsletter}>
              Send Newsletter
            </AdminButton>
          </div>
        }
      >
        <div className="grid gap-5">
          <div>
            <FieldLabel>Subject</FieldLabel>
            <AdminInput value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="This week's AI launch roundup" />
          </div>
          <div>
            <FieldLabel>Preview Text</FieldLabel>
            <AdminInput value={previewText} onChange={(event) => setPreviewText(event.target.value)} placeholder="Short summary shown in inbox previews." />
          </div>
          <div>
            <FieldLabel>Newsletter Body</FieldLabel>
            <RichTextEditor value={html} onChange={setHtml} />
          </div>
        </div>
      </AdminModal>
    </div>
  );
}
