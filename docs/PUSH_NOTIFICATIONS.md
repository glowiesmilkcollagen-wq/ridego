# Push notifications

## What gets sent
| Who | When | Alert |
|---|---|---|
| Online riders within 15 km of the pickup | a new order is placed | "New pabili job · ₱120" (loud "New jobs" channel) |
| Customer | rider accepts / arrives / picks up / delivers | "Rider found 🛵", "Paolo is at Mercury Drug", "On the way to you", "Delivered ✅" |
| Customer | rider drops the job / admin cancels | "Finding another rider" / "Order cancelled" |
| Rider | customer or admin cancels their job | "Job cancelled" |
| Rider | admin approves or suspends them | "You're approved! 🎉" / "Account suspended" |

Tapping an alert opens the order (customer) or the jobs list (rider).

## How it works
- The apps ask permission after login and save the phone's Expo push token (`register_push_token`); logging out removes it.
- Database triggers on `orders` and `riders` (see "Push notifications" in `supabase/schema.sql`) send the alerts to
  Expo's push service with `pg_net`. Nothing else to run or pay for. If sending fails, the order still goes through.
- Push works only in real builds (EAS), not in Expo Go or the web version.

## One-time setup

### iPhone (both apps)
Nothing to prepare. When you run `eas build -p ios`, answer **Yes** when EAS asks to set up push notifications
(it creates the Apple push key in your Apple Developer account).

### Android (both apps) — Firebase
Android delivers push through Google's Firebase (free).
1. Go to **console.firebase.google.com** → **Create a project** → choose your existing Google Cloud project **Pabili**
   (Analytics: not needed).
2. **Add app → Android**, package name `com.ajaridego.ridego`, nickname "Pabili" → **Register app** → skip the remaining steps.
3. **Add app → Android** again, package name `com.ajaridego.ridego.rider`, nickname "Pabili Rider".
4. **Project settings (⚙️) → General → Your apps** → download **google-services.json** (one file now covers both apps).
   Send it to Claude (or put it in the project folder as `google-services.json`). It is not secret.
5. **Project settings → Service accounts → Generate new private key** → a `.json` key downloads. **This one is secret**:
   don't send it to anyone or put it in the project folder.
6. Upload that key to Expo, once per app:
   ```bash
   npx eas-cli@latest credentials -p android
   ```
   choose `production` → **Google Service Account** → **Manage your Google Service Account Key for Push Notifications (FCM V1)**
   → **Set up a Google Service Account Key for Push Notifications (FCM V1)** → **Upload** → pick the key file.
   Then the same for the rider app:
   ```bash
   APP_VARIANT=rider npx eas-cli@latest credentials -p android
   ```
   (choose `rider-production`). Afterwards delete the key file from your Downloads.
7. Build new versions of the apps (push only works in builds made after this).
