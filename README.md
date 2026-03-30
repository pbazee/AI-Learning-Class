# 🧠 AI Learning Class

> The world's most advanced AI education platform — built with Next.js 15, Supabase, Stripe/PayPal/Paystack, and a cyber-futuristic UI.

![AI Learning Class](https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=1200&h=400&fit=crop)

---

## ✨ Features

### 🎓 Learning Platform
- **20 realistic AI courses** pre-seeded (ML, Deep Learning, LLMs, Computer Vision, NLP, MLOps, etc.)
- Course detail pages with full curriculum, video previews, and enroll flow
- Learner dashboard with progress tracking, skill radar, and streak counter
- Certificate generation (PDF + optional blockchain hash)
- AI co-pilot chat inside every course (powered by Claude)

### 🤖 AI Features
- **Personalized onboarding quiz** — generates custom learning roadmap on signup
- **AI Copilot** — in-course assistant for questions, exercises, and explanations
- **AI-generated study plans** and skill recommendations

### 🛍️ Payments
- **Stripe** — credit/debit cards worldwide
- **PayPal** — global PayPal checkout
- **Paystack** — African payments (M-Pesa, USSD, bank transfer — NGN, GHS, KES, ZAR)
- Cart with coupon support
- Order confirmation emails via Resend

### 👑 Admin Dashboard (`/admin`)
- Real-time revenue charts (Recharts)
- Full course CRUD — create, edit, delete, set Featured/Trending/New flags
- User management with role assignment
- Dynamic subscription plan manager (create/edit/delete plans with Stripe integration)
- Announcement bar editor with live preview
- Hero slide manager (drag to reorder)
- Site settings (support email, maintenance mode, payment keys)

### 🌐 Landing Page
- Animated hero carousel (admin-editable slides)
- Rotating announcement bar (admin-controlled)
- Browse by AI Skills grid (8 categories)
- Featured, Trending, Popular, New courses sections
- Testimonials with real-looking profiles (Ghana, India, Mexico, etc.)
- Blog/Journal section
- Newsletter signup
- Pricing section with monthly/yearly toggle

---

## 🚀 Quick Start

```bash
# 1. Clone the project
git clone <your-repo>
cd ai-learning-class

# 2. Install dependencies
npm install

# 3. Copy environment file
cp .env.example .env.local

# 4. Run the app
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 🔧 Environment Variables

Copy `.env.example` to `.env.local` and fill in values:

```bash
cp .env.example .env.local
```

### Required
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Database
DATABASE_URL=postgresql://postgres:[pw]@db.[ref].supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres:[pw]@db.[ref].supabase.co:5432/postgres
```

### Optional (enable features progressively)
```env
# Payments
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

NEXT_PUBLIC_PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...

NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_...
PAYSTACK_SECRET_KEY=sk_test_...

# Email
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@yourdomain.com

# AI Copilot
ANTHROPIC_API_KEY=sk-ant-...
```

---

## 🗄️ Database Setup

### Step 1: Create a Supabase Project
1. Go to [supabase.com](https://supabase.com) → New Project
2. Copy your **Project URL**, **Anon Key**, and **Service Role Key**
3. Go to **Project Settings → Database** → copy the connection string

### Step 2: Configure Environment
Update `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://[your-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
DATABASE_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres
```

### Step 3: Push the Schema
```bash
npm run db:push
# or: npx prisma db push
```

### Step 4: Seed Data (optional)
```bash
npm run db:seed
```

### Step 5: Restart
```bash
npm run dev
```

---

## 🔐 Supabase Auth Setup

### Enable providers in Supabase Dashboard:
1. Go to **Authentication → Providers**
2. Enable **Email** (with magic links)
3. Enable **Google** OAuth:
   - Add `https://your-domain.com/auth/callback` as redirect URL
   - Copy Client ID and Secret to Supabase

### Google OAuth Setup:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials
3. Add authorized redirect URIs:
   - `https://[ref].supabase.co/auth/v1/callback`
   - `http://localhost:3000/auth/callback` (dev)

### Row Level Security (RLS):
Run this in Supabase SQL editor to enable RLS:
```sql
-- Enable RLS on all tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Course" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Enrollment" ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON "User"
  FOR SELECT USING (auth.uid()::text = id);

-- Courses are public
CREATE POLICY "Courses are publicly readable" ON "Course"
  FOR SELECT USING (true);

-- Admin full access (check role)
CREATE POLICY "Admins have full access" ON "User"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.id = auth.uid()::text
      AND u.role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );
```

---

## 💳 Payment Gateway Setup

### Stripe
1. Create account at [stripe.com](https://stripe.com)
2. Copy keys from Dashboard → Developers → API Keys
3. Set up webhook: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
4. For production: add webhook endpoint in Stripe Dashboard → Webhooks

### PayPal
1. Create app at [developer.paypal.com](https://developer.paypal.com)
2. Copy Client ID and Secret
3. Test with sandbox accounts

### Paystack (Africa)
1. Create account at [paystack.com](https://paystack.com)
2. Copy keys from Settings → API Keys & Webhooks
3. Supports: 🇳🇬 NGN, 🇬🇭 GHS, 🇿🇦 ZAR, 🇰🇪 KES + USD

---

## 📧 Email Setup (Resend)

1. Create account at [resend.com](https://resend.com)
2. Add and verify your domain
3. Create API key → add to `.env.local`
4. Emails sent on: enrollment, certificate, welcome, admin alerts

---

## 🤖 AI Copilot Setup

The in-course AI copilot uses Anthropic's Claude API:

1. Get API key at [console.anthropic.com](https://console.anthropic.com)
2. Add `ANTHROPIC_API_KEY=sk-ant-...` to `.env.local`
3. The copilot appears on every course detail page

---

## 🚢 Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add STRIPE_SECRET_KEY
# ... add all required env vars
```

### Vercel Dashboard method:
1. Push to GitHub
2. Import repo at [vercel.com/new](https://vercel.com/new)
3. Add all environment variables from `.env.example`
4. Deploy

### Post-deployment checklist:
- [ ] Update `NEXT_PUBLIC_APP_URL` to your production domain
- [ ] Add production domain to Supabase Auth → URL Configuration
- [ ] Set Stripe webhook to production URL
- [ ] Test all payment methods in live mode
- [ ] Enable Vercel Edge Config for feature flags (optional)

---

## 📁 Project Structure

```
ai-learning-class/
├── prisma/
│   └── schema.prisma          # Full database schema (20+ models)
├── src/
│   ├── app/
│   │   ├── page.tsx           # Landing page
│   │   ├── courses/           # Course listing + detail pages
│   │   ├── cart/              # Shopping cart
│   │   ├── checkout/          # Multi-gateway checkout
│   │   ├── dashboard/         # Learner dashboard
│   │   ├── (auth)/
│   │   │   ├── login/         # Login (Google, email, magic link)
│   │   │   └── signup/        # Signup + AI onboarding quiz
│   │   ├── admin/
│   │   │   ├── page.tsx       # Admin dashboard (charts, stats)
│   │   │   ├── courses/       # Course CRUD table
│   │   │   ├── users/         # User management
│   │   │   ├── subscriptions/ # Dynamic subscription plans
│   │   │   ├── announcements/ # Announcement bar manager
│   │   │   ├── hero/          # Hero slide manager
│   │   │   └── settings/      # Site settings + DB mode toggle
│   │   └── api/
│   │       ├── copilot/       # AI copilot (Claude)
│   │       ├── stripe/        # Stripe checkout + webhook
│   │       ├── paystack/      # Paystack initialization
│   │       └── email/         # Resend email sender
│   ├── components/
│   │   ├── landing/           # Hero, Categories, Sections, Testimonials
│   │   ├── courses/           # CourseCard, AICopilot
│   │   ├── layout/            # Navbar, Footer
│   │   └── ui/                # Toaster, shared UI
│   ├── lib/
│   │   ├── data.ts            # Prisma-backed data helpers
│   │   ├── utils.ts           # Helpers (formatPrice, formatDuration, etc.)
│   │   ├── prisma.ts          # Prisma singleton
│   │   └── supabase.ts        # Supabase browser client
│   ├── store/
│   │   └── cart.ts            # Zustand cart store (persisted)
│   ├── types/
│   │   └── index.ts           # TypeScript types
│   └── middleware.ts          # Auth middleware (Supabase)
├── .env.example               # All environment variables documented
├── tailwind.config.ts         # Custom neon/cyber theme
└── README.md
```

---

## 🎨 Design System

The platform uses a **neon cyber-futuristic** aesthetic:

- **Colors**: `#00d4ff` (neon blue), `#7c3aed` (neon purple), `#ec4899` (neon pink)
- **Background**: `#060614` (deep cyber dark)
- **Typography**: Inter (premium, readable sans-serif)
- **Effects**: Glassmorphism cards, glow effects, animated progress bars, particle floats
- **CSS utilities**: `.glass-card`, `.gradient-text`, `.glow-blue`, `.cyber-grid-bg`, `.progress-glow`

---

## 🛠️ Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # ESLint
npm run db:push      # Push Prisma schema to DB
npm run db:studio    # Open Prisma Studio
npm run db:seed      # Seed the database
```

---

## 📄 License

MIT — build whatever you want with this.

---

Built with ❤️ using Next.js 15, Supabase, Prisma, Stripe, and Claude AI.
