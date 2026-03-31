"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, MessageSquareQuote, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/ToastProvider";
import { cn } from "@/lib/utils";
import type { CourseReview } from "@/types";

export function CourseReviewsSection({
  courseId,
  courseSlug,
  reviews,
  viewer,
}: {
  courseId: string;
  courseSlug: string;
  reviews: CourseReview[];
  viewer: { id: string; name?: string | null } | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!viewer) {
      router.push(`/login?redirect=${encodeURIComponent(`/courses/${courseSlug}#reviews`)}`);
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`/api/courses/${courseId}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rating,
          body,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "Unable to save your review right now.");
      }

      toast("Review submitted successfully.", "success");
      setBody("");
      setRating(5);
      router.refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Unable to save your review right now.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section id="reviews" className="space-y-6 scroll-mt-28">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
            Reviews
          </p>
          <h2 className="mt-2 text-2xl font-black text-foreground">Learner reviews & testimonials</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            See what learners thought of this course, then share your own experience.
          </p>
        </div>
        <div className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground">
          {reviews.length} review{reviews.length === 1 ? "" : "s"}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="space-y-4">
          {reviews.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex min-h-[180px] flex-col items-center justify-center gap-3 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-300">
                  <MessageSquareQuote className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">No reviews yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Be the first learner to rate this course and share your experience.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            reviews.map((review) => (
              <Card key={review.id} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                      {(review.name || "A").slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-semibold text-foreground">{review.name}</p>
                          <p className="text-xs text-muted-foreground">{review.createdAt}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, index) => (
                            <Star
                              key={`${review.id}-${index}`}
                              className={cn(
                                "h-4 w-4",
                                index < review.rating
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-slate-300 dark:text-slate-700"
                              )}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="mt-3 text-sm leading-7 text-muted-foreground">{review.body}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <Card className="h-fit border-blue-200/70 bg-gradient-to-b from-white to-blue-50/30 dark:border-blue-900/60 dark:from-slate-950 dark:to-slate-950">
          <CardHeader>
            <CardTitle>Write a review</CardTitle>
            <CardDescription>
              Rate the course and share what stood out for you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {viewer ? (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <p className="mb-3 text-sm font-semibold text-foreground">Your rating</p>
                  <div
                    role="radiogroup"
                    aria-label="Course rating"
                    className="flex items-center gap-2"
                  >
                    {Array.from({ length: 5 }).map((_, index) => {
                      const nextRating = index + 1;
                      return (
                        <button
                          key={nextRating}
                          type="button"
                          role="radio"
                          aria-checked={rating === nextRating}
                          onClick={() => setRating(nextRating)}
                          className="rounded-full p-1.5 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/40"
                        >
                          <Star
                            className={cn(
                              "h-7 w-7",
                              nextRating <= rating
                                ? "fill-amber-400 text-amber-400"
                                : "text-slate-300 dark:text-slate-700"
                            )}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label htmlFor="course-review-body" className="mb-2 block text-sm font-semibold text-foreground">
                    Your review
                  </label>
                  <Textarea
                    id="course-review-body"
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    placeholder="What did you learn, and who would you recommend this course to?"
                    className="min-h-[160px]"
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting Review
                    </>
                  ) : (
                    "Submit Review"
                  )}
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Sign in to rate this course and leave a review for other learners.
                </p>
                <Button asChild className="w-full">
                  <Link href={`/login?redirect=${encodeURIComponent(`/courses/${courseSlug}#reviews`)}`}>
                    Sign in to review
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
