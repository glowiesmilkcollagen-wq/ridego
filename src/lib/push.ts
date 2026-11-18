import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { supabase } from './supabase';

/**
 * Push notifications through Expo's push service. The database sends them (see "Push notifications" in
 * supabase/schema.sql); the apps only ask permission, register this phone's token and open the right screen on tap.
 * Needs a real build (EAS); Expo Go and the web version skip it.
 */
export type PushApp = 'customer' | 'rider';
const native = Platform.OS === 'ios' || Platform.OS === 'android';
let currentToken: string | null = null;

if (native) {
  // Show alerts even while the app is open.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
}

async function setupChannels() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('jobs', {
    name: 'New jobs', importance: Notifications.AndroidImportance.MAX, vibrationPattern: [0, 400, 200, 400], sound: 'default',
  });
  await Notifications.setNotificationChannelAsync('orders', {
    name: 'Order updates', importance: Notifications.AndroidImportance.HIGH, sound: 'default',
  });
}

/** Asks permission (once), gets this phone's Expo push token and saves it for the signed-in user. */
export async function registerForPush(app: PushApp): Promise<string | null> {
  if (!native) return null;
  try {
    await setupChannels();
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return null;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    const { error } = await supabase.rpc('register_push_token', { p_token: token, p_app: app });
    if (error) throw error;
    currentToken = token;
    return token;
  } catch (e) {
    // Expo Go, simulators and phones without Google Play services can't get a token: the app still works.
    console.warn('Push notifications unavailable:', (e as Error)?.message ?? e);
    return null;
  }
}

/** Stops sending this account's alerts to this phone (call before logging out). */
export async function unregisterPush() {
  if (!currentToken) return;
  const token = currentToken;
  currentToken = null;
  await supabase.rpc('unregister_push_token', { p_token: token });
}

/** Registers while signed in, and opens the order (customer) or the jobs tab (rider) when an alert is tapped. */
export function usePushNotifications(app: PushApp, signedIn: boolean) {
  const response = native ? Notifications.useLastNotificationResponse() : null;
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (signedIn) registerForPush(app);
  }, [app, signedIn]);

  useEffect(() => {
    if (!signedIn || !response) return;
    const id = response.notification.request.identifier;
    if (handled.current === id) return;
    handled.current = id;
    const orderId = response.notification.request.content.data?.orderId as string | undefined;
    // Let the screens mount first after a cold start.
    setTimeout(() => {
      try {
        if (app === 'customer' && orderId) router.push(`/track/${orderId}`);
        else if (app === 'rider') router.navigate('/');
      } catch {
        // e.g. a rider still waiting for approval has no tabs yet: the app simply opens.
      }
    }, 300);
  }, [app, signedIn, response]);
}
