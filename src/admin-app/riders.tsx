import React, { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Badge, confirmAction, notify, Page, Panel, Segmented, SmallButton, Table } from '@/components/admin/ui';
import { RiderWithProfile, sendPasswordReset, setRiderEmail, setRiderStatus, useRiders } from '@/lib/adminApi';
import { RiderStatus } from '@/lib/api';
import { errorText } from '@/lib/supabase';
import { colors } from '@/lib/theme';

const ago = (iso: string | null) => {
  if (!iso) return 'never';
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : new Date(iso).toLocaleDateString();
};

export default function Riders() {
  const riders = useRiders();
  const [tab, setTab] = useState<RiderStatus>('pending');
  const all = riders.data ?? [];
  const list = all.filter((r) => r.status === tab);
  const count = (s: RiderStatus) => all.filter((r) => r.status === s).length;

  const change = (r: RiderWithProfile, status: RiderStatus, verb: string) =>
    confirmAction(`${verb} ${r.profile?.full_name || 'this rider'}?`, status === 'suspended' ? 'They will be taken offline and cannot take jobs.' : '', async () => {
      try {
        await setRiderStatus(r.id, status);
        riders.refresh();
      } catch (e) {
        notify('Could not update', errorText(e));
      }
    });

  const [editing, setEditing] = useState<string | null>(null); // rider id whose email is being changed
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const saveEmail = (r: RiderWithProfile) => {
    const email = draft.trim().toLowerCase();
    if (!email || email === r.email) return setEditing(null);
    confirmAction(`Change login email?`, `${r.profile?.full_name || 'This rider'} will log in with ${email} from now on (instead of ${r.email}). Tell them about the change.`, async () => {
      setSaving(true);
      try {
        await setRiderEmail(r.id, email);
        setEditing(null);
        riders.refresh();
        notify('Email changed', `${r.profile?.full_name || 'The rider'} now logs in with ${email}. Their password stays the same.`);
      } catch (e) {
        notify('Could not change email', errorText(e));
      } finally {
        setSaving(false);
      }
    });
  };
  const emailCell = (r: RiderWithProfile) =>
    editing === r.id ? (
      <View key="e" style={{ gap: 6 }}>
        <TextInput
          value={draft} onChangeText={setDraft} autoFocus autoCapitalize="none" keyboardType="email-address" inputMode="email"
          onSubmitEditing={() => saveEmail(r)} placeholder="new@email.com" placeholderTextColor={colors.muted}
          style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, color: colors.text, backgroundColor: '#fff' }}
        />
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <SmallButton title={saving ? 'Saving…' : 'Save'} tone="primary" disabled={saving} onPress={() => saveEmail(r)} />
          <SmallButton title="Cancel" disabled={saving} onPress={() => setEditing(null)} />
        </View>
      </View>
    ) : (
      <View key="e" style={{ gap: 2 }}>
        <Text style={{ color: colors.text }}>{r.email || '—'}</Text>
        <Pressable onPress={() => { setEditing(r.id); setDraft(r.email ?? ''); }} accessibilityRole="button">
          <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>Change email</Text>
        </Pressable>
      </View>
    );

  const reset = (r: RiderWithProfile) =>
    r.email &&
    confirmAction(`Send a reset code to ${r.email}?`, 'They get an email with a 6-digit code to set a new password in the app (Forgot password). Passwords themselves can never be seen.', async () => {
      try {
        await sendPasswordReset(r.email!);
        notify('Code sent', `A reset code was emailed to ${r.email}.`);
      } catch (e) {
        notify('Could not send', errorText(e));
      }
    });

  return (
    <Page title="Riders" subtitle="Check each applicant's license and plate before approving. Only approved riders can go online and take jobs.">
      <Segmented value={tab} onChange={setTab} options={[
        { value: 'pending', label: `Applications (${count('pending')})` },
        { value: 'approved', label: `Approved (${count('approved')})` },
        { value: 'suspended', label: `Suspended (${count('suspended')})` },
      ]} />
      <Panel>
        <Table
          head={['Name', 'Login email', 'Mobile', 'Plate', 'License no.', tab === 'approved' ? 'Online' : 'Applied', '']}
          widths={[1.3, 1.8, 1.1, 0.9, 1.2, 1.1, 1.8]}
          rows={list.map((r) => [
            r.profile?.full_name || '—',
            emailCell(r),
            r.profile?.phone || '—',
            r.plate,
            r.license_no,
            tab === 'approved'
              ? <View key="o" style={{ gap: 2 }}><Badge text={r.online ? 'Online' : 'Offline'} tone={r.online ? 'good' : 'neutral'} /><Text style={{ color: colors.muted, fontSize: 12 }}>GPS {ago(r.location_at)}</Text></View>
              : new Date(r.created_at).toLocaleDateString(),
            <View key="a" style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              {r.status !== 'approved' && <SmallButton title={r.status === 'pending' ? 'Approve' : 'Reactivate'} tone="primary" onPress={() => change(r, 'approved', r.status === 'pending' ? 'Approve' : 'Reactivate')} />}
              {r.email ? <SmallButton title="Send reset code" onPress={() => reset(r)} /> : null}
              {r.status !== 'suspended' && <SmallButton title={r.status === 'pending' ? 'Reject' : 'Suspend'} tone="danger" onPress={() => change(r, 'suspended', r.status === 'pending' ? 'Reject' : 'Suspend')} />}
            </View>,
          ])}
          empty={riders.loaded ? (tab === 'pending' ? 'No applications waiting.' : 'No riders here.') : 'Loading…'}
        />
      </Panel>
    </Page>
  );
}
