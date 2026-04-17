import type { Metadata } from "next";
import { HelpCircle, ChevronDown } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { prisma } from "@/lib/prisma";
import { buildSiteMetadata } from "@/lib/site-server";

export async function generateMetadata(): Promise<Metadata> {
  return buildSiteMetadata("/faqs", {
    title: "Frequently Asked Questions",
    description:
      "Find answers to common questions about AI GENIUS LAB courses, subscriptions, certificates, and more.",
  });
}

export default async function FaqsPage() {
  const faqs = await prisma.fAQ.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Hero */}
        <div className="mb-14 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary-blue/20 bg-primary-blue/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary-blue">
            <HelpCircle className="h-3.5 w-3.5" />
            Support
          </div>
          <h1 className="text-4xl font-black tracking-tight text-foreground sm:text-5xl">
            Frequently Asked{" "}
            <span className="text-primary-blue">Questions</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            Everything you need to know about our platform, courses,
            subscriptions, and certificates — all in one place.
          </p>
        </div>

        {/* FAQ List */}
        {faqs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
            <HelpCircle className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40" />
            <p className="text-lg font-semibold text-foreground">
              No FAQs available yet
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Check back soon — our team is preparing answers to common
              questions.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {faqs.map((faq) => (
              <details
                key={faq.id}
                className="group rounded-2xl border border-border bg-card shadow-sm transition-all hover:shadow-md open:shadow-md"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-4 px-6 py-5 text-left">
                  <div className="flex items-start gap-3">
                    <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary-blue" />
                    <span className="text-sm font-semibold text-foreground sm:text-base">
                      {faq.question}
                    </span>
                  </div>
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <div className="border-t border-border px-6 pb-6 pt-4">
                  <p className="pl-8 text-sm leading-7 text-muted-foreground">
                    {faq.answer}
                  </p>
                </div>
              </details>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="mt-16 rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <h3 className="text-xl font-black text-foreground">
            Still have questions?
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Our team is here to help. Reach out and we&apos;ll respond as quickly
            as possible.
          </p>
          <a
            href="/contact"
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-primary-blue px-8 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primary-blue/90"
          >
            Contact Us {"->"}
          </a>
        </div>
      </div>

      <Footer />
    </div>
  );
}
