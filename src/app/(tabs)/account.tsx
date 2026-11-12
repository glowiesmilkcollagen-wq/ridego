import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, SectionTitle } from '@/components/ui';
import { useStore } from '@/lib/store';
import { colors } from '@/lib/theme';

export default function Account() {
  const { state, setProfile, resetAll } = useStore();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(state.profile.name);
  const [phone, setPhone] = useState(state.profile.phone);

  const save = () => {
    setProfile({ name: name.trim() || 'Guest', phone: phone.trim() });
    setEditing(false);
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        <Text style={{ fontSize: 26, fontWeight: '800', color: colors.text }}>Account</Text>
        <Card>
          {editing ? (
            <View style={{ gap: 10 }}>
              <TextInput value={name} onChangeText={setName} placeholder="Full name" style={styles.input} placeholderTextColor={colors.muted} />
              <TextInput value={phone} onChangeText={setPhone} placeholder="Mobile number" keyboardType="phone-pad" style={styles.input} placeholderTextColor={colors.muted} />
              <Button title="Save" onPress={save} />
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.avatar}><Text style={{ color: '#fff', fontWeight: '800', fontSize: 22 }}>{state.profile.name[0]?.toUpperCase()}</Text></View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontWeight: '800', fontSize: 18, color: colors.text }}>{state.profile.name}</Text>
                <Text style={{ color: colors.muted }}>{state.profile.phone || 'Add your mobile number'}</Text>
              </View>
              <Pressable onPress={() => setEditing(true)}><Text style={{ color: colors.primary, fontWeight: '700' }}>Edit</Text></Pressable>
            </View>
          )}
        </Card>

        <Card style={{ paddingVertical: 4 }}>
          <Item icon="home-outline" label="Saved address" sub={state.home.name} onPress={() => router.push('/place-search?target=home')} />
          <Item icon="receipt-text-outline" label="Orders & rides" sub={`${state.trips.length} total`} onPress={() => router.push('/activity')} />
          <Item icon="card-account-details-star-outline" label="Become a rider" sub="Earn with the RideGo Rider app" onPress={() => Alert.alert('Become a RideGo rider', 'Riders use the separate RideGo Rider app to receive jobs, navigate and track earnings. It will be available on the App Store and Google Play.')} last />
        </Card>

        <Card>
          <SectionTitle>About</SectionTitle>
          <Text style={{ color: colors.muted, lineHeight: 20 }}>
            RideGo v1.3 — Pabili (we buy food, medicine, groceries or anything) and Pasugo (pick up & deliver anything, or anyone). For pabili the rider buys at any store and the app only charges the delivery fee. This build runs on demo data: riders and trip progress are simulated on the device.
          </Text>
        </Card>

        <Button
          title="Reset app data" variant="ghost" color={colors.danger}
          onPress={() => Alert.alert('Reset all data?', 'Clears your cart, orders, rides and rider earnings.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Reset', style: 'destructive', onPress: resetAll },
          ])}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function Item({ icon, label, sub, onPress, last }: { icon: string; label: string; sub?: string; onPress: () => void; last?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[styles.item, !last && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
      <MaterialCommunityIcons name={icon as any} size={22} color={colors.text} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ fontWeight: '600', color: colors.text }}>{label}</Text>
        {sub ? <Text style={{ color: colors.muted, marginTop: 2 }} numberOfLines={1}>{sub}</Text> : null}
      </View>
      <MaterialCommunityIcons name="chevron-right" size={22} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, fontSize: 16, color: colors.text },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
});
