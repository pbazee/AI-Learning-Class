import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Trophy, Medal, Award, TrendingUp, Star } from "lucide-react";
import { getLeaderboard } from "@/lib/data";
import { buildSiteMetadata } from "@/lib/site-server";

const badgeCopy: Record<string, string> = {
  Trophy: "🏆",
  Silver: "🥈",
  Bronze: "🥉",
};

export async function generateMetadata(): Promise<Metadata> {
  return buildSiteMetadata("/leaderboard", {
    title: "Leaderboard",
    description:
      "See the top-performing learners on AI GENIUS LAB based on course completions, progress, and certificates.",
  });
}

export default async function LeaderboardPage() {
  const { leaders, stats } = await getLeaderboard();
  const podium = leaders.slice(0, 3);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main>
        <div className="bg-blue-600 text-white dark:bg-blue-700">
          <div className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6 lg:px-8">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium">
              <Trophy className="h-4 w-4" />
              Global Rankings
            </div>
            <h1 className="mb-3 text-3xl font-black sm:text-4xl">AI GENIUS LAB Leaderboard</h1>
            <p className="mx-auto max-w-xl text-lg text-blue-100">
              Top learners ranked by completed courses, lesson progress, and certificate milestones.
            </p>
          </div>
        </div>

        <div className="border-b border-border bg-card">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-3 divide-x divide-border">
              {[
                { label: "Active Learners", value: stats.activeLearners, icon: TrendingUp },
                { label: "Courses Completed", value: stats.coursesCompleted, icon: Award },
                { label: "Avg. Streak", value: stats.avgStreak, icon: Star },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="py-6 text-center">
                  <Icon className="mx-auto mb-2 h-5 w-5 text-blue-600" />
                  <div className="text-2xl font-black text-foreground">{value}</div>
                  <div className="mt-0.5 text-sm text-muted-foreground">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
          {leaders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center">
              <h2 className="mb-2 text-xl font-black text-foreground">No leaderboard data yet</h2>
              <p className="text-muted-foreground">
                Once learners start completing lessons and courses, rankings will appear here.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-3">
                {podium.map((leader) => (
                  <div
                    key={leader.rank}
                    className={`rounded-2xl border p-6 text-center transition-shadow hover:shadow-md ${
                      leader.rank === 1
                        ? "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30"
                        : leader.rank === 2
                          ? "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/40"
                          : "border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/30"
                    }`}
                  >
                    <div className="mb-2 text-4xl">{leader.badge ? badgeCopy[leader.badge] : <Medal className="mx-auto h-10 w-10 text-blue-600" />}</div>
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
                      {leader.name
                        .split(" ")
                        .map((part) => part[0])
                        .join("")
                        .slice(0, 2)}
                    </div>
                    <p className="font-bold text-foreground">{leader.name}</p>
                    <p className="text-sm text-muted-foreground">{leader.country}</p>
                    <div className="mt-3 flex justify-center gap-4 text-sm">
                      <span className="font-semibold text-blue-600">{leader.points.toLocaleString()} XP</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{leader.streak}-day streak</div>
                  </div>
                ))}
              </div>

              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-0 border-b border-border bg-muted/50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <span className="w-10">#</span>
                  <span>Learner</span>
                  <span className="w-24 text-right">Courses</span>
                  <span className="w-24 text-right">XP Points</span>
                  <span className="w-24 text-right">Streak</span>
                </div>
                {leaders.map((leader, index) => (
                  <div
                    key={leader.id}
                    className={`grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-0 px-6 py-4 transition-colors hover:bg-muted/40 ${
                      index < leaders.length - 1 ? "border-b border-border" : ""
                    }`}
                  >
                    <span className="w-10 text-sm font-bold text-muted-foreground">
                      {leader.badge ? badgeCopy[leader.badge] : leader.rank}
                    </span>
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                        {leader.name
                          .split(" ")
                          .map((part) => part[0])
                          .join("")
                          .slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{leader.name}</p>
                        <p className="text-xs text-muted-foreground">{leader.country}</p>
                      </div>
                    </div>
                    <span className="w-24 text-right text-sm font-medium text-foreground">{leader.courses}</span>
                    <span className="w-24 text-right text-sm font-semibold text-blue-600">
                      {leader.points.toLocaleString()}
                    </span>
                    <span className="w-24 text-right text-sm text-muted-foreground">{leader.streak}d</span>
                  </div>
                ))}
              </div>
            </>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Rankings update from real lesson progress, completed enrollments, and issued certificates.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
