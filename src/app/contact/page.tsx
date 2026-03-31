import Link from "next/link";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const contactMethods = [
  {
    title: "Email support",
    description: "Reach the team for course access, billing, and account help.",
    value: "support@ailearningclass.com",
    href: "mailto:support@ailearningclass.com",
    icon: Mail,
  },
  {
    title: "Talk to admissions",
    description: "Discuss learning paths, cohorts, and the right track for your goals.",
    value: "+254 700 000 000",
    href: "tel:+254700000000",
    icon: Phone,
  },
  {
    title: "WhatsApp chat",
    description: "Get a quick answer from the AI Learning Class team.",
    value: "Start a conversation",
    href: "https://wa.me/254700000000",
    icon: MessageCircle,
  },
];

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600 dark:text-blue-400">
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
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-300">
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-2xl">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
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

        <Card className="mt-8 overflow-hidden bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 text-white">
          <CardContent className="flex flex-col gap-6 p-8 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-200">
                Visit Us
              </p>
              <h2 className="mt-3 text-2xl font-black">Nairobi, Kenya</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200/85">
                AI Learning Class supports learners across Africa and globally, with personalized AI upskilling and structured online programs.
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-slate-100">
              <MapPin className="h-5 w-5 text-blue-200" />
              <span>Nairobi, Kenya</span>
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
