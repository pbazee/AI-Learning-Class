import type { Metadata } from "next";
import Link from "next/link";
import { Star } from "lucide-react";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { JsonLd } from "@/components/seo/JsonLd";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getTestimonials } from "@/lib/data";
import { absoluteUrl, buildSiteMetadata } from "@/lib/site-server";

export async function generateMetadata(): Promise<Metadata> {
  return buildSiteMetadata("/reviews", {
    title: "Reviews",
    description:
      "See what learners say about AI GENIUS LAB courses, mentorship, and project-based AI training.",
  });
}

export default async function ReviewsPage() {
  const reviews = await getTestimonials(24);
  const reviewsJsonLd = reviews.slice(0, 12).map((review) => ({
    "@context": "https://schema.org",
    "@type": "Review",
    itemReviewed: {
      "@type": "EducationalOrganization",
      name: "AI GENIUS LAB",
      url: absoluteUrl("/"),
    },
    author: {
      "@type": "Person",
      name: review.name,
    },
    reviewRating: {
      "@type": "Rating",
      ratingValue: review.rating,
      bestRating: 5,
    },
    reviewBody: review.text,
    name: review.courseCompleted || "Learner review",
  }));

  return (
    <div className="min-h-screen bg-background">
      <JsonLd data={reviewsJsonLd} />
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600 dark:text-blue-400">
            Reviews
          </p>
          <h1 className="mt-4 text-4xl font-black text-foreground sm:text-5xl">
            What learners say about AI GENIUS LAB
          </h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            Real testimonials from learners building AI careers, shipping projects, and moving
            into stronger technical roles.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {reviews.map((review) => (
            <Card key={review.id} className="h-full">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                    {review.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <CardTitle className="text-xl">{review.name}</CardTitle>
                    <CardDescription>{review.role}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star
                      key={`${review.id}-${index}`}
                      className={`h-4 w-4 ${
                        index < review.rating
                          ? "fill-amber-400 text-amber-400"
                          : "text-slate-300 dark:text-slate-700"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-sm leading-7 text-muted-foreground">{review.text}</p>
                {review.courseCompleted ? (
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">
                    {review.courseCompleted}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Button asChild>
            <Link href="/courses">Explore Courses</Link>
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
