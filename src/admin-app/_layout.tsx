import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, Slot, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AuthScreen, { NotConfigured } from '@/components/AuthScreen';
import { Button } from '@/components/ui';
import { signOut } from '@/lib/api';
import { AuthProvider, useAuth } from '@/lib/auth';
import { supabaseConfigured } from '@/lib/supabase';
import { colors } from '@/lib/theme';

/** Root of the RideGo admin dashboard (built with APP_VARIANT=admin, mainly used in a web browser). */
export default function AdminLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {supabaseConfigured ? <AuthProvider><Gate /></AuthProvider> : <NotConfigured />}
    </SafeAreaProvider>
  );
}

const NAV = [
  { href: '/', label: 'Overview', icon: 'chart-box-outline' },
  { href: '/orders', label: 'Orders', icon: 'receipt-text-outline' },
  { href: '/riders', label: 'Riders', icon: 'moped-outline' },
  { href: '/payments', label: 'Payments', icon: 'cash-multiple' },
  { href: '/stores', label: 'Stores', icon: 'storefront-outline' },
  { href: '/fees', label: 'Fees & commission', icon: 'tune-variant' },
  { href: '/promotions', label: 'Promotions', icon: 'ticket-percent-outline' },
] as const;

function Gate() {
  const { session, loading, profile } = useAuth();
  const { width } = useWindowDimensions();
  const path = usePathname();
  if (loading) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator color={colors.text} size="large" /></View>;
  if (!session) return <AuthScreen title="RideGo Admin" subtitle="Sign in with an admin account." emoji="🛠️" color={colors.text} allowSignUp={false} />;
  if (profile?.role !== 'admin') {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>Not an admin account</Text>
        <Text style={{ color: colors.muted, textAlign: 'center', maxWidth: 420 }}>
          {session.user.email} is signed in but is not an admin. Make it an admin in Supabase (see README → “Make yourself admin”), then reload.
        </Text>
        <Button title="Log out" variant="outline" color={colors.text} onPress={signOut} />
      </SafeAreaView>
    );
  }
  const wide = width >= 900;
  const active = (href: string) => (href === '/' ? path === '/' : path.startsWith(href));
  const links = NAV.map((n) => (
    <Pressable key={n.href} onPress={() => router.navigate(n.href)} style={[styles.link, wide ? null : styles.linkCompact, active(n.href) && styles.linkActive]}>
      <MaterialCommunityIcons name={n.icon as any} size={20} color={active(n.href) ? '#fff' : colors.text} />
      <Text style={{ marginLeft: 10, fontWeight: '700', color: active(n.href) ? '#fff' : colors.text }}>{n.label}</Text>
    </Pressable>
  ));

  return (
    <SafeAreaView style={{ flex: 1, flexDirection: wide ? 'row' : 'column', backgroundColor: colors.bg }}>
      {wide ? (
        <View style={styles.sidebar}>
          <Text style={styles.brand}>🛵 RideGo Admin</Text>
          <View style={{ gap: 4, flex: 1 }}>{links}</View>
          <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 8 }} numberOfLines={1}>{session.user.email}</Text>
          <Button title="Log out" variant="outline" color={colors.text} onPress={signOut} />
        </View>
      ) : (
        <View style={{ backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 10 }}>
            <Text style={[styles.brand, { flex: 1, marginBottom: 0 }]}>🛵 RideGo Admin</Text>
            <Pressable onPress={signOut}><Text style={{ color: colors.danger, fontWeight: '700' }}>Log out</Text></Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 10, gap: 6 }}>{links}</ScrollView>
        </View>
      )}
      <View style={{ flex: 1 }}><Slot /></View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sidebar: { width: 240, backgroundColor: '#fff', borderRightWidth: 1, borderRightColor: colors.border, padding: 16 },
  brand: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 20 },
  link: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
  linkCompact: { borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff' },
  linkActive: { backgroundColor: colors.text, borderColor: colors.text },
});
