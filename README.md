# RideGo — Food delivery + motorcycle taxi

One app for **iPhone and Android** (built with Expo / React Native):

- **Food** — browse restaurants, search dishes, filter by category, cart, promos, checkout (Cash / GCash / Card), live order tracking on a map, rate your rider.
- **Ride** — motorcycle taxi (Moto, Moto+) and Car: pick pickup/destination (or use GPS), see fares, book, track the rider live, cancel, rate.
- **Rider mode** — go online, receive delivery & ride requests, accept, navigate (opens Apple/Google Maps), step through pickup → drop-off, earnings dashboard.
- **Activity & Account** — order/ride history, profile, saved address.

> ⚠️ This version runs on **demo data stored on the phone**. Restaurants, riders and trip progress are simulated
> (a trip finishes in ~1–2 minutes). To run a real business you need a backend — see "Going live" below.

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

## 3. Publish to the stores

| | Google Play | Apple App Store |
|---|---|---|
| Account | Google Play Console — US$25 one-time | Apple Developer Program — US$99/year |
| Upload | `eas submit -p android` | `eas submit -p ios` |
| Review | usually hours–few days | usually 1–3 days |

Both stores need: app icon, screenshots, description, **privacy policy URL**, and (for this app) a reason for location access.
New personal Play Console accounts must run a closed test with testers for 14 days before production.

## Before you publish — change these

1. `app.json` → `ios.bundleIdentifier` and `android.package` (`com.ridego.app`) to your own unique ID, e.g. `com.yourcompany.ridego`. Cannot be changed after first upload.
2. `app.json` → replace `REPLACE_WITH_YOUR_GOOGLE_MAPS_ANDROID_KEY` with a Google Maps SDK for Android key
   (Google Cloud Console → enable "Maps SDK for Android"). **Without it the map is blank on Android store builds.** iOS uses Apple Maps, no key needed.
3. App name/icon: `app.json` → `name`, and replace the images in `assets/`.

## Going live (what a real launch still needs)

- **Backend + database** (e.g. Supabase or Firebase): user accounts/OTP login, restaurants & menus, orders, real-time rider location, dispatch (matching nearest rider).
- **Payments**: GCash/Maya/cards via a gateway such as PayMongo or Xendit.
- **Separate merchant tools** for restaurants to receive orders.
- **Rider verification** (license, OR/CR, NBI clearance) and **push notifications**.
- **Places search**: replace the preset list in `src/lib/data.ts` with Google Places.
- **Legal**: motorcycle taxi operation in the Philippines is regulated (LTFRB/DOTr pilot program) — check permits before taking real passengers.

## Project layout

```
src/app/            screens (Expo Router — each file is a screen)
  (tabs)/           Home, Food, Ride, Activity, Account
  restaurant/[id]   menu
  cart              checkout
  track/[id]        live tracking
  driver            rider mode
  place-search      location picker
src/lib/            data, pricing, trip simulation, app state
src/components/     map, cards, buttons
```
Fares & fees: `src/lib/pricing.ts`. Restaurants & places: `src/lib/data.ts`.
