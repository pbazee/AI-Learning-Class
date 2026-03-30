"use client";

import Image from "next/image";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, ArrowUpRight, BadgeDollarSign, Layers3, TrendingUp, Users } from "lucide-react";
import {
  AdminCard,
  AdminStatCard,
  AdminStatGrid,
  StatusPill,
} from "@/components/admin/ui";
import { formatNumber, formatPrice } from "@/lib/utils";

type DashboardAnalyticsProps = {
  stats: {
    totalRevenue: number;
    monthlyRevenue: number;
    totalStudents: number;
    activeStudents: number;
    totalCourses: number;
    avgRating: number;
    revenueBreakdown: {
      freeEnrollments: number;
      paidEnrollments: number;
      freePercentage: number;
      paidPercentage: number;
    };
    revenueAnalytics: Array<{
      month: string;
      revenue: number;
      mrr: number;
      freeEnrollments: number;
      paidEnrollments: number;
    }>;
    enrollmentTrends: Array<{
      month: string;
      newStudents: number;
      activeLearners: number;
    }>;
    topCourses: Array<{
      id?: string;
      name: string;
      thumbnailUrl?: string | null;
      categoryName?: string;
      students: number;
      revenue: number;
      rating: number;
    }>;
    categoryPerformance: Array<{
      id: string;
      name: string;
      color?: string | null;
      enrollments: number;
      completionRate: number;
      activeLearners: number;
    }>;
    recentOrders: Array<{
      id: string;
      student: string;
      course: string;
      amount: number;
      date: string;
      status: string;
    }>;
    growth: {
      totalRevenue: { change: number };
      monthlyRevenue: { change: number };
      totalStudents: { change: number };
      activeStudents: { change: number };
      totalCourses: { change: number };
      avgRating: { change: number };
    };
  };
};

const chartPalette = ["#3b82f6", "#0ea5e9", "#14b8a6", "#f59e0b", "#f97316", "#8b5cf6"];

function ChartTooltip({
  active,
  payload,
  label,
  currency = false,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  currency?: boolean;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#03060c] px-4 py-3 shadow-2xl">
      {label ? <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p> : null}
      <div className="mt-2 space-y-1.5">
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between gap-6 text-sm">
            <span className="flex items-center gap-2 text-slate-300">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.name}
            </span>
            <span className="font-semibold text-white">
              {currency ? formatPrice(entry.value) : formatNumber(entry.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardAnalytics({ stats }: DashboardAnalyticsProps) {
  const pieData = stats.categoryPerformance.slice(0, 5).map((category, index) => ({
    ...category,
    fill: category.color || chartPalette[index % chartPalette.length],
  }));

  return (
    <div className="space-y-6">
      <AdminStatGrid>
        <AdminStatCard
          label="Total Revenue"
          value={formatPrice(stats.totalRevenue)}
          detail="All completed sales"
          trend={stats.growth.totalRevenue.change}
          accent="from-blue-500 to-cyan-400"
        />
        <AdminStatCard
          label="Monthly Revenue"
          value={formatPrice(stats.monthlyRevenue)}
          detail="Current calendar month"
          trend={stats.growth.monthlyRevenue.change}
          accent="from-cyan-500 to-teal-400"
        />
        <AdminStatCard
          label="Total Students"
          value={formatNumber(stats.totalStudents)}
          detail="Registered learners"
          trend={stats.growth.totalStudents.change}
          accent="from-emerald-500 to-teal-400"
        />
        <AdminStatCard
          label="Active Learners"
          value={formatNumber(stats.activeStudents)}
          detail="Engaged this month"
          trend={stats.growth.activeStudents.change}
          accent="from-amber-500 to-orange-400"
        />
        <AdminStatCard
          label="Published Courses"
          value={formatNumber(stats.totalCourses)}
          detail="Live on the storefront"
          trend={stats.growth.totalCourses.change}
          accent="from-violet-500 to-fuchsia-400"
        />
        <AdminStatCard
          label="Average Rating"
          value={`${stats.avgRating.toFixed(1)} / 5`}
          detail="Across learner reviews"
          trend={stats.growth.avgRating.change}
          accent="from-pink-500 to-rose-400"
        />
      </AdminStatGrid>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <AdminCard className="p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                <BadgeDollarSign className="h-4 w-4 text-blue-400" />
                Revenue Analytics
              </div>
              <p className="mt-2 text-sm text-slate-400">
                Completed-order revenue versus monthly recurring revenue over the last six months.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Paid enrollments</p>
                <p className="mt-2 text-xl font-bold text-white">{formatNumber(stats.revenueBreakdown.paidEnrollments)}</p>
                <p className="text-xs text-slate-400">{stats.revenueBreakdown.paidPercentage}% of total</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Free enrollments</p>
                <p className="mt-2 text-xl font-bold text-white">{formatNumber(stats.revenueBreakdown.freeEnrollments)}</p>
                <p className="text-xs text-slate-400">{stats.revenueBreakdown.freePercentage}% of total</p>
              </div>
            </div>
          </div>

          <div className="mt-6 h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={stats.revenueAnalytics}>
                <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `$${Math.round(value / 1000)}k`}
                />
                <Tooltip content={<ChartTooltip currency />} />
                <Bar dataKey="revenue" name="Revenue" fill="#2563eb" radius={[10, 10, 0, 0]} barSize={28} />
                <Line
                  type="monotone"
                  dataKey="mrr"
                  name="MRR"
                  stroke="#22d3ee"
                  strokeWidth={3}
                  dot={{ fill: "#22d3ee", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </AdminCard>

        <AdminCard className="p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <Users className="h-4 w-4 text-cyan-400" />
            Enrollment Trends
          </div>
          <p className="mt-2 text-sm text-slate-400">
            Compare new learner acquisition against the monthly active learning base.
          </p>

          <div className="mt-6 h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.enrollmentTrends}>
                <defs>
                  <linearGradient id="studentsGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.42} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="activeGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.42} />
                    <stop offset="100%" stopColor="#14b8a6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="newStudents"
                  name="New students"
                  stroke="#60a5fa"
                  strokeWidth={2.5}
                  fill="url(#studentsGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="activeLearners"
                  name="Active learners"
                  stroke="#2dd4bf"
                  strokeWidth={2.5}
                  fill="url(#activeGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </AdminCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <AdminCard className="p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                <TrendingUp className="h-4 w-4 text-blue-400" />
                Top Performing Courses
              </div>
              <p className="mt-2 text-sm text-slate-400">
                Ranked by enrollments and revenue contribution, with course-level revenue bars.
              </p>
            </div>
            <StatusPill tone="info">Top 5</StatusPill>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stats.topCourses}
                  layout="vertical"
                  margin={{ top: 8, right: 12, left: 4, bottom: 8 }}
                >
                  <CartesianGrid stroke="rgba(148,163,184,0.12)" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => `$${Math.round(value / 1000)}k`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: "#cbd5e1", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    width={120}
                  />
                  <Tooltip content={<ChartTooltip currency />} />
                  <Bar dataKey="revenue" name="Revenue" radius={[0, 12, 12, 0]} fill="#2563eb" barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-3">
              {stats.topCourses.map((course, index) => (
                <div
                  key={`${course.id ?? course.name}-${index}`}
                  className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/25 p-4"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 text-xs font-bold text-slate-300">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <div className="relative h-12 w-16 overflow-hidden rounded-xl border border-white/10 bg-slate-900">
                    {course.thumbnailUrl ? (
                      <Image src={course.thumbnailUrl} alt={course.name} fill className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500/30 to-cyan-400/10 text-slate-200">
                        <Layers3 className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{course.name}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {course.categoryName || "Uncategorized"} • {formatNumber(course.students)} enrollments
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white">{formatPrice(course.revenue)}</p>
                    <p className="mt-1 text-xs text-slate-400">{course.rating.toFixed(1)} rating</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </AdminCard>

        <AdminCard className="p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <Activity className="h-4 w-4 text-emerald-400" />
            Category Performance
          </div>
          <p className="mt-2 text-sm text-slate-400">
            See which learning themes drive enrollments and how effectively learners complete them.
          </p>

          <div className="mt-6 grid gap-6 xl:grid-cols-[220px_1fr]">
            <div className="mx-auto h-[220px] w-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    innerRadius={58}
                    outerRadius={88}
                    paddingAngle={3}
                    dataKey="enrollments"
                    nameKey="name"
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.id} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-3">
              {stats.categoryPerformance.slice(0, 5).map((category, index) => (
                <div key={category.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: category.color || chartPalette[index % chartPalette.length] }}
                      />
                      <p className="text-sm font-semibold text-white">{category.name}</p>
                    </div>
                    <p className="text-sm font-semibold text-slate-200">
                      {formatNumber(category.enrollments)} enrollments
                    </p>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Completion</p>
                      <p className="mt-1 text-lg font-bold text-white">{category.completionRate}%</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Active learners</p>
                      <p className="mt-1 text-lg font-bold text-white">{formatNumber(category.activeLearners)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </AdminCard>
      </div>

      <AdminCard className="p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <ArrowUpRight className="h-4 w-4 text-cyan-400" />
              Recent Orders
            </div>
            <p className="mt-2 text-sm text-slate-400">
              The latest learner purchases flowing through the platform.
            </p>
          </div>
          <StatusPill tone="success">{stats.recentOrders.length} recent payments</StatusPill>
        </div>

        <div className="mt-6 grid gap-3 xl:grid-cols-3">
          {stats.recentOrders.map((order) => (
            <div key={order.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-white">{order.student}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">{order.course}</p>
                </div>
                <StatusPill tone="success">{order.status}</StatusPill>
              </div>
              <div className="mt-4 flex items-end justify-between">
                <p className="text-lg font-bold text-white">{formatPrice(order.amount)}</p>
                <p className="text-xs text-slate-500">{order.date}</p>
              </div>
            </div>
          ))}
        </div>
      </AdminCard>
    </div>
  );
}
