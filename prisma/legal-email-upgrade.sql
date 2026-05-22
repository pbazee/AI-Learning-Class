create extension if not exists pgcrypto;

do $$
begin
  alter type public."OrderStatus" add value if not exists 'PAYMENT_FAILED';
exception
  when undefined_object then null;
end $$;

do $$
begin
  alter type public."SubscriptionStatus" add value if not exists 'PAYMENT_FAILED';
exception
  when undefined_object then null;
end $$;

create table if not exists public.legal_documents (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  content text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  user_id text references public."User"(id) on delete set null,
  recipient text not null,
  template text not null,
  subject text,
  status text not null,
  provider_id text,
  error text,
  sent_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb
);

create table if not exists public.email_preferences (
  user_id text primary key references public."User"(id) on delete cascade,
  subscribed_marketing boolean not null default true,
  unsubscribe_token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.legal_documents enable row level security;
alter table public.email_logs enable row level security;
alter table public.email_preferences enable row level security;

drop policy if exists "legal documents are publicly readable" on public.legal_documents;
create policy "legal documents are publicly readable"
on public.legal_documents
for select
to anon, authenticated
using (true);

drop policy if exists "legal documents are admin writable" on public.legal_documents;
create policy "legal documents are admin writable"
on public.legal_documents
for all
to authenticated
using (
  exists (
    select 1
    from public."User" u
    where u.id = auth.uid()::text
      and u.role in ('ADMIN', 'SUPER_ADMIN')
  )
)
with check (
  exists (
    select 1
    from public."User" u
    where u.id = auth.uid()::text
      and u.role in ('ADMIN', 'SUPER_ADMIN')
  )
);

drop policy if exists "email logs are admin readable" on public.email_logs;
create policy "email logs are admin readable"
on public.email_logs
for select
to authenticated
using (
  exists (
    select 1
    from public."User" u
    where u.id = auth.uid()::text
      and u.role in ('ADMIN', 'SUPER_ADMIN')
  )
);

drop policy if exists "email preferences are self readable" on public.email_preferences;
create policy "email preferences are self readable"
on public.email_preferences
for select
to authenticated
using (auth.uid()::text = user_id);

drop policy if exists "email preferences are self insertable" on public.email_preferences;
create policy "email preferences are self insertable"
on public.email_preferences
for insert
to authenticated
with check (auth.uid()::text = user_id);

drop policy if exists "email preferences are self updatable" on public.email_preferences;
create policy "email preferences are self updatable"
on public.email_preferences
for update
to authenticated
using (auth.uid()::text = user_id)
with check (auth.uid()::text = user_id);

insert into public.legal_documents (slug, title, content, updated_at)
values
  (
    'privacy-policy',
    'Privacy Policy',
    $privacy$
<section>
  <h2>1. Information We Collect</h2>
  <p>We may collect account details, contact information, billing data, learning activity, quiz responses, support requests, and device or usage information needed to operate the platform.</p>
</section>
<section>
  <h2>2. How We Use Information</h2>
  <p>AI Genius Lab uses personal information to create accounts, deliver courses, process payments, personalize recommendations, provide support, improve the product, and send relevant service or marketing communications.</p>
</section>
<section>
  <h2>3. Learning Personalization</h2>
  <p>Onboarding quiz responses and learning activity may be used to tailor course recommendations, surface relevant content, and reduce decision overload for new learners.</p>
</section>
<section>
  <h2>4. Payments and Transactions</h2>
  <p>Payment information is processed through authorized third-party providers. AI Genius Lab may retain limited transaction records for billing, refunds, tax compliance, and fraud prevention.</p>
</section>
<section>
  <h2>5. Sharing of Information</h2>
  <p>We may share data with trusted service providers that help us host the platform, authenticate users, process payments, deliver email, or analyze service performance. We do not sell personal data.</p>
</section>
<section>
  <h2>6. Data Retention</h2>
  <p>Personal information is retained for as long as needed to provide services, comply with legal obligations, resolve disputes, or maintain learner records and purchase history.</p>
</section>
<section>
  <h2>7. Security</h2>
  <p>AI Genius Lab uses reasonable administrative, technical, and organizational safeguards to protect user information, but no online system can guarantee absolute security.</p>
</section>
<section>
  <h2>8. Your Choices</h2>
  <p>You may update profile information, manage account details, and opt out of certain marketing communications. Some data may remain where legally required or necessary for platform operations.</p>
</section>
<section>
  <h2>9. International Use</h2>
  <p>If you access the platform from outside our primary operating region, your information may be processed and stored in other jurisdictions where our service providers operate.</p>
</section>
<section>
  <h2>10. Contact Information</h2>
  <p>For privacy questions, data requests, or policy concerns, please contact AI Genius Lab using the support or contact details listed on the site.</p>
</section>
$privacy$,
    now()
  ),
  (
    'terms-of-service',
    'Terms of Service',
    $terms$
<section>
  <h2>1. Acceptance of Terms</h2>
  <p>By creating an account, purchasing a course, or using any part of AI Genius Lab, you agree to these terms and to our platform policies.</p>
</section>
<section>
  <h2>2. User Accounts</h2>
  <p>You are responsible for maintaining accurate account information, protecting your login credentials, and ensuring that your use of the platform complies with all applicable laws and community standards.</p>
</section>
<section>
  <h2>3. Courses and Access</h2>
  <p>Course access may be granted through direct purchase, subscription, team access, or promotional enrollment. Access terms may vary by product, pricing plan, or offer.</p>
</section>
<section>
  <h2>4. Payments and Billing</h2>
  <p>Paid products, subscriptions, and renewals are billed using the payment method you provide. You authorize AI Genius Lab to charge applicable fees, taxes, and renewal amounts where recurring billing applies.</p>
</section>
<section>
  <h2>5. Refunds</h2>
  <p>Refund requests are reviewed according to the specific product terms and any stated guarantee period. Abuse of refund policies, excessive chargebacks, or fraudulent use may result in account restrictions.</p>
</section>
<section>
  <h2>6. Intellectual Property</h2>
  <p>All platform materials, including videos, text, downloads, branding, and curriculum, remain the property of AI Genius Lab or its licensors. Content may not be copied, resold, redistributed, or shared publicly without written permission.</p>
</section>
<section>
  <h2>7. Acceptable Use</h2>
  <p>You agree not to misuse the platform, interfere with service availability, attempt unauthorized access, or use the platform for abusive, unlawful, or deceptive purposes.</p>
</section>
<section>
  <h2>8. Limitation of Liability</h2>
  <p>AI Genius Lab provides educational content on an as-available basis. To the fullest extent permitted by law, we disclaim liability for indirect, incidental, or consequential damages arising from use of the platform.</p>
</section>
<section>
  <h2>9. Changes to the Service</h2>
  <p>We may update, improve, pause, or discontinue features, content, or pricing as the platform evolves. Material changes to these terms may be posted on this page.</p>
</section>
<section>
  <h2>10. Contact Information</h2>
  <p>Questions about these terms can be directed to AI Genius Lab through the contact information listed on the site contact page.</p>
</section>
$terms$,
    now()
  ),
  (
    'refund-policy',
    'Refund Policy',
    $refund$
<section>
  <h2>1. Overview</h2>
  <p>AI Genius Lab wants every learner to feel confident when buying a course or subscription. This Refund Policy explains when refunds may be requested, how they are reviewed, and when they may be declined.</p>
</section>
<section>
  <h2>2. Course Purchases</h2>
  <p>For one-time course purchases, refund requests should be submitted within 7 days of purchase unless a different guarantee is stated on the offer page. Requests may be denied where most of the course has been consumed, certificates have been issued, or abuse is suspected.</p>
</section>
<section>
  <h2>3. Subscription Plans</h2>
  <p>Subscription charges are generally non-refundable once a billing period starts, except where required by law or where AI Genius Lab expressly approves a goodwill refund. To avoid a future renewal, cancel before your next billing date.</p>
</section>
<section>
  <h2>4. Fraud, Chargebacks, and Abuse</h2>
  <p>We may refuse a refund and suspend access where there is evidence of fraud, account sharing, repeated refund abuse, or chargeback activity inconsistent with good-faith platform use.</p>
</section>
<section>
  <h2>5. How to Request a Refund</h2>
  <p>Contact support with your account email, purchase date, payment method, and the reason for the request. We may ask for extra details to verify the order and speed up review.</p>
</section>
<section>
  <h2>6. Processing Time</h2>
  <p>Approved refunds are typically processed within 5 to 10 business days, depending on your payment provider. Bank or card settlement timelines are controlled by the provider after the refund is issued.</p>
</section>
<section>
  <h2>7. Questions</h2>
  <p>If you have questions about your eligibility or need help retrying a failed payment instead of requesting a refund, please contact AI Genius Lab support before opening a dispute.</p>
</section>
$refund$,
    now()
  )
on conflict (slug) do update
set
  title = excluded.title,
  content = excluded.content,
  updated_at = excluded.updated_at;

insert into public.email_preferences (user_id, subscribed_marketing)
select id, true
from public."User"
on conflict (user_id) do nothing;

create index if not exists email_logs_recipient_sent_at_idx
  on public.email_logs (recipient, sent_at desc);

create index if not exists email_logs_template_sent_at_idx
  on public.email_logs (template, sent_at desc);
