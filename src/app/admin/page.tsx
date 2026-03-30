import { DashboardAnalytics } from "@/components/admin/dashboard-analytics";
import { getAdminStats } from "@/lib/data";

export default async function AdminDashboardPage() {
  const stats = await getAdminStats();

  return <DashboardAnalytics stats={stats} />;
}
