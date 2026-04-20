import { AdminClientLayout } from "@/components/admin/AdminClientLayout";
import { getSiteBranding } from "@/lib/site-server";

// Force Node.js runtime so Prisma and server-only libs are available on Vercel.
export const runtime = "nodejs";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let branding: Awaited<ReturnType<typeof getSiteBranding>>;

  try {
    branding = await getSiteBranding();
  } catch (err) {
    console.error("[admin-layout] Failed to load site branding", err);
    // Provide a minimal fallback so the admin panel still renders.
    branding = { siteName: "Admin" };
  }

  return (
    <AdminClientLayout branding={branding}>
      {children}
    </AdminClientLayout>
  );
}
