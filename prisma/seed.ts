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

async function main() {
  console.log("🌱 Seeding database...");

  // Categories
  console.log("📁 Seeding categories...");
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
      name: "AI Learning Class",
      role: "INSTRUCTOR",
    },
  });

  // Courses
  console.log("📚 Seeding 20 AI courses...");
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
  console.log("🖼️  Seeding hero slides...");
  for (const slide of seedHeroSlides) {
    await prisma.heroSlide.upsert({
      where: { id: slide.id },
      update: {},
      create: slide,
    });
  }

  // Announcements
  console.log("📢 Seeding announcements...");
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
  console.log("💳 Seeding subscription plans...");
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

  // Site settings
  await prisma.siteSettings.upsert({
    where: { id: "singleton" },
    update: {
      adminEmail: primaryAdminEmail,
    },
    create: {
      id: "singleton",
      siteName: "AI Learning Class",
      supportEmail: "support@ailearning.com",
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

  console.log("✅ Database seeded successfully!");
  console.log(`   📚 ${seedCourses.length} courses`);
  console.log(`   📁 ${seedCategories.length} categories`);
  console.log(`   🖼️  ${seedHeroSlides.length} hero slides`);
  console.log(`   📢 ${seedAnnouncements.length} announcements`);
  console.log(`   💳 ${seedSubscriptionPlans.length} subscription plans`);
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
