import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Bank,
  CalendarBlank,
  ChatCircle,
  Check,
  CheckCircle,
  Coins,
  CurrencyDollar,
  DeviceMobile,
  Eye,
  House,
  MapPin,
  Money,
  X,
} from 'phosphor-react-native';
import { useEffect, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { StepperBar } from '@/components/ui/StepperBar';
import { Text } from '@/components/ui/Text';
import { mockMatches } from '@/data/matches';
import { MatchTypeBadge } from '@/features/match/MatchTypeBadge';
import { BCV_RATE, formatVes, usdToVes } from '@/lib/exchange';
import {
  formatMatchTime,
  formatPrice,
  labelModality,
  labelPayment,
} from '@/lib/format';
import { colors, radius, spacing } from '@/theme';
import type { PaymentMethod, Sport } from '@/types/domain';

const SPORT_EMOJIS: Record<Sport, string> = {
  futbol: '⚽',
  tenis: '🎾',
  padel: '🏓',
  beachTennis: '🏖️',
  basket: '🏀',
};

const PAYMENT_ICON: Record<PaymentMethod, { icon: ReactNode; color: string }> = {
  pagoMovil: { icon: <DeviceMobile size={18} color="#fff" weight="fill" />, color: '#3B82F6' },
  transferencia: { icon: <Bank size={18} color="#fff" weight="fill" />, color: '#22C55E' },
  zelle: { icon: <CurrencyDollar size={18} color="#fff" weight="fill" />, color: '#7C3AED' },
  usdt: { icon: <Coins size={18} color="#fff" weight="fill" />, color: '#F59E0B' },
  efectivo: { icon: <Money size={18} color="#fff" weight="fill" />, color: '#6B7280' },
};

const TOTAL_FLOW_STEPS = 3;

export default function UnirseScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const match = mockMatches.find((m) => m.id === id) ?? mockMatches[0];

  const [step, setStep] = useState(1);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | null>(null);
  const [checkedReqs, setCheckedReqs] = useState<Set<string>>(new Set());
  const [masterChecked, setMasterChecked] = useState(false);

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

  if (step === 4) {
    return <SuccessStep match={match} router={router} />;
  }

  return (
    <Screen edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <PressableScale onPress={() => (step === 1 ? router.back() : setStep(step - 1))} scaleTo={0.9}>
          <X size={22} color={colors.textPrimary} weight="bold" />
        </PressableScale>
        <Text variant="bodySemibold">
          {step === 1 ? 'Resumen' : step === 2 ? 'Método de pago' : 'Requisitos'}
        </Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.stepperWrap}>
        <StepperBar total={TOTAL_FLOW_STEPS} current={step} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {step === 1 ? (
          <ConfirmStep
            match={match}
            durationHours={durationHours}
            total={total}
            router={router}
          />
        ) : null}
        {step === 2 ? (
          <PaymentStep
            methods={match.paymentMethods}
            selected={selectedPayment}
            onSelect={setSelectedPayment}
          />
        ) : null}
        {step === 3 ? (
          <RequirementsStep
            requirements={match.requirements}
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
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label="Continuar"
          disabled={step === 2 ? !selectedPayment : step === 3 ? !allReqsChecked : false}
          onPress={() => setStep(step + 1)}
        />
      </View>
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// Step 1 — Confirmación
// ---------------------------------------------------------------------------

function ConfirmStep({
  match,
  durationHours,
  total,
  router,
}: {
  match: (typeof mockMatches)[0];
  durationHours: number;
  total: number;
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <View style={styles.step}>
      <Text variant="h2">Resumen de la partida</Text>

      <Card>
        <View style={styles.matchSummary}>
          <Text style={styles.sportEmoji}>{SPORT_EMOJIS[match.sport]}</Text>
          <View style={{ flex: 1 }}>
            <Text variant="bodySemibold" color="textPrimary">
              {labelModality(match.modality)}
            </Text>
            <View style={styles.badgeRow}>
              <MatchTypeBadge type={match.type} />
            </View>
          </View>
        </View>

        <View style={styles.infoRows}>
          <InfoRow
            icon={<CalendarBlank size={16} color={colors.primary} weight="fill" />}
            label={formatMatchTime(match.startsAt)}
            sub={`${match.durationMin} min de duración`}
          />
          <InfoRow
            icon={<MapPin size={16} color={colors.primary} weight="fill" />}
            label={match.location.name}
            sub={match.location.address}
          />
        </View>

        <View style={styles.priceDivider} />

        <View style={styles.priceRows}>
          <View style={styles.priceRow}>
            <Text variant="body" color="textSecondary">
              Precio por hora
            </Text>
            <Text variant="bodySemibold" color="textPrimary">
              {formatPrice(match.pricePerHour, match.currency)}
            </Text>
          </View>
          <View style={styles.priceRow}>
            <Text variant="body" color="textSecondary">
              Total estimado ({durationHours}h)
            </Text>
            <Text variant="bodySemibold" color="primary">
              {formatPrice(total, match.currency)}
            </Text>
          </View>
          <Text variant="caption" color="textTertiary">
            ≈ {formatVes(usdToVes(total))} · BCV {BCV_RATE.toFixed(2)} Bs/USD
          </Text>
        </View>

        <View style={styles.priceDivider} />

        <PressableScale
          style={styles.organizerRow}
          scaleTo={0.98}
          onPress={() => router.push(`/perfil/${match.organizer.id}`)}
        >
          <Avatar name={match.organizer.name} size={40} />
          <View style={{ flex: 1 }}>
            <Text variant="bodyMedium" color="textPrimary">
              {match.organizer.name}
            </Text>
            <Text variant="small" color="textSecondary">
              Organizador
            </Text>
          </View>
          {match.organizer.verified ? (
            <CheckCircle size={18} color={colors.primary} weight="fill" />
          ) : null}
        </PressableScale>
      </Card>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Método de pago
// ---------------------------------------------------------------------------

function PaymentStep({
  methods,
  selected,
  onSelect,
}: {
  methods: PaymentMethod[];
  selected: PaymentMethod | null;
  onSelect: (m: PaymentMethod) => void;
}) {
  return (
    <View style={styles.step}>
      <View style={styles.stepHeader}>
        <Text variant="h2">Método de pago</Text>
        <Text variant="body" color="textSecondary">
          Elige tu método preferido
        </Text>
      </View>
      <Card padded={false}>
        {methods.map((m, i) => {
          const meta = PAYMENT_ICON[m];
          const isSelected = selected === m;
          return (
            <View key={m}>
              <PressableScale
                style={[styles.payRow, isSelected ? styles.payRowActive : null]}
                scaleTo={0.98}
                onPress={() => onSelect(m)}
              >
                <View style={[styles.payIcon, { backgroundColor: meta.color }]}>
                  {meta.icon}
                </View>
                <Text variant="body" color="textPrimary" style={{ flex: 1 }}>
                  {labelPayment(m)}
                </Text>
                <View style={[styles.radio, isSelected ? styles.radioOn : null]}>
                  {isSelected ? <View style={styles.radioDot} /> : null}
                </View>
              </PressableScale>
              {i < methods.length - 1 ? <View style={styles.rowDivider} /> : null}
            </View>
          );
        })}
      </Card>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Step 3 — Requisitos
// ---------------------------------------------------------------------------

function RequirementsStep({
  requirements,
  checked,
  onToggle,
  masterChecked,
  onMasterToggle,
}: {
  requirements: string[];
  checked: Set<string>;
  onToggle: (r: string) => void;
  masterChecked: boolean;
  onMasterToggle: () => void;
}) {
  return (
    <View style={styles.step}>
      <View style={styles.stepHeader}>
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
                  style={[styles.reqRow, on ? styles.reqRowActive : null]}
                  scaleTo={0.98}
                  onPress={() => onToggle(r)}
                >
                  <Text variant="body" color="textPrimary" style={{ flex: 1 }}>
                    {r}
                  </Text>
                  <CheckBox checked={on} />
                </PressableScale>
                {i < requirements.length - 1 ? <View style={styles.rowDivider} /> : null}
              </View>
            );
          })}
        </Card>
      ) : null}

      <PressableScale
        style={[styles.masterRow, masterChecked ? styles.masterRowActive : null]}
        scaleTo={0.98}
        onPress={onMasterToggle}
      >
        <CheckCircle
          size={22}
          color={masterChecked ? colors.primary : colors.border}
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
}: {
  match: (typeof mockMatches)[0];
  router: ReturnType<typeof useRouter>;
}) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 12, stiffness: 120 });
    opacity.value = withDelay(200, withSpring(1));
  }, []);

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const contentStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.successWrap}>
        <ConfettiDecor />

        <Animated.View style={[styles.checkCircle, checkStyle]}>
          <Check size={52} color={colors.bg} weight="bold" />
        </Animated.View>

        <Animated.View style={[styles.successContent, contentStyle]}>
          <Text variant="h1" color="textPrimary">
            ¡Ya estás dentro!
          </Text>
          <Text variant="body" color="textSecondary" style={styles.successSub}>
            Te hemos agregado a la partida.
          </Text>

          <View style={styles.successMatchCard}>
            <Text style={styles.sportEmoji}>{SPORT_EMOJIS[match.sport]}</Text>
            <View style={{ flex: 1 }}>
              <View style={styles.badgeRow}>
                <MatchTypeBadge type={match.type} />
              </View>
              <Text variant="small" color="textSecondary" style={{ marginTop: 2 }}>
                {formatMatchTime(match.startsAt)} · {match.location.name}
              </Text>
            </View>
          </View>

          <View style={styles.successActions}>
            <Button
              label="Ir al chat"
              onPress={() => router.replace(`/chat/${match.id}`)}
              leading={<ChatCircle size={18} color={colors.bg} weight="fill" />}
            />
            <Button
              label="Ver partida"
              variant="secondary"
              onPress={() => router.replace(`/match/${match.id}`)}
              leading={<Eye size={18} color={colors.textPrimary} weight="fill" />}
            />
            <PressableScale onPress={() => router.replace('/(tabs)')} scaleTo={0.97}>
              <Text variant="bodyMedium" color="primary" style={{ textAlign: 'center' }}>
                Volver al inicio
              </Text>
            </PressableScale>
          </View>
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
    <View style={styles.infoRow}>
      {icon}
      <View>
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

function CheckBox({ checked }: { checked: boolean }) {
  return (
    <View style={[styles.checkbox, checked ? styles.checkboxOn : null]}>
      {checked ? <Check size={13} color={colors.bg} weight="bold" /> : null}
    </View>
  );
}

function ConfettiDecor() {
  const dots = [
    { top: 40, left: 30, size: 10, color: colors.primary },
    { top: 80, left: 60, size: 7, color: '#FF6B6B' },
    { top: 55, right: 40, size: 12, color: '#FFD93D' },
    { top: 110, left: 20, size: 8, color: '#4D96FF' },
    { top: 30, right: 70, size: 9, color: '#FF6B6B' },
    { top: 95, right: 25, size: 7, color: colors.primary },
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

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  // Match summary
  matchSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  sportEmoji: { fontSize: 28, lineHeight: 36 },
  badgeRow: { flexDirection: 'row', gap: spacing.xs, marginTop: 2 },
  infoRows: { gap: spacing.sm },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  priceDivider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  priceRows: { gap: spacing.sm },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  organizerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  // Payment
  payRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  payRowActive: { backgroundColor: colors.primarySoft },
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
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: colors.primary },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  rowDivider: { height: 1, backgroundColor: colors.border, marginHorizontal: spacing.md },
  // Requirements
  reqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  reqRowActive: { backgroundColor: colors.primarySoft },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  masterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  masterRowActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
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
    backgroundColor: colors.primary,
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
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
  },
  successActions: { width: '100%', gap: spacing.sm },
});
