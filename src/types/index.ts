// src/types/index.ts

export type Level = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "ALL_LEVELS";
export type Role = "STUDENT" | "INSTRUCTOR" | "ADMIN" | "SUPER_ADMIN";
export type OrderStatus = "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";
export type EnrollmentStatus = "ACTIVE" | "COMPLETED" | "SUSPENDED" | "EXPIRED";
export type CourseAssetType = "AUDIO" | "VIDEO" | "PDF";
export type ContentStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type PopupShowOn = "HOMEPAGE_ONLY" | "COURSE_PAGES" | "BLOG_PAGES" | "ALL_PAGES";

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  shortDescription?: string;
  thumbnailUrl?: string;
  previewVideoUrl?: string;
  categoryId: string;
  categoryName?: string;
  level: Level;
  price: number;
  originalPrice?: number;
  currency?: string;
  isFree: boolean;
  isFeatured: boolean;
  isTrending: boolean;
  isRecommended?: boolean;
  isNew: boolean;
  totalDuration: number;
  totalLessons: number;
  totalStudents: number;
  rating: number;
  totalRatings: number;
  tags: string[];
  whatYouLearn: string[];
  requirements?: string[];
  instructorName?: string;
  instructorAvatar?: string;
  language?: string;
  modules?: Module[];
  assets?: CourseAsset[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  isActive?: boolean;
  parentId?: string;
}

export interface Module {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  order: number;
  lessons: Lesson[];
}

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  description?: string;
  type: "VIDEO" | "AUDIO" | "PDF" | "TEXT" | "QUIZ" | "ASSIGNMENT" | "PROJECT" | "LIVE";
  videoUrl?: string;
  assetUrl?: string;
  assetPath?: string;
  duration?: number;
  content?: string;
  isPreview: boolean;
  allowDownload?: boolean;
  sellSeparately?: boolean;
  order: number;
}

export interface CourseAsset {
  id: string;
  courseId: string;
  type: CourseAssetType;
  title: string;
  fileName: string;
  storagePath: string;
  url: string;
  mimeType?: string;
  sizeBytes?: number;
  order: number;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  role: Role;
  bio?: string;
  country?: string;
}

export interface CartItem {
  courseId: string;
  title: string;
  price: number;
  originalPrice?: number;
  thumbnailUrl?: string;
  instructorName?: string;
}

export interface HeroSlide {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  imageUrl: string;
  ctaText?: string;
  ctaLink?: string;
  isActive: boolean;
  order: number;
  autoSlideInterval?: number | null;
}

export interface Announcement {
  id: string;
  text: string;
  link?: string;
  linkText?: string;
  bgColor?: string;
  isActive: boolean;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  yearlyPrice?: number;
  currency: string;
  features: string[];
  isPopular: boolean;
  isActive: boolean;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  rating: number;
  text: string;
  courseCompleted?: string;
  country?: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content?: string;
  coverImage?: string;
  categoryName?: string;
  status?: ContentStatus;
  authorName?: string;
  tags: string[];
  publishedAt?: string;
  readTime?: string;
}
