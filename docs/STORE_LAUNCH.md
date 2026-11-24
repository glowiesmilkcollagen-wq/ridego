# Launching Pabili on the App Store and Google Play

Two apps, each listed separately on both stores:

| App | iOS bundle ID / Android package | Build profile |
|---|---|---|
| Pabili (customers) | `com.ajaridego.ridego` | `production` |
| Pabili Rider | `com.ajaridego.ridego.rider` | `rider-production` |

Store accounts are **personal** for now (listings show your own name as the seller/developer).

## What the apps already have for review

- Account deletion inside both apps (Account / Profile → Delete account) and a public deletion page.
- Privacy policy and terms inside the apps (login screen + Account) and as public web pages.
- Forgot password (emailed 6-digit code).
- App icons and splash screens; location permission explanations.
- No passenger rides (motorcycle taxi needs LTFRB permits).
- Push notifications for new jobs and order updates (setup: [`PUSH_NOTIFICATIONS.md`](PUSH_NOTIFICATIONS.md)).

## Your steps, in order

### 1. Emails to customers (password reset codes) — ✅ done
Supabase sends its emails through **Brevo** (free, 300 emails a day), because Supabase's built-in email only reaches your own team.
- Supabase → Authentication → Emails → SMTP Settings: host `smtp-relay.brevo.com`, port `587`, username = the Brevo SMTP login
  (`…@smtp-brevo.com`), password = a Brevo SMTP key (Brevo → Settings → SMTP & API). Sender `ridegopabiliapp@gmail.com`, name `Pabili`.
- The "Reset password" email template shows a 6-digit code (`{{ .Token }}`) that customers type into the app.
- If reset emails stop arriving: check Brevo → Transactional → Logs. SMTP keys stop working after 90 days without any email sent —
  generate a new one and paste it into Supabase.
- Later, with your own domain (e.g. ridego.ph), add it in Brevo → Senders, domains, IPs so emails come from `noreply@yourdomain`.

### 2. Website (privacy policy, terms, account deletion) — ✅ done
Live at **https://ridego.expo.app** (republish after changes with `npm run deploy:admin`). Links for the stores:
- Privacy policy: https://ridego.expo.app/legal/privacy
- Terms of service: https://ridego.expo.app/legal/terms
- Account deletion (Google Play asks for this): https://ridego.expo.app/legal/delete-account
- Support URL: https://ridego.expo.app/legal/privacy (contact email is on every page) and ridegopabiliapp@gmail.com
- Admin dashboard: https://ridego.expo.app (admin login required)

### 3. Developer accounts
- **Apple Developer Program**: developer.apple.com/programs → Enroll as an *Individual* (US$99/year). Needs an Apple ID with two-factor authentication. Approval usually takes 1–2 days.
- **Google Play Console**: play.google.com/console → *Personal* account (US$25 once). Google checks your ID, and may ask you to confirm you have an **Android phone** via the Play Console app — borrow one if you need to.
- New personal Play accounts must run a **closed test with at least 12 testers for 14 days in a row** before the app can go public. Start this as early as possible (see step 6).

### 4. Reviewer test accounts
Apple (and often Google) need logins to test with. Before submitting, ask Claude to create:
a customer demo account, and an **approved** rider demo account. Put them in the review notes (below).

### 5. Build and upload
iPhone apps (build and send to App Store Connect in one go; EAS asks you to log in to Apple and makes the certificates for you):
```bash
npx eas-cli@latest build -p ios --profile production --auto-submit
```
```bash
APP_VARIANT=rider npx eas-cli@latest build -p ios --profile rider-production --auto-submit
```
Android apps:
```bash
npx eas-cli@latest build -p android --profile production
```
```bash
APP_VARIANT=rider npx eas-cli@latest build -p android --profile rider-production
```
- Both apps live in one Expo project, so don't use `eas submit --latest` (it could pick the other app's build).
- Android production builds are `.aab` files. The **first upload of each app must be done by hand** in Play Console
  (Create app → Testing → Closed testing → Create release → upload the `.aab` from the EAS build page).

### 6. Google Play closed test (14 days)
Play Console → each app → **Testing → Closed testing** → add a list of at least 12 testers' Gmail addresses → send them the opt-in link.
They install from Google Play and should open the app now and then. After 14 days, apply for production access (Dashboard).
Riders you are recruiting are ideal testers for the rider app; friends and family for the customer app.

### 7. Store listing, privacy forms, submit
Fill in the texts and answers below, add screenshots (Claude can make them), then submit for review.
Apple review usually takes 1–3 days; Google's first review can take up to about a week.

---

## Nearby stores (Google Places)
The Pabili tab lists real stores within 3 km of the delivery address from Google Maps (plus Pabili's own store list).
Google Cloud → APIs & Services → Credentials → **RideGo Server** key → API restrictions: tick **Routes API** and **Places API (New)**.
Searches are cached per ~1 km area for a day. Check usage in Google Cloud → Billing → Reports.

## Store texts (ready to paste)

### Pabili (customers)
- **Name (store listing)**: RideGoPH: Pabili — same on the App Store and Google Play (the name under the icon on the phone stays "Pabili")
- **Subtitle (iOS, 30 chars)**: We buy it. We bring it.
- **Short description (Play, 80 chars)**: Pabili from any store, or send documents and parcels across town by motorcycle.
- **Category**: Food & Drink (iOS) / Food & Drink (Play). Alternative: Lifestyle.
- **Keywords (iOS)**: pabili,pasugo,delivery,padala,errand,courier,rider,food,medicine,grocery,parcel
- **Description**:
  > Pabili brings it to you — from any store, anywhere in town.
  >
  > PABILI — We buy it for you
  > Need food, medicine, groceries or hardware? Pick a store or type any store (even a small sari-sari store), write your list, and a Pabili rider buys it with their own money and brings it to your door. You pay the rider the exact receipt amount plus the driver fee. Up to 5 stores in one order.
  >
  > PASUGO — We pick it up for you
  > Documents, a bag, a package: a rider picks it up and brings it to you or anyone you choose.
  >
  > • See the driver fee before you book — no surprises
  > • Follow your rider live on the map
  > • Call or text your rider
  > • Cancel free until the rider reaches the store or pickup
  > • Pay in cash
  >
  > Questions? ridegopabiliapp@gmail.com

### Pabili Rider
- **Name**: Pabili Rider
- **Subtitle**: Earn with pabili & pasugo
- **Short description**: Take pabili and pasugo jobs near you, navigate, and track your earnings.
- **Category**: Business (iOS) / Maps & Navigation or Business (Play)
- **Description**:
  > The app for Pabili riders. Go online, receive pabili and pasugo jobs from customers nearby, and earn on your own schedule.
  >
  > • New jobs appear live while you're online
  > • Navigate with Google Maps, Waze or Apple Maps
  > • Step-by-step job flow: arrived, bought / picked up, delivered
  > • Enter receipts so customers repay exactly what you spent
  > • See today's, this week's and all-time earnings and your cash balance
  >
  > Riders need an approved Pabili account and a motorcycle with valid license and registration.
  > Apply: ridegopabiliapp@gmail.com

### Review notes (App Store "Notes" / Play "App access")
> Pabili is a delivery and errand service in Metro Manila, Philippines. Riders are independent motorcyclists who buy items for customers with their own money; customers repay the receipt plus the driver fee in cash. The app only charges the driver fee; no payments are made in the app.
> Demo customer: (email) / (password). Set "Saved address" to a place in Makati to see local stores.
> Demo rider (already approved): (email) / (password). The rider app is used together with the customer app: place an order in Pabili, then accept it in Pabili Rider.
> Account deletion: Account → Delete account (customer), Profile → Delete account (rider).

---

## Privacy answers

These match what the apps actually do (see the privacy policy). No tracking, no ads, no data sold.

### Apple — App Privacy ("Data Used to Track You": **none**)
| Data type | Collected | Linked to user | Purpose |
|---|---|---|---|
| Name | Yes | Yes | App Functionality |
| Email Address | Yes | Yes | App Functionality |
| Phone Number | Yes | Yes | App Functionality |
| Precise Location | Yes | Yes | App Functionality |
| Other User Content (order details, lists) | Yes | Yes | App Functionality |
| Purchase History (order history) | Yes | Yes | App Functionality |
| Other data (rider: plate and license number) | Rider app only | Yes | App Functionality |

### Google Play — Data safety
- Data collected: Personal info (name, email, phone), Location (precise), App activity (in-app actions: order history), Other (rider: plate/license number).
- Shared with third parties: **No** (service providers that process data for you don't count as sharing).
- Encrypted in transit: **Yes**. Users can request deletion: **Yes** (link: `https://ridego.expo.app/legal/delete-account`).
- Purpose: App functionality, Account management. Not used for ads.

### Ratings questionnaires
No violence, sexual content, gambling or user-to-user chat; users can't see other users' content. Expect **4+** (Apple) / **Everyone** (Play).
Answer "yes" to "app shares location" / "users interact" only where the forms ask about the rider seeing the customer's address.

---

## Before or soon after launch (recommended)
- **Push notifications** are built in. Finish the one-time Firebase setup in [`PUSH_NOTIFICATIONS.md`](PUSH_NOTIFICATIONS.md) before the production Android builds.
- **Online payments** (GCash/Maya via a provider like PayMongo) — needs a registered business.
- **Business registration (DTI)** if you plan to scale; later you can move the store accounts to an organization.
- Supabase free plan: fine for launch (500 MB database). A project with no activity for 7 days is paused — a live app won't hit this.
