import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, SectionTitle } from '@/components/ui';
import { signOut, updateProfile, useMyOrders } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useStore } from '@/lib/store';
import { errorText } from '@/lib/supabase';
import { colors } from '@/lib/theme';

export default function Account() {
  const { state } = useStore();
  const { session, userId, profile, refreshProfile } = useAuth();
  const orders = useMyOrders(userId);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const displayName = profile?.full_name || 'Your name';

  const edit = () => {
    setName(profile?.full_name ?? '');
    setPhone(profile?.phone ?? '');
    setEditing(true);
  };
  const save = async () => {
    try {
      await updateProfile(userId!, name, phone);
      refreshProfile();
      setEditing(false);
    } catch (e) {
      Alert.alert('Could not save', errorText(e));
    }
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
              <View style={styles.avatar}><Text style={{ color: '#fff', fontWeight: '800', fontSize: 22 }}>{displayName[0]?.toUpperCase()}</Text></View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontWeight: '800', fontSize: 18, color: colors.text }}>{displayName}</Text>
                <Text style={{ color: colors.muted }}>{profile?.phone || 'Add your mobile number'} · {session?.user.email}</Text>
              </View>
              <Pressable onPress={edit}><Text style={{ color: colors.primary, fontWeight: '700' }}>Edit</Text></Pressable>
            </View>
          )}
        </Card>

        <Card style={{ paddingVertical: 4 }}>
          <Item icon="home-outline" label="Saved address" sub={state.home.name} onPress={() => router.push('/place-search?target=home')} />
          <Item icon="receipt-text-outline" label="Orders & rides" sub={`${orders.data?.length ?? 0} total`} onPress={() => router.push('/activity')} />
          <Item icon="card-account-details-star-outline" label="Become a rider" sub="Earn with the RideGo Rider app" onPress={() => Alert.alert('Become a RideGo rider', 'Riders use the separate RideGo Rider app to receive jobs, navigate and track earnings. It will be available on the App Store and Google Play.')} last />
        </Card>

        <Card>
          <SectionTitle>About</SectionTitle>
          <Text style={{ color: colors.muted, lineHeight: 20 }}>
            RideGo v2.0 — Pabili (we buy food, medicine, groceries or anything) and Pasugo (pick up & deliver anything, or anyone). For pabili the rider buys at any store and the app only charges the delivery fee. Orders are matched with real RideGo riders near you.
          </Text>
        </Card>

        <Button
          title="Log out" variant="ghost" color={colors.danger}
          onPress={() => Alert.alert('Log out?', '', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Log out', style: 'destructive', onPress: signOut },
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
