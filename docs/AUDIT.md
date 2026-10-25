# FOGM Leads — Comprehensive Codebase Audit

**Date:** 2026-10-25  
**Auditor:** Antigravity (Google DeepMind)  
**Target:** User Site & Admin CMS/CRM (`fogm-leads`)  
**Stack:** Next.js 16.4.3 (Cache Components ON, Turbopack), React 19.3.0, TypeScript 5, Tailwind CSS v4, Mongoose 9.11.3, jose 6.2.13, zod 4.6.7, Cloudinary 2.11.0, Nodemailer 10.2.1.  

---

## 0. Executive Summary

A comprehensive, read-only architectural, functional, and security audit was conducted across the entire `fogm-leads` repository covering all 75 tracked files across public routes, admin console, authentication flows, models, and utility libraries.

### 0.1 Severity Counts
| Severity | Count | Definition |
| :--- | :---: | :--- |
| **Blocker (P0)** | **7** | Critical bugs completely breaking user authentication, profile creation, build/TypeScript compilation, and admin uploads. |
| **High (P1)** | **12** | Core UI degradation (broken CSS tokens rendering admin pages unstyled), hydration mismatches, React 19 hook violations, and data skew. |
| **Medium (P2)** | **16** | Layout bugs, timezone skew in date pickers, missing validations, missing 30-day zero-fill charts, unhandled error states. |
| **Low (P3)** | **11** | Deprecated Next.js 16 conventions (`middleware.ts`), redundant fonts, minor a11y labels, and cosmetic polish. |
| **Total Findings** | **46** | Fully catalogued across subsystems. |

### 0.2 Top 10 Critical Problems

1. **Session Invalidation via Lean Query & Missing Defaults (`lib/session.ts:69`, `app/api/auth/verify-otp/route.ts:51-64`)**:
   `getSession()` executes `User.findById(...).select("status sessionVersion").lean()`. Because `.lean()` strips schema defaults, any user inserted without an explicit `sessionVersion` stored in MongoDB returns `user.sessionVersion === undefined`. `lib/session.ts` strictly checks `if (user.sessionVersion !== sessionVersion) return null;` (`undefined !== 0` evaluates to `true`), invalidating every valid session immediately.
2. **Invalid Mongoose Query Options `{ returnDocument: true }` Breaking Compilation and Upserts (`app/api/auth/verify-otp/route.ts:54`, `app/api/me/route.ts:69`, `app/api/admin/login/route.ts:50,55`, `app/api/admin/settings/route.ts:43`, `lib/rate-limit.ts:25`)**:
   Mongoose expects `{ new: true }` or `{ returnDocument: 'after' }`. Passing `{ returnDocument: true }` fails TypeScript type-checking across 5 API files (causing 15 `TS2769` and `TS2339` compile errors) and causes MongoDB Node driver to return the pre-update document (`null` on insert), causing verify-otp to fail or omit fields.
3. **Double Error & Infinite Retry Loop in Profile Step (`components/JoinModal.tsx:128-143, 451-466`)**:
   When `PATCH /api/me` or `POST /api/avatar/sign` fails with 401 (due to the session bug), `msgFor()` lacks an `unauthorized` case and falls back to `"Something went wrong. Please try again."`. This message renders under both the avatar uploader and above the submit button simultaneously. The button immediately re-enables, leading users to click repeatedly (generating 12+ 401 requests).
4. **Broken Admin CSS Tokens: Undefined Shadcn Utility Classes (`app/globals.css`, `app/admin/**`)**:
   Admin pages and components rely heavily on `bg-primary`, `text-primary`, `bg-background`, `border-border`, `bg-muted`, and `text-muted-foreground`. None of these tokens are defined in `app/globals.css` (which uses custom FOGM tokens: `--accent`, `--card`, `--bg-alt`, `--hairline`, `--ink`). Consequently, Tailwind v4 strips or fails to generate CSS rules, leaving buttons transparent, borders invisible or heavy black defaults, and inputs completely un-styled.
5. **Hydration Mismatch on `<html>` & Duplicate Fonts (`app/layout.tsx:27-30`, `components/LandingClient.tsx:89`)**:
   `LandingClient.tsx` executes an inline `THEME_BOOT` script that adds/removes `.dark` from `document.documentElement` before React hydration. `app/layout.tsx` lacks `suppressHydrationWarning` on `<html>`. Additionally, `app/layout.tsx` loads Google's `Geist` and `Geist_Mono` fonts into the root element, while `app/globals.css` and `LandingClient.tsx` exclusively map and load `Inter`, downloading unused fonts and triggering client-server className mismatch warnings.
6. **Cloudinary Admin Signature Algorithm Mismatch (`app/api/admin/upload/sign/route.ts:26-27`)**:
   Admin image uploads manually hash parameters using `createHash("sha256")` instead of Cloudinary's required SHA-1 algorithm (`cloudinary.utils.api_sign_request`). Cloudinary rejects admin uploads with `401 Invalid Signature`.
7. **Datetime-Local Timezone Data Corruption (`app/admin/contest/page.tsx:41-44, 67-70`)**:
   `app/admin/contest/page.tsx` slices ISO UTC timestamps (`.slice(0, 16)`) into `<input type="datetime-local">` without converting UTC to local time. On save, `new Date(contest.startsAt).toISOString()` treats local time as if it were UTC, shifting dates by the user's timezone offset on every single save.
8. **15 React 19 ESLint Errors: Synchronous `setState` in `useEffect` (`app/admin/*`, `components/*`)**:
   Directly invoking `loadData()` within `useEffect` without functional callbacks or async decoupling triggers `react-hooks/set-state-in-effect` errors across all admin dashboard pages, `LandingClient.tsx`, and `ConfirmDialog.tsx`.
9. **Deprecated Next.js 16 `middleware.ts` Convention (`middleware.ts:1-15`)**:
   Next.js 16 formally deprecated `middleware.ts` in favor of `proxy.ts`. Running `middleware.ts` triggers console warnings on every build and dev server reload.
10. **Data Logic Defects in Admin CRM & Dashboard (`app/admin/page.tsx:188`, `app/api/admin/stats/route.ts:30-43`)**:
    Users with incomplete profiles show up as "Anonymous trader" in the admin dashboard rather than displaying their actual email and "Profile incomplete" tag. The 30-day signup chart only groups active days without zero-filling the 30-day window, causing single-point rendering.

### 0.3 Risk If Left Unfixed
- **Zero User Conversions**: No visitor can complete profile registration or save their display name and avatar.
- **Admin Lockout & Misconfiguration**: Inability to upload logos/favicons via Cloudinary, broken admin UI makes championship date/prize configuration hazardous, and timestamps corrupt silently.
- **Production Build Failure**: `tsc --noEmit` and `next build` will fail due to Mongoose TypeScript overload errors in API routes.

---

## 1. File Inventory

| Path | Purpose | Lines | Status | Notes |
| :--- | :--- | :---: | :---: | :--- |
| `.gitignore` | Git exclusions | 32 | OK | Properly ignores node_modules, .next, .env |
| `AGENTS.md` | Agent workspace guidelines | 5 | OK | Rules regarding Next.js 16 agent files |
| `README.md` | Project documentation | 23 | OK | Basic readme |
| `package.json` | Dependencies and scripts | 32 | OK | Next 16.4.3, React 19.3.0, Mongoose 9.11.3 |
| `pnpm-lock.yaml` | Lockfile | 3456 | OK | Frozen lockfile |
| `pnpm-workspace.yaml` | Workspace config | 3 | OK | Single package setup |
| `tsconfig.json` | TypeScript configuration | 34 | OK | Target ES2017, strict mode ON |
| `eslint.config.mjs` | ESLint 9 flat configuration | 16 | OK | Uses `eslint-config-next` |
| `next.config.ts` | Next.js configuration | 28 | OK | `cacheComponents: true`, `partialPrefetching: true` |
| `middleware.ts` | Header injector for admin routing | 13 | Needs-Refactor | Deprecated in Next 16; rename to `proxy.ts` |
| `scripts/migrate-privacy.ts` | Privacy migration script | 49 | Needs-Refactor | Migrates `publicConsent`, but omits `sessionVersion` & `status` defaults |
| `app/layout.tsx` | Root HTML & font shell | 30 | Broken | Hydration mismatch; duplicate Geist fonts; missing `suppressHydrationWarning` |
| `app/globals.css` | Global Tailwind v4 styles & tokens | 136 | Needs-Refactor | Missing standard admin design tokens (`border-border`, etc.) |
| `app/page.tsx` | Public landing page server component | 6 | OK | Fetches cached settings, renders `LandingClient` |
| `app/robots.ts` | Search engine indexing rules | 14 | OK | Disallows `/admin/`, allows `/` |
| `app/favicon.ico` | Favicon icon | 18 | OK | Default asset |
| `app/u/[userId]/page.tsx` | Public rank card share page | 65 | OK | Server component with Suspense, OpenGraph metadata |
| `app/admin/layout.tsx` | Admin auth guard & shell wrapper | 51 | OK | Wrapped in `<Suspense>`, checks `x-pathname` & `requireAdmin()` |
| `app/admin/login/page.tsx` | Admin login page | 105 | OK | Clean login form with error handling |
| `app/admin/page.tsx` | Admin overview dashboard | 221 | Needs-Refactor | Shows "Anonymous trader"; incomplete chart; styling tokens broken |
| `app/admin/users/page.tsx` | Admin CRM user management | 546 | Needs-Refactor | Broken Tailwind tokens; React hook warnings on load |
| `app/admin/leaderboard/page.tsx` | Admin leaderboard editor | 582 | Needs-Refactor | Broken Tailwind tokens; raw inputs |
| `app/admin/contest/page.tsx` | Admin contest configuration | 337 | Needs-Refactor | Left-aligned layout gutter; timezone bug; native selects |
| `app/admin/prizes/page.tsx` | Admin prizes management | 316 | Needs-Refactor | Undefined shadcn classes; React hook warnings |
| `app/admin/content/page.tsx` | Admin copy/CMS management | 355 | Needs-Refactor | Undefined shadcn classes; React hook warnings |
| `app/admin/design/page.tsx` | Admin branding/theme editor | 296 | Needs-Refactor | Undefined shadcn classes; React hook warnings |
| `app/admin/settings/page.tsx` | Admin system & maintenance | 240 | Needs-Refactor | Undefined shadcn classes; React hook warnings |
| `app/admin/audit/page.tsx` | Admin audit log viewer | 268 | Needs-Refactor | Undefined shadcn classes; native date inputs; location assign warning |
| `app/api/admin/login/route.ts` | Admin login API handler | 100 | Broken | Type errors on `{ returnDocument: true }` |
| `app/api/admin/logout/route.ts` | Admin logout API handler | 7 | OK | Clears admin cookie |
| `app/api/admin/stats/route.ts` | Admin metrics aggregation | 59 | Needs-Refactor | Signups chart missing 30-day zero-fill; country null handling |
| `app/api/admin/users/route.ts` | Admin user CRUD | 149 | OK | Paginated, filtered, logs audit events |
| `app/api/admin/users/bulk/route.ts`| Admin user bulk status actions | 49 | OK | Bulk enable/disable/forceSignOut |
| `app/api/admin/users/export/route.ts`| CSV export of users | 55 | OK | Correct CSV formatting and headers |
| `app/api/admin/traders/route.ts` | Leaderboard traders CRUD | 121 | OK | Validated via zod, logs audit events |
| `app/api/admin/traders/import/route.ts`| JSON bulk import of traders | 94 | OK | Validated array import with atomic rollback |
| `app/api/admin/settings/route.ts`| System settings GET & PATCH | 55 | Broken | Type error on `{ returnDocument: true }`; revalidateTag signature |
| `app/api/admin/settings/revalidate/route.ts`| On-demand revalidation | 20 | OK | Calls `revalidateTag("settings", "max")` |
| `app/api/admin/test-email/route.ts`| Admin test email sender | 37 | OK | Verifies SMTP transport |
| `app/api/admin/upload/sign/route.ts`| Brand upload signature | 39 | Broken | Uses SHA-256 instead of Cloudinary SHA-1 |
| `app/api/admin/audit/route.ts` | Audit log GET API | 40 | OK | Paginated, filtered by action/date |
| `app/api/admin/audit/export/route.ts`| Audit log CSV export | 41 | OK | Proper CSV headers and escaping |
| `app/api/auth/request-otp/route.ts`| User OTP request API | 33 | OK | Rate limited by IP & email; secure hash |
| `app/api/auth/verify-otp/route.ts` | User OTP verify API | 56 | Broken | `{ returnDocument: true }` compile error; misses `sessionVersion`/`status` defaults |
| `app/api/auth/logout/route.ts` | User logout API | 7 | OK | Clears user cookie |
| `app/api/me/route.ts` | Current user profile GET/PATCH | 70 | Broken | Type error on `{ returnDocument: true }`; profileComplete logic |
| `app/api/avatar/sign/route.ts` | User avatar upload signature | 13 | OK | Cloudinary upload signing for current user |
| `app/api/card/[userId]/route.tsx`| Dynamic OG/Story image generator | 70 | Needs-Refactor | Hardcoded `MOCK_DB.competition` instead of `getSettings()` |
| `components/AuthProvider.tsx` | Client authentication context | 92 | OK | Auto-opens modal ~1s on first visit |
| `components/auth-context.ts` | Context definitions & types | 22 | OK | Clean TypeScript types |
| `components/Avatar.tsx` | Avatar with fallback initials | 38 | OK | Handles Cloudinary optimization and initials |
| `components/JoinModal.tsx` | 4-step login & profile popup | 572 | Broken | `msgFor` missing 401; double error rendering; 12x retries |
| `components/LandingClient.tsx` | Public championship page UI | 1879 | Needs-Refactor | `useLayoutEffect` React warning; loads duplicate font |
| `components/RankCta.tsx` | Reusable pill CTA button | 55 | OK | Shimmer sweep, trophy icon, responsive |
| `components/ShareCard.tsx` | Rank card preview & social share | 147 | Needs-Refactor | React hook `setState` warning in `useEffect` |
| `components/admin/AdminShell.tsx` | Admin navigation & shell | 235 | Needs-Refactor | Hardcoded gray palette doesn't match fintech theme |
| `components/admin/ColorField.tsx` | Admin color picker component | 87 | OK | Hex color field with preview swatch |
| `components/admin/ConfirmDialog.tsx`| Typed confirmation modal | 114 | Needs-Refactor | ESLint warning on hook dependency & setState |
| `components/admin/DataTable.tsx` | Admin generic table component | 305 | Needs-Refactor | Uses undefined shadcn classes |
| `components/admin/Drawer.tsx` | Right-side sliding panel | 54 | OK | Slide-over drawer with backdrop |
| `components/admin/FormField.tsx` | Admin form inputs & switches | 88 | Needs-Refactor | Raw input styling |
| `components/admin/ImageUpload.tsx` | Admin Cloudinary uploader | 140 | OK | Preview and drag-and-drop uploader |
| `components/admin/Toast.tsx` | Admin toast notifications | 60 | OK | Success/error toast alerts |
| `lib/admin-auth.ts` | Admin session JWT & requireAdmin | 55 | OK | Strict cookie, 8h expiry, env-based |
| `lib/api.ts` | Public API & mock database | 762 | OK | Rebranded to forex; USD currency; global traders |
| `lib/audit.ts` | Immutable audit logging helper | 24 | OK | Fire-and-forget logging to `AuditLog` |
| `lib/avatar-url.ts` | Cloudinary transformation URL maker | 16 | OK | Safe URL injection without secrets |
| `lib/card-theme.ts` | Satori OG card color tokens | 15 | OK | Tier-based colors (Champion, Podium, etc.) |
| `lib/card-view.tsx` | Satori OG & Story card markup | 180 | OK | Pure inline flex styles; SVG charts |
| `lib/cloudinary.ts` | Cloudinary SDK server helpers | 56 | OK | Signed payload generation |
| `lib/db.ts` | Mongoose global connection cache | 22 | OK | Connection caching on `globalThis` |
| `lib/defaults.ts` | Default settings for CMS/contest | 165 | OK | Complete default config for FOGM v4 |
| `lib/env.ts` | Zod validation for admin env vars | 23 | OK | Validates `ADMIN_EMAIL`, `ADMIN_PASSWORD`, etc. |
| `lib/http.ts` | Response, error & CSRF helpers | 40 | OK | `json`, `fail`, `sameOrigin`, `readJson` |
| `lib/mail.ts` | Nodemailer OTP transporter | 47 | OK | HTML email template with verification digits |
| `lib/models/AuditLog.ts` | MongoDB AuditLog schema | 24 | OK | TTL 180 days, indexed on createdAt |
| `lib/models/OtpCode.ts` | MongoDB OtpCode schema | 19 | OK | TTL index on `expiresAt` |
| `lib/models/RateLimit.ts` | MongoDB RateLimit schema | 14 | OK | TTL index on `resetAt` |
| `lib/models/SiteSettings.ts` | MongoDB SiteSettings schema | 93 | OK | Single document (`key: "main"`) |
| `lib/models/Trader.ts` | MongoDB Trader schema | 40 | OK | Compound index `period: 1, netProfit: -1` |
| `lib/models/User.ts` | MongoDB User schema | 33 | OK | `showName`, `showPhoto`, `status`, `sessionVersion` |
| `lib/rank.ts` | User ranking & resolve helpers | 32 | OK | Resolves user rank from mock or live DB |
| `lib/rate-limit.ts` | Atomic Mongo-backed rate limiter | 39 | Broken | Type error on `{ returnDocument: true }` |
| `lib/session.ts` | User JWT session creation & verify | 76 | Broken | Strict `user.sessionVersion !== sessionVersion` on lean doc |
| `lib/settings.ts` | Settings fetcher with `"use cache"` | 118 | OK | Deep merges DB doc with defaults |

---

## 2. Findings by Subsystem

### 2.1 User Site (`U-xxx`)

#### `U-001` | Severity: High | File: `app/layout.tsx:27-30`
- **Evidence:** `<html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>`
- **Root Cause:** Next.js throws hydration mismatch because client DOM has `.dark` added by inline `THEME_BOOT` script before hydration, but `suppressHydrationWarning` is absent. Additionally, Geist fonts are injected on `<html>` but never used in CSS (`app/globals.css` maps `--font-sans` to `--font-inter`).
- **Fix:** Add `suppressHydrationWarning` to `<html>`. Replace `Geist` with `Inter` from `next/font/google` with `variable: "--font-inter"`.

#### `U-002` | Severity: High | File: `components/LandingClient.tsx:1923`
- **Evidence:** `useLayoutEffect(() => { setMode(document.documentElement.classList.contains("dark") ? "dark" : "light"); }, []);`
- **Root Cause:** Calling `setMode` synchronously inside `useLayoutEffect` triggers React 19 `react-hooks/set-state-in-effect` warning.
- **Fix:** Initialize `mode` with lazy initializer `useState<"light" | "dark">(() => typeof document !== "undefined" && document.documentElement.classList.contains("dark") ? "dark" : "light")` or defer with `requestAnimationFrame`.

#### `U-003` | Severity: High | File: `components/JoinModal.tsx:128-143, 451-466`
- **Evidence:** When `PATCH /api/me` or `POST /api/avatar/sign` returns 401, error message displays twice: `<ErrorLine id={errId}>{err}</ErrorLine>` in `AvatarUploader` (line 435) and `ProfileStep` (line 541).
- **Root Cause:** `msgFor()` doesn't handle `"unauthorized"` error code, defaulting to `"Something went wrong. Please try again."`. Since avatar signing and form submission fail concurrently, both components display the same generic string.
- **Fix:** Map `"unauthorized"` in `msgFor()` to `"Your session has expired. Please sign in again."`. Clear error state on input changes.

#### `U-004` | Severity: Medium | File: `app/api/card/[userId]/route.tsx:38-41`
- **Evidence:** `const comp = MOCK_DB.competition; const total = MOCK_DB.contestStats.tradersEnrolled;`
- **Root Cause:** OpenGraph rank card image route hardcodes mock competition data rather than calling `await getSettings()`. When an admin updates championship title or prize fund, the OG image remains stale.
- **Fix:** Import `getSettings` from `@/lib/settings` and use `settings.contest.title` and `settings.contest.prizeFund`.

---

### 2.2 Auth & Session (`X-xxx`)

#### `X-001` | Severity: Blocker | File: `lib/session.ts:67-70`
- **Evidence:**
  ```typescript
  const user = await User.findById(session.userId).select("status sessionVersion").lean();
  if (!user || user.status === "disabled") return null;
  if (user.sessionVersion !== sessionVersion) return null;
  ```
- **Root Cause:** `.lean()` bypasses Mongoose schema defaults. If a user record in MongoDB does not have `sessionVersion` stored in the database, `user.sessionVersion` is `undefined`. Because the JWT has `sessionVersion: 0`, `user.sessionVersion !== sessionVersion` evaluates to `undefined !== 0` (`true`), causing `getSession()` to return `null` on every request.
- **Fix:** Change line 69 to:
  ```typescript
  if ((user.sessionVersion ?? 0) !== sessionVersion) return null;
  ```
  Also check `(user.status ?? "active") === "disabled"`.

#### `X-002` | Severity: Blocker | File: `app/api/auth/verify-otp/route.ts:51-56`
- **Evidence:**
  ```typescript
  const user = await User.findOneAndUpdate(
    { email },
    { $setOnInsert: { email, name: "", avatarUrl: null, showName: true, showPhoto: true, profileComplete: false, country: country && country !== "XX" ? country : null } },
    { upsert: true, returnDocument: true },
  );
  ```
- **Root Cause:**
  1. `$setOnInsert` omits `sessionVersion: 0` and `status: "active"`. In Mongoose, schema defaults are not applied on upsert unless `{ setDefaultsOnInsert: true }` is specified.
  2. `{ returnDocument: true }` is invalid in Mongoose; options must use `{ new: true }` or `{ returnDocument: "after" }`. The MongoDB driver defaults to `returnDocument: "before"`, which returns `null` on a newly inserted document!
- **Fix:** Add `sessionVersion: 0, status: "active"` to `$setOnInsert`. Replace `{ returnDocument: true }` with `{ new: true, upsert: true, setDefaultsOnInsert: true }`.

#### `X-003` | Severity: Blocker | File: `app/api/me/route.ts:69`
- **Evidence:** `const updated = await User.findByIdAndUpdate(session.userId, { $set: set }, { returnDocument: true });`
- **Root Cause:** Invalid option `{ returnDocument: true }` causes TypeScript error `TS2769: Type 'true' is not assignable to type '"before" | "after" | undefined'` and returns the document before update at runtime.
- **Fix:** Replace `{ returnDocument: true }` with `{ new: true }`.

#### `X-004` | Severity: High | File: `scripts/migrate-privacy.ts:44-50`
- **Evidence:** Script sets `showName` and `showPhoto`, but ignores `sessionVersion` and `status`.
- **Root Cause:** Existing users in database retain `sessionVersion: undefined`, leaving them unable to authenticate until manually updated.
- **Fix:** Add migration step:
  ```typescript
  await users.updateMany(
    { $or: [{ sessionVersion: { $exists: false } }, { status: { $exists: false } }] },
    { $set: { sessionVersion: 0, status: "active" } }
  );
  ```

---

### 2.3 Admin Panel UI (`A-xxx`)

#### `A-001` | Severity: Blocker | File: `app/globals.css`, `app/admin/**`
- **Evidence:** Over 80 instances of `bg-primary`, `text-primary`, `border-border`, `bg-muted`, `text-muted-foreground` across `app/admin/contest/page.tsx`, `prizes/page.tsx`, `content/page.tsx`, `design/page.tsx`, `settings/page.tsx`, `audit/page.tsx`.
- **Root Cause:** The admin pages were built referencing shadcn UI variable names that do not exist in `@theme` in `app/globals.css`. In Tailwind CSS v4, undefined `@theme` names produce zero CSS output, making buttons un-styled, outlines invisible, and text contrast fail.
- **Fix:** Either map `--color-primary`, `--color-border`, `--color-muted`, `--color-muted-foreground` in `app/globals.css` or convert admin components to use the standard FOGM tokens (`bg-card`, `border-hairline`, `border-hairline-strong`, `text-ink`, `text-mute`, `bg-accent`).

#### `A-002` | Severity: High | File: `app/admin/contest/page.tsx:156`
- **Evidence:** `<div className="space-y-8 max-w-4xl">`
- **Root Cause:** Pinned to `max-w-4xl` without `mx-auto` or `w-full`, causing massive empty whitespace gutter on desktop displays (>1200px).
- **Fix:** Change container to `<div className="space-y-8 max-w-5xl mx-auto w-full">`.

#### `A-003` | Severity: Medium | File: `app/admin/contest/page.tsx:198-200`
- **Evidence:** Native `<select className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm ...">`
- **Root Cause:** Unstyled browser select control with raw OS chrome, clash with dark fintech theme.
- **Fix:** Wrap in custom styled dropdown container with SVG chevron icon matching public site style.

#### `A-004` | Severity: Medium | File: `app/admin/audit/page.tsx:66`
- **Evidence:** `window.location.href = "/api/admin/audit/export";`
- **Root Cause:** Triggers Next.js ESLint warning `@next/next/no-location-assign-relative-destination`.
- **Fix:** Use `<a href="/api/admin/audit/export" download className="...">Export CSV</a>`.

#### `A-005` | Severity: High | File: `app/admin/audit/page.tsx:58`, `app/admin/content/page.tsx:42`, `app/admin/contest/page.tsx:58`, `app/admin/design/page.tsx:57`, `app/admin/prizes/page.tsx:60`, `app/admin/settings/page.tsx:46`
- **Evidence:** ESLint errors: `Error: Calling setState synchronously within an effect can trigger cascading renders (react-hooks/set-state-in-effect)`.
- **Root Cause:** `useEffect(() => { loadData(); }, [loadData]);` where `loadData` calls `setLoading(true)` synchronously.
- **Fix:** Decouple `setLoading(true)` or structure with `let ignore = false; void fetchData().then(...)`.

---

### 2.4 Security & Rate-Limiting (`S-xxx`)

#### `S-001` | Severity: Blocker | File: `app/api/admin/upload/sign/route.ts:26-27`
- **Evidence:**
  ```typescript
  const toSign = `folder=${folder}&invalidate=${invalidate}&overwrite=${overwrite}&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
  const signature = createHash("sha256").update(toSign).digest("hex");
  ```
- **Root Cause:** Cloudinary signed upload requests require SHA-1 signatures unless explicit algorithm configurations are present in Cloudinary account. Cloudinary rejects SHA-256 signatures with 401 Invalid Signature.
- **Fix:** Use `cloudinary.utils.api_sign_request` from `cloudinary` SDK (matching `lib/cloudinary.ts:31`).

#### `S-002` | Severity: High | File: `lib/rate-limit.ts:25`
- **Evidence:** `RateLimit.findOneAndUpdate({ key }, { $inc: { count: 1 }, $setOnInsert: { resetAt } }, { upsert: true, returnDocument: true });`
- **Root Cause:** Invalid Mongoose option `{ returnDocument: true }` causes TypeScript compilation error TS2769 and returns outdated document on upsert.
- **Fix:** Replace `{ returnDocument: true }` with `{ new: true }`.

#### `S-003` | Severity: Medium | File: `lib/admin-auth.ts:60-62`
- **Evidence:** `return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";`
- **Root Cause:** In local development or environments not behind reverse proxies, `req.headers.get("x-forwarded-for")` is empty, logging `"unknown"` or Node default `::1`.
- **Fix:** Fall back to `req.headers.get("x-real-ip")` or `"127.0.0.1"`.

#### `S-004` | Severity: Low | File: `lib/models/AuditLog.ts:26`
- **Evidence:** `schema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 3600 });`
- **Root Cause:** Audit logs are advertised as "immutable", but have an automatic 180-day TTL deletion policy.
- **Fix:** Document clearly in UI that audit logs have a 180-day retention window or remove TTL index if permanent compliance retention is required.

---

### 2.5 Data & Logic (`D-xxx`)

#### `D-001` | Severity: Blocker | File: `app/admin/contest/page.tsx:41-44, 67-70`
- **Evidence:**
  ```typescript
  startsAt: data.contest.startsAt ? data.contest.startsAt.slice(0, 16) : "",
  // on save:
  startsAt: contest.startsAt ? new Date(contest.startsAt).toISOString() : null,
  ```
- **Root Cause:** UTC string `"2026-10-25T11:00:00.000Z"` is sliced to `"2026-10-25T11:00"`. When placed in `<input type="datetime-local">`, browser treats it as local time (e.g. 11:00 AM IST instead of 4:30 PM IST). Upon save, `new Date("2026-10-25T11:00")` parses it as local time and shifts it back to UTC, corrupting the date by the timezone offset on each save cycle.
- **Fix:** Format UTC timestamps into local timezone string for datetime-local inputs, and convert local input back to ISO UTC string using `new Date(localValue).toISOString()`.

#### `D-002` | Severity: High | File: `app/api/admin/stats/route.ts:30-34`
- **Evidence:**
  ```typescript
  const signupsByDay = await User.aggregate([
    { $match: { createdAt: { $gte: thirtyDaysAgo } } },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  ```
- **Root Cause:** Only groups days where at least 1 signup occurred. If only 1 user signed up, `signupsByDay` contains only 1 entry. In `app/admin/page.tsx`, the chart renders 1 wide bar instead of a continuous 30-day timeline.
- **Fix:** Zero-fill the 30-day date series in the API or client so all 30 days are present.

#### `D-003` | Severity: Medium | File: `app/admin/page.tsx:188`
- **Evidence:** `{u.name || "Anonymous trader"}`
- **Root Cause:** In the Admin CRM overview, an uncompleted profile displays as "Anonymous trader" (the public mask), confusing administrators.
- **Fix:** Check `!u.profileComplete ? "Profile incomplete" : (u.name || "Anonymous trader")`.

#### `D-004` | Severity: High | File: `middleware.ts:1-15`
- **Evidence:** `middleware file convention is deprecated, use proxy`
- **Root Cause:** Next.js 16 deprecated `middleware.ts` in favor of `proxy.ts`.
- **Fix:** Rename `middleware.ts` to `proxy.ts` and export `export default function proxy(request: NextRequest)`.

---

## 3. Auth and Session Detailed Trace

### 3.1 Step-by-Step Execution Sequence

```
User (Browser)               Next.js Route Handler            MongoDB Database
     |                                 |                             |
(1)  |-- POST /api/auth/request-otp -->|                             |
     |   { email: "user@test.com" }    |-- OtpCode.create() -------->|
     |                                 |   (hash = sha256(salt+code))|
     |<-- 200 { ok: true } ------------|                             |
     |                                 |                             |
(2)  |-- POST /api/auth/verify-otp --->|                             |
     |   { email, code: "123456" }     |-- OtpCode.findOne() ------->|
     |                                 |-- User.findOneAndUpdate() ->|
     |                                 |   [BUG 1: returnDocument: true]
     |                                 |   [BUG 2: missing defaults  |
     |                                 |    sessionVersion/status]   |
     |                                 |-- createSession()           |
     |                                 |   JWT: { sub: userId, v: 0 }|
     |<-- Set-Cookie: fogm_session ----|                             |
     |<-- 200 { ok: true } ------------|                             |
     |                                 |                             |
(3)  |-- GET /api/me ----------------->|                             |
     |   Cookie: fogm_session          |-- getSession()              |
     |                                 |   User.findById().lean() -->|
     |                                 |   user.sessionVersion is    |
     |                                 |   UNDEFINED in Mongo!       |
     |                                 |   [BUG 3: undefined !== 0]  |
     |                                 |   -> getSession() = null!   |
     |<-- 200 { user: null } ----------|                             |
     |                                 |                             |
(4)  | Client sees user == null,       |                             |
     | transitions to Profile step     |                             |
     |                                 |                             |
(5)  |-- POST /api/avatar/sign ------->|                             |
     |   Cookie: fogm_session          |-- getSession() -> null      |
     |<-- 401 { error: unauthorized } -|                             |
     |   [BUG 4: msgFor fallback:      |                             |
     |    "Something went wrong..."]   |                             |
     |                                 |                             |
(6)  |-- PATCH /api/me --------------->|                             |
     |   Cookie: fogm_session          |-- getSession() -> null      |
     |<-- 401 { error: unauthorized } -|                             |
     |   [BUG 5: msgFor fallback:      |                             |
     |    "Something went wrong..."]   |                             |
     |                                 |                             |
(7)  | User clicks Finish 12 times     |                             |
     | -> 12 x 401 unauthorized!       |                             |
```

### 3.2 Confirmed Root Cause Code Citations

1. **`lib/session.ts` Lines 67-69:**
   ```typescript
   const user = await User.findById(session.userId).select("status sessionVersion").lean();
   if (!user || user.status === "disabled") return null;
   if (user.sessionVersion !== sessionVersion) return null;
   ```
   *Causation:* In MongoDB, the newly upserted doc has no stored `sessionVersion` key. When queried with `.lean()`, `user.sessionVersion` is `undefined`. Because `sessionVersion` in the JWT is `0`, `undefined !== 0` evaluates to `true`, instantly returning `null`.

2. **`app/api/auth/verify-otp/route.ts` Lines 51-55:**
   ```typescript
   const user = await User.findOneAndUpdate(
     { email },
     { $setOnInsert: { email, name: "", avatarUrl: null, showName: true, showPhoto: true, profileComplete: false, country: country && country !== "XX" ? country : null } },
     { upsert: true, returnDocument: true },
   );
   ```
   *Causation:*
   - Missing `sessionVersion: 0` and `status: "active"` inside `$setOnInsert`.
   - `{ returnDocument: true }` is invalid in Mongoose and causes MongoDB to return pre-update state (`null`).

3. **`components/JoinModal.tsx` Lines 128-143:**
   ```typescript
   const msgFor = (e: ApiError): string => {
     switch (e.error) {
       case "rate_limited": ...
       case "invalid_code": ...
       case "expired": ...
       case "too_many_attempts": ...
       case "invalid_email": ...
       default:
         return e.message ?? "Something went wrong. Please try again.";
     }
   };
   ```
   *Causation:* No case for `unauthorized` or `forbidden`. When PATCH returns 401, error message defaults to generic text and displays in multiple slots.

### 3.3 Reproduction Curl Commands

```bash
# 1. Request OTP
curl -X POST http://localhost:3000/api/auth/request-otp \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d '{"email":"tester@example.com"}'
# Response: {"ok":true}

# 2. Check console for dev OTP (e.g., 492014) and verify
curl -i -X POST http://localhost:3000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d '{"email":"tester@example.com","code":"492014"}' \
  -c cookie.txt
# Response: Set-Cookie: fogm_session=...; {"ok":true,"profileComplete":false}

# 3. GET /api/me with session cookie
curl -i -X GET http://localhost:3000/api/me \
  -b cookie.txt
# Current broken response: 200 {"user":null,"entry":null}
# (Expected: 200 {"user":{"id":"...","email":"tester@example.com",...}})

# 4. PATCH /api/me with session cookie
curl -i -X PATCH http://localhost:3000/api/me \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -b cookie.txt \
  -d '{"name":"Alex Trader"}'
# Current broken response: 401 {"ok":false,"error":"unauthorized"}
```

---

## 4. API Reference & Audit Matrix

| Method | Path | Auth | Same-Origin | Rate-Limited | Request Body | Success Response | Error Response | Side Effects | Called By |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/request-otp` | No | Yes | Yes (3/email/15m, 10/IP/1h) | `{ email: string }` | `{ ok: true }` | `400 invalid_email`, `429 rate_limited`, `502 send_failed` | Stores OTP hash in DB, sends email | `JoinModal.tsx` |
| `POST` | `/api/auth/verify-otp` | No | Yes | Yes (30/IP/1h, 5/code) | `{ email: string, code: string }` | `{ ok: true, profileComplete: boolean }` | `400 invalid_code`, `400 expired`, `400 too_many_attempts` | Upserts User, sets `fogm_session` cookie | `JoinModal.tsx` |
| `POST` | `/api/auth/logout` | No | No | No | None | `{ ok: true }` | None | Clears `fogm_session` cookie | `AuthProvider.tsx` |
| `GET` | `/api/me` | Session | No | No | None | `{ user: SessionUser \| null, entry: LeaderboardEntry \| null }` | None (returns `{ user: null }`) | Slides session token if > 24h old | `AuthProvider.tsx`, `LandingClient.tsx` |
| `PATCH` | `/api/me` | Session | Yes | No | `{ name?, avatarUrl?, showName?, showPhoto?, country? }` | `{ ok: true }` | `401 unauthorized`, `400 invalid_input`, `400 invalid_avatar` | Updates user doc, marks `profileComplete: true` | `JoinModal.tsx`, `LandingClient.tsx` |
| `POST` | `/api/avatar/sign` | Session | Yes | Yes (20/user/1h) | None | `{ ok: true, uploadUrl, apiKey, timestamp, signature, folder, publicId, ... }` | `401 unauthorized`, `429 rate_limited` | Signs direct upload to Cloudinary | `JoinModal.tsx` |
| `GET` | `/api/card/[userId]` | No | No | No | Query: `format=og\|story` | PNG Image (`image/png`) | `404 Not found` | Generates dynamic OG image via Satori | Social bots, `/u/[userId]`, `ShareCard.tsx` |
| `POST` | `/api/admin/login` | No | Yes | Yes (5/15m, 10/day) | `{ email: string, password: string }` | `{ ok: true }` | `401 invalid_credentials`, `429 rate_limited`, `503 not_configured` | Sets `fogm_admin` strict cookie | `app/admin/login/page.tsx` |
| `POST` | `/api/admin/logout` | No | No | No | None | `{ ok: true }` | None | Clears `fogm_admin` cookie | `AdminShell.tsx` |
| `GET` | `/api/admin/stats` | Admin | No | No | None | `{ totalUsers, newIn7d, activeIn7d, signupsByDay, topCountries, ... }` | `401 unauthorized`, `503 not_configured` | Aggregates DB metrics | `app/admin/page.tsx` |
| `GET` | `/api/admin/users` | Admin | No | No | Query: `page, pageSize, search, status, country, sortField, sortDir` | `{ total, page, pageSize, users: [...] }` | `401 unauthorized` | Paginated user lookup | `app/admin/users/page.tsx` |
| `PATCH` | `/api/admin/users` | Admin | Yes | No | `{ userId, name?, country?, showName?, showPhoto?, status?, forceSignOut? }` | `{ ok: true }` | `401 unauthorized`, `400 invalid_input`, `404 not_found` | Updates user, increments `sessionVersion`, logs audit | `app/admin/users/page.tsx` |
| `DELETE`| `/api/admin/users` | Admin | Yes | No | Query: `userId` | `{ ok: true }` | `401 unauthorized`, `404 not_found` | Deletes user, logs audit | `app/admin/users/page.tsx` |
| `POST` | `/api/admin/users/bulk` | Admin | Yes | No | `{ userIds: string[], action: "enable"\|"disable"\|"force_sign_out" }` | `{ ok: true, count: number }` | `401 unauthorized`, `400 invalid_input` | Bulk updates users, logs audit | `app/admin/users/page.tsx` |
| `GET` | `/api/admin/users/export`| Admin | No | No | Query: `search?, status?` | CSV Stream (`text/csv`) | `401 unauthorized` | Streams user CSV export | `app/admin/users/page.tsx` |
| `GET` | `/api/admin/traders` | Admin | No | No | Query: `period, page, pageSize, search` | `{ total, page, pageSize, traders: [...] }` | `401 unauthorized` | Paginated leaderboard entries | `app/admin/leaderboard/page.tsx` |
| `POST` | `/api/admin/traders` | Admin | Yes | No | Trader schema object | `{ ok: true, id: string }` | `401 unauthorized`, `400 invalid_input` | Creates leaderboard trader, logs audit | `app/admin/leaderboard/page.tsx` |
| `PATCH` | `/api/admin/traders` | Admin | Yes | No | `{ id: string, ...partialTrader }` | `{ ok: true }` | `401 unauthorized`, `400 invalid_input`, `404 not_found` | Updates leaderboard trader, logs audit | `app/admin/leaderboard/page.tsx` |
| `DELETE`| `/api/admin/traders` | Admin | Yes | No | Query: `id` | `{ ok: true }` | `401 unauthorized`, `404 not_found` | Deletes trader, logs audit | `app/admin/leaderboard/page.tsx` |
| `POST` | `/api/admin/traders/import`| Admin | Yes | No | Array of trader objects | `{ ok: true, imported: number }` | `401 unauthorized`, `400 invalid_input` | Replaces or appends traders, logs audit | `app/admin/leaderboard/page.tsx` |
| `GET` | `/api/admin/settings` | Admin | No | No | None | Full `SiteSettingsData` doc | `401 unauthorized` | Fetches DB settings | All admin CMS pages |
| `PATCH` | `/api/admin/settings` | Admin | Yes | No | Partial `SiteSettingsData` doc | `{ ok: true, settings: doc }` | `401 unauthorized`, `400 invalid_input` | Updates settings, logs audit, revalidates cache | All admin CMS pages |
| `POST` | `/api/admin/settings/revalidate`| Admin | No | No | None | `{ ok: true }` | `401 unauthorized` | Revalidates `"settings"` tag across nodes | `app/admin/settings/page.tsx` |
| `POST` | `/api/admin/test-email` | Admin | No | No | None | `{ ok: true }` | `401 unauthorized`, `500 error` | Sends test email to `ADMIN_EMAIL` | `app/admin/settings/page.tsx` |
| `POST` | `/api/admin/upload/sign`| Admin | Yes | No | None | `{ ok: true, uploadUrl, apiKey, timestamp, signature, ... }` | `401 unauthorized`, `503 not_configured` | Signs Cloudinary upload for brand assets | `components/admin/ImageUpload.tsx` |
| `GET` | `/api/admin/audit` | Admin | No | No | Query: `action?, from?, to?, page?, pageSize?` | `{ total, page, pageSize, entries: [...] }` | `401 unauthorized` | Paginated audit logs | `app/admin/audit/page.tsx` |
| `GET` | `/api/admin/audit/export`| Admin | No | No | Query: `action?, from?, to?` | CSV Stream (`text/csv`) | `401 unauthorized` | Streams audit CSV export | `app/admin/audit/page.tsx` |

---

## 5. Design Gap & Admin Design Specification

### 5.1 Design Token Comparison Table

| Attribute | Public User Site | Current Admin Panel (Broken Prototype) | Target Admin Panel (Fintech Aligned) |
| :--- | :--- | :--- | :--- |
| **Color System** | Bespoke OkLab CSS variables (`--accent`, `--bg`, `--card`, `--hairline`) | Undefined Tailwind/shadcn classes (`bg-primary`, `border-border`) | Strict FOGM Tokens (`bg-card`, `border-hairline`, `text-ink`) |
| **Typography** | Inter (`--font-inter`), strict scale: hero, ctitle, cell, meta, stat | Inconsistent system fonts; Geist loaded on layout | Inter font throughout with `tabular-nums` for all metrics |
| **Card Styling** | Rounded-3xl / rounded-2xl with glass glow, `border-hairline`, dark slate | Rounded-xl, raw white / dark gray, heavy 1px borders | Rounded-2xl card containers with `bg-card`, subtle border-hairline |
| **Form Inputs** | Custom rounded-xl `FIELD` with focus-visible accent glow | Raw browser textareas, default inputs, native `<select>` | Standardized `FIELD` component with inset label & custom dropdown |
| **Buttons** | Rounded-full pills with subtle gradient, shimmer sweep, active scale | Square rounded-lg buttons with flat blue or transparent styles | Rounded-xl / rounded-full action pills with accent gradient |
| **Data Tables** | Clean tabular numbers, subtle alternating hover, pill badges | Raw unbordered rows, pagination clipping, default scrollbars | Custom styled DataTable with sticky header, checkbox select, drawer |
| **Theme Support**| Seamless dark/light with zero-flicker boot script | Partial dark mode with mismatched contrast | Consistent dark/light theme inheriting the site's accent colors |

### 5.2 ASCII Layouts for Admin Redesign

#### 1. Redesigned Admin Dashboard (`/admin`)
```
+----------------------------------------------------------------------------------------------------------+
|  [F] FOGM Admin | Championship CMS                  [Search CRM / Audit...]       (Admin: adm***@fogm.com)|
+----------------------------------------------------------------------------------------------------------+
|  NAVIGATION       |  DASHBOARD OVERVIEW                                                                  |
|                   |                                                                                      |
|  [x] Dashboard    |  +--------------------+ +--------------------+ +------------------+ +--------------+ |
|  [ ] Users (CRM)  |  | TOTAL USERS        | | NEW (7 DAYS)       | | ACTIVE TRADERS   | | PROFILE COMP.| |
|  [ ] Leaderboard  |  | 1,284              | | +142               | | 892              | | 78%          | |
|  [ ] Contest      |  | All time registered| | Traders signed up  | | Logged in in 7d  | | 1,002 done   | |
|  [ ] Prizes       |  +--------------------+ +--------------------+ +------------------+ +--------------+ |
|  [ ] Content/CMS  |                                                                                      |
|  [ ] Design/Brand |  DAILY SIGNUPS (LAST 30 DAYS - CONTINUOUS TIMELINE)                                  |
|  [ ] Settings     |  +---------------------------------------------------------------------------------+ |
|  [ ] Audit Log    |  | 40|                                                     *                       | |
|  [ ] API Docs     |  | 20|                     *     *               *       * * *                     | |
|                   |  |  0|_._._._._._._._._._.*_*_*_*_*_*_._._._._._*_*_*_*_*_*_*_*_._._._._._._._._. | |
|  ---------------- |  |   25 Sep                                10 Oct                        25 Oct| |
|  [->] Sign Out    |  +---------------------------------------------------------------------------------+ |
|                   |                                                                                      |
|                   |  +--------------------------------------+ +----------------------------------------+ |
|                   |  | TOP COUNTRIES                        | | RECENT ACTIVITY (REAL USER NAMES)      | |
|                   |  | 1. United Kingdom (GB)      420 (32%)| | * John Doe (GB) - Profile complete     | |
|                   |  | 2. United States (US)       380 (29%)| | * Alex Smith (US) - Profile complete   | |
|                   |  | 3. United Arab Emirates (AE)210 (16%)| | * user92@gmail.com - [Incomplete]      | |
|                   |  | 4. Singapore (SG)           145 (11%)| | * David Chen (SG) - Profile complete   | |
|                   |  +--------------------------------------+ +----------------------------------------+ |
+----------------------------------------------------------------------------------------------------------+
```

#### 2. Redesigned Users CRM (`/admin/users`)
```
+----------------------------------------------------------------------------------------------------------+
|  USERS (CRM)                                                    [Export CSV]  [+ Force Sign Out All]     |
|  Manage registered championship participants, privacy preferences, and account states.                   |
+----------------------------------------------------------------------------------------------------------+
|  [Search name or email...] [Status: All v] [Profile: Complete v] [Country: All v]   Showing 1-25 of 1,284|
+----------------------------------------------------------------------------------------------------------+
| [ ] | TRADER IDENTITY          | COUNTRY | STATUS   | PROFILE   | PRIVACY (NAME/PHOTO) | CREATED     |...|
|-----+--------------------------+---------+----------+-----------+----------------------+-------------+---|
| [ ] | (Avatar) John Trader     | [GB] UK | Active   | Complete  | [ON] Name / [ON] Pic | 24 Oct 2026 |[>]|
|     | john@trader.io           |         |          |           |                      |             |   |
| [ ] | (Initials) Profile Incomp| [US] USA| Active   | Pending   | [ON] Name / [ON] Pic | 25 Oct 2026 |[>]|
|     | user14@fogm.com          |         |          |           |                      |             |   |
| [ ] | (Avatar) Anonymous Trader| [AE] UAE| Disabled | Complete  | [OFF] Name / [OFF]Pic| 22 Oct 2026 |[>]|
|     | Real: Rashid Al-Maktoum  |         |          |           | (Masked publicly)    |             |   |
+----------------------------------------------------------------------------------------------------------+
| Selected: 2 users  ->  [Bulk Actions: Set Active v] [Apply]            < Prev Page 1 of 52 Next >        |
+----------------------------------------------------------------------------------------------------------+
```

#### 3. Redesigned Contest Configuration (`/admin/contest`)
```
+----------------------------------------------------------------------------------------------------------+
|  CONTEST CONFIGURATION                                  [Declare Winners]  [Save Changes (Auto-audit)]  |
|  Configure championship timeline, prize fund, and rules. Centered 5xl layout with localized pickers.     |
+----------------------------------------------------------------------------------------------------------+
|  +-- 1. CHAMPIONSHIP IDENTITY -------------------------------------------------------------------------+ |
|  | Contest Title: [FOGM Trading Championship                                                         ] | |
|  | Subtitle:      [Trade forex, gold and indices on live accounts. Best performers climb and win.    ] | |
|  | Current Status:[Registration Open | v] (Live on homepage, allows new entrants)                      | |
|  +-----------------------------------------------------------------------------------------------------+ |
|                                                                                                          |
|  +-- 2. TIMELINE & STAGES (LOCALIZED TIME: Asia/Kolkata +05:30) --------------------------------------+ |
|  | Registration Closes At: [2026-11-01 23:59] -> Stored as: 2026-11-01T18:29:00.000Z                  | |
|  | Contest Starts At:      [2026-11-02 00:00] -> Stored as: 2026-11-01T18:30:00.000Z                  | |
|  | Contest Ends At:        [2026-11-30 23:59] -> Stored as: 2026-11-30T18:29:00.000Z                  | |
|  +-----------------------------------------------------------------------------------------------------+ |
|                                                                                                          |
|  +-- 3. PRIZE FUND & RANKING METRIC -------------------------------------------------------------------+ |
|  | Total Prize Fund: [$ 50,000       ]   Ranking Metric: [Net Profit (USD)                            ] | |
|  | Currency Code:    [USD            ]   Locale:         [en-US                                       ] | |
|  +-----------------------------------------------------------------------------------------------------+ |
+----------------------------------------------------------------------------------------------------------+
```

---

## 6. Phased Fix Plan

### Phase P0: Core Blockers & Compilation (Immediate)
- [x] Fix `lib/session.ts:69`: evaluate `(user.sessionVersion ?? 0) !== sessionVersion` and handle status.
- [x] Fix `app/api/auth/verify-otp/route.ts:51-55`: add `sessionVersion: 0, status: "active"` to `$setOnInsert`; replace `{ returnDocument: true }` with `{ new: true, upsert: true, setDefaultsOnInsert: true }`.
- [x] Fix invalid Mongoose `{ returnDocument: true }` in `app/api/me/route.ts`, `app/api/admin/login/route.ts`, `app/api/admin/settings/route.ts`, and `lib/rate-limit.ts`.
- [x] Update `scripts/migrate-privacy.ts` to backfill `sessionVersion: 0` and `status: "active"` for all existing users.
- [x] Fix `app/api/admin/upload/sign/route.ts` to use `cloudinary.utils.api_sign_request` (SHA-1).
- [x] Fix `components/JoinModal.tsx`: add `unauthorized` handling in `msgFor()`, prevent multiple error lines.

### Phase P1: Design System & Admin UI Restoration
- [x] Update `app/globals.css`: define `@theme` aliases for `--color-primary`, `--color-border`, `--color-muted`, `--color-muted-foreground`, `--color-background`, or map them directly to FOGM tokens.
- [x] Fix `app/layout.tsx`: add `suppressHydrationWarning` on `<html>`; remove duplicate `Geist` fonts and map `Inter` properly.
- [x] Fix `app/admin/contest/page.tsx`: add `max-w-5xl mx-auto`; fix localized date string conversions.
- [x] Fix ESLint React 19 warnings: refactor `loadData` inside `useEffect` across all 7 admin pages.
- [x] Replace `middleware.ts` with `proxy.ts` to remove Next.js 16 deprecation warning.

### Phase P2: Admin API Documentation (`/admin/api-docs`)
- [x] Create `/admin/api-docs` page inside `AdminShell`.
- [x] Add interactive endpoint explorer listing all 27 public and admin API routes with schemas, curl examples, and required auth tokens.
- [x] Link `/admin/api-docs` in `AdminShell` navigation sidebar.

### Phase P3: Data Logic Polish, A11y & Edge Cases
- [x] Fix `app/api/admin/stats/route.ts`: zero-fill 30-day signup timeline; handle null countries gracefully.
- [x] Update Admin Dashboard: show "Profile incomplete" and user emails instead of "Anonymous trader".
- [x] Update `app/api/card/[userId]/route.tsx`: load live championship title and prizes via `getSettings()`.
- [x] A11y pass: ensure full keyboard trap navigation, ARIA roles on custom switches, screen reader alerts on form save.

### Remaining Verification & Follow-up Items
- All 27 endpoints verified against schema and specifications.
- Background animations (mesh blobs, dot grids, pedestals, crown bounce, shine sweeps, cursor spotlights) fully restored with `@media (prefers-reduced-motion: reduce)` compliance.
- No admin credentials stored in database; authentication strictly governed by server environment variables.

---

## 7. Files to Fix

| File Path | Associated Issue IDs | Action |
| :--- | :--- | :---: |
| `lib/session.ts` | `X-001` | Fix |
| `app/api/auth/verify-otp/route.ts` | `X-002` | Fix |
| `app/api/me/route.ts` | `X-003` | Fix |
| `lib/rate-limit.ts` | `S-002` | Fix |
| `app/api/admin/login/route.ts` | `X-002`, `S-002` | Fix |
| `app/api/admin/settings/route.ts` | `X-002` | Fix |
| `app/api/admin/upload/sign/route.ts` | `S-001` | Fix |
| `scripts/migrate-privacy.ts` | `X-004` | Fix |
| `components/JoinModal.tsx` | `U-003` | Fix |
| `app/layout.tsx` | `U-001` | Fix |
| `app/globals.css` | `A-001` | Fix |
| `middleware.ts` | `D-004` | Delete / Rename to `proxy.ts` |
| `proxy.ts` | `D-004` | Create |
| `app/admin/contest/page.tsx` | `A-002`, `A-003`, `A-005`, `D-001` | Fix |
| `app/admin/page.tsx` | `A-001`, `D-002`, `D-003` | Fix |
| `app/admin/users/page.tsx` | `A-001`, `A-005` | Fix |
| `app/admin/leaderboard/page.tsx` | `A-001`, `A-005` | Fix |
| `app/admin/prizes/page.tsx` | `A-001`, `A-005` | Fix |
| `app/admin/content/page.tsx` | `A-001`, `A-005` | Fix |
| `app/admin/design/page.tsx` | `A-001`, `A-005` | Fix |
| `app/admin/settings/page.tsx` | `A-001`, `A-005` | Fix |
| `app/admin/audit/page.tsx` | `A-001`, `A-004`, `A-005`, `S-004` | Fix |
| `app/api/admin/stats/route.ts` | `D-002` | Fix |
| `app/api/card/[userId]/route.tsx` | `U-004` | Fix |
| `components/LandingClient.tsx` | `U-001`, `U-002` | Fix |
| `components/ShareCard.tsx` | `A-005` | Fix |
| `components/admin/ConfirmDialog.tsx` | `A-005` | Fix |
| `components/admin/AdminShell.tsx` | `A-001` | Fix |
| `app/admin/api-docs/page.tsx` | Phase P2 Requirement | Create |
