import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { checkPromo, OrderKind } from '@/lib/api';
import { errorText } from '@/lib/supabase';
import { colors, peso, radius } from '@/lib/theme';

export type AppliedPromo = { code: string; discount: number; description: string } | null;

/** Promo code entry; the server checks the code again when the order is placed. */
export default function PromoField({ kind, baseFee, value, onChange }: { kind: OrderKind; baseFee: number; value: AppliedPromo; onChange: (p: AppliedPromo) => void }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const apply = async () => {
    const c = code.trim().toUpperCase();
    if (!c) return;
    setBusy(true);
    setMessage('');
    try {
      const r = await checkPromo(c, kind, baseFee);
      onChange({ code: c, ...r });
    } catch (e) {
      onChange(null);
      setMessage(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  if (value) {
    return (
      <View style={styles.applied}>
        <Text style={{ flex: 1, color: colors.ride, fontWeight: '700' }}>
          {value.code}: −{peso(value.discount)}{value.description ? ` · ${value.description}` : ''}
        </Text>
        <Pressable onPress={() => { onChange(null); setCode(''); }} hitSlop={8}><Text style={{ color: colors.muted, fontWeight: '700' }}>Remove</Text></Pressable>
      </View>
    );
  }
  return (
    <View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <TextInput value={code} onChangeText={setCode} placeholder="Promo code" autoCapitalize="characters" placeholderTextColor={colors.muted} style={[styles.input, { width: '100%' }]} onSubmitEditing={apply} />
        </View>
        <Pressable onPress={apply} disabled={busy || !code.trim()} style={[styles.btn, (!code.trim() || busy) && { opacity: 0.4 }]}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>{busy ? '…' : 'Apply'}</Text>
        </Pressable>
      </View>
      {message ? <Text style={{ color: colors.danger, marginTop: 6 }}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: colors.text },
  btn: { backgroundColor: colors.text, borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },
  applied: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.rideSoft, borderRadius: radius.md, padding: 12 },
});
