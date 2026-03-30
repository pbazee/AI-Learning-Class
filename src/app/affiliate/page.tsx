import { AffiliatePortal } from "@/components/affiliate/AffiliatePortal";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export const dynamic = "force-dynamic";

export default function AffiliatePage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <AffiliatePortal />
      </main>
      <Footer />
    </div>
  );
}
