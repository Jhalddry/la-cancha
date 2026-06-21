import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Bank,
  CalendarBlank,
  Check,
  CheckCircle,
  DeviceMobile,
  Eye,
  House,
  MapPin,
  Money,
  X,
} from 'phosphor-react-native';
import Svg, { Path } from 'react-native-svg';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  SlideInLeft,
  SlideInRight,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';


import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { Divider } from '@/components/ui/Divider';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { StepperBar } from '@/components/ui/StepperBar';
import { Text } from '@/components/ui/Text';
import { MatchTypeBadge } from '@/features/match/MatchTypeBadge';
import { useColors } from '@/hooks/useColors';
import { useMatch, useJoinMatch } from '@/hooks/useMatches';
import { useSession } from '@/store/session';
import { useProfile } from '@/hooks/useProfiles';
import { formatVes, usdToVes } from '@/lib/exchange';
import { useBcvRate } from '@/hooks/useExchange';
import {
  formatMatchTime,
  formatPrice,
  labelModality,
  labelPayment,
} from '@/lib/format';
import { radius, spacing } from '@/theme';
import type { ColorPalette } from '@/theme/palettes';
import type { PaymentMethod, Sport } from '@/types/domain';

const SPORT_EMOJIS: Record<Sport, string> = {
  futbol: '⚽',
  tenis: '🎾',
  padel: '🏓',
  beachTennis: '🏖️',
  basket: '🏀',
};

// Official Simple Icons paths (MIT) — viewBox 0 0 24 24
const SI_ZELLE_PATH =
  'M13.559 24h-2.841a.483.483 0 0 1-.483-.483v-2.765H5.638a.667.667 0 0 1-.666-.666v-2.234a.67.67 0 0 1 .142-.412l8.139-10.382h-7.25a.667.667 0 0 1-.667-.667V3.914c0-.367.299-.666.666-.666h4.23V.483c0-.266.217-.483.483-.483h2.841c.266 0 .483.217.483.483v2.765h4.323c.367 0 .666.299.666.666v2.137a.67.67 0 0 1-.141.41l-8.19 10.481h7.665c.367 0 .666.299.666.666v2.477a.667.667 0 0 1-.666.667h-4.32v2.765a.483.483 0 0 1-.483.483Z';

const SI_BINANCE_PATH =
  'M16.624 13.9202l2.7175 2.7154-7.353 7.353-7.353-7.352 2.7175-2.7164 4.6355 4.6595 4.6356-4.6595zm4.6366-4.6366L24 12l-2.7154 2.7164L18.5682 12l2.6924-2.7164zm-9.272.001l2.7163 2.6914-2.7164 2.7174v-.001L9.2721 12l2.7164-2.7154zm-9.2722-.001L5.4088 12l-2.6914 2.6924L0 12l2.7164-2.7164zM11.9885.0115l7.353 7.329-2.7174 2.7154-4.6356-4.6356-4.6355 4.6595-2.7174-2.7154 7.353-7.353z';

function ZelleLogo() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path d={SI_ZELLE_PATH} fill="white" />
    </Svg>
  );
}

function BinanceLogo() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path d={SI_BINANCE_PATH} fill="white" />
    </Svg>
  );
}

const PAYMENT_ICON: Record<PaymentMethod, { icon: ReactNode; color: string }> = {
  pagoMovil:     { icon: <DeviceMobile size={18} color="#fff" weight="fill" />, color: '#0047AB' },
  transferencia: { icon: <Bank size={18} color="#fff" weight="fill" />,         color: '#1565C0' },
  zelle:         { icon: <ZelleLogo />,                                          color: '#6D1ED4' },
  usdt:          { icon: <BinanceLogo />,                                        color: '#F0B90B' },
  efectivo:      { icon: <Money size={18} color="#fff" weight="fill" />,        color: '#2E7D32' },
};

const TOTAL_FLOW_STEPS = 3;

export default function UnirseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: match, isLoading } = useMatch(id);
  const c = useColors();

  if (isLoading || !match) {
    return (
      <Screen edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={c.primary} size="large" />
        </View>
      </Screen>
    );
  }

  return <UnirseContent match={match} />;
}

function UnirseContent({ match }: { match: import('@/types/domain').Match }) {
  const router = useRouter();
  const userId = useSession((st) => st.user?.id);
  const isAdmin = useSession((st) => st.user?.isAdmin ?? false);
  const { data: myProfile } = useProfile(userId);
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);

  const [step, setStep] = useState(1);
  const stepDir = useRef(1);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | null>(null);
  const [checkedReqs, setCheckedReqs] = useState<Set<string>>(new Set());
  const [masterChecked, setMasterChecked] = useState(false);
  const [outOfPositionWarning, setOutOfPositionWarning] = useState(false);

  const allReqsChecked =
    match.requirements.every((r) => checkedReqs.has(r)) && masterChecked;

  const toggleReq = (r: string) =>
    setCheckedReqs((cur) => {
      const next = new Set(cur);
      if (next.has(r)) next.delete(r);
      else next.add(r);
      return next;
    });

  const durationHours = match.durationMin / 60;
  const total = Math.round(match.pricePerHour * durationHours);

  // Guard: admin accounts are read-only
  if (isAdmin) {
    return (
      <Screen edges={['top']}>
        <View style={s.header}>
          <PressableScale onPress={() => router.back()} scaleTo={0.9}>
            <X size={22} color={c.textPrimary} weight="bold" />
          </PressableScale>
          <Text variant="bodySemibold">Sin acceso</Text>
          <View style={{ width: 22 }} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text variant="h3" color="textPrimary" style={{ textAlign: 'center' }}>
            Las cuentas de administrador no pueden unirse a partidas
          </Text>
          <Text variant="body" color="textSecondary" style={{ textAlign: 'center', marginTop: 8 }}>
            Esta cuenta es de solo lectura.
          </Text>
        </View>
      </Screen>
    );
  }

  // Guard: prevent joining ended or cancelled matches
  if (match.endedAt) {
    return (
      <Screen edges={['top']}>
        <View style={s.header}>
          <PressableScale onPress={() => router.back()} scaleTo={0.9}>
            <X size={22} color={c.textPrimary} weight="bold" />
          </PressableScale>
          <Text variant="bodySemibold">Partida finalizada</Text>
          <View style={{ width: 22 }} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
          <Text variant="h2" color="textSecondary" style={{ textAlign: 'center' }}>
            Esta partida ya finalizó
          </Text>
          <Text variant="body" color="textTertiary" style={{ textAlign: 'center', marginTop: spacing.sm }}>
            No puedes unirte a partidas que ya terminaron.
          </Text>
        </View>
      </Screen>
    );
  }

  if (step === 4) {
    return (
      <SuccessStep
        match={match}
        router={router}
        selectedPayment={selectedPayment}
        checkedRequirements={[...checkedReqs]}
      />
    );
  }

  return (
    <Screen edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <PressableScale onPress={() => { if (step === 1) { router.back(); } else { stepDir.current = -1; setStep(step - 1); } }} scaleTo={0.9}>
          <X size={22} color={c.textPrimary} weight="bold" />
        </PressableScale>
        <Text variant="bodySemibold">
          {step === 1 ? 'Resumen' : step === 2 ? 'Método de pago' : 'Requisitos'}
        </Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={s.stepperWrap}>
        <StepperBar total={TOTAL_FLOW_STEPS} current={step} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View
          key={step}
          entering={stepDir.current > 0 ? SlideInRight.duration(220) : SlideInLeft.duration(220)}
        >
          {step === 1 ? (
            <ConfirmStep
              c={c}
              match={match}
              durationHours={durationHours}
              total={total}
              router={router}
            />
          ) : null}
          {step === 2 ? (
            <PaymentStep
              c={c}
              methods={match.paymentMethods}
              selected={selectedPayment}
              onSelect={setSelectedPayment}
            />
          ) : null}
          {step === 3 ? (
            <RequirementsStep
              c={c}
              requirements={match.requirements}
              optionalRequirements={match.optionalRequirements ?? []}
              checked={checkedReqs}
              onToggle={toggleReq}
              masterChecked={masterChecked}
              onMasterToggle={() => {
                if (masterChecked) {
                  setMasterChecked(false);
                } else {
                  setCheckedReqs(new Set(match.requirements));
                  setMasterChecked(true);
                }
              }}
            />
          ) : null}
        </Animated.View>
      </ScrollView>

      <View style={s.footer}>
        <Button
          label="Continuar"
          disabled={step === 2 ? !selectedPayment : step === 3 ? !allReqsChecked : false}
          onPress={() => {
            if (step === 1 && myProfile && match) {
              const needed = match.missingPositions;
              const hasPosition =
                needed.length === 0 ||
                needed.includes('cualquiera' as import('@/types/domain').Position) ||
                myProfile.positions.some((p) => needed.includes(p));

              if (!hasPosition) {
                setOutOfPositionWarning(true);
                return;
              }
            }
            stepDir.current = 1;
            setStep(step + 1);
          }}
        />
      </View>

      <ConfirmSheet
        visible={outOfPositionWarning}
        onClose={() => setOutOfPositionWarning(false)}
        title="Fuera de posición"
        description={`Esta partida busca: ${match.missingPositions.join(', ')}. Tu posición registrada no coincide. ¿Continuar de todas formas?`}
        confirmLabel="Continuar de todas formas"
        onConfirm={() => {
          setOutOfPositionWarning(false);
          stepDir.current = 1;
          setStep(step + 1);
        }}
      />
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// Step 1 — Confirmación
// ---------------------------------------------------------------------------

function ConfirmStep({
  c,
  match,
  durationHours,
  total,
  router,
}: {
  c: ColorPalette;
  match: import('@/types/domain').Match;
  durationHours: number;
  total: number;
  router: ReturnType<typeof useRouter>;
}) {
  const s = useMemo(() => makeStyles(c), [c]);
  const bcvRate = useBcvRate();
  return (
    <View style={s.step}>
      <View style={s.stepHeader}>
        <Text variant="h2">Resumen</Text>
        <Text variant="body" color="textSecondary">
          Revisa los detalles antes de continuar
        </Text>
      </View>

      {/* Sport + type header */}
      <View style={s.summaryHero}>
        <Text style={s.sportEmoji}>{SPORT_EMOJIS[match.sport]}</Text>
        <View style={{ flex: 1, gap: 4 }}>
          <Text variant="h3" color="textPrimary">
            {labelModality(match.modality)}
          </Text>
          <MatchTypeBadge type={match.type} />
        </View>
      </View>

      {/* Info rows */}
      <Card padded={false}>
        <InfoRow
          icon={<CalendarBlank size={16} color={c.primary} weight="fill" />}
          label={formatMatchTime(match.startsAt)}
          sub={`${match.durationMin} min de duración`}
        />
        <View style={s.rowDivider} />
        <InfoRow
          icon={<MapPin size={16} color={c.primary} weight="fill" />}
          label={match.location.name}
          sub={match.location.address}
        />
      </Card>

      {/* Price breakdown */}
      <Card>
        <View style={s.priceRows}>
          <View style={s.priceRow}>
            <Text variant="body" color="textSecondary">
              Precio por hora
            </Text>
            <Text variant="bodySemibold" color="textPrimary">
              {formatPrice(match.pricePerHour, match.currency)}
            </Text>
          </View>
          <View style={s.priceRow}>
            <Text variant="body" color="textSecondary">
              Total estimado ({durationHours}h)
            </Text>
            <Text variant="h3" color="primary">
              {formatPrice(total, match.currency)}
            </Text>
          </View>
        </View>
        <View style={s.bcvRow}>
          <Text variant="caption" color="textTertiary">
            ≈ {formatVes(usdToVes(total, bcvRate))} · Tasa BCV {bcvRate.toFixed(2)} Bs/USD
          </Text>
        </View>
      </Card>

      {/* Requirements */}
      {match.requirements.length > 0 ? (
        <Card padded={false}>
          {match.requirements.map((r, i) => (
            <View key={r}>
              <View style={s.reqPreviewRow}>
                <CheckCircle size={15} color={c.primary} weight="fill" />
                <Text variant="body" color="textPrimary" style={{ flex: 1 }}>{r}</Text>
              </View>
              {i < match.requirements.length - 1 ? <View style={s.rowDivider} /> : null}
            </View>
          ))}
        </Card>
      ) : null}

      {/* Organizer */}
      <PressableScale
        style={[s.organizerRow, { backgroundColor: c.surface, borderColor: c.border }]}
        scaleTo={0.98}
        onPress={() => router.push(`/perfil/${match.organizer.id}`)}
      >
        <Avatar name={match.organizer.name} uri={match.organizer.avatarUrl} size={40} />
        <View style={{ flex: 1 }}>
          <Text variant="bodyMedium" color="textPrimary">
            {match.organizer.name}
          </Text>
          <Text variant="small" color="textSecondary">
            Organizador
          </Text>
        </View>
        {match.organizer.verified ? (
          <CheckCircle size={18} color={c.primary} weight="fill" />
        ) : null}
      </PressableScale>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Método de pago
// ---------------------------------------------------------------------------

function PayRow({
  m,
  isSelected,
  s,
  onSelect,
}: {
  m: PaymentMethod;
  isSelected: boolean;
  s: ReturnType<typeof makeStyles>;
  onSelect: (m: PaymentMethod) => void;
}) {
  const meta = PAYMENT_ICON[m];
  return (
    <PressableScale
      style={[s.payRow, isSelected ? s.payRowActive : null]}
      scaleTo={0.98}
      onPress={() => onSelect(m)}
    >
      <View style={[s.payIcon, { backgroundColor: meta.color }]}>
        {meta.icon}
      </View>
      <Text variant="body" color="textPrimary" style={{ flex: 1 }}>
        {labelPayment(m)}
      </Text>
      <View style={[s.radio, isSelected ? s.radioOn : null]}>
        {isSelected ? <View style={s.radioDot} /> : null}
      </View>
    </PressableScale>
  );
}

function PaymentStep({
  c,
  methods,
  selected,
  onSelect,
}: {
  c: ColorPalette;
  methods: PaymentMethod[];
  selected: PaymentMethod | null;
  onSelect: (m: PaymentMethod) => void;
}) {
  const s = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={s.step}>
      <View style={s.stepHeader}>
        <Text variant="h2">Método de pago</Text>
        <Text variant="body" color="textSecondary">
          Elige tu método preferido
        </Text>
      </View>
      <Card padded={false}>
        {methods.map((m, i) => (
          <View key={m}>
            <PayRow m={m} isSelected={selected === m} s={s} onSelect={onSelect} />
            {i < methods.length - 1 ? <View style={s.rowDivider} /> : null}
          </View>
        ))}
      </Card>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Step 3 — Requisitos
// ---------------------------------------------------------------------------

function RequirementsStep({
  c,
  requirements,
  optionalRequirements,
  checked,
  onToggle,
  masterChecked,
  onMasterToggle,
}: {
  c: ColorPalette;
  requirements: string[];
  optionalRequirements: string[];
  checked: Set<string>;
  onToggle: (r: string) => void;
  masterChecked: boolean;
  onMasterToggle: () => void;
}) {
  const s = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={s.step}>
      <View style={s.stepHeader}>
        <Text variant="h2">Requisitos</Text>
        <Text variant="body" color="textSecondary">
          Confirma que cumples con lo siguiente
        </Text>
      </View>

      {requirements.length > 0 ? (
        <Card padded={false}>
          {requirements.map((r, i) => {
            const on = checked.has(r);
            return (
              <View key={r}>
                <PressableScale
                  style={[s.reqRow, on ? s.reqRowActive : null]}
                  scaleTo={0.98}
                  onPress={() => onToggle(r)}
                >
                  <Text variant="body" color="textPrimary" style={{ flex: 1 }}>
                    {r}
                  </Text>
                  <CheckBox c={c} checked={on} />
                </PressableScale>
                {i < requirements.length - 1 ? <View style={s.rowDivider} /> : null}
              </View>
            );
          })}
        </Card>
      ) : null}

      {optionalRequirements.length > 0 ? (
        <>
          <Text variant="caption" color="textSecondary" style={{ marginTop: spacing.md }}>
            Opcionales (no requeridas)
          </Text>
          <Card padded={false}>
            {optionalRequirements.map((r, i) => {
              const on = checked.has(r);
              return (
                <View key={r}>
                  <PressableScale
                    style={[s.reqRow, on ? s.reqRowActive : null]}
                    scaleTo={0.98}
                    onPress={() => onToggle(r)}
                  >
                    <Text variant="body" color="textPrimary" style={{ flex: 1 }}>
                      {r}
                    </Text>
                    <CheckBox c={c} checked={on} />
                  </PressableScale>
                  {i < optionalRequirements.length - 1 ? <View style={s.rowDivider} /> : null}
                </View>
              );
            })}
          </Card>
        </>
      ) : null}

      <PressableScale
        style={[s.masterRow, masterChecked ? s.masterRowActive : null]}
        scaleTo={0.98}
        onPress={onMasterToggle}
      >
        <CheckCircle
          size={22}
          color={masterChecked ? c.primary : c.border}
          weight={masterChecked ? 'fill' : 'regular'}
        />
        <Text
          variant="bodyMedium"
          color={masterChecked ? 'primary' : 'textPrimary'}
          style={{ flex: 1 }}
        >
          Entiendo y acepto los requisitos
        </Text>
      </PressableScale>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Step 4 — Éxito
// ---------------------------------------------------------------------------

function SuccessStep({
  match,
  router,
  selectedPayment,
  checkedRequirements,
}: {
  match: import('@/types/domain').Match;
  router: ReturnType<typeof useRouter>;
  selectedPayment: PaymentMethod | null;
  checkedRequirements: string[];
}) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const { mutate: joinMatch, isError: joinError, isPending: joinPending } = useJoinMatch();
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const hasSentRef = useRef(false);

  useEffect(() => {
    if (hasSentRef.current) return;
    hasSentRef.current = true;
    joinMatch({
      matchId: match.id,
      paymentMethod: selectedPayment ?? undefined,
      checkedRequirements,
    }, {
      onSuccess: () => {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
    });
    scale.value = withSpring(1, { damping: 12, stiffness: 120 });
    opacity.value = withDelay(200, withSpring(1));
  }, []);

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const contentStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={s.successWrap}>
        <ConfettiDecor c={c} />

        <Animated.View style={[s.checkCircle, checkStyle, joinError ? { backgroundColor: c.alert } : null]}>
          {joinError ? (
            <X size={52} color={c.bg} weight="bold" />
          ) : (
            <Check size={52} color={c.bg} weight="bold" />
          )}
        </Animated.View>

        <Animated.View style={[s.successContent, contentStyle]}>
          {joinError ? (
            <>
              <Text variant="h1" color="alert">Error al unirse</Text>
              <Text variant="body" color="textSecondary" style={s.successSub}>
                No se pudo enviar tu solicitud. Intenta de nuevo.
              </Text>
              <View style={s.successActions}>
                <Button
                  label="Reintentar"
                  onPress={() => joinMatch({
                    matchId: match.id,
                    paymentMethod: selectedPayment ?? undefined,
                    checkedRequirements,
                  })}
                  leading={<Eye size={18} color={c.bg} weight="fill" />}
                />
                <Button
                  label="Ver partida"
                  variant="secondary"
                  onPress={() => router.replace(`/match/${match.id}`)}
                />
              </View>
            </>
          ) : joinPending ? (
            <>
              <Text variant="h1" color="textPrimary">Enviando solicitud…</Text>
              <Text variant="body" color="textSecondary" style={s.successSub}>
                Estamos procesando tu solicitud.
              </Text>
            </>
          ) : (
            <>
              <Text variant="h1" color="textPrimary">¡Solicitud enviada!</Text>
              <Text variant="body" color="textSecondary" style={s.successSub}>
                El organizador revisará tu solicitud y te notificará cuando sea aceptada.
              </Text>

              <View style={s.successMatchCard}>
                <Text style={s.sportEmoji}>{SPORT_EMOJIS[match.sport]}</Text>
                <View style={{ flex: 1 }}>
                  <View style={s.badgeRow}>
                    <MatchTypeBadge type={match.type} />
                  </View>
                  <Text variant="small" color="textSecondary" style={{ marginTop: 2 }}>
                    {formatMatchTime(match.startsAt)} · {match.location.name}
                  </Text>
                </View>
              </View>

              <View style={s.successActions}>
                <Button
                  label="Ver partida"
                  onPress={() => router.replace(`/match/${match.id}`)}
                  leading={<Eye size={18} color={c.bg} weight="fill" />}
                />
                <PressableScale onPress={() => router.replace('/(tabs)')} scaleTo={0.97}>
                  <Text variant="bodyMedium" color="primary" style={{ textAlign: 'center' }}>
                    Volver al inicio
                  </Text>
                </PressableScale>
              </View>
            </>
          )}
        </Animated.View>
      </View>
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function InfoRow({ icon, label, sub }: { icon: ReactNode; label: string; sub?: string }) {
  return (
    <View style={staticStyles.infoRow}>
      {icon}
      <View style={{ flex: 1 }}>
        <Text variant="bodyMedium" color="textPrimary">
          {label}
        </Text>
        {sub ? (
          <Text variant="small" color="textSecondary">
            {sub}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function CheckBox({ c, checked }: { c: ColorPalette; checked: boolean }) {
  const s = useMemo(() => makeStyles(c), [c]);
  const boxScale = useSharedValue(1);
  const checkScale = useSharedValue(checked ? 1 : 0);
  const prevChecked = useRef(checked);

  useEffect(() => {
    if (checked && !prevChecked.current) {
      boxScale.value = withSequence(
        withSpring(1.2, { damping: 10, stiffness: 400 }),
        withSpring(1, { damping: 16, stiffness: 200 }),
      );
    }
    checkScale.value = withTiming(checked ? 1 : 0, { duration: 140 });
    prevChecked.current = checked;
  }, [checked, boxScale, checkScale]);

  const boxStyle = useAnimatedStyle(() => ({ transform: [{ scale: boxScale.value }] }));
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: checkScale.value }] }));

  return (
    <Animated.View style={[s.checkbox, checked ? s.checkboxOn : null, boxStyle]}>
      <Animated.View style={iconStyle}>
        <Check size={13} color={c.bg} weight="bold" />
      </Animated.View>
    </Animated.View>
  );
}

function ConfettiDecor({ c }: { c: ColorPalette }) {
  const dots = [
    { top: 40, left: 30, size: 10, color: c.primary },
    { top: 80, left: 60, size: 7, color: '#FF6B6B' },
    { top: 55, right: 40, size: 12, color: '#FFD93D' },
    { top: 110, left: 20, size: 8, color: '#4D96FF' },
    { top: 30, right: 70, size: 9, color: '#FF6B6B' },
    { top: 95, right: 25, size: 7, color: c.primary },
    { top: 140, left: 80, size: 6, color: '#FFD93D' },
    { top: 125, right: 60, size: 10, color: '#4D96FF' },
  ] as const;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {dots.map((d, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            width: d.size,
            height: d.size,
            borderRadius: d.size / 2,
            backgroundColor: d.color,
            opacity: 0.7,
            ...('right' in d ? { right: d.right, top: d.top } : { left: d.left, top: d.top }),
          }}
        />
      ))}
    </View>
  );
}

const staticStyles = StyleSheet.create({
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
});

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    stepperWrap: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    scroll: {
      paddingHorizontal: spacing.lg,
      paddingBottom: 120,
    },
    step: { gap: spacing.lg, paddingTop: spacing.md },
    stepHeader: { gap: spacing.xs },
    footer: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      padding: spacing.lg,
      paddingBottom: spacing.xxl,
      backgroundColor: c.bg,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    // Step 1 summary
    summaryHero: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    sportEmoji: { fontSize: 32, lineHeight: 42 },
    badgeRow: { flexDirection: 'row', gap: spacing.xs, marginTop: 2 },
    priceRows: { gap: spacing.sm },
    priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    bcvRow: {
      marginTop: spacing.sm,
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    reqPreviewRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
    },
    organizerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: radius.lg,
      borderWidth: 1,
    },
    // Payment
    payRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
    },
    payRowActive: { backgroundColor: c.primarySoft },
    payIcon: {
      width: 36,
      height: 36,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioOn: { borderColor: c.primary },
    radioDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: c.primary,
    },
    rowDivider: { height: 1, backgroundColor: c.border, marginHorizontal: spacing.md },
    // Requirements
    reqRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
    },
    reqRowActive: { backgroundColor: c.primarySoft },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: radius.sm,
      borderWidth: 1.5,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxOn: { backgroundColor: c.primary, borderColor: c.primary },
    masterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
    },
    masterRowActive: { borderColor: c.primary, backgroundColor: c.primarySoft },
    // Success
    successWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
    },
    checkCircle: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xl,
    },
    successContent: { width: '100%', alignItems: 'center', gap: spacing.lg },
    successSub: { textAlign: 'center', marginTop: -spacing.sm },
    successMatchCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      width: '100%',
    },
    successActions: { width: '100%', gap: spacing.sm },
  });
}
