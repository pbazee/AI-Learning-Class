
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    const courses = await prisma.course.findMany({
        where: { isPublished: true },
        select: { id: true, title: true, isPublished: true, isFeatured: true }
    })
    const categories = await prisma.category.findMany({
        where: { isActive: true }
    })
    const slides = await prisma.heroSlide.findMany({
        where: { isActive: true }
    })

    console.log('--- DETAILED DB CHECK ---')
    console.log('Published Courses:', courses.length)
    if (courses.length > 0) {
        console.log('Sample Course:', courses[0])
    }
    console.log('Active Categories:', categories.length)
    console.log('Active HeroSlides:', slides.length)
    console.log('-------------------------')
  } catch (error) {
    console.error('DB Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
