import { Activity, DollarSign, Globe, TrendingUp, Users } from "lucide-react";
import { getAdminStats } from "@/lib/data";
import { formatPrice, formatNumber } from "@/lib/utils";

export default async function AdminAnalyticsPage() {
  const stats = await getAdminStats();
  const maxRevenue = Math.max(...stats.revenueByMonth.map((entry) => entry.revenue), 1);
  const maxCountry = Math.max(...stats.countryBreakdown.map((entry) => entry.students), 1);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-foreground">Analytics</h2>
        <p className="text-sm text-muted-foreground">
          Live platform performance across learners, revenue, and geography.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Revenue", value: formatPrice(stats.totalRevenue), icon: DollarSign, tone: "text-blue-600 dark:text-blue-400" },
          { label: "Total Students", value: formatNumber(stats.totalStudents), icon: Users, tone: "text-violet-600 dark:text-violet-400" },
          { label: "Completion Rate", value: `${stats.completionRate}%`, icon: TrendingUp, tone: "text-emerald-600 dark:text-emerald-400" },
          { label: "Avg. Rating", value: `${stats.avgRating}★`, icon: Activity, tone: "text-amber-600 dark:text-amber-400" },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <card.icon className={`mb-3 h-6 w-6 ${card.tone}`} />
            <div className="text-2xl font-black text-foreground">{card.value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-6 text-base font-bold text-foreground">Revenue over time</h3>
          <div className="space-y-4">
            {stats.revenueByMonth.map((point) => (
              <div key={point.month}>
                <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{point.month}</span>
                  <span>{formatPrice(point.revenue)}</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400"
                    style={{ width: `${Math.max(8, Math.round((point.revenue / maxRevenue) * 100))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-6 flex items-center gap-2 text-base font-bold text-foreground">
            <Globe className="h-4 w-4 text-blue-600" /> Students by country
          </h3>
          <div className="space-y-4">
            {stats.countryBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Learner geography will appear once countries are set on user profiles.
              </p>
            ) : (
              stats.countryBreakdown.map((entry) => (
                <div key={entry.country}>
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="text-foreground">{entry.country}</span>
                    <span className="text-muted-foreground">{entry.percentage}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-600 to-violet-500"
                      style={{ width: `${Math.max(8, Math.round((entry.students / maxCountry) * 100))}%` }}
                    />
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {formatNumber(entry.students)} students
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-5 text-base font-bold text-foreground">Top categories</h3>
          <div className="space-y-4">
            {stats.topCategories.map((category) => (
              <div key={category.name} className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">{category.name}</p>
                  <p className="text-xs text-muted-foreground">{category.students} enrollments</p>
                </div>
                <div className="text-sm font-medium text-blue-600">{category.percentage}%</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-5 text-base font-bold text-foreground">Top courses</h3>
          <div className="space-y-4">
            {stats.topCourses.map((course, index) => (
              <div key={`${course.name}-${index}`} className="rounded-xl border border-border p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{course.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatNumber(course.students)} students · {course.rating.toFixed(1)}★
                    </p>
                  </div>
                  <div className="text-sm font-semibold text-blue-600">{formatPrice(course.revenue)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
