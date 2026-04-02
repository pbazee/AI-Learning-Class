"use client";

import { startTransition, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { MailOpen, MessageSquareReply, RefreshCw, Reply, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { replyToContactMessageAction, updateContactMessageStatusAction } from "@/app/admin/actions";
import {
  AdminButton,
  AdminCard,
  AdminPageIntro,
  AdminStatCard,
  AdminStatGrid,
  AdminTextarea,
  StatusPill,
} from "@/components/admin/ui";
import { useToast } from "@/components/ui/ToastProvider";
import type { ContactMessageThread } from "@/types";

function formatStatusTone(status: ContactMessageThread["status"]) {
  if (status === "UNREAD") return "warning";
  if (status === "REPLIED") return "success";
  return "info";
}

function formatStatusLabel(status: ContactMessageThread["status"]) {
  if (status === "UNREAD") return "Unread";
  if (status === "REPLIED") return "Replied";
  return "Read";
}

export function MessagesManager({ messages }: { messages: ContactMessageThread[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(messages[0]?.id ?? null);
  const [replyBody, setReplyBody] = useState("");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const selectedMessage = useMemo(
    () => messages.find((message) => message.id === selectedId) ?? messages[0] ?? null,
    [messages, selectedId]
  );

  function handleStatusUpdate(id: string, status: ContactMessageThread["status"]) {
    setBusyAction(`status:${id}:${status}`);
    startTransition(async () => {
      try {
        const result = await updateContactMessageStatusAction({ id, status });
        toast(result.message, result.success ? "success" : "error");
        if (result.success) {
          router.refresh();
        }
      } finally {
        setBusyAction(null);
      }
    });
  }

  function handleReply() {
    if (!selectedMessage || !replyBody.trim()) {
      return;
    }

    setBusyAction(`reply:${selectedMessage.id}`);
    startTransition(async () => {
      try {
        const result = await replyToContactMessageAction({
          messageId: selectedMessage.id,
          body: replyBody.trim(),
        });
        toast(result.message, result.success ? "success" : "error");
        if (result.success) {
          setReplyBody("");
          router.refresh();
        }
      } finally {
        setBusyAction(null);
      }
    });
  }

  return (
    <div className="space-y-6">
      <AdminPageIntro
        title="Messages"
        description="Review every contact submission, keep statuses up to date, and reply from one threaded inbox."
      />

      <AdminStatGrid>
        <AdminStatCard label="Inbox" value={messages.length} detail="All contact messages" />
        <AdminStatCard
          label="Unread"
          value={messages.filter((message) => message.status === "UNREAD").length}
          detail="Needs first response"
          accent="from-amber-500 to-orange-500"
        />
        <AdminStatCard
          label="Read"
          value={messages.filter((message) => message.status === "READ").length}
          detail="Opened but not replied"
          accent="from-sky-500 to-cyan-500"
        />
        <AdminStatCard
          label="Replied"
          value={messages.filter((message) => message.status === "REPLIED").length}
          detail="Follow-up already sent"
          accent="from-emerald-500 to-teal-500"
        />
      </AdminStatGrid>

      {messages.length === 0 ? (
        <AdminCard className="p-10 text-center">
          <MailOpen className="mx-auto h-10 w-10 text-blue-300" />
          <h3 className="mt-4 text-lg font-bold text-white">No messages yet</h3>
          <p className="mt-2 text-sm text-slate-400">
            New contact submissions will appear here automatically as they come in from the support page.
          </p>
        </AdminCard>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <AdminCard className="overflow-hidden">
            <div className="border-b border-white/10 px-5 py-4">
              <p className="text-sm font-semibold text-white">Inbox</p>
              <p className="mt-1 text-xs text-slate-400">Newest messages first</p>
            </div>
            <div className="max-h-[72vh] overflow-y-auto">
              {messages.map((message) => (
                <button
                  key={message.id}
                  type="button"
                  onClick={() => setSelectedId(message.id)}
                  className={`w-full border-b border-white/5 px-5 py-4 text-left transition ${
                    selectedMessage?.id === message.id ? "bg-white/5" : "hover:bg-white/[0.03]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{message.subject}</p>
                      <p className="mt-1 truncate text-xs text-slate-400">
                        {message.name} • {message.email}
                      </p>
                    </div>
                    <StatusPill tone={formatStatusTone(message.status)}>{formatStatusLabel(message.status)}</StatusPill>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm text-slate-300">{message.message}</p>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                    <span>{formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}</span>
                    <span>{message.replies.length} repl{message.replies.length === 1 ? "y" : "ies"}</span>
                  </div>
                </button>
              ))}
            </div>
          </AdminCard>

          <AdminCard className="flex min-h-[72vh] flex-col overflow-hidden">
            {selectedMessage ? (
              <>
                <div className="border-b border-white/10 px-6 py-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusPill tone={formatStatusTone(selectedMessage.status)}>
                          {formatStatusLabel(selectedMessage.status)}
                        </StatusPill>
                        <span className="text-xs text-slate-500">
                          {new Date(selectedMessage.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <h3 className="mt-3 text-2xl font-black text-white">{selectedMessage.subject}</h3>
                      <p className="mt-2 text-sm text-slate-400">
                        {selectedMessage.name} • {selectedMessage.email}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <AdminButton
                        type="button"
                        variant="secondary"
                        busy={busyAction === `status:${selectedMessage.id}:READ`}
                        icon={<MailOpen className="h-4 w-4" />}
                        onClick={() => handleStatusUpdate(selectedMessage.id, "READ")}
                      >
                        Mark Read
                      </AdminButton>
                      <AdminButton
                        type="button"
                        variant="secondary"
                        busy={busyAction === `status:${selectedMessage.id}:UNREAD`}
                        icon={<RefreshCw className="h-4 w-4" />}
                        onClick={() => handleStatusUpdate(selectedMessage.id, "UNREAD")}
                      >
                        Mark Unread
                      </AdminButton>
                      <AdminButton
                        type="button"
                        variant="secondary"
                        busy={busyAction === `status:${selectedMessage.id}:REPLIED`}
                        icon={<MessageSquareReply className="h-4 w-4" />}
                        onClick={() => handleStatusUpdate(selectedMessage.id, "REPLIED")}
                      >
                        Mark Replied
                      </AdminButton>
                    </div>
                  </div>
                </div>

                <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
                  <div className="rounded-[28px] border border-white/10 bg-black/25 p-5">
                    <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      <UserRound className="h-3.5 w-3.5" />
                      Original message
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-7 text-slate-100">{selectedMessage.message}</p>
                  </div>

                  {selectedMessage.replies.length > 0 ? (
                    <div className="space-y-4">
                      {selectedMessage.replies.map((reply) => (
                        <div
                          key={reply.id}
                          className={`rounded-[26px] border p-5 ${
                            reply.isAdmin
                              ? "ml-auto max-w-[90%] border-primary-blue/25 bg-primary-blue text-white"
                              : "mr-auto max-w-[90%] border-white/10 bg-black/25 text-slate-100"
                          }`}
                        >
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${reply.isAdmin ? "text-white/80" : "text-slate-400"}`}>
                              {reply.isAdmin ? reply.senderName || "Admin reply" : reply.senderName || selectedMessage.name}
                            </p>
                            <span className={`text-xs ${reply.isAdmin ? "text-white/70" : "text-slate-500"}`}>
                              {new Date(reply.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="whitespace-pre-wrap text-sm leading-7">{reply.body}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[28px] border border-dashed border-white/10 bg-black/20 p-6 text-sm text-slate-400">
                      No replies yet. Use the composer below to answer this message and store the thread history here.
                    </div>
                  )}
                </div>

                <div className="border-t border-white/10 px-6 py-5">
                  <p className="mb-3 text-sm font-semibold text-white">Reply</p>
                  <AdminTextarea
                    rows={5}
                    placeholder="Write a helpful response to this learner..."
                    value={replyBody}
                    onChange={(event) => setReplyBody(event.target.value)}
                  />
                  <div className="mt-4 flex justify-end">
                    <AdminButton
                      type="button"
                      busy={busyAction === `reply:${selectedMessage.id}`}
                      icon={<Reply className="h-4 w-4" />}
                      onClick={handleReply}
                    >
                      Send Reply
                    </AdminButton>
                  </div>
                </div>
              </>
            ) : null}
          </AdminCard>
        </div>
      )}
    </div>
  );
}
