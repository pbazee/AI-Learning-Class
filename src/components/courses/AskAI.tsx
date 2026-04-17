"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { X, Send, Sparkles, Bot, User, Loader2, Lock } from "lucide-react";
import { DEFAULT_ASK_AI_NAME } from "@/lib/site";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

type AskAiQuota = {
  planName: string;
  limit: number;
  used: number;
  remaining: number;
  monthKey: string;
};

interface AskAIProps {
  courseTitle: string;
  onClose: () => void;
  assistantLabel?: string;
  variant?: "overlay" | "embedded";
  className?: string;
}

const suggestions = [
  "Summarize the key concepts",
  "What are the prerequisites?",
  "Give me a study plan",
  "What projects will I build?",
];

export function AskAI({
  courseTitle,
  onClose,
  assistantLabel = DEFAULT_ASK_AI_NAME,
  variant = "overlay",
  className,
}: AskAIProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Hi! I'm your **${assistantLabel}** assistant for **"${courseTitle}"**. I can summarize concepts, create practice questions, and help you plan your study sessions.`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [quota, setQuota] = useState<AskAiQuota | null>(null);
  const [quotaLoading, setQuotaLoading] = useState(true);
  const [quotaError, setQuotaError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadQuota() {
      // Coordinated delay: Prevents auth lock contention when multiple 
      // authenticated fetches fire simultaneously on mount.
      await new Promise(resolve => setTimeout(resolve, 400));
      
      if (cancelled) return;

      setQuotaLoading(true);
      setQuotaError(null);

      try {
        const response = await fetch("/api/ask-ai");
        const payload = await response.json().catch(() => null);

        if (!response.ok || !payload?.quota) {
          throw new Error(payload?.error || `Please sign in to use ${assistantLabel}.`);
        }

        if (!cancelled) {
          setQuota(payload.quota);
        }
      } catch (error) {
        if (!cancelled) {
          setQuota(null);
          setQuotaError(
            error instanceof Error ? error.message : `Unable to load ${assistantLabel} quota.`
          );
        }
      } finally {
        if (!cancelled) {
          setQuotaLoading(false);
        }
      }
    }

    void loadQuota();

    return () => {
      cancelled = true;
    };
  }, [assistantLabel]);

  async function sendMessage(content: string) {
    if (!content.trim() || loading) return;

    if (!quota || quota.remaining <= 0) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: quota
            ? `You have reached your ${quota.planName} plan limit for this month.`
            : `Please sign in to use ${assistantLabel}.`,
          timestamp: new Date(),
        },
      ]);
      return;
    }

    const userMsg: Message = { role: "user", content, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ask-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((message) => ({
            role: message.role,
            content: message.content,
          })),
          courseTitle,
        }),
      });

      const data = await res.json().catch(() => null);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data?.content || "I could not process that request. Please try again.",
          timestamp: new Date(),
        },
      ]);

      if (data?.quota) {
        setQuota(data.quota);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Connection error. Please try again in a moment.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage(input);
    }
  }

  function renderContent(content: string) {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-900 dark:text-white">$1</strong>')
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(
        /`(.*?)`/g,
        '<code class="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">$1</code>'
      );
  }

  const quotaLabel = quota
    ? `${quota.remaining} of ${quota.limit} requests left this month`
    : quotaLoading
      ? "Loading quota..."
      : quotaError || `Please sign in to use ${assistantLabel}`;

  const inputDisabled = loading || quotaLoading || !quota || quota.remaining <= 0;
  const motionProps =
    variant === "overlay"
      ? {
          initial: { opacity: 0, x: 60 },
          animate: { opacity: 1, x: 0 },
          exit: { opacity: 0, x: 60 },
        }
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: 16 },
        };

  return (
    <motion.div
      {...motionProps}
      className={cn(
        "flex w-full flex-col bg-white dark:bg-slate-950",
        variant === "overlay"
          ? "fixed inset-x-0 bottom-0 z-[120] max-h-[calc(100vh-120px)] overflow-hidden rounded-t-[28px] border border-border shadow-[0_0_60px_rgba(15,23,42,0.12)] sm:inset-x-auto sm:bottom-4 sm:right-4 sm:w-[26rem] sm:rounded-[30px]"
          : "h-full border-0 shadow-none",
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-border bg-blue-50/70 p-4 dark:bg-blue-950/20">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-600 text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-bold text-foreground">{assistantLabel}</div>
            <div className="text-xs text-muted-foreground">{quota?.planName || "Free"} plan</div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-2 text-muted-foreground hover:bg-card hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="border-b border-border bg-background px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-blue">
              Monthly quota
            </p>
            <p className="mt-1 text-sm text-foreground">{quotaLabel}</p>
          </div>
          {quota && quota.remaining <= 0 ? (
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-300">
              <Lock className="h-4 w-4" />
            </div>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-background p-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "flex-row")}
          >
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
                msg.role === "assistant"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
              )}
            >
              {msg.role === "assistant" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
            </div>
            <div
              className={cn(
                "max-w-[82%] rounded-2xl px-4 py-3 text-sm shadow-sm",
                msg.role === "assistant"
                  ? "border border-border bg-card text-foreground"
                  : "bg-blue-600 text-white"
              )}
            >
              <p className="leading-7" dangerouslySetInnerHTML={{ __html: renderContent(msg.content) }} />
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Bot className="h-4 w-4" />
            </div>
            <div className="rounded-2xl border border-border bg-card px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {messages.length === 1 && (
        <div className="border-t border-border px-4 py-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Quick prompts
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => void sendMessage(suggestion)}
                disabled={inputDisabled}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-border bg-card p-4">
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 focus-within:border-blue-300">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={quota ? "Ask anything about this course..." : `Sign in to unlock ${assistantLabel}`}
            disabled={inputDisabled}
            className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60"
          />
          <button
            onClick={() => void sendMessage(input)}
            disabled={!input.trim() || inputDisabled}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Powered by OpenAI with plan-based monthly usage limits
        </p>
      </div>
    </motion.div>
  );
}

export const AICopilot = AskAI;
