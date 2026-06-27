# Joseph & Mike's Barbershop

Full-stack Next.js platform for Joseph & Mike's Barbershop in Milton, Ontario. It includes a premium public website, custom appointment booking, secure customer booking management, admin operations, product shop, mock/Stripe checkout, and notification logging with optional provider delivery.

## Tech Stack

- Next.js 14 App Router + TypeScript
- Tailwind CSS + Radix UI components
- Prisma ORM
- SQLite for local development
- Postgres/Supabase-ready Prisma schema for production
- Optional Stripe, Resend, and Twilio integrations

## Local Setup

```bash
npm install
cp .env.example .env
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

Open `http://localhost:3000`.

The seed creates editable starter data: services, staff, business hours, products, gallery images, testimonials, settings, and an owner account.

Seeded admin logins (both are role `OWNER`):

| Purpose | Email | Password |
| --- | --- | --- |
| Owner (configurable) | `owner@josephandmikes.com` | `ChangeMe!2024` |
| Local test/demo admin | `admin@test.com` | `Admin123!` |

**Access from the site (no manual URLs):** on the homepage, click **Staff Login**
in the navbar (or in the mobile menu, or **Staff Portal** in the footer) → it
opens `/admin/login` → sign in → you land on `/admin`. In local/dev mode the
login page also shows a "Fill test credentials" helper for the test account.

Quick local login:
1. `npm run db:seed`
2. open the homepage (`npm run dev` → `http://localhost:3000`)
3. click **Staff Login**
4. sign in with `admin@test.com` / `Admin123!`

Sign in at `http://localhost:3000/admin/login`. The owner email/password can be
changed via `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` in `.env`; the test admin
is always (re)provisioned by the seed so it reliably works for local testing.
Re-seed any time with `npm run db:seed` (idempotent) or `npm run db:reset`.
Passwords are hashed with bcrypt — plaintext is never stored.

### Creating more admins

- **Seed/bootstrap:** edit `prisma/seed.ts` or just sign in with the accounts above.
- **Gated signup (setup mode):** set `ALLOW_ADMIN_SIGNUP=true`, then open
  `/admin/signup`. The first account created becomes `OWNER`, later ones `ADMIN`.
  If `ADMIN_ALLOWED_EMAILS` is set, only those emails may register. Turn
  `ALLOW_ADMIN_SIGNUP` back to `false` once you're done — with it off, the signup
  page shows "Signup is disabled" and the action refuses, so random visitors can
  never create admin accounts.

## Environment Variables

Start from `.env.example`.

Required locally:

- `DATABASE_URL`: defaults to `file:./dev.db`
- `NEXT_PUBLIC_SITE_URL`: e.g. `http://localhost:3000`
- `SHOP_TIMEZONE`: defaults to `America/Toronto`
- `AUTH_SECRET`: required in production; generate with `openssl rand -base64 48`

Optional providers:

- Resend: `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_NOTIFICATION_EMAIL`
- Twilio: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- Stripe: `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
- Admin production gate: `ADMIN_ALLOWED_EMAILS` as a comma-separated list
- Local test bypass: `ALLOW_DEV_ADMIN_BYPASS=true`
- Gated admin signup (setup mode): `ALLOW_ADMIN_SIGNUP=true`
- Supabase uploads: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`

Without provider keys, email/SMS are written to `NotificationLog` and checkout runs in mock mode.

`ALLOW_DEV_ADMIN_BYPASS=true` only works in local/non-production mode unless explicitly enabled. Turn it off before production. When active, `/admin/login` shows a development bypass button and the admin shell shows a visible warning banner.

## Common Commands

```bash
npm run dev              # local dev server
npm run build            # Prisma generate + production build
npm run start            # serve built app
npm run typecheck        # TypeScript check
npm run lint             # Next/ESLint check
npm test                 # unit tests
npm run db:push          # sync Prisma schema to DB
npm run db:seed          # seed starter data
npm run db:reset         # reset local DB and seed
```

## Testing The Platform

Booking:

1. Visit `/book`.
2. Pick a service, barber or "Any available barber", date, and time.
3. Submit customer details.
4. Use the returned `/booking/[token]` page to reschedule or cancel.

Admin:

1. Visit `/admin/login`.
2. Sign in with the seeded owner account.
3. Edit website content, services, barbers, schedule, products, gallery, reviews, messages, orders, and settings.
4. Export bookings from the bookings screen.

Website customization:

1. Open `/admin/content`.
2. Edit Header/Nav, Homepage, page headers, FAQ, policies, story timeline, SEO, theme colors, and footer links.
3. Content publishes immediately through database-backed dynamic pages.

Booking customization:

- `/admin/services`: service price, duration, category, image/icon, active/public/bookable/featured toggles, assigned barbers, add-ons, order.
- `/admin/staff`: barber name, title, photo, bio, contact, services, public visibility, booking visibility.
- `/admin/availability`: business hours, barber hours, breaks, closures, vacations, holidays, special hours.
- `/admin/settings`: slot interval, minimum notice, max booking window, cancellation cutoff, deposits, "Any available barber", required customer fields, booking help/confirmation text, policies.

Shop:

1. Visit `/shop`.
2. Add a product to cart.
3. Go to checkout and submit customer details.
4. With no Stripe key, mock checkout marks the order paid and opens `/shop/order/[ref]`.

Smoke/e2e scripts require the app server to be running:

```bash
node scripts/smoke-routes.mjs
node scripts/e2e-test.mjs
node scripts/e2e-shop.mjs
node scripts/smoke-customization.mjs
```

The e2e scripts create test bookings/orders in the configured database.
The customization smoke temporarily edits service, barber, product, gallery, and settings records, verifies public/dynamic flows, then restores the original values.

## Database Notes

Local development uses SQLite:

```env
DATABASE_URL="file:./dev.db"
```

For Supabase/Postgres production:

1. Change `datasource db.provider` in `prisma/schema.prisma` from `"sqlite"` to `"postgresql"`.
2. Set `DATABASE_URL` to the pooled Postgres connection string.
3. Run `npx prisma generate`.
4. Run `npx prisma db push` or migrate with Prisma Migrate if you prefer migration files.

Money is stored in integer cents. Booking instants are stored as UTC `DateTime`; business hours and breaks are stored as shop-local minutes and resolved in `America/Toronto` by default.

## Deployment

Vercel is the easiest deployment target for this full-stack Next.js app.

Recommended production checklist:

- Set a strong `AUTH_SECRET`.
- Set production `NEXT_PUBLIC_SITE_URL`.
- Use Postgres/Supabase for durable data.
- Configure Stripe keys and webhook endpoint if taking real payments.
- Configure Resend/Twilio if sending real email/SMS.
- Run `npm run build` before deploying.

The app is not currently configured for OpenAI Sites/Cloudflare hosting; there is no `.openai/hosting.json`.
