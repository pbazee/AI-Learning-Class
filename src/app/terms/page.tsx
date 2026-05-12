import type { Metadata } from "next";
import { Footer } from "@/components/layout/Footer";
import { buildSiteMetadata } from "@/lib/site-server";

export async function generateMetadata(): Promise<Metadata> {
  return buildSiteMetadata("/terms", {
    title: "Terms of Service",
    description:
      "Read the Terms of Service for AI Genius Lab, including account usage, payments, refunds, and platform rules.",
  });
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-4xl px-4 py-3 sm:px-6 sm:py-12 lg:px-8">
        <div className="mb-10">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary-blue">
            Legal
          </p>
          <h1 className="mt-3 text-4xl font-black text-foreground">Terms of Service</h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            These Terms of Service govern your use of AI Genius Lab, including course access,
            subscriptions, payments, and platform participation.
          </p>
        </div>

        <div className="space-y-8 text-sm leading-7 text-muted-foreground">
          <section>
            <h2 className="text-2xl font-black text-foreground">1. Acceptance of Terms</h2>
            <p className="mt-3">
              By creating an account, purchasing a course, or using any part of AI Genius Lab,
              you agree to these terms and to our platform policies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-foreground">2. User Accounts</h2>
            <p className="mt-3">
              You are responsible for maintaining accurate account information, protecting your
              login credentials, and ensuring that your use of the platform complies with all
              applicable laws and community standards.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-foreground">3. Courses and Access</h2>
            <p className="mt-3">
              Course access may be granted through direct purchase, subscription, team access, or
              promotional enrollment. Access terms may vary by product, pricing plan, or offer.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-foreground">4. Payments and Billing</h2>
            <p className="mt-3">
              Paid products, subscriptions, and renewals are billed using the payment method you
              provide. You authorize AI Genius Lab to charge applicable fees, taxes, and renewal
              amounts where recurring billing applies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-foreground">5. Refunds</h2>
            <p className="mt-3">
              Refund requests are reviewed according to the specific product terms and any stated
              guarantee period. Abuse of refund policies, excessive chargebacks, or fraudulent use
              may result in account restrictions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-foreground">6. Intellectual Property</h2>
            <p className="mt-3">
              All platform materials, including videos, text, downloads, branding, and curriculum,
              remain the property of AI Genius Lab or its licensors. Content may not be copied,
              resold, redistributed, or shared publicly without written permission.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-foreground">7. Acceptable Use</h2>
            <p className="mt-3">
              You agree not to misuse the platform, interfere with service availability, attempt
              unauthorized access, or use the platform for abusive, unlawful, or deceptive
              purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-foreground">8. Limitation of Liability</h2>
            <p className="mt-3">
              AI Genius Lab provides educational content on an as-available basis. To the fullest
              extent permitted by law, we disclaim liability for indirect, incidental, or
              consequential damages arising from use of the platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-foreground">9. Changes to the Service</h2>
            <p className="mt-3">
              We may update, improve, pause, or discontinue features, content, or pricing as the
              platform evolves. Material changes to these terms may be posted on this page.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-foreground">10. Contact Information</h2>
            <p className="mt-3">
              Questions about these terms can be directed to AI Genius Lab through the contact
              information listed on the site contact page.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
