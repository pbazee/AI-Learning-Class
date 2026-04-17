import { AdminClientLayout } from "@/components/admin/AdminClientLayout";
import { getSiteBranding } from "@/lib/site-server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const branding = await getSiteBranding();

  return (
    <AdminClientLayout branding={branding}>
      {children}
    </AdminClientLayout>
  );
}
