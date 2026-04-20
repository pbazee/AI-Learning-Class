
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    const courseCount = await prisma.course.count()
    const categoryCount = await prisma.category.count()
    const slideCount = await prisma.heroSlide.count()
    const userCount = await prisma.user.count()

    console.log('--- DB STATS ---')
    console.log('Courses:', courseCount)
    console.log('Categories:', categoryCount)
    console.log('HeroSlides:', slideCount)
    console.log('Users:', userCount)
    console.log('----------------')

    if (courseCount > 0) {
        const firstCourse = await prisma.course.findFirst({ select: { title: true, isPublished: true } })
        console.log('First Course:', firstCourse)
    }
  } catch (error) {
    console.error('DB Connection Error:', error)
  }
}

main()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))
