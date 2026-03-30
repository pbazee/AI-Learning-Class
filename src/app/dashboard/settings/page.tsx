import { redirect } from "next/navigation";

// Redirect /dashboard/settings → /settings
export default function DashboardSettingsPage() {
  redirect("/settings");
}
