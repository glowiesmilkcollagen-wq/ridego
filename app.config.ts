import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * One codebase, three apps (everything not set here comes from app.json):
 * - default            → "RideGo", the customer app (screens in src/app)
 * - APP_VARIANT=rider  → "RideGo Rider", the rider app (screens in src/rider-app)
 * - APP_VARIANT=admin  → "RideGo Admin", the admin dashboard website (screens in src/admin-app)
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const base = config as ExpoConfig;
  const variant = process.env.APP_VARIANT;
  if (variant !== 'rider' && variant !== 'admin') return base;

  const routerRoot = variant === 'rider' ? './src/rider-app' : './src/admin-app';
  const location = 'RideGo Rider uses your location to show nearby jobs and navigate to pickups and drop-offs.';
  const withRouterRoot = (plugins: ExpoConfig['plugins'] = []) =>
    plugins.map((p) => {
      if (p === 'expo-router') return ['expo-router', { root: routerRoot }] as [string, unknown];
      if (variant === 'rider' && Array.isArray(p) && p[0] === 'expo-location') return ['expo-location', { locationWhenInUsePermission: location }] as [string, unknown];
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
    android: { ...base.android, package: 'com.ajaridego.ridego.rider' },
    plugins: withRouterRoot(base.plugins),
  };
};
