import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * One codebase, two apps:
 * - default            → "RideGo", the customer app (screens in src/app)
 * - APP_VARIANT=rider  → "RideGo Rider", the rider app (screens in src/rider-app)
 * Everything else comes from app.json.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const base = config as ExpoConfig;
  if (process.env.APP_VARIANT !== 'rider') return base;

  const location = 'RideGo Rider uses your location to show nearby jobs and navigate to pickups and drop-offs.';
  return {
    ...base,
    name: 'RideGo Rider',
    scheme: 'ridego-rider',
    ios: {
      ...base.ios,
      bundleIdentifier: 'com.ajaridego.ridego.rider',
      infoPlist: { ...base.ios?.infoPlist, NSLocationWhenInUseUsageDescription: location },
    },
    android: { ...base.android, package: 'com.ajaridego.ridego.rider' },
    plugins: (base.plugins ?? []).map((p) => {
      if (p === 'expo-router') return ['expo-router', { root: './src/rider-app' }];
      if (Array.isArray(p) && p[0] === 'expo-location') return ['expo-location', { locationWhenInUsePermission: location }];
      return p;
    }),
  };
};
