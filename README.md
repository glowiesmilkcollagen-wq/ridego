# RideGo — Pabili & Pasugo

Three apps from one codebase (Expo / React Native), connected through one **Supabase** database:

| App | For | Runs on | Screens | Start it |
|---|---|---|---|---|
| **RideGo** | customers | iPhone, Android | `src/app` | `npx expo start` |
| **RideGo Rider** | riders | iPhone, Android | `src/rider-app` | `npm run start:rider` |
| **RideGo Admin** | you | web browser | `src/admin-app` | `npm run start:admin` |

`app.config.ts` picks the app with `APP_VARIANT` (`rider`, `admin`, or unset for customers). Shared code is in `src/lib` and `src/components`.

## What each app does

**RideGo (customers)**
- **Pabili** — buy anything (food, medicine, groceries, hardware…) from a suggested store or *any* store — or from **up to 5 stores in one order**
  (e.g. chicken from one place and medicine from another), each with its own shopping list. The fee adds **₱20 per store**, including the first
  (Admin → Fees & commission). Write the shopping list;
  a rider buys it with their own money and brings it. The customer repays the receipt amount plus the delivery fee — **the app only charges the delivery fee.**
- **Pasugo** — a rider picks up a document, a bag, or a person and brings it to you or anywhere (nothing to buy). Motorcycles only.
- Promo codes, live tracking with the rider's real GPS position, call/text the rider, cancel (before the rider starts), rate.
- Pays in **cash** for now (GCash/card show as "coming soon").

**RideGo Rider**
- Sign up → RideGo approves → go online → jobs appear live → accept → step through (arrived → bought/picked up → delivered).
- **Navigate** with Google Maps, Waze or Apple Maps. Calls the customer / pickup contact / receiver.
- Shares GPS while online so customers can follow the rider.
- Shows exactly what to collect, and **earnings**: today / week / all time, the rider's share, and how much cash they owe RideGo.

**RideGo Admin (dashboard)**
- **Overview** reports: live orders, riders online, delivered/cancelled, fees, rider earnings, **company commission**, promo cost, by day and by rider.
- **Orders** (live, with details and cancel) · **Riders** (approve / reject / suspend) · **Payments** (each rider's balance; record cash remittances and payouts)
- **Stores** (add/edit/hide suggested stores) · **Fees & commission** (rider share and every price, with preview) · **Promotions** (promo codes).

### Money rules
- **Normal rules:** riders keep **70%** of each delivery/pasugo fee; RideGo keeps 30% plus a **₱15 booking fee** that customers pay on every order.
- **Beta waiver (on now):** no booking fee and no commission — riders keep **100%**. Switch it off in Admin → Fees & commission to start the normal rules.
- The share and booking fee are saved on each order, so changes only affect new orders.
- Fees are calculated **on the server** from distance and the admin's prices — the apps can't change them.
- Promo discounts come out of RideGo's part; riders still earn their share of the full fee.
- Cash: the rider collects the fee, keeps their share, and owes RideGo the rest until the admin records a remittance.

## 1. Connect the database (once)

> **Already done for RideGo:** the project `euzgazzfrytlihcnkmek` (Singapore) has the schema, security rules and starter stores
> loaded, email confirmation is off, and `.env` points the apps at it. The steps below are for setting up a new project.

1. Create a free project at [supabase.com](https://supabase.com) (region: Southeast Asia / Singapore).
2. **SQL Editor → New query**: paste all of [`supabase/schema.sql`](supabase/schema.sql) → **Run**. Then do the same with [`supabase/seed.sql`](supabase/seed.sql) (starter stores).
3. **Authentication → Sign In / Providers → Email**: turn off **Confirm email** (or keep it on and confirm by email).
4. **Project Settings → API**: copy the **Project URL** and the **anon / publishable key** into a file named `.env` in this folder
   (see [`.env.example`](.env.example)). Never put the `service_role` / secret key in the apps.

### Make yourself admin
Sign up once in the customer app (or create a user under **Authentication → Users**), then run in the SQL Editor:
```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'you@example.com');
```

## 2. Run the apps on your phone (Expo Go)

```bash
npm install
npx expo start              # customer app — scan the QR code with your phone
npm run start:rider         # rider app (stop the other one first with Ctrl+C)
npm run start:admin         # admin dashboard — opens in your browser
```
Phone and computer must be on the same Wi-Fi (or add `--tunnel`). Expo Go runs one app at a time.
To test a whole order yourself: run the **customer app on your phone**, the **rider app on another phone** (or the same phone, switching),
and the **admin dashboard in a browser** to approve the rider.

## 3. Build installable apps and publish the dashboard

You need a free Expo account (`npx eas-cli@latest login`), and the project linked once (`npx eas-cli@latest init`).

```bash
npx eas-cli@latest build -p android --profile preview            # customer app, Android test APK
npx eas-cli@latest build -p android --profile rider-preview      # rider app, Android test APK
npx eas-cli@latest build -p ios --profile production             # customer app for the App Store
npx eas-cli@latest build -p ios --profile rider-production       # rider app for the App Store
npm run deploy:admin                                             # admin dashboard website (EAS Hosting)
```
The `.env` values are built into the apps, so build after creating `.env`.
Stores: Google Play Console (US$25 once) and Apple Developer Program (US$99/year); customer and rider apps are separate listings
(`com.ajaridego.ridego` and `com.ajaridego.ridego.rider` — these IDs can't change after the first upload).

Android maps use the Google Maps SDK for Android key in `app.json` (`androidGoogleMapsApiKey`, restricted to that API).
iOS uses Apple Maps (no key). Maps only change in a new build, not in Expo Go.

## 4. Google Maps

Two separate keys from [Google Cloud Console](https://console.cloud.google.com) (billing must be on; Google gives a free monthly allowance):

| Key | Used for | Where it goes | Restrict to |
|---|---|---|---|
| **Server key** | road distances, route lines, fees (**Routes API**) | Supabase → **Edge Functions → Secrets** as `GOOGLE_MAPS_API_KEY` — never in the apps | API: Routes API |
| **Android key** | showing maps on Android (**Maps SDK for Android**) | `app.json` → `androidGoogleMapsApiKey` (it is public by design) | API: Maps SDK for Android; Android apps `com.ajaridego.ridego` and `com.ajaridego.ridego.rider` + their SHA-1 from `npx eas-cli@latest credentials` |

How routing works: the apps call the `route` Edge Function ([`supabase/functions/route`](supabase/functions/route/index.ts)).
It uses Google (motorcycle routes, car roads if none) when the secret is set, otherwise the free OSRM server, and caches
answers for 30 days in `route_cache` so the same trip doesn't cost twice. Only signed-in users can call it, and only for points in the Philippines.
If the function can't be reached, the apps fall back to OSRM, then to a straight-line estimate. No app update is needed when you add the key.

## Project layout

```
src/app/            customer app screens
src/rider-app/      rider app screens
src/admin-app/      admin dashboard screens
src/lib/            shared: api.ts (database), adminApi.ts, pricing, routing, auth, local drafts
src/components/     shared UI (admin/ and rider/ have app-specific parts)
supabase/           schema.sql (tables, security rules, server functions), seed.sql, tests/, functions/route (Google routing)
app.config.ts       picks the customer, rider or admin app
```

### Database tests
`supabase/tests/rules_test.sql` checks the security rules and money logic as customers, riders and an admin
(e.g. riders can't approve themselves, customers can't change fees, only one rider gets a job, shares, booking fee, beta waiver, promos, balances).
Run against any Postgres 15+: `npm run test:db -- "-h localhost -U postgres"`.

## Still to do before a public launch
- **Online payments** (GCash/Maya/cards) via a provider such as PayMongo — needs a business account.
- **Phone-number (SMS) login** instead of email — needs an SMS provider in Supabase (e.g. Twilio).
- **Push notifications** for new jobs and order updates; **background location** for riders (today the rider app must stay open).
- **Receipt and prescription photos**; **rider document uploads** (license, OR/CR) for approval.
- **Routing**: add the Google server key (section 4); until then distances use the free OSRM demo server.
- **Legal**: motorcycle passenger transport (pasugo "Person") and courier services are regulated in the Philippines (LTFRB/DOTr) — get permits first.
