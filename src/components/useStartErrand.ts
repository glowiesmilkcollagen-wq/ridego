import { router } from 'expo-router';
import { Alert } from 'react-native';
import { usePrices } from '@/lib/api';
import { peso } from '@/lib/theme';
import { Stop } from '@/lib/trips';
import { hasStore, MAX_STORES, useStore } from '@/lib/store';

/**
 * Picking a store from the Pabili tab: starts an order with it, or — if an order with other stores is in progress —
 * asks whether to add this store to it (each store adds a per-store fee) or start a new order.
 */
export function useStartErrand() {
  const { state, addErrandStore, clearErrand } = useStore();
  const prices = usePrices();
  return (store: Stop, storeId: string | null, navigate: 'push' | 'replace' = 'push') => {
    const go = () => router[navigate]('/order');
    const { stops } = state.errand;
    const startNew = () => { clearErrand(); addErrandStore(store, storeId); go(); };
    if (!stops.length || hasStore(state.errand, store, storeId)) {
      if (!stops.length) addErrandStore(store, storeId);
      return go();
    }
    if (stops.length >= MAX_STORES) {
      return Alert.alert('Order is full', `An order can include up to ${MAX_STORES} stores.`, [
        { text: 'Keep my order', style: 'cancel', onPress: go },
        { text: 'Start a new order', style: 'destructive', onPress: startNew },
      ]);
    }
    const names = stops.map((st) => st.store.name).join(', ');
    Alert.alert(`Add ${store.name}?`, `Your order already has ${names}. Each extra store adds ${peso(prices.pabili_per_store)}.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Start a new order', style: 'destructive', onPress: startNew },
      { text: `Add to order (+${peso(prices.pabili_per_store)})`, onPress: () => { addErrandStore(store, storeId); go(); } },
    ]);
  };
}
