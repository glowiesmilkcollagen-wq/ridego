import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Badge, confirmAction, notify, Page, Panel, Segmented, SmallButton, Table } from '@/components/admin/ui';
import { RiderWithProfile, setRiderStatus, useRiders } from '@/lib/adminApi';
import { RiderStatus } from '@/lib/api';
import { VEHICLES } from '@/lib/pricing';
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

  return (
    <Page title="Riders" subtitle="Check each applicant's license and plate before approving. Only approved riders can go online and take jobs.">
      <Segmented value={tab} onChange={setTab} options={[
        { value: 'pending', label: `Applications (${count('pending')})` },
        { value: 'approved', label: `Approved (${count('approved')})` },
        { value: 'suspended', label: `Suspended (${count('suspended')})` },
      ]} />
      <Panel>
        <Table
          head={['Name', 'Mobile', 'Vehicle', 'Plate', 'License no.', tab === 'approved' ? 'Online' : 'Applied', '']}
          widths={[1.5, 1.1, 1, 1, 1.3, 1.2, 1.6]}
          rows={list.map((r) => [
            r.profile?.full_name || '—',
            r.profile?.phone || '—',
            VEHICLES[r.vehicle].label,
            r.plate,
            r.license_no,
            tab === 'approved'
              ? <View key="o" style={{ gap: 2 }}><Badge text={r.online ? 'Online' : 'Offline'} tone={r.online ? 'good' : 'neutral'} /><Text style={{ color: colors.muted, fontSize: 12 }}>GPS {ago(r.location_at)}</Text></View>
              : new Date(r.created_at).toLocaleDateString(),
            <View key="a" style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              {r.status !== 'approved' && <SmallButton title={r.status === 'pending' ? 'Approve' : 'Reactivate'} tone="primary" onPress={() => change(r, 'approved', r.status === 'pending' ? 'Approve' : 'Reactivate')} />}
              {r.status !== 'suspended' && <SmallButton title={r.status === 'pending' ? 'Reject' : 'Suspend'} tone="danger" onPress={() => change(r, 'suspended', r.status === 'pending' ? 'Reject' : 'Suspend')} />}
            </View>,
          ])}
          empty={riders.loaded ? (tab === 'pending' ? 'No applications waiting.' : 'No riders here.') : 'Loading…'}
        />
      </Panel>
    </Page>
  );
}
