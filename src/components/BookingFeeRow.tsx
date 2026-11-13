import React from 'react';
import { Text, View } from 'react-native';
import { currentBookingFee, Prices } from '@/lib/pricing';
import { colors, peso } from '@/lib/theme';
import { Row } from './ui';

/** The booking fee line at checkout; during the beta it shows as waived. */
export default function BookingFeeRow({ prices }: { prices: Prices }) {
  if (!prices.booking_fee) return null;
  if (!prices.beta_waiver) return <Row label="Booking fee" value={peso(currentBookingFee(prices))} />;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
      <Text style={{ color: colors.muted }}>Booking fee</Text>
      <Text style={{ color: colors.ride, fontWeight: '600' }}>
        <Text style={{ textDecorationLine: 'line-through', color: colors.muted }}>{peso(prices.booking_fee)}</Text>  Waived (beta)
      </Text>
    </View>
  );
}
