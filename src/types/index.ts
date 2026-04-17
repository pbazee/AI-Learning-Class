// src/types/index.ts

export type Level = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "ALL_LEVELS";
export type Role = "STUDENT" | "INSTRUCTOR" | "ADMIN" | "SUPER_ADMIN";
export type OrderStatus = "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";
export type EnrollmentStatus = "ACTIVE" | "COMPLETED" | "SUSPENDED" | "EXPIRED";
export type CourseAssetType = "AUDIO" | "VIDEO" | "PDF";
export type ContentStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type PopupShowOn = "HOMEPAGE_ONLY" | "COURSE_PAGES" | "BLOG_PAGES" | "ALL_PAGES";
export type ContactMessageStatus = "UNREAD" | "READ" | "REPLIED";
export type TeamWorkspaceRole = "OWNER" | "ADMIN" | "MEMBER";
export type TeamWorkspaceMemberStatus = "ACTIVE" | "REVOKED";
export type TeamWorkspaceInviteStatus = "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED";

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  shortDescription?: string;
  imageUrl?: string;
  imagePath?: string;
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
  reviews?: CourseReview[];
}

export interface CourseAccessState {
  courseId: string;
  hasAccess: boolean;
  statusLabel: "Owned" | "Enrolled" | "Pro Access" | "Team Access";
  actionLabel: "Continue Learning" | "Go to Classroom";
  lessonHref: string;
  progress: number;
  completedLessons: number;
  totalLessons: number;
  lastLessonTitle?: string;
  accessSource?: "purchase" | "free_enrollment" | "subscription" | "team";
  expiresAt?: string | null;
}

export interface CoursePreviewLessonState {
  id: string;
  title: string;
  type: Lesson["type"];
  sourceUrl?: string;
  content?: string;
  duration?: number;
  previewPages?: number;
  previewMinutes?: number;
  moduleTitle?: string;
}

export interface CoursePreviewState {
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  thumbnailUrl?: string;
  previewVideoUrl?: string;
  coursePrice: number;
  courseCurrency?: string;
  isFreeCourse: boolean;
  previewLessons: CoursePreviewLessonState[];
  courseAccess?: CourseAccessState;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  imagePath?: string;
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
  previewPages?: number;
  previewMinutes?: number;
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

export interface CourseReview {
  id: string;
  name: string;
  avatarUrl?: string;
  rating: number;
  title?: string;
  body: string;
  createdAt: string;
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

export interface TrustedLogo {
  id: string;
  name: string;
  imageUrl: string;
  imagePath?: string;
  websiteUrl?: string;
  order: number;
  isActive: boolean;
}

export interface CourseSearchSuggestion {
  id: string;
  slug: string;
  title: string;
  level: Level;
  thumbnailUrl?: string;
  categoryName?: string;
}

export interface ContactMessageReply {
  id: string;
  senderName?: string;
  senderEmail?: string;
  body: string;
  isAdmin: boolean;
  createdAt: string;
}

export interface ContactMessageThread {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: ContactMessageStatus;
  createdAt: string;
  updatedAt: string;
  replies: ContactMessageReply[];
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
  askAiLimit?: number;
  currency: string;
  features: string[];
  isPopular: boolean;
  isActive: boolean;
}

export interface TeamWorkspaceDashboardData {
  workspace: {
    id: string;
    name: string;
    inviteCode: string;
    seatLimit: number;
    seatsUsed: number;
    seatsAvailable: number;
    role: TeamWorkspaceRole;
    planEndsAt: string | null;
  };
  metrics: {
    activeMembers: number;
    pendingInvites: number;
    assignedCourses: number;
    averageProgress: number;
  };
  members: Array<{
    id: string;
    userId: string;
    name: string;
    email: string;
    role: TeamWorkspaceRole;
    status: TeamWorkspaceMemberStatus;
    joinedAt: string;
    assignedCourses: number;
    startedCourses: number;
    completedLessons: number;
    averageProgress: number;
    lastActivity: string | null;
  }>;
  invites: Array<{
    id: string;
    invitedEmail: string | null;
    token: string;
    status: TeamWorkspaceInviteStatus;
    expiresAt: string;
    createdAt: string;
    inviteLink: string;
  }>;
  availableCourses: Array<{
    id: string;
    title: string;
    slug: string;
  }>;
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
  publishedAtIso?: string;
  readTime?: string;
}
