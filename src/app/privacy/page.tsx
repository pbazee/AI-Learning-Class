import type { Metadata } from "next";
import { Footer } from "@/components/layout/Footer";
import { buildSiteMetadata } from "@/lib/site-server";

export async function generateMetadata(): Promise<Metadata> {
  return buildSiteMetadata("/privacy", {
    title: "Privacy Policy",
    description:
      "Read the Privacy Policy for AI Genius Lab, including how account, payment, and learning data are collected and used.",
  });
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-4xl px-4 py-3 sm:px-6 sm:py-12 lg:px-8">
        <div className="mb-10">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary-blue">
            Legal
          </p>
          <h1 className="mt-3 text-4xl font-black text-foreground">Privacy Policy</h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            This Privacy Policy explains how AI Genius Lab collects, uses, stores, and protects
            your personal information across our learning platform.
          </p>
        </div>

        <div className="space-y-8 text-sm leading-7 text-muted-foreground">
          <section>
            <h2 className="text-2xl font-black text-foreground">1. Information We Collect</h2>
            <p className="mt-3">
              We may collect account details, contact information, billing data, learning activity,
              quiz responses, support requests, and device or usage information needed to operate
              the platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-foreground">2. How We Use Information</h2>
            <p className="mt-3">
              AI Genius Lab uses personal information to create accounts, deliver courses, process
              payments, personalize recommendations, provide support, improve the product, and send
              relevant service or marketing communications.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-foreground">3. Learning Personalization</h2>
            <p className="mt-3">
              Onboarding quiz responses and learning activity may be used to tailor course
              recommendations, surface relevant content, and reduce decision overload for new
              learners.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-foreground">4. Payments and Transactions</h2>
            <p className="mt-3">
              Payment information is processed through authorized third-party providers. AI Genius
              Lab may retain limited transaction records for billing, refunds, tax compliance, and
              fraud prevention.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-foreground">5. Sharing of Information</h2>
            <p className="mt-3">
              We may share data with trusted service providers that help us host the platform,
              authenticate users, process payments, deliver email, or analyze service performance.
              We do not sell personal data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-foreground">6. Data Retention</h2>
            <p className="mt-3">
              Personal information is retained for as long as needed to provide services, comply
              with legal obligations, resolve disputes, or maintain learner records and purchase
              history.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-foreground">7. Security</h2>
            <p className="mt-3">
              AI Genius Lab uses reasonable administrative, technical, and organizational safeguards
              to protect user information, but no online system can guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-foreground">8. Your Choices</h2>
            <p className="mt-3">
              You may update profile information, manage account details, and opt out of certain
              marketing communications. Some data may remain where legally required or necessary for
              platform operations.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-foreground">9. International Use</h2>
            <p className="mt-3">
              If you access the platform from outside our primary operating region, your information
              may be processed and stored in other jurisdictions where our service providers operate.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-foreground">10. Contact Information</h2>
            <p className="mt-3">
              For privacy questions, data requests, or policy concerns, please contact AI Genius
              Lab using the support or contact details listed on the site.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
