import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CategoriesGrid } from "@/components/landing/CategoriesGrid";
import { getCategories } from "@/lib/data";
import { buildSiteMetadata } from "@/lib/site-server";

export async function generateMetadata(): Promise<Metadata> {
  return buildSiteMetadata("/categories", {
    title: "Categories",
    description:
      "Explore AI GENIUS LAB learning categories, from machine learning and prompt engineering to multimodal AI and MLOps.",
  });
}

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <div className="min-h-screen">
      <main className="pt-6 sm:pt-8">
        <CategoriesGrid categories={categories} />
      </main>
      <Footer />
    </div>
  );
}
