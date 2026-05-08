"use client";

import { useEffect, useMemo } from "react";
import Image from "next/image";
import { Copy, Facebook, Linkedin, MessageCircle, Share2, X } from "lucide-react";
import { useToast } from "@/components/ui/ToastProvider";
import { formatPrice } from "@/lib/utils";

function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M18.9 2H22l-6.77 7.74L23 22h-6.09l-4.77-6.24L6.68 22H3.57l7.24-8.27L1 2h6.25l4.31 5.7L18.9 2Zm-1.07 18.17h1.72L6.31 3.74H4.46l13.37 16.43Z" />
    </svg>
  );
}

const thumbnailFallback =
  "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=1200&h=630&fit=crop";

export function CourseShareModal({
  course,
  logoUrl,
  open,
  shareUrl,
  siteName,
  onClose,
}: {
  course: {
    title: string;
    shortDescription?: string;
    thumbnailUrl?: string;
    instructorName?: string;
    rating: number;
    price: number;
    currency?: string;
    whatYouLearn: string[];
  };
  logoUrl?: string;
  open: boolean;
  shareUrl: string;
  siteName: string;
  onClose: () => void;
}) {
  const { success, error } = useToast();
  const shortDescription = course.shortDescription?.trim() || `Explore ${course.title} on ${siteName}.`;
  const learningPoints = course.whatYouLearn.slice(0, 2);

  const shareLinks = useMemo(() => {
    const encodedUrl = encodeURIComponent(shareUrl);
    const whatsappText = encodeURIComponent(
      `🎓 ${course.title} on ${siteName} — ${shortDescription} Enroll here: ${shareUrl}`
    );
    const xText = encodeURIComponent(`${course.title} #AI #OnlineCourses #LearnAI`);

    return {
      whatsapp: `https://wa.me/?text=${whatsappText}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      x: `https://twitter.com/intent/tweet?text=${xText}&url=${encodedUrl}`,
      linkedIn: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    };
  }, [course.title, shareUrl, shortDescription, siteName]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      success("Copied!", 2000);
    } catch {
      error("Unable to copy the link right now.", 2000);
    }
  }

  async function copyTikTokCaption() {
    const caption = `Just found this 🔥 AI course — ${course.title}! Learn ${
      learningPoints[0] || "practical AI skills"
    }, ${learningPoints[1] || "real-world workflows"} and more. Link in bio: ${shareUrl} #AILearning #OnlineCourse #AIGenius`;

    try {
      await navigator.clipboard.writeText(caption);
      success("Copied!", 2000);
    } catch {
      error("Unable to copy the TikTok caption right now.", 2000);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/82 p-4 backdrop-blur-md"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[32px] border border-white/10 bg-[#04070d] p-6 text-white shadow-2xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-blue">
              Share This Course
            </p>
            <h3 className="mt-2 text-2xl font-black">Share preview card</h3>
            <p className="mt-2 text-sm text-slate-400">
              Send a rich course preview to social channels or copy a tailored caption in one click.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 p-2 text-slate-400 transition hover:border-primary-blue/40 hover:text-white"
            aria-label="Close share modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-8 overflow-hidden rounded-[28px] border border-white/10 bg-slate-950">
          <div className="relative aspect-[1200/630] w-full">
            <Image
              src={course.thumbnailUrl || thumbnailFallback}
              alt={course.title}
              fill
              sizes="(min-width: 1024px) 896px, 100vw"
              className="object-cover opacity-65"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/72 to-black/30" />
            <div className="absolute inset-0 flex flex-col justify-between p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div className="max-w-[72%]">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-blue">
                    AI Genius Lab
                  </p>
                  <h4 className="mt-3 text-2xl font-black sm:text-4xl">{course.title}</h4>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-white/76 sm:text-base">
                    {shortDescription}
                  </p>
                </div>
                <div className="rounded-full border border-white/15 bg-white/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
                  Social Preview
                </div>
              </div>

              <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="space-y-2 text-sm text-white/80">
                  <p>Instructor: {course.instructorName || "AI Genius Lab"}</p>
                  <p>Rating: {course.rating.toFixed(1)} / 5</p>
                  <p>Price: {course.price === 0 ? "Free" : formatPrice(course.price, course.currency || "USD")}</p>
                  <p className="break-all text-white/60">{shareUrl}</p>
                </div>

                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
                  {logoUrl ? (
                    <Image src={logoUrl} alt={siteName} width={88} height={28} className="h-7 w-auto object-contain opacity-80" />
                  ) : (
                    <span className="text-sm font-bold uppercase tracking-[0.16em] text-white/70">
                      {siteName}
                    </span>
                  )}
                  <Share2 className="h-4 w-4 text-primary-blue" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <a
            href={shareLinks.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm font-semibold text-white transition hover:border-primary-blue/40 hover:bg-slate-900"
          >
            <MessageCircle className="h-4 w-4 text-primary-blue" />
            WhatsApp
          </a>
          <a
            href={shareLinks.facebook}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm font-semibold text-white transition hover:border-primary-blue/40 hover:bg-slate-900"
          >
            <Facebook className="h-4 w-4 text-primary-blue" />
            Facebook
          </a>
          <button
            type="button"
            onClick={() => void copyTikTokCaption()}
            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm font-semibold text-white transition hover:border-primary-blue/40 hover:bg-slate-900"
          >
            <Copy className="h-4 w-4 text-primary-blue" />
            TikTok caption
          </button>
          <a
            href={shareLinks.x}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm font-semibold text-white transition hover:border-primary-blue/40 hover:bg-slate-900"
          >
            <XIcon className="h-4 w-4 text-primary-blue" />
            X
          </a>
          <a
            href={shareLinks.linkedIn}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm font-semibold text-white transition hover:border-primary-blue/40 hover:bg-slate-900"
          >
            <Linkedin className="h-4 w-4 text-primary-blue" />
            LinkedIn
          </a>
          <button
            type="button"
            onClick={() => void copyLink()}
            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm font-semibold text-white transition hover:border-primary-blue/40 hover:bg-slate-900"
          >
            <Copy className="h-4 w-4 text-primary-blue" />
            Copy Link
          </button>
        </div>
      </div>
    </div>
  );
}
