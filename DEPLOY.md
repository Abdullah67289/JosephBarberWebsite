# Deploying to Cloudflare (Workers + D1)

This app runs on **Cloudflare Workers** via the OpenNext adapter, with **D1**
(Cloudflare's SQLite) as the database. No Supabase, no always-on Node server.

You only need to do the one-time setup once; after that every `git push` can
redeploy automatically (see "Continuous deploys").

## Prerequisites
- A free Cloudflare account
- Node 18+ and this repo cloned locally
- `npm install` already run

Wrangler (the Cloudflare CLI) is already a dev dependency, so you can run it with
`npx wrangler ...`.

## 1. Log in
```
npx wrangler login
```

## 2. Create the D1 database
```
npx wrangler d1 create joseph-mikes-barbershop
```
Copy the `database_id` it prints and paste it into **wrangler.jsonc** where it
says `REPLACE_WITH_D1_DATABASE_ID`.

## 3. Create the R2 bucket (for admin image uploads)
```
npx wrangler r2 bucket create joseph-mikes-barbershop-uploads
```

## 4. Create the tables + load the site content
```
npm run d1:migrate        # creates all tables in D1 (migrations/0001_init.sql)
npm run d1:seed           # loads the site content (d1/seed-data.sql)
```
The committed seed contains ONLY site content (services, staff profiles, hours,
gallery, testimonials). It never contains accounts, customers or bookings.

## 4b. Create the owner account (kept out of the repo on purpose)
```
node scripts/make-owner.mjs
npx wrangler d1 execute joseph-mikes-barbershop --remote --file=d1/owner-setup.sql
```
The script prints the owner password ONCE — store it in a password manager.
`d1/owner-setup.sql` is gitignored, so no credential material is ever committed.
Workers (barber/admin accounts) are then created from **Admin → Manage Team**,
and everyone can change their own password from **Admin → My Account**.

## 5. Set the secrets
Run each and paste the value when prompted:
```
npx wrangler secret put AUTH_SECRET
```
Use this freshly-generated value (or your own 32+ char random string):
```
/PxVbXmv6m/Q+drvPDktOFNFYUNNfjX31QRsW1rDdtE7xuzn
```
Optional integrations (only if you use them): `RESEND_API_KEY`,
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `TWILIO_ACCOUNT_SID`,
`TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`.

Also set `NEXT_PUBLIC_SITE_URL` in **wrangler.jsonc** `vars` to your real Worker
URL once you know it (step 6 prints it).

## 6. Deploy
```
npm run deploy
```
This builds with OpenNext and uploads the Worker. It prints your live URL
(e.g. `https://joseph-mikes-barbershop.<your-subdomain>.workers.dev`). Put that
URL into `wrangler.jsonc` → `vars.NEXT_PUBLIC_SITE_URL` and run `npm run deploy`
once more so links/emails use the right domain.

## Admin login
The only account is the owner (`cosimo.pedulla3@gmail.com`) created in step 4b.
There are no demo or test accounts anywhere.

Recommended extra lock-down: in `wrangler.jsonc` `vars`, set
`ADMIN_ALLOWED_EMAILS` to a comma-separated list of the owner + worker emails —
then no other email can ever sign in, even if an account row existed.

## Continuous deploys (optional)
In the Cloudflare dashboard → **Workers & Pages → Create → Connect to Git**,
pick this repo. Set:
- Build command: `npx opennextjs-cloudflare build`
- Deploy command: `npx wrangler deploy`
The D1 and R2 bindings from `wrangler.jsonc` are picked up automatically. Push to
`main` and it redeploys.

## Local preview of the Workers build
```
npm run d1:migrate:local && npm run d1:seed:local   # once
npm run preview                                      # runs the real Worker locally
```
Plain `npm run dev` still uses the local file database (fast, no D1 needed).
