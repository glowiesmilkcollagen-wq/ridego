import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { resetPasswordWithCode, sendPasswordResetCode, signIn, signUp } from '@/lib/api';
import { errorText } from '@/lib/supabase';
import { colors, radius } from '@/lib/theme';
import { useLegal } from './LegalModal';
import { Button } from './ui';

/** Email + password login and sign-up, shared by the customer and rider apps. */
export default function AuthScreen({ title, subtitle, emoji, color = colors.primary, allowSignUp = true }: {
  title: string; subtitle: string; emoji: string; color?: string; allowSignUp?: boolean;
}) {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [info, setInfo] = useState('');
  const [openLegal, legal] = useLegal();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const submit = async () => {
    setMessage('');
    if (mode === 'reset') return reset();
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

  // Forgot password: email a 6-digit code, then enter it with a new password.
  const reset = async () => {
    setMessage(''); setInfo('');
    if (!email.trim()) return setMessage('Enter the email of your account.');
    setBusy(true);
    try {
      if (!codeSent) {
        await sendPasswordResetCode(email);
        setCodeSent(true);
        setInfo(`We sent a 6-digit code to ${email.trim()}. Check your inbox (and spam folder).`);
      } else {
        if (!code.trim() || !password) { setMessage('Enter the code and a new password.'); return; }
        await resetPasswordWithCode(email, code, password);
      }
    } catch (e) {
      setMessage(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  const switchMode = (m: typeof mode) => { setMode(m); setMessage(''); setInfo(''); setCodeSent(false); setCode(''); setPassword(''); };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
          <Text style={{ fontSize: 56, textAlign: 'center' }}>{emoji}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          {allowSignUp && mode !== 'reset' && <View style={styles.tabs}>
            {(['login', 'signup'] as const).map((m) => (
              <Pressable key={m} onPress={() => switchMode(m)} style={[styles.tab, mode === m && { backgroundColor: '#fff' }]}>
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
          {mode === 'reset' && <Text style={[styles.h2]}>Reset your password</Text>}
          <TextInput value={email} onChangeText={setEmail} editable={!(mode === 'reset' && codeSent)} placeholder="Email" autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholderTextColor={colors.muted} style={styles.input} />
          {mode === 'reset' && codeSent && (
            <TextInput value={code} onChangeText={setCode} placeholder="6-digit code from the email" keyboardType="number-pad" autoComplete="one-time-code" maxLength={10} placeholderTextColor={colors.muted} style={styles.input} />
          )}
          {(mode !== 'reset' || codeSent) && (
            <TextInput value={password} onChangeText={setPassword} placeholder={mode === 'reset' ? 'New password (at least 6 characters)' : 'Password (at least 6 characters)'} secureTextEntry autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholderTextColor={colors.muted} style={styles.input} onSubmitEditing={submit} />
          )}

          {info ? <Text style={styles.info}>{info}</Text> : null}
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <Button
            title={mode === 'login' ? 'Log in' : mode === 'signup' ? 'Create account' : codeSent ? 'Set new password' : 'Email me a code'}
            onPress={submit} loading={busy} color={color} style={{ marginTop: 6 }}
          />
          {mode === 'login' && (
            <Pressable onPress={() => switchMode('reset')} style={{ alignSelf: 'center', padding: 6 }}>
              <Text style={{ color, fontWeight: '700' }}>Forgot password?</Text>
            </Pressable>
          )}
          {mode === 'reset' && (
            <Pressable onPress={() => switchMode('login')} style={{ alignSelf: 'center', padding: 6 }}>
              <Text style={{ color, fontWeight: '700' }}>Back to log in</Text>
            </Pressable>
          )}
          <Text style={styles.legal}>
            {mode === 'signup' ? 'By creating an account you agree to our ' : 'See our '}
            <Text style={styles.link} onPress={() => openLegal('terms')}>Terms of service</Text> and{' '}
            <Text style={styles.link} onPress={() => openLegal('privacy')}>Privacy policy</Text>.
          </Text>
          {legal}
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
  info: { color: colors.text, textAlign: 'center', lineHeight: 20 },
  h2: { fontSize: 18, fontWeight: '800', color: colors.text, textAlign: 'center' },
  legal: { color: colors.muted, textAlign: 'center', fontSize: 13, lineHeight: 19, marginTop: 8 },
  link: { color: colors.text, textDecorationLine: 'underline', fontWeight: '600' },
});
