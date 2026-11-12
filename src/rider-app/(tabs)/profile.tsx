import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRider } from '@/components/rider/RiderContext';
import { RiderForm } from '@/components/rider/RiderOnboarding';
import { Button, Card, Row, SectionTitle } from '@/components/ui';
import { signOut, useRiderOrders } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { deliveredSince, summarize } from '@/lib/driver';
import { VEHICLES } from '@/lib/pricing';
import { colors, peso } from '@/lib/theme';

export default function Profile() {
  const { userId, profile, session, refreshProfile } = useAuth();
  const { rider, setRider } = useRider();
  const orders = useRiderOrders(userId);
  const [editing, setEditing] = useState(false);
  const all = summarize(deliveredSince(orders.data ?? [], 'all'));
  const rated = (orders.data ?? []).filter((o) => o.rating);
  const rating = rated.length ? (rated.reduce((s, o) => s + (o.rating ?? 0), 0) / rated.length).toFixed(1) : '—';
  const name = profile?.full_name || 'Rider';

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.h1}>Profile</Text>
        <Card>
          {editing ? (
            <RiderForm rider={rider} submitLabel="Save" onDone={(r) => { setRider(r); refreshProfile(); setEditing(false); }} />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.avatar}><Text style={{ color: '#fff', fontWeight: '800', fontSize: 22 }}>{name[0]?.toUpperCase()}</Text></View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontWeight: '800', fontSize: 18, color: colors.text }}>{name}</Text>
                <Text style={{ color: colors.muted }}>{rider ? `${VEHICLES[rider.vehicle].label} · ${rider.plate}` : ''}</Text>
                <Text style={{ color: colors.muted }}>{profile?.phone} · {session?.user.email}</Text>
              </View>
              <Pressable onPress={() => setEditing(true)}><Text style={{ color: colors.ride, fontWeight: '700' }}>Edit</Text></Pressable>
            </View>
          )}
        </Card>

        <Card>
          <SectionTitle>All-time</SectionTitle>
          <Row label="Jobs completed" value={String(all.jobs)} />
          <Row label="Average rating" value={`${rating}${rated.length ? ` ★ (${rated.length})` : ''}`} />
          <Row label="Total earned" value={peso(all.earned)} bold />
        </Card>

        <Card>
          <SectionTitle>About</SectionTitle>
          <Text style={{ color: colors.muted, lineHeight: 20 }}>
            RideGo Rider — receive pabili and pasugo jobs from customers near you, navigate with Google Maps, Waze or Apple Maps,
            and track your earnings. Keep the app open while online so customers can follow you on the map.
          </Text>
        </Card>

        <Button
          title="Log out" variant="ghost" color={colors.danger}
          onPress={() => {
            if (rider?.online) return Alert.alert('Go offline first', 'Switch off “online” on the Jobs tab before logging out.');
            signOut();
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 26, fontWeight: '800', color: colors.text },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.ride, alignItems: 'center', justifyContent: 'center' },
});
