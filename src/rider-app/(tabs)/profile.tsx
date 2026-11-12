import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Row, SectionTitle } from '@/components/ui';
import { summarize } from '@/lib/driver';
import { Vehicle, VEHICLES } from '@/lib/pricing';
import { useStore } from '@/lib/store';
import { colors, peso } from '@/lib/theme';

export default function Profile() {
  const { state, setRiderProfile, resetAll } = useStore();
  const p = state.driver.profile;
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(p.name);
  const [phone, setPhone] = useState(p.phone);
  const [plate, setPlate] = useState(p.plate);
  const [vehicle, setVehicle] = useState<Vehicle>(p.vehicle);
  const all = summarize(state.driver.history);

  const save = () => {
    setRiderProfile({ name: name.trim() || 'Rider', phone: phone.trim(), plate: plate.trim().toUpperCase(), vehicle });
    setEditing(false);
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        <Text style={styles.h1}>Profile</Text>
        <Card>
          {editing ? (
            <View style={{ gap: 10 }}>
              <TextInput value={name} onChangeText={setName} placeholder="Full name" placeholderTextColor={colors.muted} style={styles.input} />
              <TextInput value={phone} onChangeText={setPhone} placeholder="Mobile number" keyboardType="phone-pad" placeholderTextColor={colors.muted} style={styles.input} />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {(Object.keys(VEHICLES) as Vehicle[]).map((v) => (
                  <Pressable key={v} onPress={() => setVehicle(v)} style={[styles.vehicle, vehicle === v && { borderColor: colors.ride, backgroundColor: colors.rideSoft }]}>
                    <Text style={{ fontWeight: '700', color: colors.text }}>{VEHICLES[v].label}</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput value={plate} onChangeText={setPlate} placeholder="Plate number" autoCapitalize="characters" placeholderTextColor={colors.muted} style={styles.input} />
              <Button title="Save" color={colors.ride} onPress={save} />
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.avatar}><Text style={{ color: '#fff', fontWeight: '800', fontSize: 22 }}>{p.name[0]?.toUpperCase()}</Text></View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontWeight: '800', fontSize: 18, color: colors.text }}>{p.name}</Text>
                <Text style={{ color: colors.muted }}>{VEHICLES[p.vehicle].label}{p.plate ? ` · ${p.plate}` : ''}</Text>
                <Text style={{ color: colors.muted }}>{p.phone || 'Add your mobile number'}</Text>
              </View>
              <Pressable onPress={() => setEditing(true)}><Text style={{ color: colors.ride, fontWeight: '700' }}>Edit</Text></Pressable>
            </View>
          )}
        </Card>

        <Card>
          <SectionTitle>All-time</SectionTitle>
          <Row label="Jobs completed" value={String(all.jobs)} />
          <Row label="Total earned" value={peso(all.earned)} bold />
        </Card>

        <Card>
          <SectionTitle>About</SectionTitle>
          <Text style={{ color: colors.muted, lineHeight: 20 }}>
            RideGo Rider — receive pabili and pasugo jobs, navigate with Google Maps, Waze or Apple Maps, and track your
            earnings. This build uses demo requests; real customer orders arrive once the apps are connected to a server.
          </Text>
        </Card>

        <Button
          title="Reset rider data" variant="ghost" color={colors.danger}
          onPress={() => Alert.alert('Reset all data?', 'Clears your jobs and earnings on this phone.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Reset', style: 'destructive', onPress: resetAll },
          ])}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 26, fontWeight: '800', color: colors.text },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, fontSize: 16, color: colors.text },
  vehicle: { flex: 1, alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border, backgroundColor: '#fff' },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.ride, alignItems: 'center', justifyContent: 'center' },
});
