import { prisma } from "@/lib/prisma";
import { HeroSlidesManager } from "@/components/admin/hero-slides-manager";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function AdminHeroSlidesPage() {
  const slides = await (async () => {
    try {
      return await prisma.heroSlide.findMany({
        orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      });
    } catch (error) {
      console.error(
        "[database] admin hero slides query failed. Returning a safe fallback while the database catches up.",
        error
      );
      return [];
    }
  })();

  return (
    <HeroSlidesManager
      slides={slides.map((slide) => ({
        id: slide.id,
        title: slide.title,
        subtitle: slide.subtitle,
        description: slide.description,
        imageUrl: slide.imageUrl,
        imagePath: slide.imagePath,
        ctaText: slide.ctaText,
        ctaLink: slide.ctaLink,
        order: slide.order,
        isActive: slide.isActive,
      }))}
    />
  );
}
