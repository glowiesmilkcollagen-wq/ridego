import { Link, useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LegalView } from '@/components/LegalModal';
import { LEGAL, LEGAL_TITLES, LegalDoc, SUPPORT_EMAIL } from '@/lib/legal';
import { colors } from '@/lib/theme';

/** Builds /legal/privacy, /legal/terms and /legal/delete-account as real pages for the website. */
export async function generateStaticParams(): Promise<{ doc: string }[]> {
  return (Object.keys(LEGAL) as LegalDoc[]).map((doc) => ({ doc }));
}

/** Public pages (no login): /legal/privacy, /legal/terms, /legal/delete-account — linked from the App Store and Google Play. */
export default function LegalPage() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const known = doc && doc in LEGAL ? (doc as LegalDoc) : null;
  return (
    <ScrollView style={{ backgroundColor: '#fff' }} contentContainerStyle={styles.wrap}>
      <Head>
        <title>{known ? `${LEGAL_TITLES[known]} · RideGo` : 'RideGo'}</title>
        <meta name="description" content="RideGo — Pabili and Pasugo delivery in the Philippines." />
      </Head>
      <Text style={styles.brand}>🛵 RideGo</Text>
      <Text style={styles.title}>{known ? LEGAL_TITLES[known] : 'Page not found'}</Text>
      {known ? <LegalView doc={known} /> : <Text style={{ color: colors.muted }}>Try the links below.</Text>}
      <View style={styles.links}>
        {(Object.keys(LEGAL) as LegalDoc[]).map((d) => (
          <Link key={d} href={`/legal/${d}`} style={styles.link}>{LEGAL_TITLES[d]}</Link>
        ))}
      </View>
      <Text style={{ color: colors.muted }}>Contact: {SUPPORT_EMAIL}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 24, gap: 18, maxWidth: 760, width: '100%', alignSelf: 'center' },
  brand: { fontSize: 18, fontWeight: '800', color: colors.text },
  title: { fontSize: 30, fontWeight: '800', color: colors.text },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16 },
  link: { color: colors.primary, fontWeight: '700' },
});
