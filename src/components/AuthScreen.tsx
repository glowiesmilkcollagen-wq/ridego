import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signIn, signUp } from '@/lib/api';
import { errorText } from '@/lib/supabase';
import { colors, radius } from '@/lib/theme';
import { Button } from './ui';

/** Email + password login and sign-up, shared by the customer and rider apps. */
export default function AuthScreen({ title, subtitle, emoji, color = colors.primary, allowSignUp = true }: {
  title: string; subtitle: string; emoji: string; color?: string; allowSignUp?: boolean;
}) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const submit = async () => {
    setMessage('');
    if (!email.trim() || !password) return setMessage('Enter your email and password.');
    if (mode === 'signup' && !name.trim()) return setMessage('Enter your name.');
    setBusy(true);
    try {
      if (mode === 'login') await signIn(email, password);
      else await signUp(email, password, name, phone);
    } catch (e) {
      setMessage(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
          <Text style={{ fontSize: 56, textAlign: 'center' }}>{emoji}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          {allowSignUp && <View style={styles.tabs}>
            {(['login', 'signup'] as const).map((m) => (
              <Pressable key={m} onPress={() => { setMode(m); setMessage(''); }} style={[styles.tab, mode === m && { backgroundColor: '#fff' }]}>
                <Text style={{ fontWeight: '700', color: mode === m ? colors.text : colors.muted }}>{m === 'login' ? 'Log in' : 'Create account'}</Text>
              </Pressable>
            ))}
          </View>}

          {mode === 'signup' && (
            <>
              <TextInput value={name} onChangeText={setName} placeholder="Full name" placeholderTextColor={colors.muted} style={styles.input} autoComplete="name" />
              <TextInput value={phone} onChangeText={setPhone} placeholder="Mobile number" keyboardType="phone-pad" placeholderTextColor={colors.muted} style={styles.input} autoComplete="tel" />
            </>
          )}
          <TextInput value={email} onChangeText={setEmail} placeholder="Email" autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholderTextColor={colors.muted} style={styles.input} />
          <TextInput value={password} onChangeText={setPassword} placeholder="Password (at least 6 characters)" secureTextEntry autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholderTextColor={colors.muted} style={styles.input} onSubmitEditing={submit} />

          {message ? <Text style={styles.message}>{message}</Text> : null}
          <Button title={mode === 'login' ? 'Log in' : 'Create account'} onPress={submit} loading={busy} color={color} style={{ marginTop: 6 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Shown when the app was built without the Supabase settings in `.env`. */
export function NotConfigured() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: 24 }}>
      <Text style={{ fontSize: 48, textAlign: 'center' }}>🔌</Text>
      <Text style={styles.title}>Server not connected</Text>
      <Text style={styles.subtitle}>
        Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to the .env file, then restart the app. See README.md → “Connect the database”.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 24, paddingTop: 48, gap: 12, maxWidth: 480, width: '100%', alignSelf: 'center' },
  title: { fontSize: 26, fontWeight: '800', color: colors.text, textAlign: 'center' },
  subtitle: { color: colors.muted, textAlign: 'center', marginBottom: 12, lineHeight: 20 },
  tabs: { flexDirection: 'row', backgroundColor: colors.border, borderRadius: radius.md, padding: 4, marginBottom: 4 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.sm },
  input: { borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff', borderRadius: 10, padding: 14, fontSize: 16, color: colors.text },
  message: { color: colors.danger, textAlign: 'center' },
});
