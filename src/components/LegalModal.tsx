import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LEGAL, LEGAL_TITLES, LegalDoc, UPDATED } from '@/lib/legal';
import { colors } from '@/lib/theme';

/** The text of a legal page (privacy policy, terms, account deletion). */
export function LegalView({ doc }: { doc: LegalDoc }) {
  return (
    <View style={{ gap: 18 }}>
      {LEGAL[doc].map((s) => (
        <View key={s.heading} style={{ gap: 6 }}>
          <Text style={styles.h2}>{s.heading}</Text>
          {s.body.map((p, i) => <Text key={i} style={styles.p}>{p}</Text>)}
        </View>
      ))}
      <Text style={{ color: colors.muted, fontSize: 12 }}>Last updated {UPDATED}</Text>
    </View>
  );
}

/** Opens a legal page in a full-screen pop-up; works on the login screen too. Returns [open, element]. */
export function useLegal(): [(doc: LegalDoc) => void, React.ReactNode] {
  const [doc, setDoc] = useState<LegalDoc | null>(null);
  const open = useCallback((d: LegalDoc) => setDoc(d), []);
  const element = (
    <Modal visible={!!doc} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setDoc(null)}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={styles.bar}>
          <Text style={styles.title}>{doc ? LEGAL_TITLES[doc] : ''}</Text>
          <Pressable accessibilityLabel="Close" onPress={() => setDoc(null)} hitSlop={12}>
            <MaterialCommunityIcons name="close" size={26} color={colors.text} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
          {doc && <LegalView doc={doc} />}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
  return [open, element];
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: '#fff' },
  title: { flex: 1, fontSize: 20, fontWeight: '800', color: colors.text },
  h2: { fontSize: 17, fontWeight: '800', color: colors.text },
  p: { color: colors.text, lineHeight: 22 },
});
