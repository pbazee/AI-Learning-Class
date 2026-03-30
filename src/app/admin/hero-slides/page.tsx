import { prisma } from "@/lib/prisma";
import { HeroSlidesManager } from "@/components/admin/hero-slides-manager";

export default async function AdminHeroSlidesPage() {
  const slides = await prisma.heroSlide.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
  });

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
