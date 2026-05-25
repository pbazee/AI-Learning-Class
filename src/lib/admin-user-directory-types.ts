import type { Role } from "@prisma/client";

export type AdminDirectoryMode = "users" | "learners";

export type AdminDirectoryFilters = {
  page: number;
  pageSize: number;
  search: string;
  role: "all" | Role;
  plan: "all" | "free" | "pro" | "teams";
  progress: "all" | "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  courseId: string;
  courseName: string;
  country: string;
  joinedFrom: string;
  joinedTo: string;
  sort: string;
};

export type AdminDirectoryRow = {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  country: string | null;
  avatarUrl: string | null;
  bio: string | null;
  enrollmentsCount: number;
  activeSubscriptions: number;
  totalSpent: number;
  joinedAt: string;
  planLabel: "Free" | "Pro" | "Teams";
  lastActiveAt: string | null;
  progressPercent: number;
  progressStatus: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
};

export type AdminDirectoryResult = {
  mode: AdminDirectoryMode;
  filters: AdminDirectoryFilters;
  users: AdminDirectoryRow[];
  total: number;
  pageCount: number;
  countries: string[];
};
