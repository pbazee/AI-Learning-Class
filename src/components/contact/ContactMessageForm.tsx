"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const inputClassName =
  "flex h-11 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary-blue focus:ring-2 focus:ring-primary-blue/20";

export function ContactMessageForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/contact/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || "Unable to send your message right now.");
      }

      setForm({
        name: "",
        email: "",
        subject: "",
        message: "",
      });
      setFeedback({
        type: "success",
        message: payload?.message || "Your message has been sent successfully.",
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

  function updateField<Key extends keyof typeof form>(key: Key, value: (typeof form)[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold text-foreground">Name</label>
          <input
            required
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            placeholder="Your full name"
            className={inputClassName}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-foreground">Email</label>
          <input
            required
            type="email"
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
            placeholder="you@example.com"
            className={inputClassName}
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-foreground">Subject</label>
        <input
          required
          value={form.subject}
          onChange={(event) => updateField("subject", event.target.value)}
          placeholder="How can we help?"
          className={inputClassName}
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-foreground">Message</label>
        <Textarea
          required
          rows={6}
          value={form.message}
          onChange={(event) => updateField("message", event.target.value)}
          placeholder="Tell us what you need, what page you were on, and any context that will help us respond faster."
        />
      </div>

      {feedback ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"
              : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      <Button type="submit" size="lg" className="w-full md:w-auto" disabled={busy}>
        <Send className="h-4 w-4" />
        {busy ? "Sending..." : "Send Message"}
      </Button>
    </form>
  );
}
