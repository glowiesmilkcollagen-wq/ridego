import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapPreview from '@/components/MapPreview';
import { MapPin } from '@/components/MapPreview.types';
import PaymentPicker from '@/components/PaymentPicker';
import { Button, Card, SectionTitle } from '@/components/ui';
import { etaMinutes, pasugoFee, Vehicle, VEHICLES } from '@/lib/pricing';
import { useRoute } from '@/lib/routing';
import { useStore } from '@/lib/store';
import { Cargo, CARGO } from '@/lib/trips';
import { colors, peso, radius } from '@/lib/theme';

export default function Pasugo() {
  const { state, setPasugoStop, swapPasugoStops, bookPasugo } = useStore();
  const [cargo, setCargo] = useState<Cargo>('document');
  const [vehicle, setVehicle] = useState<Vehicle>('moto');
  const [description, setDescription] = useState('');
  const [senderName, setSenderName] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [receiveMyself, setReceiveMyself] = useState(true);
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [showPay, setShowPay] = useState(false);
  const { pickup, dropoff } = state.pasugoDraft;
  const person = cargo === 'person';

  // By default the rider brings it to you.
  useEffect(() => {
    if (state.ready && !dropoff) setPasugoStop('dropoff', state.home);
  }, [state.ready, dropoff, state.home, setPasugoStop]);

  const { route, loading } = useRoute(pickup?.location, dropoff?.location);
  const km = route?.km ?? 0;
  const pins: MapPin[] = [
    ...(pickup ? [{ id: 'p', coord: pickup.location, kind: 'pickup' as const }] : []),
    ...(dropoff ? [{ id: 'd', coord: dropoff.location, kind: 'dropoff' as const }] : []),
  ];
  const tooShort = !!route && km < 0.3;

  const book = () => {
    if (!pickup || !dropoff || !route) return;
    const missing = [
      !description.trim() && (person ? 'who the rider is picking up' : 'what the rider is picking up'),
      person && !senderPhone.trim() && "the passenger's mobile number",
      !receiveMyself && !receiverPhone.trim() && "the receiver's mobile number",
    ].filter(Boolean);
    if (missing.length) return Alert.alert('A few details missing', `Please add ${missing.join(' and ')}.`);

    const contact = (name: string, phone: string) => (name.trim() || phone.trim() ? { name: name.trim(), phone: phone.trim() } : undefined);
    const id = bookPasugo({
      pickup, dropoff, route, vehicle, cargo, description: description.trim(),
      sender: contact(senderName, senderPhone),
      receiver: receiveMyself ? undefined : contact(receiverName, receiverPhone),
    });
    setDescription(''); setSenderName(''); setSenderPhone(''); setReceiverName(''); setReceiverPhone(''); setReceiveMyself(true);
    router.push(`/track/${id}`);
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
          <View style={{ padding: 16, paddingBottom: 12 }}>
            <Text style={styles.h1}>Pasugo</Text>
            <Text style={{ color: colors.muted, marginTop: 4, lineHeight: 20 }}>
              A rider picks up a folder, a bag, or even a person, and brings it to you or anywhere you choose.
            </Text>
          </View>
          {pins.length > 1 && <MapPreview pins={pins} path={route?.path} height={190} />}

          <View style={{ padding: 16, gap: 14 }}>
            <View>
              <SectionTitle>What are we picking up?</SectionTitle>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {(Object.keys(CARGO) as Cargo[]).map((k) => {
                  const on = k === cargo;
                  return (
                    <Pressable key={k} onPress={() => setCargo(k)} style={[styles.cargo, on && { borderColor: colors.ride, backgroundColor: colors.rideSoft }]}>
                      <Text style={{ fontSize: 28 }}>{CARGO[k].emoji}</Text>
                      <Text style={[styles.cargoText, on && { color: colors.ride }]}>{CARGO[k].label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <Card style={{ paddingVertical: 6 }}>
              <StopRow color={colors.ride} label="Pick up from" value={pickup?.name} placeholder="Where do we pick it up?" onPress={() => router.push('/place-search?target=pickup')} />
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1, height: 1, backgroundColor: colors.border, marginLeft: 34 }} />
                <Pressable accessibilityLabel="Swap pickup and drop-off" onPress={swapPasugoStops} style={styles.swap}>
                  <MaterialCommunityIcons name="swap-vertical" size={18} color={colors.text} />
                </Pressable>
              </View>
              <StopRow color={colors.primary} label="Bring to" value={dropoff?.name} placeholder="Where should it go?" onPress={() => router.push('/place-search?target=dropoff')} />
            </Card>

            <Card>
              <SectionTitle>{person ? 'Who are we picking up?' : 'What exactly?'}</SectionTitle>
              <TextInput
                value={description} onChangeText={setDescription} multiline placeholder={CARGO[cargo].example}
                placeholderTextColor={colors.muted} style={[styles.input, { minHeight: 56, textAlignVertical: 'top' }]}
              />
              <Text style={styles.label}>{person ? 'Passenger contact' : 'Person at the pickup (optional)'}</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <HalfInput value={senderName} onChangeText={setSenderName} placeholder="Name" placeholderTextColor={colors.muted} />
                <HalfInput value={senderPhone} onChangeText={setSenderPhone} placeholder="Mobile no." keyboardType="phone-pad" placeholderTextColor={colors.muted} />
              </View>

              <View style={styles.toggle}>
                <Text style={{ flex: 1, color: colors.text, fontWeight: '600' }}>{person ? "I'll meet them at the drop-off" : "I'll receive it myself"}</Text>
                <Switch value={receiveMyself} onValueChange={setReceiveMyself} trackColor={{ true: colors.ride }} />
              </View>
              {!receiveMyself && (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <HalfInput value={receiverName} onChangeText={setReceiverName} placeholder="Receiver name" placeholderTextColor={colors.muted} />
                  <HalfInput value={receiverPhone} onChangeText={setReceiverPhone} placeholder="Mobile no." keyboardType="phone-pad" placeholderTextColor={colors.muted} />
                </View>
              )}
            </Card>

            {pickup && dropoff && !route ? (
              <Text style={{ color: colors.muted, textAlign: 'center', paddingVertical: 12 }}>Calculating the road route…</Text>
            ) : pickup && dropoff && route ? (
              <>
                <Text style={{ color: colors.muted }}>{route.estimated ? `about ${km.toFixed(1)} km (estimated)` : `${km.toFixed(1)} km by road`} · about {etaMinutes(km, vehicle)} min after pickup</Text>
                {route.estimated && (
                  <Text style={{ color: colors.warning, fontSize: 13 }}>Couldn't reach the map service, so this distance is estimated.</Text>
                )}
                {(Object.keys(VEHICLES) as Vehicle[]).map((k) => {
                  const t = VEHICLES[k];
                  const on = k === vehicle;
                  return (
                    <Pressable key={k} onPress={() => setVehicle(k)} style={[styles.option, on && { borderColor: colors.ride, backgroundColor: colors.rideSoft }]}>
                      <MaterialCommunityIcons name={t.icon as any} size={34} color={colors.text} />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={{ fontWeight: '800', fontSize: 16, color: colors.text }}>{t.label}</Text>
                        <Text style={{ color: colors.muted, marginTop: 2 }}>{t.blurb}</Text>
                      </View>
                      <Text style={{ fontWeight: '800', fontSize: 16, color: colors.text }}>{peso(pasugoFee(km, k))}</Text>
                    </Pressable>
                  );
                })}

                <Card style={{ paddingVertical: 8 }}>
                  <Pressable onPress={() => setShowPay((v) => !v)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}>
                    <MaterialCommunityIcons name="wallet-outline" size={22} color={colors.text} />
                    <Text style={{ flex: 1, marginLeft: 12, fontWeight: '600', color: colors.text }}>Payment: {state.payment.toUpperCase()}</Text>
                    <MaterialCommunityIcons name={showPay ? 'chevron-up' : 'chevron-down'} size={22} color={colors.muted} />
                  </Pressable>
                  {showPay && <PaymentPicker />}
                </Card>

                {person && vehicle === 'moto' && (
                  <View style={styles.safety}>
                    <MaterialCommunityIcons name="racing-helmet" size={20} color={colors.ride} />
                    <Text style={{ marginLeft: 8, flex: 1, color: colors.text }}>The rider brings a spare helmet for your passenger.</Text>
                  </View>
                )}

                <Button
                  title={tooShort ? 'Pickup and drop-off are too close' : `Book pasugo · ${peso(pasugoFee(km, vehicle))}`}
                  color={colors.ride} onPress={book} disabled={tooShort}
                />
              </>
            ) : (
              <View style={{ alignItems: 'center', paddingTop: 12 }}>
                <Text style={{ fontSize: 48 }}>📦</Text>
                <Text style={{ color: colors.muted, marginTop: 6, textAlign: 'center' }}>Choose where to pick up to see the fee.</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Half-width text box; the wrapper View does the sizing so two boxes share a row on every platform. */
function HalfInput(props: React.ComponentProps<typeof TextInput>) {
  return (
    <View style={{ flex: 1 }}>
      <TextInput placeholderTextColor={colors.muted} {...props} style={[styles.input, { width: '100%' }]} />
    </View>
  );
}

function StopRow({ color, label, value, placeholder, onPress }: { color: string; label: string; value?: string; placeholder: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}>
      <View style={{ width: 22, alignItems: 'center' }}><View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: color }} /></View>
      <View style={{ marginLeft: 12, flex: 1 }}>
        <Text style={{ color: colors.muted, fontSize: 12 }}>{label}</Text>
        <Text style={{ fontWeight: '700', fontSize: 15, color: value ? colors.text : colors.muted }} numberOfLines={1}>{value ?? placeholder}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 26, fontWeight: '800', color: colors.text },
  cargo: {
    flex: 1, alignItems: 'center', backgroundColor: '#fff', borderRadius: radius.lg, paddingVertical: 12, paddingHorizontal: 6,
    borderWidth: 1.5, borderColor: colors.border,
  },
  cargoText: { marginTop: 6, fontWeight: '700', color: colors.text, textAlign: 'center', fontSize: 13 },
  swap: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: colors.text },
  label: { color: colors.muted, marginTop: 14, marginBottom: 6 },
  toggle: { flexDirection: 'row', alignItems: 'center', marginTop: 14, marginBottom: 8 },
  option: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: radius.lg, padding: 14, borderWidth: 1.5, borderColor: colors.border },
  safety: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.rideSoft, padding: 12, borderRadius: radius.md },
});
