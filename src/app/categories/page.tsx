import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CategoriesGrid } from "@/components/landing/CategoriesGrid";
import { getCategories } from "@/lib/data";

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-6 sm:pt-8">
        <CategoriesGrid categories={categories} />
      </main>
      <Footer />
    </div>
  );
}
