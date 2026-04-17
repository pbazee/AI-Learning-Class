AI Learning Class — Codebase Audit

Date: 2026-04-17
Scope: Full repository audit (quick automated scans + manual review of key files)

Executive summary

- The project is a large Next.js (v15) + Supabase + Prisma app; overall structure is sound and follows Next app router layout.
- No high-confidence leaked secrets found in committed files (README contains placeholders). Some large log and tmp files exist in repo directories (codex_tmp, build logs) — confirm they are gitignored.
- Several actionable issues found across security, logging, typing, and CI/testing that should be addressed before production.

High-priority issues (blockers / must-fix before production)

1) Excessive console.log usage in server code and webhook handlers
   - Files: src/app/api/stripe/webhook/route.ts, src/app/api/paystack/webhook/route.ts, src/app/signup/page.tsx, src/app/login/page.tsx, many admin action files.
   - Risk: Sensitive data may be logged (emails, invoice IDs), noisy logs in production. Webhook handlers must use structured logging at appropriate levels and avoid logging secrets.
   - Fix: Replace console.log with structured logger (pino/winston/@vercel/telemetry or Next.js-compatible logger). Sanitize logs; avoid logging full payloads or API keys.

2) Environment variable handling and non-null assertions
   - Several places use non-null assertions (process.env.VAR!) and mutate process.env (src/lib/prisma.ts sets process.env.DATABASE_URL at runtime).
   - Risk: Unexpected runtime errors when env vars are missing; mutation of process.env can be confusing and cause side-effects.
   - Fix: Add a central config module that validates required env vars at startup (zod/env-schema). Fail fast with clear errors. Avoid mutating process.env where possible; compute local constants instead.

3) Sensitive files and repo hygiene
   - Large binary/log/tmp artifacts present: codex_tmp, many build logs in repo. Ensure .gitignore excludes these; consider removing large files from history (git filter-repo) if already committed.
   - Fix: Clean up repo, add appropriate gitignore entries (.log, /codex_tmp/, /build-*.log). Rotate any exposed keys if needed.

4) Webhook and payment verification
   - Positive: Many webhooks check required secrets (Stripe, Paystack, PayPal) before processing. Ensure verification is strict and retries/IDEMPOTENCY are handled.
   - Fix: Add idempotency checks, validate signatures strictly, and centralize error handling for webhook endpoints.

Medium-priority issues (should address before go-live)

1) Loose TypeScript usage and any types
   - Files: src/lib/prisma.ts, multiple admin components and API handlers use any extensively.
   - Risk: Hard-to-find runtime bugs and reduced maintainability.
   - Fix: Introduce stricter TS rules (noImplicitAny, ESLint rules), fix top 'any' occurrences (especially API surface types), add type definitions for third-party libs where missing.

2) Missing automated tests and CI
   - No visible tests or CI workflows. This increases risk for regressions.
   - Fix: Add CI (GitHub Actions) with steps: install, build, typecheck, lint, run tests. Add unit tests for critical API flows (webhooks, payment flows) and at least integration tests for auth and checkout.

3) Dependency management and security
   - Many dependencies with wide version ranges. Run `npm audit` and enable dependabot/renovate to track updates.
   - Fix: Add Dependabot config, run audits, pin critical dependency versions. Consider locking major infra versions (Next/React) that are verified.

4) Observability & error reporting
   - No Sentry or error telemetry integrated.
   - Fix: Add Sentry (or equivalent) for server and client, structured logging, and request tracing. Centralize log levels by environment.

Low-priority / cosmetic

- README contains stray text: "why did you leave me soledad" — remove or clarify.
- Tailwind content config references both pages/ and src/. Confirm content paths match actual layout (app router uses app/ and src/). Current config includes src, so OK — just verify for unused globs.
- Consider adding package.json "engines" and CI checks for node version.

Performance & scaling notes

- Prisma connection pooling: project manipulates DATABASE_URL and DIRECT_URL. For serverless (Vercel), use a connection pooler or Prisma Data Proxy. Avoid opening too many DB connections.
- Caching and revalidation: cache-config uses revalidate env vars — ensure values suit traffic patterns, and use CDN/Edge caching for public pages.

Security checklist (quick)

- [ ] Confirm .env.example does not contain real secrets (it doesn't appear to). Rotate if any real secrets were committed earlier.
- [ ] Enforce HTTPS-only cookies and secure flags for production domains.
- [ ] Ensure RLS is enabled in Supabase per README instructions.
- [ ] Limit SUPABASE_SERVICE_ROLE_KEY usage server-side only; never expose on client.

Recommended immediate action plan (prioritized)

1) Add CI: build, typecheck, lint, run tests. (High)
2) Replace console.log with structured logger + remove sensitive payload logging. (High)
3) Centralize and validate env vars with an env schema; fail-fast on missing required keys. (High)
4) Clean repo: remove large logs/tmp and update .gitignore. (High)
5) Add Dependabot/Renovate and run `npm audit` — fix critical vulnerabilities. (Medium)
6) Reduce/replace rampant any types in server and API handlers. Add stricter TS linting. (Medium)
7) Add Sentry/monitoring and more robust webhook idempotency. (Medium)
8) Add tests (unit for payments/auth, e2e for checkout). (Medium)

Suggested short-term TODOs (actionable)

- Create issue: "Replace console.log with structured logger" and assign to backend owner; list files from grep output.
- Create issue: "Add env validation and central config".
- Create issue: "Remove committed build logs and codex_tmp; add to .gitignore".
- Create issue: "Add GitHub Actions CI: install -> build -> typecheck -> lint".
- Create issue: "Run npm audit and remediate".

Next steps I can take (choose which to run):
- Start implementing fixes: replace console.log in API routes and wire up a logger.
- Add env validation (zod) and a central config loader.
- Create CI workflow file and initial tests.
- Remove large files from repo and update .gitignore.

If helpful, request which action to start and authorization to modify files. Otherwise, can open PRs with the highest-priority fixes.

Appendix: notable grep hits (examples)
- console.log locations: src/app/api/stripe/webhook/route.ts, src/app/signup/page.tsx, src/app/login/page.tsx, src/components/ui/ToastProvider.tsx
- process.env usage and checks: src/lib/prisma.ts, src/lib/supabase.ts, many API routes
- any occurrences: src/lib/prisma.ts (transaction wrappers), admin actions; several "error: any" catch blocks — replace with unknown then narrow.

End of audit

Generated by Copilot CLI audit run.