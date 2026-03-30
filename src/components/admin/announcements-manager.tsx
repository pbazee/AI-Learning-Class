"use client";

import { deleteAnnouncementAction, saveAnnouncementAction } from "@/app/admin/actions";
import { SimpleCrudManager } from "@/components/admin/simple-crud-manager";
import { StatusPill } from "@/components/admin/ui";

type AnnouncementRow = {
  id: string;
  text: string;
  link?: string | null;
  linkText?: string | null;
  bgColor: string;
  startsAt?: string | null;
  endsAt?: string | null;
  isActive: boolean;
};

export function AnnouncementsManager({ announcements }: { announcements: AnnouncementRow[] }) {
  return (
    <SimpleCrudManager
      title="Announcements"
      description="Control the rotating notice bar, campaign windows, and background styling for site-wide updates."
      stats={[
        { label: "Total Announcements", value: announcements.length },
        { label: "Active", value: announcements.filter((item) => item.isActive).length },
        { label: "With Schedule", value: announcements.filter((item) => item.startsAt || item.endsAt).length },
        { label: "Linked Campaigns", value: announcements.filter((item) => item.link).length },
      ]}
      items={announcements}
      createLabel="New Announcement"
      dialogTitle="Announcement"
      emptyTitle="No announcements yet"
      emptyDescription="Add promotional banners, flash-sale notices, and launch updates for the top bar."
      getEmptyForm={() => ({
        id: "",
        text: "",
        link: "",
        linkText: "",
        bgColor: "#2563eb",
        startsAt: "",
        endsAt: "",
        isActive: true,
      })}
      mapItemToForm={(item) => ({
        id: item.id,
        text: item.text,
        link: item.link || "",
        linkText: item.linkText || "",
        bgColor: item.bgColor || "#2563eb",
        startsAt: item.startsAt || "",
        endsAt: item.endsAt || "",
        isActive: item.isActive,
      })}
      buildPayload={(form) => ({
        id: form.id || undefined,
        text: form.text,
        link: form.link,
        linkText: form.linkText,
        bgColor: form.bgColor,
        startsAt: form.startsAt,
        endsAt: form.endsAt,
        isActive: Boolean(form.isActive),
      })}
      onSave={saveAnnouncementAction}
      onDelete={deleteAnnouncementAction}
      fields={[
        { name: "text", label: "Announcement Text", type: "textarea", rows: 3, colSpan: 2 },
        { name: "link", label: "Link", type: "url", placeholder: "/courses" },
        { name: "linkText", label: "Link Label", type: "text", placeholder: "Enroll now" },
        { name: "bgColor", label: "Background Color", type: "color" },
        { name: "startsAt", label: "Start Date", type: "date" },
        { name: "endsAt", label: "End Date", type: "date" },
        { name: "isActive", label: "Active Announcement", type: "switch", hint: "Inactive banners stay saved but won’t appear on the site." },
      ]}
      columns={[
        {
          header: "Message",
          cell: (item) => (
            <div>
              <p className="font-semibold text-foreground">{item.text}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {item.link ? `${item.linkText || "Link"} -> ${item.link}` : "No CTA link"}
              </p>
            </div>
          ),
        },
        {
          header: "Window",
          cell: (item) => (
            <span className="text-sm text-muted-foreground">
              {item.startsAt || item.endsAt ? `${item.startsAt || "Now"} to ${item.endsAt || "Open-ended"}` : "Always on"}
            </span>
          ),
        },
        {
          header: "Color",
          cell: (item) => (
            <div className="flex items-center gap-2">
              <span className="h-4 w-4 rounded-full border border-border" style={{ backgroundColor: item.bgColor }} />
              <span className="text-xs text-muted-foreground">{item.bgColor}</span>
            </div>
          ),
        },
        {
          header: "Status",
          cell: (item) => <StatusPill tone={item.isActive ? "success" : "neutral"}>{item.isActive ? "Active" : "Inactive"}</StatusPill>,
        },
      ]}
    />
  );
}
