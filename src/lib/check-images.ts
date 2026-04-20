
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    const publishedCourses = await prisma.course.findMany({
      where: { isPublished: true },
      select: { id: true, title: true, imageUrl: true, thumbnailUrl: true }
    })
    console.log('--- PUBLISHED COURSES IMAGES ---')
    publishedCourses.forEach(c => {
      console.log(`Course: ${c.title}`)
      console.log(`  Thumbnail: ${c.thumbnailUrl}`)
      console.log(`  Image: ${c.imageUrl}`)
    })

    const categories = await prisma.category.findMany({
        where: { isActive: true },
        select: { name: true, imageUrl: true }
    })
    console.log('\n--- ACTIVE CATEGORIES IMAGES ---')
    categories.forEach(c => {
        console.log(`Category: ${c.name}`)
        console.log(`  Image: ${c.imageUrl}`)
    })

    const slides = await prisma.heroSlide.findMany({
        where: { isActive: true },
        select: { title: true, imageUrl: true }
    })
    console.log('\n--- ACTIVE SLIDES IMAGES ---')
    slides.forEach(s => {
        console.log(`Slide: ${s.title}`)
        console.log(`  Image: ${s.imageUrl}`)
    })
  } catch (error) {
    console.error('DB Error:', error)
  }
}

main()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))
