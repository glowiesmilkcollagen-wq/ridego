import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { PAYMENT_LABELS, PaymentMethod } from '@/lib/trips';
import { useStore } from '@/lib/store';
import { colors } from '@/lib/theme';

const ICONS: Record<PaymentMethod, string> = { cash: 'cash', gcash: 'wallet-outline', card: 'credit-card-outline' };
/** Payment methods customers can choose today. GCash and cards need a payment provider (e.g. PayMongo) first. */
export const AVAILABLE_PAYMENTS: PaymentMethod[] = ['cash'];

export default function PaymentPicker() {
  const { state, setPayment } = useStore();
  return (
    <View>
      {(Object.keys(PAYMENT_LABELS) as PaymentMethod[]).map((m) => {
        const available = AVAILABLE_PAYMENTS.includes(m);
        const on = state.payment === m && available;
        return (
          <Pressable key={m} disabled={!available} onPress={() => setPayment(m)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, opacity: available ? 1 : 0.45 }}>
            <MaterialCommunityIcons name={ICONS[m] as any} size={22} color={colors.text} />
            <Text style={{ flex: 1, marginLeft: 12, color: colors.text, fontWeight: on ? '700' : '400' }}>
              {PAYMENT_LABELS[m]}{available ? '' : ' — coming soon'}
            </Text>
            {available && <MaterialCommunityIcons name={on ? 'radiobox-marked' : 'radiobox-blank'} size={22} color={on ? colors.primary : colors.muted} />}
          </Pressable>
        );
      })}
    </View>
  );
}

/** The payment to send with an order: the saved choice if it is available, otherwise cash. */
export const paymentFor = (saved: PaymentMethod): PaymentMethod => (AVAILABLE_PAYMENTS.includes(saved) ? saved : 'cash');
