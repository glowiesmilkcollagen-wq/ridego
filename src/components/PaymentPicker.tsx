import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { PAYMENT_LABELS, PaymentMethod } from '@/lib/trips';
import { useStore } from '@/lib/store';
import { colors } from '@/lib/theme';

const ICONS: Record<PaymentMethod, string> = { cash: 'cash', gcash: 'wallet-outline', card: 'credit-card-outline' };

export default function PaymentPicker() {
  const { state, setPayment } = useStore();
  return (
    <View>
      {(Object.keys(PAYMENT_LABELS) as PaymentMethod[]).map((m) => {
        const on = state.payment === m;
        return (
          <Pressable key={m} onPress={() => setPayment(m)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}>
            <MaterialCommunityIcons name={ICONS[m] as any} size={22} color={colors.text} />
            <Text style={{ flex: 1, marginLeft: 12, color: colors.text, fontWeight: on ? '700' : '400' }}>{PAYMENT_LABELS[m]}</Text>
            <MaterialCommunityIcons name={on ? 'radiobox-marked' : 'radiobox-blank'} size={22} color={on ? colors.primary : colors.muted} />
          </Pressable>
        );
      })}
    </View>
  );
}
