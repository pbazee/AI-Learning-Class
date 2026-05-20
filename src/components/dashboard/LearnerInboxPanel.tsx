"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Inbox, Loader2, MessageSquareReply, Plus, Send, Trash2 } from "lucide-react";

type LearnerInboxConversation = {
  id: string;
  subject: string;
  message: string;
  createdAt: string;
  replies: Array<{
    id: string;
    body: string;
    createdAt: string;
  }>;
};

const LAST_VIEWED_STORAGE_KEY = "learner-inbox:last-viewed";

export function LearnerInboxPanel({
  userName,
  userEmail,
  conversations,
}: {
  userName: string;
  userEmail: string;
  conversations: LearnerInboxConversation[];
}) {
  const [localConversations, setLocalConversations] = useState(conversations);
  const [lastViewedAt, setLastViewedAt] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [form, setForm] = useState({
    subject: "",
    message: "",
  });

  useEffect(() => {
    setLocalConversations(conversations);
  }, [conversations]);

  useEffect(() => {
    const stored = window.localStorage.getItem(LAST_VIEWED_STORAGE_KEY);
    setLastViewedAt(stored);
  }, []);

  const unreadCount = useMemo(() => {
    const viewedAt = lastViewedAt ? new Date(lastViewedAt).getTime() : 0;

    return localConversations.reduce((count, conversation) => {
      const hasUnreadReply = conversation.replies.some(
        (reply) => new Date(reply.createdAt).getTime() > viewedAt
      );
      return count + (hasUnreadReply ? 1 : 0);
    }, 0);
  }, [lastViewedAt, localConversations]);

  function markInboxViewed() {
    const now = new Date().toISOString();
    window.localStorage.setItem(LAST_VIEWED_STORAGE_KEY, now);
    setLastViewedAt(now);
  }

  async function handleSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/contact/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: userName || userEmail.split("@")[0] || "Learner",
          email: userEmail,
          subject: form.subject,
          message: form.message,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || "Unable to send your message right now.");
      }

      const createdAt = new Date().toISOString();
      setLocalConversations((current) => [
        {
          id: payload?.id || `local-${Date.now()}`,
          subject: form.subject,
          message: form.message,
          createdAt,
          replies: [],
        },
        ...current,
      ]);
      setForm({ subject: "", message: "" });
      setComposeOpen(false);
      setFeedback({
        type: "success",
        message: payload?.message || "Message sent!",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Unable to send your message right now.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteMessage(id: string) {
    setDeletingId(id);
    setFeedback(null);

    try {
      const response = await fetch(`/api/contact/messages/${id}`, {
        method: "DELETE",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || "Unable to delete this message right now.");
      }

      setLocalConversations((current) => current.filter((conversation) => conversation.id !== id));
      setFeedback({
        type: "success",
        message: payload?.message || "Message deleted successfully.",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Unable to delete this message right now.",
      });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="rounded-[28px] border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-black text-foreground">Inbox</h2>
            {unreadCount > 0 ? (
              <span className="inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                {unreadCount}
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Replies from the admin to your contact messages appear here.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setComposeOpen((current) => !current);
              setFeedback(null);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-blue/90"
          >
            <Plus className="h-4 w-4" />
            {composeOpen ? "Close" : "New Message"}
          </button>
          <button
            type="button"
            onClick={markInboxViewed}
            className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-accent"
          >
            Mark inbox as read
          </button>
        </div>
      </div>

      {composeOpen ? (
        <form onSubmit={handleSendMessage} className="mt-6 rounded-2xl border border-border bg-background/60 p-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">Subject</label>
            <input
              required
              value={form.subject}
              onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
              placeholder="What do you need help with?"
              className="flex h-11 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary-blue focus:ring-2 focus:ring-primary-blue/20"
            />
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-sm font-semibold text-foreground">Message</label>
            <textarea
              required
              rows={5}
              value={form.message}
              onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
              placeholder="Write your message to the admin team here."
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary-blue focus:ring-2 focus:ring-primary-blue/20"
            />
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl bg-primary-blue px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-blue/90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {busy ? "Sending..." : "Send"}
            </button>
          </div>
        </form>
      ) : null}

      {feedback ? (
        <div
          className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"
              : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      <div className="mt-6 space-y-4">
        {localConversations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-background/60 p-6 text-center">
            <Inbox className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 font-semibold text-foreground">No admin replies yet</p>
            <p className="mt-2 text-sm text-muted-foreground">
              When the team replies to your messages, the conversation will show up here.
            </p>
          </div>
        ) : (
          localConversations.map((conversation) => {
            const viewedAt = lastViewedAt ? new Date(lastViewedAt).getTime() : 0;
            const hasUnreadReply = conversation.replies.some(
              (reply) => new Date(reply.createdAt).getTime() > viewedAt
            );

            return (
              <article
                key={conversation.id}
                className="rounded-2xl border border-border bg-background/70 p-5"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-foreground">{conversation.subject}</h3>
                      {hasUnreadReply ? (
                        <span className="inline-flex items-center rounded-full bg-red-500/12 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.12em] text-red-600">
                          New reply
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Sent {new Date(conversation.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteMessage(conversation.id)}
                    disabled={deletingId === conversation.id}
                    className="inline-flex items-center justify-center rounded-xl border border-rose-200 px-3 py-2 text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-900/60 dark:hover:bg-rose-950/30"
                    aria-label={`Delete message ${conversation.subject}`}
                  >
                    {deletingId === conversation.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>

                <div className="mt-4 rounded-2xl border border-border bg-card p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Your message
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-foreground">
                    {conversation.message}
                  </p>
                </div>

                <div className="mt-4 space-y-3">
                  {conversation.replies.map((reply) => (
                    <div
                      key={reply.id}
                      className="rounded-2xl border border-primary-blue/15 bg-primary-blue/5 p-4"
                    >
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary-blue">
                        <MessageSquareReply className="h-3.5 w-3.5" />
                        Admin reply
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-foreground">
                        {reply.body}
                      </p>
                      <p className="mt-3 text-xs text-muted-foreground">
                        {new Date(reply.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
