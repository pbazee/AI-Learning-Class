export const ADMIN_NOTIFICATION_SECTIONS = [
  "messages",
  "subscribers",
  "affiliates",
  "orders",
  "reviews",
  "announcements",
] as const;

export type AdminNotificationSection = (typeof ADMIN_NOTIFICATION_SECTIONS)[number];

export const ADMIN_NOTIFICATION_PATHS: Record<AdminNotificationSection, string> = {
  messages: "/admin/messages",
  subscribers: "/admin/subscribers",
  affiliates: "/admin/affiliates",
  orders: "/admin/orders",
  reviews: "/admin/reviews",
  announcements: "/admin/announcements",
};

export function isAdminNotificationSection(value: string): value is AdminNotificationSection {
  return ADMIN_NOTIFICATION_SECTIONS.includes(value as AdminNotificationSection);
}
