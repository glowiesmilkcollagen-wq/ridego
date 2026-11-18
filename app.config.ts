import type { ConfigContext, ExpoConfig } from 'expo/config';

// This file runs in Node (no @types/node in the app), so declare the one fs helper used.
declare function require(name: 'fs'): { existsSync(path: string): boolean };
const { existsSync } = require('fs');

/**
 * One codebase, three apps (everything not set here comes from app.json):
 * - default            → "RideGo", the customer app (screens in src/app)
 * - APP_VARIANT=rider  → "RideGo Rider", the rider app (screens in src/rider-app)
 * - APP_VARIANT=admin  → "RideGo Admin", the admin dashboard website (screens in src/admin-app)
 */
// Firebase settings for Android push notifications (one file for both apps; see docs/PUSH_NOTIFICATIONS.md).
// Added only once the file exists, so builds work before Firebase is set up.
const GOOGLE_SERVICES = './google-services.json';

export default ({ config }: ConfigContext): ExpoConfig => {
  const variant = process.env.APP_VARIANT;
  const base = config as ExpoConfig;
  if (existsSync(GOOGLE_SERVICES)) base.android = { ...base.android, googleServicesFile: GOOGLE_SERVICES };
  if (variant !== 'rider' && variant !== 'admin') return base;

  const routerRoot = variant === 'rider' ? './src/rider-app' : './src/admin-app';
  const location = 'RideGo Rider uses your location to show nearby jobs and navigate to pickups and drop-offs.';
  const withRouterRoot = (plugins: ExpoConfig['plugins'] = []) =>
    plugins.map((p) => {
      if (p === 'expo-router') return ['expo-router', { root: routerRoot }] as [string, unknown];
      if (variant === 'rider' && Array.isArray(p) && p[0] === 'expo-location') return ['expo-location', { locationWhenInUsePermission: location }] as [string, unknown];
      if (variant === 'rider' && Array.isArray(p) && p[0] === 'expo-notifications') return ['expo-notifications', { ...(p[1] as object), icon: './assets/rider/notification-icon.png', color: '#0F9D58', defaultChannel: 'jobs' }] as [string, unknown];
      if (variant === 'rider' && Array.isArray(p) && p[0] === 'expo-splash-screen') return ['expo-splash-screen', { ...(p[1] as object), image: './assets/rider/splash-icon.png' }] as [string, unknown];
      return p;
    });

  if (variant === 'admin') {
    return { ...base, name: 'RideGo Admin', scheme: 'ridego-admin', orientation: 'default', plugins: withRouterRoot(base.plugins) };
  }
  return {
    ...base,
    name: 'RideGo Rider',
    scheme: 'ridego-rider',
    ios: {
      ...base.ios,
      bundleIdentifier: 'com.ajaridego.ridego.rider',
      infoPlist: { ...base.ios?.infoPlist, NSLocationWhenInUseUsageDescription: location },
    },
    icon: './assets/rider/icon.png',
    android: {
      ...base.android,
      package: 'com.ajaridego.ridego.rider',
      adaptiveIcon: {
        backgroundColor: '#0F9D58',
        foregroundImage: './assets/rider/android-icon-foreground.png',
        backgroundImage: './assets/rider/android-icon-background.png',
        monochromeImage: './assets/rider/android-icon-monochrome.png',
      },
    },
    web: { ...base.web, favicon: './assets/rider/favicon.png' },
    plugins: withRouterRoot(base.plugins),
  };
};
