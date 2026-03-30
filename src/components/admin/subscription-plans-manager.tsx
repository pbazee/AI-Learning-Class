"use client";

import { deleteSubscriptionPlanAction, saveSubscriptionPlanAction } from "@/app/admin/actions";
import { SimpleCrudManager } from "@/components/admin/simple-crud-manager";
import { StatusPill } from "@/components/admin/ui";
import { formatPrice } from "@/lib/utils";

type PlanRow = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  price: number;
  yearlyPrice?: number | null;
  currency: string;
  features: string[];
  coursesIncluded: string[];
  isPopular: boolean;
  isActive: boolean;
  subscriptionsCount: number;
};

function toLines(values: string[]) {
  return values.join("\n");
}

function fromLines(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function SubscriptionPlansManager({ plans }: { plans: PlanRow[] }) {
  return (
    <SimpleCrudManager
      title="Subscriptions"
      description="Manage paid plans, featured pricing, and which courses or bundles each plan unlocks."
      stats={[
        { label: "Total Plans", value: plans.length },
        { label: "Active", value: plans.filter((plan) => plan.isActive).length },
        { label: "Popular Picks", value: plans.filter((plan) => plan.isPopular).length },
        { label: "Tracked Subscribers", value: plans.reduce((sum, plan) => sum + plan.subscriptionsCount, 0) },
      ]}
      items={plans}
      createLabel="New Plan"
      dialogTitle="Subscription Plan"
      emptyTitle="No plans configured"
      emptyDescription="Create pricing tiers for individual learners, teams, and enterprise customers."
      getEmptyForm={() => ({
        id: "",
        name: "",
        slug: "",
        description: "",
        price: 0,
        yearlyPrice: "",
        currency: "USD",
        featuresText: "",
        coursesIncludedText: "ALL",
        isPopular: false,
        isActive: true,
      })}
      mapItemToForm={(item) => ({
        id: item.id,
        name: item.name,
        slug: item.slug,
        description: item.description || "",
        price: item.price,
        yearlyPrice: item.yearlyPrice != null ? String(item.yearlyPrice) : "",
        currency: item.currency,
        featuresText: toLines(item.features),
        coursesIncludedText: toLines(item.coursesIncluded),
        isPopular: item.isPopular,
        isActive: item.isActive,
      })}
      buildPayload={(form) => ({
        id: form.id || undefined,
        name: form.name,
        slug: form.slug,
        description: form.description,
        price: form.price,
        yearlyPrice: form.yearlyPrice === "" ? undefined : Number(form.yearlyPrice),
        currency: form.currency,
        features: fromLines(form.featuresText),
        coursesIncluded: fromLines(form.coursesIncludedText),
        isPopular: Boolean(form.isPopular),
        isActive: Boolean(form.isActive),
      })}
      onSave={saveSubscriptionPlanAction}
      onDelete={deleteSubscriptionPlanAction}
      fields={[
        { name: "name", label: "Plan Name", type: "text", placeholder: "Pro" },
        { name: "slug", label: "Slug", type: "text", placeholder: "pro" },
        { name: "price", label: "Monthly Price", type: "number", step: "0.01" },
        { name: "yearlyPrice", label: "Yearly Price", type: "number", step: "0.01" },
        { name: "currency", label: "Currency", type: "text", placeholder: "USD" },
        { name: "isPopular", label: "Highlight as Popular", type: "switch", hint: "Adds a featured state in pricing sections." },
        { name: "isActive", label: "Active Plan", type: "switch", hint: "Inactive plans are hidden from the storefront." },
        { name: "description", label: "Description", type: "textarea", rows: 3, colSpan: 2 },
        { name: "featuresText", label: "Features", type: "textarea", rows: 6, colSpan: 2, hint: "One feature per line." },
        { name: "coursesIncludedText", label: "Courses Included", type: "textarea", rows: 4, colSpan: 2, hint: "Use course IDs or ALL." },
      ]}
      columns={[
        {
          header: "Plan",
          cell: (item) => (
            <div>
              <p className="font-semibold text-foreground">{item.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.description || "No description yet."}</p>
            </div>
          ),
        },
        {
          header: "Pricing",
          cell: (item) => (
            <div>
              <p className="font-semibold text-foreground">{formatPrice(item.price, item.currency)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {item.yearlyPrice ? `${formatPrice(item.yearlyPrice, item.currency)}/year` : "No annual price"}
              </p>
            </div>
          ),
        },
        {
          header: "Features",
          cell: (item) => <span className="text-sm text-muted-foreground">{item.features.length} included</span>,
        },
        {
          header: "Subscribers",
          cell: (item) => <span className="text-sm font-semibold text-foreground">{item.subscriptionsCount}</span>,
        },
        {
          header: "Status",
          cell: (item) => (
            <div className="flex flex-wrap gap-2">
              <StatusPill tone={item.isActive ? "success" : "neutral"}>{item.isActive ? "Active" : "Inactive"}</StatusPill>
              {item.isPopular ? <StatusPill tone="warning">Popular</StatusPill> : null}
            </div>
          ),
        },
      ]}
    />
  );
}
