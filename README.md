# RideGo — Pabili (buy & deliver) + Pasugo (pick up & deliver)

**Two apps** for **iPhone and Android** from one codebase (Expo / React Native):

| App | Who uses it | Screens | Run | App ID |
|---|---|---|---|---|
| **RideGo** | customers | `src/app` | `npx expo start` | `com.ajaridego.ridego` |
| **RideGo Rider** | riders | `src/rider-app` | `npm run start:rider` | `com.ajaridego.ridego.rider` |

`app.config.ts` switches between them with `APP_VARIANT=rider`. Both share `src/lib` and `src/components`.

### RideGo (customer app)

- **Pabili** — buy **anything**: food, medicine, groceries, convenience-store items, hardware, flowers, pet supplies.
  The customer picks a suggested store (filter by type), or *any* store, and writes what to buy
  (quick-add suggestions, quantities, instructions, optional spending limit). A rider goes there, orders and **pays with their own money**,
  then delivers. The customer repays the items per the receipt, plus the delivery fee.
  **The app only computes the delivery fee** (by distance from the store to the customer). No menus, prices or store involvement. Pharmacies show a reminder that prescription medicines need a valid prescription.
- **Pasugo** — ask a rider to pick something up at one place and bring it to you or anywhere: a **document / folder**,
  a **bag / package**, or a **person**. Set pickup and drop-off (drop-off defaults to your address), describe what or who,
  add the contact at the pickup and an optional receiver, choose **Motorcycle** or **Car**, see the fee, book, and track the rider live.
- **Activity & Account** — order and pasugo history, profile, saved address.

### RideGo Rider (rider app)

- **Jobs** — go online, see incoming pabili and pasugo requests with distance, the customer's fee and payment method,
  and your share; accept; follow the steps (arrived → picked up / bought → delivered). **Navigate** opens
  Google Maps, Waze or Apple Maps to the pickup, then to the drop-off. For pabili, enter the receipt total after paying.
  The app shows exactly what to collect: the receipt for pabili items, plus the fee only if the customer pays cash.
- **Earnings** — today / this week / all time: fees charged to customers, **your 20% share**, cash collected and
  **cash to remit to RideGo**, and every job grouped by day.
- **Profile** — name, mobile number, vehicle and plate.

**Rider share: 20% of every fee charged to customers** (`RIDER_SHARE` in `src/lib/pricing.ts`).
Cash: the rider holds the whole fee, keeps 20% and remits 80%. GCash / card: RideGo collects and pays the rider 20%.

> ⚠️ This version runs on **demo data stored on each phone**. The two apps are **not connected yet**: the rider app
> receives simulated requests, and customer orders are handled by simulated riders (a trip finishes in ~1–2 minutes).
> Connecting them so a customer's order reaches a real rider needs a backend — see "Going live" below.

## 1. Run it on your phone (5 minutes, free)

You need a computer with [Node.js](https://nodejs.org) (LTS version) installed. Open a terminal and run:

```bash
git clone https://github.com/glowiesmilkcollagen-wq/ridego
cd ridego
npm install
npx expo start
```

**The QR code appears in your terminal** after `npx expo start` — it is generated each time you run it, so it is not on this page.

1. Install **Expo Go** on your phone (App Store / Play Store).
2. Scan the QR code: on **iPhone** use the normal Camera app; on **Android** use the "Scan QR code" button inside Expo Go.
3. Your phone and computer must be on the **same Wi-Fi**. If it won't connect, stop the server (Ctrl+C) and run `npx expo start --tunnel` instead.

Maps work in Expo Go.

**Rider app:** stop the server (Ctrl+C) and run `npm run start:rider` instead, then scan the new QR code.
Only one app runs at a time in Expo Go; switch by restarting with the other command.

## 2. Build installable apps

You need a free Expo account: https://expo.dev/signup

```bash
npm install -g eas-cli
eas login
eas init            # links the project to your Expo account
```

**Android test APK** (install directly on any Android phone, no Play Store needed):
```bash
eas build -p android --profile preview
```
EAS gives you a download link / QR code for the `.apk`.

**Store builds:**
```bash
eas build -p android --profile production   # .aab for Google Play
eas build -p ios --profile production       # .ipa for the App Store (needs Apple Developer account)
```

**Rider app** — same commands with the rider profiles:
```bash
eas build -p android --profile rider-preview      # Android test APK of RideGo Rider
eas build -p android --profile rider-production   # Google Play
eas build -p ios --profile rider-production       # App Store
```
Each app is a separate listing in the stores (different app IDs).

## 3. Publish to the stores

| | Google Play | Apple App Store |
|---|---|---|
| Account | Google Play Console — US$25 one-time | Apple Developer Program — US$99/year |
| Upload | `eas submit -p android` | `eas submit -p ios` |
| Review | usually hours–few days | usually 1–3 days |

Both stores need: app icon, screenshots, description, **privacy policy URL**, and (for this app) a reason for location access.
New personal Play Console accounts must run a closed test with testers for 14 days before production.

## Before you publish — change these

1. App IDs are `com.ajaridego.ridego` (customer, in `app.json`) and `com.ajaridego.ridego.rider` (rider, in `app.config.ts`). Keep them — they cannot be changed after the first store upload.
2. `app.json` → replace `REPLACE_WITH_YOUR_GOOGLE_MAPS_ANDROID_KEY` with a Google Maps SDK for Android key
   (Google Cloud Console → enable "Maps SDK for Android"). **Without it the map is blank on Android store builds.** iOS uses Apple Maps, no key needed.
3. App name/icon: `app.json` → `name`, and replace the images in `assets/`.

## Going live (what a real launch still needs)

- **Backend + database** (e.g. Supabase or Firebase) to **connect the two apps**: customer and rider accounts/OTP login,
  orders sent to nearby online riders, real-time rider location for tracking, earnings and cash remittance records.
- **Payments**: GCash/Maya/cards via a gateway such as PayMongo or Xendit.
- **Receipt photos**: let riders upload a photo of the store receipt so customers can verify the item cost.
- **Rider verification** (license, OR/CR, NBI clearance) and **push notifications**.
- **Places search**: replace the preset list in `src/lib/data.ts` with Google Places.
- **Routing server**: distances, fees and route lines come from the free public OSRM demo server
  (`ROUTING_URL` in `src/lib/routing.ts`, OpenStreetMap road data). It is meant for testing and has no traffic data.
  Before launch, run your own OSRM server or switch to a paid routing API (e.g. Google Routes).
  If the server can't be reached, the app falls back to an estimate and says so on screen.
- **Legal**: carrying people on motorcycles for a fee (pasugo "Person") is regulated in the Philippines (LTFRB/DOTr motorcycle-taxi rules), and courier services may need permits — check before taking real passengers or parcels.

## Project layout

```
src/app/            customer app screens (Expo Router — each file is a screen)
  (tabs)/           Home, Pabili, Pasugo, Activity, Account
  order             what to buy (shopping list) + delivery fee
  track/[id]        live tracking
  place-search      location picker
src/rider-app/      rider app screens
  (tabs)/           Jobs, Earnings, Profile
src/lib/            shared: data, pricing, routing, trip simulation, rider jobs, app state
src/components/     shared: map, cards, buttons
app.config.ts       picks the customer or rider app (APP_VARIANT=rider)
```
Prices: `src/lib/pricing.ts` — `deliveryFee` for pabili (₱49 for the first 2 km, then ₱10 per km) and `VEHICLES` / `pasugoFee` for pasugo. Suggested stores, store types and item suggestions: `src/lib/data.ts`.
