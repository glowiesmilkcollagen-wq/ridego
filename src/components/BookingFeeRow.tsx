import React from 'react';
import { currentBookingFee, Prices } from '@/lib/pricing';
import { colors, peso } from '@/lib/theme';
import { Row } from './ui';

/** The booking fee line at checkout; during the beta it only says it is waived (no amount shown). */
export default function BookingFeeRow({ prices }: { prices: Prices }) {
  if (!prices.booking_fee) return null;
  if (!prices.beta_waiver) return <Row label="Booking fee" value={peso(currentBookingFee(prices))} />;
  return <Row label="Booking fee" value="Waived (beta)" valueColor={colors.ride} />;
}
