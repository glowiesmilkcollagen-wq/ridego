# App Review notes (App Store Connect → version → App Review Information → Notes)

Apple asked (Guideline 2.1 – Information Needed) for: a screen recording on a real iPhone, the app's purpose,
setup instructions, external services, regional differences, and regulatory information. Paste the matching
block below into Notes and replace `VIDEO LINK` with the link to the recording and `DEMO-PASSWORD` with the demo accounts' password
(not stored in this repository).

## RideGoPH: Rider

```
1. SCREEN RECORDING (iPhone, latest iOS): VIDEO LINK
It shows: launching the app, creating a rider account, the "waiting for approval" screen, deleting that account (Delete account button), logging in with the approved demo rider, going online, receiving a job ordered from the customer app, accepting it, the step-by-step job flow (arrived at store, items bought with receipt amount, delivered and paid), earnings, and Profile → Delete account.

2. PURPOSE AND AUDIENCE: RideGoPH: Rider is the app for independent motorcycle riders (18+) who do errands for customers of our customer app, RideGoPH: Pabili, in the Philippines. "Pabili" jobs: the rider buys the items the customer listed at a store and delivers them; the customer repays the receipt amount plus the driver fee in cash. "Pasugo" jobs: the rider picks up a document or parcel and delivers it. It gives riders a way to earn from nearby errands, and customers a way to get things without leaving home. No passengers are carried.

3. HOW TO TEST:
- Demo rider (already approved): ridegopabiliapp+reviewrider@gmail.com / DEMO-PASSWORD
- Allow location, then tap the switch at the top to go online.
- To create a job, open RideGoPH: Pabili (customer app) and log in as ridegopabiliapp+reviewcustomer@gmail.com / DEMO-PASSWORD. Set the delivery address in Makati, pick a store, add an item and tap "Find a rider". The job appears in the rider app within a few seconds; tap Accept and follow the buttons.
- New sign-ups must be approved by our team before they can take jobs, which is why we provide an approved demo account.
- Account deletion: Profile → Delete account (also available on the "waiting for approval" screen).
- There is no user-generated content shared publicly, no in-app purchases and no paid features. All payments are cash between customer and rider, outside the app.

4. EXTERNAL SERVICES: Supabase (accounts, database, server functions), Google Maps Platform (maps, road distances and routes, nearby store search), Expo (app updates and push notification delivery), Apple Push Notification service and Firebase Cloud Messaging (notifications), Brevo (password reset emails). Navigation buttons open Apple Maps, Google Maps or Waze. No AI services and no payment processors.

5. REGIONS: The app is available in the Philippines only and works the same everywhere in the Philippines.

6. REGULATION: The service is an errand and parcel delivery service by motorcycle. It does not carry passengers. Riders are independent and must have a valid driver's license and motorcycle registration, which we check before approving them (they enter their plate and license numbers). Prohibited items (illegal goods, weapons, prescription medicine without a prescription, alcohol or tobacco for minors) are listed in our terms: https://ridego.expo.app/legal/terms
```

## RideGoPH: Pabili (customer app)

```
1. SCREEN RECORDING (iPhone, latest iOS): VIDEO LINK
It shows: launching the app, creating an account, setting and saving a delivery address on the map, choosing a nearby store, "Buy from Any Store" with a pinned store, writing the shopping list, the driver fee, placing the order, following the rider live once a rider accepts, order history, and Account → Delete account.

2. PURPOSE AND AUDIENCE: RideGoPH: Pabili lets adults (18+) in the Philippines ask an independent motorcycle rider to buy items for them at any store ("pabili") or to pick up and deliver a document or parcel ("pasugo"). The customer sees the driver fee before ordering and repays the rider the receipt amount plus the driver fee in cash. It saves people a trip to the store and supports local stores and riders. No passengers are carried.

3. HOW TO TEST:
- Demo customer: ridegopabiliapp+reviewcustomer@gmail.com / DEMO-PASSWORD
- Allow location (or set the delivery address to a place in Makati, Metro Manila) to see nearby stores.
- Pabili tab: pick a store or tap "Buy from Any Store", add items, tap "Find a rider".
- To see the rider side, log in to RideGoPH: Rider as ridegopabiliapp+reviewrider@gmail.com (same password), go online and accept the order.
- Please cancel any test order you do not complete (Activity → order → Cancel).
- Account deletion: Account → Delete account.
- There is no publicly shared user content, no in-app purchases and no paid features. Payment is cash to the rider, outside the app.

4. EXTERNAL SERVICES: Supabase (accounts, database, server functions), Google Maps Platform (maps, road distances, nearby store search), Expo (app updates and push notification delivery), Apple Push Notification service and Firebase Cloud Messaging (notifications), Brevo (password reset emails). No AI services and no payment processors.

5. REGIONS: The app is available in the Philippines only and works the same everywhere in the Philippines.

6. REGULATION: The service is an errand and parcel delivery service by motorcycle. It does not carry passengers. Riders are independent, approved by us, and must have a valid driver's license and motorcycle registration. Prohibited items (illegal goods, weapons, prescription medicine without a prescription, alcohol or tobacco for minors) are listed in our terms: https://ridego.expo.app/legal/terms
```
