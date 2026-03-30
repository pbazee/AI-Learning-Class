"use client";

import { deleteReviewAction, saveReviewAction } from "@/app/admin/actions";
import { SimpleCrudManager } from "@/components/admin/simple-crud-manager";
import { StatusPill } from "@/components/admin/ui";

type ReviewRow = {
  id: string;
  userId: string;
  userName: string;
  courseId: string;
  courseTitle: string;
  rating: number;
  title?: string | null;
  body: string;
  isApproved: boolean;
  isFeatured: boolean;
  createdAt: string;
};

export function ReviewsManager({
  reviews,
  userOptions,
  courseOptions,
}: {
  reviews: ReviewRow[];
  userOptions: Array<{ label: string; value: string }>;
  courseOptions: Array<{ label: string; value: string }>;
}) {
  return (
    <SimpleCrudManager
      title="Reviews & Testimonials"
      description="Moderate course reviews, approve testimonials, and highlight standout learner feedback."
      stats={[
        { label: "Total Reviews", value: reviews.length },
        { label: "Approved", value: reviews.filter((review) => review.isApproved).length },
        { label: "Featured", value: reviews.filter((review) => review.isFeatured).length },
        { label: "Average Rating", value: reviews.length ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1) : "0.0" },
      ]}
      items={reviews}
      createLabel="New Review"
      dialogTitle="Review Moderator"
      emptyTitle="No reviews yet"
      emptyDescription="Create or import reviews so you can moderate testimonials before they appear publicly."
      getEmptyForm={() => ({
        id: "",
        userId: "",
        courseId: "",
        rating: 5,
        title: "",
        body: "",
        isApproved: false,
        isFeatured: false,
      })}
      mapItemToForm={(item) => ({
        id: item.id,
        userId: item.userId,
        courseId: item.courseId,
        rating: item.rating,
        title: item.title || "",
        body: item.body,
        isApproved: item.isApproved,
        isFeatured: item.isFeatured,
      })}
      buildPayload={(form) => ({
        id: form.id || undefined,
        userId: form.userId,
        courseId: form.courseId,
        rating: Number(form.rating),
        title: form.title,
        body: form.body,
        isApproved: Boolean(form.isApproved),
        isFeatured: Boolean(form.isFeatured),
      })}
      onSave={saveReviewAction}
      onDelete={deleteReviewAction}
      fields={[
        { name: "userId", label: "Learner", type: "select", options: userOptions },
        { name: "courseId", label: "Course", type: "select", options: courseOptions },
        { name: "rating", label: "Rating", type: "number", step: "1" },
        { name: "isApproved", label: "Approved", type: "switch", hint: "Approved reviews can feed the storefront testimonials." },
        { name: "isFeatured", label: "Featured Testimonial", type: "switch", hint: "Featured reviews are prioritized in testimonial sections." },
        { name: "title", label: "Review Title", type: "text", placeholder: "Best AI course I’ve taken" },
        { name: "body", label: "Review Body", type: "textarea", rows: 5, colSpan: 2 },
      ]}
      columns={[
        {
          header: "Review",
          cell: (item) => (
            <div>
              <p className="font-semibold text-foreground">{item.title || `${item.rating}/5 review`}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.body}</p>
            </div>
          ),
        },
        {
          header: "Learner",
          cell: (item) => (
            <div>
              <p className="text-sm font-semibold text-foreground">{item.userName}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.courseTitle}</p>
            </div>
          ),
        },
        {
          header: "Rating",
          cell: (item) => <span className="text-sm font-semibold text-foreground">{item.rating}/5</span>,
        },
        {
          header: "Status",
          cell: (item) => (
            <div className="flex flex-wrap gap-2">
              <StatusPill tone={item.isApproved ? "success" : "neutral"}>{item.isApproved ? "Approved" : "Pending"}</StatusPill>
              {item.isFeatured ? <StatusPill tone="warning">Featured</StatusPill> : null}
            </div>
          ),
        },
      ]}
    />
  );
}
