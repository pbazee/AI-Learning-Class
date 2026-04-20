// prisma/seed.ts
// Run with: npm run db:seed
import { PrismaClient } from "@prisma/client";
import {
  seedCourses,
  seedCategories,
  seedHeroSlides,
  seedAnnouncements,
  seedSubscriptionPlans,
} from "./seed-data";
import { getPrimaryAdminEmail } from "../src/lib/admin-email";

const prisma = new PrismaClient();
const primaryAdminEmail = getPrimaryAdminEmail();
const trustedLogos = [
  { name: "OpenAI", imageUrl: "/trusted-logos/openai.svg", websiteUrl: "https://openai.com", order: 0 },
  { name: "Google", imageUrl: "/trusted-logos/google.svg", websiteUrl: "https://google.com", order: 1 },
  { name: "Microsoft", imageUrl: "/trusted-logos/microsoft.svg", websiteUrl: "https://microsoft.com", order: 2 },
  { name: "Meta", imageUrl: "/trusted-logos/meta.svg", websiteUrl: "https://meta.com", order: 3 },
  { name: "Midjourney", imageUrl: "/trusted-logos/midjourney.svg", websiteUrl: "https://midjourney.com", order: 4 },
  { name: "NVIDIA", imageUrl: "/trusted-logos/nvidia.svg", websiteUrl: "https://nvidia.com", order: 5 },
];

async function main() {
  console.log("ðŸŒ± Seeding database...");

  // Categories
  console.log("ðŸ“ Seeding categories...");
  for (const cat of seedCategories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        icon: cat.icon,
        color: cat.color,
      },
    });
  }

  // Create a default instructor user
  const instructor = await prisma.user.upsert({
    where: { email: "instructor@ailearning.com" },
    update: {},
    create: {
      email: "instructor@ailearning.com",
      name: "AI Genius Lab",
      role: "INSTRUCTOR",
    },
  });

  // Courses
  console.log("ðŸ“š Seeding 20 AI courses...");
  for (const course of seedCourses) {
    await prisma.course.upsert({
      where: { slug: course.slug },
      update: {},
      create: {
        id: course.id,
        title: course.title,
        slug: course.slug,
        description: course.description,
        shortDescription: course.shortDescription,
        thumbnailUrl: course.thumbnailUrl,
        categoryId: course.categoryId,
        instructorId: instructor.id,
        level: course.level,
        price: course.price,
        originalPrice: course.originalPrice,
        isFree: course.isFree,
        isFeatured: course.isFeatured,
        isTrending: course.isTrending,
        isNew: course.isNew,
        totalDuration: course.totalDuration,
        totalLessons: course.totalLessons,
        totalStudents: course.totalStudents,
        rating: course.rating,
        totalRatings: course.totalRatings,
        tags: course.tags,
        whatYouLearn: course.whatYouLearn,
        isPublished: true,
      },
    });
  }

  // Hero slides
  console.log("ðŸ–¼ï¸  Seeding hero slides...");
  for (const slide of seedHeroSlides) {
    await prisma.heroSlide.upsert({
      where: { id: slide.id },
      update: {},
      create: slide,
    });
  }

  // Announcements
  console.log("ðŸ“¢ Seeding announcements...");
  for (const ann of seedAnnouncements) {
    await prisma.announcement.upsert({
      where: { id: ann.id },
      update: {},
      create: {
        id: ann.id,
        text: ann.text,
        link: ann.link,
        linkText: ann.linkText,
        isActive: ann.isActive,
      },
    });
  }

  // Subscription plans
  console.log("ðŸ’³ Seeding subscription plans...");
  for (const plan of seedSubscriptionPlans) {
    await prisma.subscriptionPlan.upsert({
      where: { slug: plan.slug },
      update: {},
      create: {
        id: plan.id,
        name: plan.name,
        slug: plan.slug,
        description: plan.description,
        price: plan.price,
        yearlyPrice: plan.yearlyPrice,
        currency: plan.currency,
        features: plan.features,
        coursesIncluded: plan.coursesIncluded,
        isPopular: plan.isPopular,
        isActive: plan.isActive,
      },
    });
  }

  // Trusted logos
  console.log("Seeding trusted logos...");
  for (const logo of trustedLogos) {
    await prisma.trustedLogo.upsert({
      where: { name: logo.name },
      update: {
        imageUrl: logo.imageUrl,
        websiteUrl: logo.websiteUrl,
        order: logo.order,
        isActive: true,
      },
      create: {
        ...logo,
        isActive: true,
      },
    });
  }

  // Site settings
  await prisma.siteSettings.upsert({
    where: { id: "singleton" },
    update: {
      siteName: "AI GENIUS LAB",
      supportEmail: "support@aigeniuslab.com",
      adminEmail: primaryAdminEmail,
    },
    create: {
      id: "singleton",
      siteName: "AI GENIUS LAB",
      supportEmail: "support@aigeniuslab.com",
      adminEmail: primaryAdminEmail,
    },
  });

  // Create admin user
  await prisma.user.upsert({
    where: { email: primaryAdminEmail },
    update: {
      role: "ADMIN",
      name: "Primary Admin",
    },
    create: {
      email: primaryAdminEmail,
      name: "Primary Admin",
      role: "ADMIN",
    },
  });

  console.log("âœ… Database seeded successfully!");
  console.log(`   ðŸ“š ${seedCourses.length} courses`);
  console.log(`   ðŸ“ ${seedCategories.length} categories`);
  console.log(`   ðŸ–¼ï¸  ${seedHeroSlides.length} hero slides`);
  console.log(`   ðŸ“¢ ${seedAnnouncements.length} announcements`);
  console.log(`   ðŸ’³ ${seedSubscriptionPlans.length} subscription plans`);
  console.log(`   trusted logos: ${trustedLogos.length}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("âŒ Seed error:", e);
    process.exit(1);
  });

