"use client";

import { deleteCouponAction, saveCouponAction } from "@/app/admin/actions";
import { SimpleCrudManager } from "@/components/admin/simple-crud-manager";
import { StatusPill } from "@/components/admin/ui";

type CouponRow = {
  id: string;
  code: string;
  description?: string | null;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  value: number;
  expiresAt?: string | null;
  usageLimit?: number | null;
  usageCount: number;
  isActive: boolean;
};

export function CouponsManager({ coupons }: { coupons: CouponRow[] }) {
  return (
    <SimpleCrudManager
      title="Coupons"
      description="Create discount codes for launches, cohorts, seasonal campaigns, and internal promotions."
      stats={[
        { label: "Total Coupons", value: coupons.length },
        { label: "Active", value: coupons.filter((coupon) => coupon.isActive).length },
        { label: "Expiring", value: coupons.filter((coupon) => coupon.expiresAt).length },
        { label: "Redeemed", value: coupons.reduce((sum, coupon) => sum + coupon.usageCount, 0) },
      ]}
      items={coupons}
      createLabel="New Coupon"
      dialogTitle="Coupon"
      emptyTitle="No coupons yet"
      emptyDescription="Create coupon codes to support launch offers, referral campaigns, and limited-time deals."
      getEmptyForm={() => ({
        id: "",
        code: "",
        description: "",
        discountType: "PERCENTAGE",
        value: 10,
        expiresAt: "",
        usageLimit: "",
        isActive: true,
      })}
      mapItemToForm={(item) => ({
        id: item.id,
        code: item.code,
        description: item.description || "",
        discountType: item.discountType,
        value: item.value,
        expiresAt: item.expiresAt || "",
        usageLimit: item.usageLimit != null ? String(item.usageLimit) : "",
        isActive: item.isActive,
      })}
      buildPayload={(form) => ({
        id: form.id || undefined,
        code: form.code,
        description: form.description,
        discountType: form.discountType,
        value: Number(form.value),
        expiresAt: form.expiresAt,
        usageLimit: form.usageLimit === "" ? undefined : Number(form.usageLimit),
        isActive: Boolean(form.isActive),
      })}
      onSave={saveCouponAction}
      onDelete={deleteCouponAction}
      fields={[
        { name: "code", label: "Coupon Code", type: "text", placeholder: "LAUNCH50" },
        {
          name: "discountType",
          label: "Discount Type",
          type: "select",
          options: [
            { label: "Percentage", value: "PERCENTAGE" },
            { label: "Fixed Amount", value: "FIXED_AMOUNT" },
          ],
        },
        { name: "value", label: "Discount Value", type: "number", step: "0.01" },
        { name: "usageLimit", label: "Usage Limit", type: "number" },
        { name: "expiresAt", label: "Expiry Date", type: "date" },
        { name: "isActive", label: "Coupon Active", type: "switch", hint: "Inactive coupons stay saved but cannot be redeemed." },
        { name: "description", label: "Description", type: "textarea", rows: 4, colSpan: 2 },
      ]}
      columns={[
        {
          header: "Coupon",
          cell: (item) => (
            <div>
              <p className="font-semibold text-foreground">{item.code}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.description || "No internal notes."}</p>
            </div>
          ),
        },
        {
          header: "Discount",
          cell: (item) => (
            <span className="text-sm font-semibold text-foreground">
              {item.discountType === "PERCENTAGE" ? `${item.value}%` : `$${item.value}`}
            </span>
          ),
        },
        {
          header: "Usage",
          cell: (item) => (
            <span className="text-sm text-muted-foreground">
              {item.usageCount} / {item.usageLimit || "∞"}
            </span>
          ),
        },
        {
          header: "Expiry",
          cell: (item) => <span className="text-sm text-muted-foreground">{item.expiresAt || "No expiry"}</span>,
        },
        {
          header: "Status",
          cell: (item) => <StatusPill tone={item.isActive ? "success" : "neutral"}>{item.isActive ? "Active" : "Inactive"}</StatusPill>,
        },
      ]}
    />
  );
}
