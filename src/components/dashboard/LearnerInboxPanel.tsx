"use client";

import { useEffect, useMemo, useState } from "react";
import { Inbox, MessageSquareReply } from "lucide-react";

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
  conversations,
}: {
  conversations: LearnerInboxConversation[];
}) {
  const [lastViewedAt, setLastViewedAt] = useState<string | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(LAST_VIEWED_STORAGE_KEY);
    setLastViewedAt(stored);
  }, []);

  const unreadCount = useMemo(() => {
    const viewedAt = lastViewedAt ? new Date(lastViewedAt).getTime() : 0;

    return conversations.reduce((count, conversation) => {
      const hasUnreadReply = conversation.replies.some(
        (reply) => new Date(reply.createdAt).getTime() > viewedAt
      );
      return count + (hasUnreadReply ? 1 : 0);
    }, 0);
  }, [conversations, lastViewedAt]);

  function markInboxViewed() {
    const now = new Date().toISOString();
    window.localStorage.setItem(LAST_VIEWED_STORAGE_KEY, now);
    setLastViewedAt(now);
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

        <button
          type="button"
          onClick={markInboxViewed}
          className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-accent"
        >
          Mark inbox as read
        </button>
      </div>

      <div className="mt-6 space-y-4">
        {conversations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-background/60 p-6 text-center">
            <Inbox className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 font-semibold text-foreground">No admin replies yet</p>
            <p className="mt-2 text-sm text-muted-foreground">
              When the team replies to your messages, the conversation will show up here.
            </p>
          </div>
        ) : (
          conversations.map((conversation) => {
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
