import { DashboardAnalytics } from "@/components/admin/dashboard-analytics";
import { getAdminStats } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const stats = await getAdminStats();

  return <DashboardAnalytics stats={stats} />;
}
