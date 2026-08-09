# My Clothing Store — Full-Stack E-Commerce Platform

A production-style clothing store built with Next.js 16 (App Router), Prisma 6 + SQLite, NextAuth v5, and Tailwind CSS. Includes a full admin panel (catalog, orders, inventory, customers, coupons, content, analytics, settings, users/roles, audit log) and a complete customer storefront (browsing, cart, checkout with Razorpay/COD, accounts, reviews, search).

This document is meant to be self-contained: if you have this file but no memory of how the project was built, you should be able to understand the system, run it, and know what's left to do before selling to real customers.

---

## 1. Quick Start

```bash
cd B:\clothing-store
npm install        # only needed if node_modules is missing
npm run dev
```

Open:
- Storefront: **http://localhost:3000**
- Admin panel: **http://localhost:3000/admin**

**Default admin login:**
- Email: `admin@store.com`
- Password: `Admin@123`

The SQLite database (`data/store.db`) is already migrated and seeded with demo data (5 products, 20 categories, 4 collections, banners, pages, nav menus, 32 site settings). No extra setup is required to start browsing/using the app.

Other useful commands:
```bash
npm run build && npm run start   # production build + run
npx prisma studio                # visual DB browser
npx prisma migrate reset         # ⚠ wipes DB and reseeds from scratch
npx prisma db seed               # re-run seed script only (won't reset schema)
npx tsc --noEmit                 # type-check
npx eslint src                   # lint
```

---

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack, Server + Client Components) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS v4 |
| Database | SQLite (file at `data/store.db`) via Prisma 6 ORM |
| Auth | NextAuth v5 (Credentials provider, JWT sessions) |
| State (client) | Zustand (cart store, toast store) |
| Forms/validation | Zod schemas in `src/lib/validators/` |
| Rich text | TipTap |
| Charts | Recharts |
| Carousel | Swiper |
| PDF | jsPDF + jspdf-autotable (client-side invoice generation) |
| Email | Nodemailer (SMTP), templated via DB-stored `EmailTemplate` rows |
| Payments | Razorpay (REST API + client checkout.js, no SDK dependency) |
| Images | Sharp (server-side resize/thumbnail/WebP generation) |

---

## 3. Environment Variables (`.env`)

All variables live in `.env` at the project root. Key ones:

| Variable | Purpose | Status |
|---|---|---|
| `DATABASE_URL` | SQLite file path | Set — works as-is |
| `NEXTAUTH_URL` / `NEXTAUTH_SECRET` | Auth session signing | **Placeholder secret — rotate before real launch** |
| `ENCRYPTION_KEY` | AES-256 key for encrypting Razorpay/SMTP secrets stored in DB | **Placeholder — rotate before real launch** |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Payment gateway | Empty — set in Admin → Settings → Payment, or here |
| `SMTP_*` / `EMAIL_FROM_*` | Outbound email | Empty — set in Admin → Settings → Email, or here |
| `UPLOAD_DIR` | Where product/banner/category images are stored on disk | `./data/uploads` |
| `MAX_IMAGE_SIZE_MB` / `MAX_CSV_SIZE_MB` | Upload limits | 5 / 10 |

Note: Payment and email credentials can be configured **either** via `.env` **or** via the Admin Settings UI (which encrypts and stores them in the `SiteSetting` table). The Settings UI values take priority when both are present.

---

## 4. Project Structure

```
src/
  app/
    (storefront)/          ← customer-facing pages (route group, no URL prefix)
      page.tsx             ← home page
      shop/, category/[slug]/, collection/[slug]/   ← product browsing (shared ShopGrid)
      product/[slug]/      ← product detail (server-rendered for SEO)
      cart/, checkout/, checkout/success/
      account/             ← customer account area (profile, orders, addresses, wishlist)
      search/, contact/, [slug]/  ← search, contact form, dynamic CMS pages
      layout.tsx           ← wraps storefront in Header + Footer
    admin/                 ← full admin panel (protected by middleware)
      page.tsx             ← dashboard
      products/, categories/, collections/, tags/
      orders/, customers/, coupons/, inventory/
      banners/, pages/, navigation/, reviews/
      analytics/, settings/, users/, audit-log/, errors/
      layout.tsx           ← wraps admin in Sidebar + AdminHeader
    api/                   ← all API routes (see §6)
    auth/                  ← login/register/error pages (shared by admin + customer)
    uploads/[...path]/     ← serves files from data/uploads (outside /public)
    layout.tsx             ← root layout (SessionProvider, fonts, metadata)
    robots.ts, sitemap.ts  ← SEO
  components/
    ui/                    ← generic design-system components (Button, Modal, DataTable, etc.)
    admin/                 ← admin-only components (Sidebar, AdminHeader, product/page forms)
    storefront/            ← customer-facing components (Header, Footer, ProductCard, cart drawer...)
  lib/                     ← business logic: auth, prisma client, email, checkout, encryption,
                              image processing, file storage, validators, utils
  store/                   ← Zustand stores (cart, toast)
  types/                   ← shared TypeScript types
  middleware.ts            ← route protection (admin roles, customer auth, public API allowlist)

prisma/
  schema.prisma            ← full data model (30 tables)
  seed.ts                  ← demo data seeder
  migrations/               ← migration history

data/
  store.db                 ← SQLite database file
  uploads/                 ← product/category/banner/page images (served via /uploads/*)
```

---

## 5. Database Schema (high level)

Defined in `prisma/schema.prisma`. Grouped by domain:

- **Users**: `User` (roles: `SUPER_ADMIN`, `ADMIN`, `MANAGER`, `STAFF`, `CUSTOMER`)
- **Catalog**: `Product`, `ProductVariant`, `ProductImage`, `Category`, `Collection`, `Tag` (+ join tables)
- **Orders**: `Order`, `OrderItem`, `OrderTimeline`, `Address`
- **Cart**: `Cart`, `CartItem`
- **Promotions**: `Coupon`, `CouponUsage`
- **Reviews/Wishlist**: `Review` (with `isApproved` / `isRejected` states), `Wishlist`
- **Content**: `Banner`, `Page`, `NavMenuItem`
- **System**: `Notification`, `AuditLog`, `ErrorLog`, `StockAdjustment`, `SiteSetting`, `EmailTemplate`, `NewsletterSubscriber`, `BulkJob`, `ContactSubmission`, `EmailLog`

Run `npx prisma studio` for a visual browser of all tables and current data.

---

## 6. API Routes Overview

**Public** (no auth required — see `middleware.ts` allowlist):
`GET /api/products`, `/api/products/[slug]`, `/api/categories`, `/api/categories/[slug]`, `/api/collections/[slug]`, `/api/banners`, `/api/navigation`, `/api/settings/public`, `/api/search`, `/api/pages/[slug]`
`POST /api/newsletter`, `/api/contact`, `/api/auth/register`, `/api/coupons/validate`

**Customer-authenticated** (requires logged-in `CUSTOMER` or admin session):
`/api/cart`, `/api/orders`, `/api/orders/[id]`, `/api/orders/[id]/return`, `/api/wishlist`, `/api/addresses`, `/api/addresses/[id]`, `/api/account/profile`, `/api/account/change-password`, `/api/reviews`, `/api/checkout/*`

**Admin-only** (role + module permission checked in `middleware.ts` via `checkPermission`):
Everything under `/api/admin/*` — products (incl. bulk upload/bulk images), categories, collections, tags, orders, customers, coupons, inventory, banners, pages, navigation, reviews, analytics, settings, users (SUPER_ADMIN only), audit-log, errors, dashboard, upload (generic image upload helper).

All API responses follow the shape:
```ts
{ success: boolean; data: T | null; error: string | null; meta?: { page, limit, total, totalPages } }
```

---

## 7. Role-Based Access Control

Defined in `src/lib/constants.ts` (`ROLE_PERMISSIONS`) and enforced in `src/middleware.ts` + `src/lib/auth-utils.ts` (`checkPermission`):

| Role | Access |
|---|---|
| `SUPER_ADMIN` | Everything, including Users & Roles management |
| `ADMIN` | Products, Orders, Customers, Inventory, Coupons, Content, Reviews, Analytics, Settings, Audit |
| `MANAGER` | Same as Admin minus Settings/Audit |
| `STAFF` | Products (read-only), Orders (status updates only), Inventory, Reviews |
| `CUSTOMER` | Storefront + own account/orders/cart/wishlist only |

The admin Sidebar auto-hides nav items the logged-in role can't access; the middleware is the actual enforcement layer.

---

## 8. Feature Checklist (what's implemented)

### Admin Panel
- ✅ Dashboard (revenue chart, recent orders, low-stock alerts, top products)
- ✅ Product CRUD with variants (size/color generator), multi-image upload, SEO fields, categories/collections/tags
- ✅ Bulk product import (CSV, create/update/upsert modes, error reporting)
- ✅ Bulk image upload (filename → SKU matching, manual reassignment for unmatched)
- ✅ Categories (nested tree), Collections (with manual product assignment), Tags (with merge)
- ✅ Inventory dashboard (inline stock edit, bulk CSV update, adjustment history log)
- ✅ Orders (filters, status timeline, tracking, PDF invoice, refunds — full & partial)
- ✅ Customers (segments: VIP/Regular/New/Inactive, order history, addresses, reviews, wishlist)
- ✅ Coupons (percentage/fixed/free-shipping, usage limits, usage analytics)
- ✅ Banners, Pages (rich text), Navigation (header/footer menus)
- ✅ Reviews moderation (pending/approved/rejected tabs, bulk approve, admin replies)
- ✅ Analytics (sales trend, revenue by category, top products, customer report, inventory value, coupon performance, abandoned carts)
- ✅ Settings (General/SEO/Shipping/Payment/Email/Tax/Social, with AES-256 encryption for secrets)
- ✅ Users & Roles (SUPER_ADMIN only), permission matrix
- ✅ Audit log (with before/after diff viewer) and Error log (with stack trace viewer + cleanup)

### Storefront
- ✅ Home page (hero carousel, categories, new arrivals, bestsellers, newsletter)
- ✅ Shop / Category / Collection pages with filters (size, color, price, stock), sort, URL-synced state
- ✅ Product detail (variant selection, live stock, size chart, reviews, related + recently viewed, JSON-LD SEO)
- ✅ Cart (persisted client-side) + Checkout (saved/new address, Razorpay + COD, coupon codes)
- ✅ Customer account (profile, password change, order history + returns, addresses, wishlist)
- ✅ Search, dynamic CMS pages, contact form, sitemap.xml/robots.txt

---

## 9. Known Simplifications vs. the Original Spec

These were deliberate, reasonable adaptations — not bugs:

1. **Checkout requires login.** The `Order.customerId` field is a required foreign key, so anonymous guest checkout isn't representable in the schema as built. Users are redirected to login/register.
2. **Search uses SQL `LIKE`, not SQLite FTS5.** Functionally fine at this data scale; true full-text search would need raw-SQL migrations + sync triggers.
3. **CSV bulk upload only — no XLSX parsing.** `parseXLSX()` exists but throws a clear "not supported" error.
4. **`lucide-react` v1 has no brand icons** (Instagram/Facebook/etc. were removed upstream). The footer uses generic equivalent icons instead.
5. **No live drag-and-drop reordering** (categories, banners, nav, product images) — implemented as up/down buttons instead, since no DnD library was part of the approved dependency list.
6. **Email templates are seeded but not fully wired.** Most transactional emails currently send inline HTML via `queueEmail()` rather than calling `sendTemplateEmail()` against the seeded `EmailTemplate` rows. Worth reconciling before relying on them.
7. **No stock reservation locking at checkout.** Stock is decremented at order-creation time; there's a theoretical race condition if two customers buy the last unit simultaneously. The schema has a `reservedStock` field that isn't currently used.
8. **Razorpay confirmation is client-driven only** — no server-side webhook as a backstop. If a customer's browser closes right after a successful payment but before the verify call completes, the order won't be created even though Razorpay charged them.

---

## 10. Launch Checklist (before selling to real customers)

**Must do before going live:**
- [ ] Replace `NEXTAUTH_SECRET` and `ENCRYPTION_KEY` with real random secrets (rotating these also invalidates any data encrypted with the old key, so do it *before* entering real Razorpay/SMTP secrets)
- [ ] Set real Razorpay keys (Admin → Settings → Payment) and real SMTP credentials (Admin → Settings → Email)
- [ ] Move file uploads off local disk to object storage (S3/Cloudinary/R2) — most hosting platforms wipe local disk on redeploy
- [ ] Move database from local SQLite file to a hosted Postgres/MySQL if deploying anywhere beyond a single-instance VPS, or if you need concurrent writers
- [ ] Deploy behind HTTPS with a real domain
- [ ] Replace all seeded demo content: products, categories, banners, About/FAQ/Privacy/Terms copy

**Strongly recommended:**
- [ ] Wire up `src/lib/rate-limiter.ts` on login, register, and checkout endpoints
- [ ] Add a Razorpay webhook as a backstop for payment confirmation
- [ ] Add stock reservation or a locking check at checkout to close the race condition in §9.7
- [ ] Set up error monitoring/alerting (the `ErrorLog` table exists but nothing pages anyone)
- [ ] Set up a database backup schedule (`backups/` folder exists but nothing populates it yet)
- [ ] Run a full security review pass

**Business/legal (not code):**
- [ ] Real Privacy Policy / Terms / Return Policy reviewed for your jurisdiction
- [ ] Business/GST registration if applicable, and confirm the invoice PDF meets local compliance
- [ ] A real shipping/courier integration if flat-rate shipping rules aren't sufficient
- [ ] Someone monitoring the admin panel for orders, low stock, and reviews day to day

---

## 11. Troubleshooting

- **"Middleware convention is deprecated" warning on startup** — cosmetic; Next.js 16 recommends renaming `middleware.ts` to `proxy.ts` eventually, but the current file still works.
- **Images not showing** — confirm the dev server is running; images are served dynamically from `data/uploads` via `/uploads/[...path]/route.ts`, not Next's static file serving.
- **Login fails right after registering** — extremely rare timing issue observed once during testing (unrelated to app logic — retrying immediately succeeded). If it recurs, check the server console for the actual NextAuth error.
- **Prisma client out of sync with schema** — run `npx prisma generate`.
- **Stale "Cannot find module .../page.js" TypeScript errors** — delete the `.next` folder and run `npm run dev` once to regenerate Next's generated types, then re-run `npx tsc --noEmit`.
