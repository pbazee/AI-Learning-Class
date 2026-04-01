import Link from "next/link";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const settings = await prisma.siteSettings.findUnique({
    where: { id: "singleton" },
    select: {
      supportEmail: true,
      supportPhone: true,
      supportAddress: true,
      socialLinks: true,
    },
  });

  const socialLinks =
    settings?.socialLinks && typeof settings.socialLinks === "object" && !Array.isArray(settings.socialLinks)
      ? Object.fromEntries(Object.entries(settings.socialLinks).map(([key, value]) => [key, String(value)]))
      : {};

  const supportEmail = settings?.supportEmail || "support@ailearningclass.com";
  const supportPhone = settings?.supportPhone || "+254 700 000 000";
  const supportAddress = settings?.supportAddress || "Nairobi, Kenya";
  const whatsappNumber = socialLinks.whatsapp || "254700000000";
  const whatsappHref = `https://wa.me/${whatsappNumber.replace(/\D/g, "")}`;

  const contactMethods = [
    {
      title: "Email support",
      description: "Reach the team for course access, billing, and account help.",
      value: supportEmail,
      href: `mailto:${supportEmail}`,
      icon: Mail,
    },
    {
      title: "Talk to admissions",
      description: "Discuss learning paths, cohorts, and the right track for your goals.",
      value: supportPhone,
      href: `tel:${supportPhone}`,
      icon: Phone,
    },
    {
      title: "WhatsApp chat",
      description: "Get a quick answer from the AI Learning Class team.",
      value: whatsappNumber,
      href: whatsappHref,
      icon: MessageCircle,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary-blue">
            Contact Us
          </p>
          <h1 className="mt-4 text-4xl font-black text-foreground sm:text-5xl">
            We&apos;re here to help you keep learning
          </h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            Contact the team for support, partnership questions, or help choosing the right AI learning path.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {contactMethods.map(({ title, description, value, href, icon: Icon }) => (
            <Card key={title} className="h-full">
              <CardHeader>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-blue/10 text-primary-blue">
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-2xl text-foreground">{title}</CardTitle>
                <CardDescription className="text-muted-foreground">{description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm font-semibold text-foreground">{value}</p>
                <Button asChild variant="outline" className="w-full">
                  <a href={href} target={href.startsWith("https://") ? "_blank" : undefined} rel="noreferrer">
                    Open
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-8 overflow-hidden bg-gradient-to-r from-slate-950 via-slate-900 to-primary-blue text-white">
          <CardContent className="flex flex-col gap-6 p-8 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/70">
                Visit Us
              </p>
              <h2 className="mt-3 text-2xl font-black">{supportAddress}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/85">
                AI Learning Class supports learners across Africa and globally, with personalized AI upskilling and structured online programs.
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-white">
              <MapPin className="h-5 w-5 text-white/75" />
              <span>{supportAddress}</span>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <Button asChild>
            <Link href="/courses">Browse Courses</Link>
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
