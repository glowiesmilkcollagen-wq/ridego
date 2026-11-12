import { router } from 'expo-router';
import { Alert } from 'react-native';
import { Stop } from '@/lib/trips';
import { useStore } from '@/lib/store';

/**
 * Sets where the rider should buy from, then opens the order screen.
 * Asks first if that would throw away a shopping list started for another store.
 */
export function useStartErrand() {
  const { state, setErrandStore } = useStore();
  return (store: Stop, storeId: string | null, navigate: 'push' | 'replace' = 'push') => {
    const go = () => {
      setErrandStore(store, storeId);
      router[navigate]('/order');
    };
    const { errand } = state;
    const sameStore = errand.store && (storeId ? errand.storeId === storeId : errand.store.name === store.name);
    if (errand.items.length && !sameStore) {
      Alert.alert('Start a new list?', `You have items to buy from ${errand.store?.name}. Switching stores clears that list.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'New list', style: 'destructive', onPress: go },
      ]);
    } else go();
  };
}
