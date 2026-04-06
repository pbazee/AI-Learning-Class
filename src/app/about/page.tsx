import Link from "next/link";
import { ArrowRight, CheckCircle2, Mail, MapPin, Phone } from "lucide-react";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import {
  DEFAULT_ABOUT_CONTENT,
} from "@/lib/site-settings";
import { getPublicAboutPageData } from "@/lib/data";

export const revalidate = 300;

export default async function AboutPage() {
  const {
    about,
    siteName,
    supportAddress,
    supportEmail,
    supportPhone,
  } = await getPublicAboutPageData();
  const stats = [
    { value: about.statOneValue, label: about.statOneLabel },
    { value: about.statTwoValue, label: about.statTwoLabel },
    { value: about.statThreeValue, label: about.statThreeLabel },
  ];
  const pillars = [
    { title: about.valueOneTitle, body: about.valueOneBody },
    { title: about.valueTwoTitle, body: about.valueTwoBody },
    { title: about.valueThreeTitle, body: about.valueThreeBody },
  ];

  return (
    <div className="site-shell min-h-screen">
      <Navbar />

      <main className="pb-20 pt-8 sm:pt-10">
        <section className="section-frame">
          <div className="overflow-hidden rounded-[34px] border border-border bg-[radial-gradient(circle_at_top_right,rgba(0,86,210,0.18),transparent_42%),linear-gradient(135deg,#071121_0%,#0b1730_44%,#111b34_100%)] px-6 py-10 text-white shadow-[0_40px_120px_-64px_rgba(15,23,42,0.9)] sm:px-10 sm:py-14">
            <div className="max-w-3xl">
              <div className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#8db4ff]">
                {about.eyebrow || DEFAULT_ABOUT_CONTENT.eyebrow}
              </div>
              <h1 className="mt-6 text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
                {about.title}
              </h1>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-white/78 sm:text-base">
                {about.subtitle}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/courses" className="action-primary">
                  Explore courses
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/pricing" className="action-secondary border-white/20 bg-white/5 text-white hover:bg-white/10">
                  View pricing
                </Link>
              </div>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-[24px] border border-white/10 bg-white/[0.05] px-5 py-5"
                >
                  <p className="text-2xl font-black text-white">{stat.value}</p>
                  <p className="mt-2 text-sm text-white/70">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section-frame mt-10 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_360px]">
          <div className="space-y-6">
            <div className="surface-card p-6 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-blue">
                Mission
              </p>
              <h2 className="mt-3 text-2xl font-black text-foreground">Why {siteName} exists</h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base">
                {about.mission}
              </p>
              <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base">
                {about.story}
              </p>
              <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base">
                {about.promise}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {pillars.map((pillar) => (
                <div key={pillar.title} className="surface-card p-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-blue/10 text-primary-blue">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-foreground">{pillar.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{pillar.body}</p>
                </div>
              ))}
            </div>
          </div>

          <aside className="surface-card h-fit p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-blue">
              Contact
            </p>
            <h2 className="mt-3 text-2xl font-black text-foreground">
              Talk to the {siteName} team
            </h2>
            <div className="mt-6 space-y-4 text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary-blue" />
                <span>{supportEmail || "support@ailearningclass.com"}</span>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary-blue" />
                <span>{supportPhone || "Support available on request"}</span>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-blue" />
                <span>{supportAddress || "Nairobi, Kenya"}</span>
              </div>
            </div>

            <div className="mt-6 rounded-[24px] border border-border bg-muted/40 p-5">
              <p className="text-sm font-semibold text-foreground">Admin-managed content</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                The copy on this page is controlled from the admin settings panel, so your team can update it without changing code.
              </p>
            </div>
          </aside>
        </section>
      </main>

      <Footer />
    </div>
  );
}
