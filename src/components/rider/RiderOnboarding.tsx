import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui';
import { Rider, registerRider, signOut } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Vehicle, VEHICLES } from '@/lib/pricing';
import { errorText } from '@/lib/supabase';
import { colors, radius } from '@/lib/theme';

/** Rider sign-up form (also used to edit vehicle details later). Sends the application to the admin for approval. */
export function RiderForm({ rider, onDone, submitLabel = 'Submit application' }: { rider?: Rider | null; onDone: (r: Rider) => void; submitLabel?: string }) {
  const { profile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [vehicle, setVehicle] = useState<Vehicle>(rider?.vehicle ?? 'moto');
  const [plate, setPlate] = useState(rider?.plate ?? '');
  const [licenseNo, setLicenseNo] = useState(rider?.license_no ?? '');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!fullName.trim() || !phone.trim()) return Alert.alert('Missing details', 'Enter your full name and mobile number.');
    setBusy(true);
    try {
      onDone(await registerRider({ fullName, phone, vehicle, plate, licenseNo }));
    } catch (e) {
      Alert.alert('Could not save', errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: 10 }}>
      <TextInput value={fullName} onChangeText={setFullName} placeholder="Full name (as on your license)" placeholderTextColor={colors.muted} style={styles.input} />
      <TextInput value={phone} onChangeText={setPhone} placeholder="Mobile number" keyboardType="phone-pad" placeholderTextColor={colors.muted} style={styles.input} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {(Object.keys(VEHICLES) as Vehicle[]).map((v) => (
          <Pressable key={v} onPress={() => setVehicle(v)} style={[styles.vehicle, vehicle === v && { borderColor: colors.ride, backgroundColor: colors.rideSoft }]}>
            <MaterialCommunityIcons name={VEHICLES[v].icon as any} size={26} color={colors.text} />
            <Text style={{ fontWeight: '700', color: colors.text, marginTop: 4 }}>{VEHICLES[v].label}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput value={plate} onChangeText={setPlate} placeholder="Plate number" autoCapitalize="characters" placeholderTextColor={colors.muted} style={styles.input} />
      <TextInput value={licenseNo} onChangeText={setLicenseNo} placeholder="Driver's license number" autoCapitalize="characters" placeholderTextColor={colors.muted} style={styles.input} />
      <Button title={submitLabel} color={colors.ride} onPress={submit} loading={busy} />
    </View>
  );
}

export function RegisterScreen({ onDone }: { onDone: (r: Rider) => void }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
          <Text style={{ fontSize: 48, textAlign: 'center' }}>🏍️</Text>
          <Text style={styles.title}>Become a RideGo rider</Text>
          <Text style={styles.subtitle}>Tell us about you and your vehicle. RideGo reviews every application before you can take jobs.</Text>
          <RiderForm onDone={onDone} />
          <Button title="Log out" variant="ghost" color={colors.muted} onPress={signOut} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function StatusScreen({ rider, onRefresh }: { rider: Rider; onRefresh: () => void }) {
  const pending = rider.status === 'pending';
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}>
      <View style={styles.wrap}>
        <Text style={{ fontSize: 48, textAlign: 'center' }}>{pending ? '⏳' : '⛔'}</Text>
        <Text style={styles.title}>{pending ? 'Application received' : 'Account suspended'}</Text>
        <Text style={styles.subtitle}>
          {pending
            ? `We're reviewing your details (${VEHICLES[rider.vehicle].label} · ${rider.plate}). You can take jobs as soon as RideGo approves your account.`
            : 'Your rider account is suspended. Please contact RideGo support.'}
        </Text>
        <Button title="Check again" color={colors.ride} onPress={onRefresh} />
        <Button title="Log out" variant="ghost" color={colors.muted} onPress={signOut} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 24, paddingTop: 40, gap: 12, maxWidth: 480, width: '100%', alignSelf: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: colors.text, textAlign: 'center' },
  subtitle: { color: colors.muted, textAlign: 'center', marginBottom: 8, lineHeight: 20 },
  input: { borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff', borderRadius: 10, padding: 14, fontSize: 16, color: colors.text },
  vehicle: { flex: 1, alignItems: 'center', padding: 12, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: '#fff' },
});
