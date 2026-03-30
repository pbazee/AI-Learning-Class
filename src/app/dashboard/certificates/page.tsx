import { redirect } from "next/navigation";

// Redirect /dashboard/certificates → /certificates
export default function DashboardCertificatesPage() {
  redirect("/certificates");
}
