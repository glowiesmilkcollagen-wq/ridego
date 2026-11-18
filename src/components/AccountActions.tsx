import { MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import React, { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { confirmAction, notify } from '@/components/admin/ui';
import { deleteMyAccount } from '@/lib/api';
import { SUPPORT_EMAIL } from '@/lib/legal';
import { errorText } from '@/lib/supabase';
import { colors } from '@/lib/theme';
import { useLegal } from './LegalModal';
import { Card } from './ui';

/** Help, privacy policy, terms and "Delete account" — shown in the customer Account tab and the rider Profile tab. */
export function AccountActions({ appName }: { appName: string }) {
  const [openLegal, legal] = useLegal();
  const [deleting, setDeleting] = useState(false);

  const email = () =>
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`${appName} help`)}`).catch(() =>
      notify('No email app found', `Please email us at ${SUPPORT_EMAIL}.`),
    );

  const askDelete = () =>
    confirmAction(
      'Delete your account?',
      'Your login, name, phone number and saved details are deleted permanently. Past orders are kept without your details for our records. This cannot be undone.',
      () =>
        confirmAction('Are you sure?', 'Tap Yes to delete your RideGo account now.', async () => {
          setDeleting(true);
          try {
            await deleteMyAccount();
          } catch (e) {
            setDeleting(false);
            notify('Could not delete your account', errorText(e));
          }
        }),
    );

  return (
    <>
      <Card style={{ paddingVertical: 4 }}>
        <Item icon="lifebuoy" label="Help & support" sub={SUPPORT_EMAIL} onPress={email} />
        <Item icon="shield-lock-outline" label="Privacy policy" onPress={() => openLegal('privacy')} />
        <Item icon="file-document-outline" label="Terms of service" onPress={() => openLegal('terms')} />
        <Pressable onPress={askDelete} disabled={deleting} style={styles.item} accessibilityLabel="Delete account">
          {deleting ? <ActivityIndicator color={colors.danger} /> : <MaterialCommunityIcons name="account-remove-outline" size={22} color={colors.danger} />}
          <Text style={{ flex: 1, marginLeft: 12, fontWeight: '600', color: colors.danger }}>Delete account</Text>
        </Pressable>
      </Card>
      <Text style={{ color: colors.muted, textAlign: 'center', fontSize: 12 }}>
        {appName} {Constants.expoConfig?.version ?? ''}
      </Text>
      {legal}
    </>
  );
}

function Item({ icon, label, sub, onPress }: { icon: string; label: string; sub?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.item, { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
      <MaterialCommunityIcons name={icon as any} size={22} color={colors.text} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ fontWeight: '600', color: colors.text }}>{label}</Text>
        {sub ? <Text style={{ color: colors.muted, marginTop: 2 }}>{sub}</Text> : null}
      </View>
      <MaterialCommunityIcons name="chevron-right" size={22} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
});
