import { useRouter } from 'expo-router';
import {
  CalendarBlank,
  CaretRight,
  Check,
  ClockCounterClockwise,
  MapPin,
  Minus,
  Plus,
  WarningCircle,
} from 'phosphor-react-native';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { InputAccessoryView, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import {
  DateTimePickerSheet,
  DurationPickerSheet,
} from '@/components/feature/DateTimePickerSheet';
import { LocationPickerSheet } from '@/components/feature/LocationPickerSheet';
import { BackHeader } from '@/components/ui/BackHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { Stars } from '@/components/ui/Stars';
import { StepperBar } from '@/components/ui/StepperBar';
import { Text } from '@/components/ui/Text';
import { TextInput } from '@/components/ui/TextInput';
import { MiniPitchPreview } from '@/features/match/MiniPitchPreview';
import { matchTypeMeta } from '@/features/match/matchTypeMeta';
import { PositionPitch } from '@/features/match/PositionPitch';
import {
  NO_POSITION_SPORTS,
  positionsForModality,
  sportModalities,
} from '@/features/match/helpers';
import { BCV_RATE, formatVes, usdToVes } from '@/lib/exchange';
import {
  labelModality,
  labelPayment,
  labelPosition,
  labelSkill,
  labelSport,
} from '@/lib/format';
import { useDraftMatch, type DraftMatch } from '@/store/draftMatch';
import { useColors } from '@/hooks/useColors';
import type { ColorPalette } from '@/theme/palettes';
import { radius, spacing } from '@/theme';
import type {
  MatchType,
  Modality,
  PaymentMethod,
  Position,
  SkillLevel,
  Sport,
} from '@/types/domain';

const TOTAL_STEPS = 5;

const SPORTS: { value: Sport; emoji: string }[] = [
  { value: 'futbol', emoji: '⚽' },
  { value: 'tenis', emoji: '🎾' },
  { value: 'padel', emoji: '🏓' },
  { value: 'beachTennis', emoji: '🏖️' },
  { value: 'basket', emoji: '🏀' },
];

const PAYMENT_METHODS: PaymentMethod[] = [
  'pagoMovil',
  'transferencia',
  'efectivo',
  'zelle',
  'usdt',
];

const REQUIREMENTS_BY_SPORT: Record<Sport, string[]> = {
  futbol: [
    'Canilleras obligatorias',
    'Traer balón propio',
    'Camiseta del color asignado',
    'Hidratación',
  ],
  basket: [
    'Camiseta del color asignado',
    'Traer balón propio',
    'Zapatillas adecuadas',
    'Hidratación',
  ],
  padel: [
    'Traer mi propia pala',
    'Traer pelotas',
    'Zapatillas adecuadas',
    'Hidratación',
  ],
  tenis: [
    'Traer mi raqueta',
    'Traer pelotas',
    'Vestimenta deportiva',
    'Hidratación',
  ],
  beachTennis: [
    'Traer mi pala',
    'Protector solar',
    'Gorra recomendada',
    'Hidratación',
  ],
};

const DEFAULT_REQUIREMENTS = ['Hidratación', 'Llegar 10 min antes'];

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

type FieldKey =
  | 'sport'
  | 'modality'
  | 'type'
  | 'skillLevel'
  | 'positions'
  | 'locationName'
  | 'pricePerHour'
  | 'paymentMethods';

type StepErrors = Partial<Record<FieldKey, string>>;

function validateStep(step: number, draft: DraftMatch): StepErrors {
  const errors: StepErrors = {};
  const noPositions =
    draft.sport !== null && NO_POSITION_SPORTS.includes(draft.sport);

  switch (step) {
    case 1:
      if (!draft.sport) errors.sport = 'Selecciona un deporte para continuar.';
      break;
    case 2:
      if (!draft.modality)
        errors.modality = 'Selecciona una modalidad para continuar.';
      break;
    case 3:
      if (!draft.type) errors.type = 'Elige el tipo de partida.';
      if (!draft.skillLevel) errors.skillLevel = 'Selecciona el nivel requerido.';
      if (!noPositions && draft.positions.length === 0) {
        errors.positions = 'Selecciona al menos una posición.';
      }
      break;
    case 4:
      if (draft.locationName.trim().length === 0)
        errors.locationName = 'La cancha es obligatoria.';
      if (!(Number(draft.pricePerHour) > 0))
        errors.pricePerHour = 'Indica un precio mayor a 0.';
      break;
    case 5:
      if (draft.paymentMethods.length === 0)
        errors.paymentMethods = 'Selecciona al menos un método de pago.';
      break;
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Date / Time formatters
// ---------------------------------------------------------------------------

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function formatDateLabel(d: Date): string {
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(d, today)) return `Hoy, ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
  if (sameDay(d, tomorrow))
    return `Mañana, ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
  return `${DAYS[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
}

function formatTimeLabel(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
}

// ---------------------------------------------------------------------------
// Main wizard
// ---------------------------------------------------------------------------

export default function CrearWizard() {
  const router = useRouter();
  const draft = useDraftMatch((s) => s.draft);
  const step = useDraftMatch((s) => s.step);
  const setKey = useDraftMatch((s) => s.set);
  const next = useDraftMatch((s) => s.next);
  const prev = useDraftMatch((s) => s.prev);
  const togglePosition = useDraftMatch((s) => s.togglePosition);
  const togglePayment = useDraftMatch((s) => s.togglePayment);
  const toggleRequirement = useDraftMatch((s) => s.toggleRequirement);
  const reset = useDraftMatch((s) => s.reset);
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);

  const [triedNext, setTriedNext] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  const errors = useMemo(() => validateStep(step, draft), [step, draft]);
  const isValid = Object.keys(errors).length === 0;
  const shownErrors: StepErrors = triedNext ? errors : {};

  // Clear validation flag when step changes.
  useEffect(() => {
    setTriedNext(false);
  }, [step]);

  const onBack = () => {
    if (step === 1) {
      router.back();
    } else {
      prev();
    }
  };

  const onNext = () => {
    if (!isValid) {
      setTriedNext(true);
      return;
    }
    if (step < TOTAL_STEPS) {
      next();
      return;
    }
    router.replace('/crear/confirmacion');
    setTimeout(reset, 500);
  };

  return (
    <Screen edges={['top']}>
      <BackHeader title="Crear partida" onBack={onBack} transparent />

      <View style={s.stepperWrap}>
        <StepperBar total={TOTAL_STEPS} current={step} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: c.bg }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {step === 1 ? (
          <Step1Sport draft={draft} setKey={setKey} errors={shownErrors} />
        ) : null}
        {step === 2 ? (
          <Step2Modality draft={draft} setKey={setKey} errors={shownErrors} />
        ) : null}
        {step === 3 ? (
          <Step3TypeLevelPositions
            draft={draft}
            setKey={setKey}
            togglePosition={togglePosition}
            errors={shownErrors}
          />
        ) : null}
        {step === 4 ? (
          <Step4LocationPrice
            draft={draft}
            setKey={setKey}
            errors={shownErrors}
          />
        ) : null}
        {step === 5 ? (
          <Step5PaymentsExtras
            draft={draft}
            setKey={setKey}
            togglePayment={togglePayment}
            toggleRequirement={toggleRequirement}
            errors={shownErrors}
          />
        ) : null}
      </ScrollView>
      </KeyboardAvoidingView>

      {!keyboardVisible ? (
        <View style={s.footer}>
          <Button
            label={step === TOTAL_STEPS ? 'Publicar partida' : 'Siguiente'}
            onPress={onNext}
          />
        </View>
      ) : null}
    </Screen>
  );
}

interface StepProps {
  draft: DraftMatch;
  setKey: <K extends keyof DraftMatch>(key: K, value: DraftMatch[K]) => void;
  errors: StepErrors;
}

function StepHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <View style={staticStyles.stepHead}>
      <Text variant="h2">{title}</Text>
      {sub ? (
        <Text variant="body" color="textSecondary">
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

function ErrorMessage({ message }: { message?: string }) {
  const c = useColors();
  if (!message) return null;
  return (
    <View style={staticStyles.errorRow}>
      <WarningCircle size={14} color={c.alert} weight="fill" />
      <Text variant="small" color="alert">
        {message}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Step 1 — Deporte
// ---------------------------------------------------------------------------

function Step1Sport({ draft, setKey, errors }: StepProps) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={staticStyles.step}>
      <StepHeader
        title="¿Qué deporte quieres jugar?"
        sub="Selecciona el deporte para tu partida"
      />

      <View style={staticStyles.sportList}>
        {SPORTS.map((sport) => (
          <PressableScale
            key={sport.value}
            onPress={() => {
              setKey('sport', sport.value);
              setKey('modality', null);
              setKey('positions', []);
            }}
            style={[
              s.sportRow,
              draft.sport === sport.value ? s.sportRowActive : null,
            ]}
            scaleTo={0.98}
          >
            <View style={s.sportEmojiWrap}>
              <Text style={staticStyles.sportEmoji}>{sport.emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="bodySemibold" color="textPrimary">
                {labelSport(sport.value)}
              </Text>
            </View>
            {draft.sport === sport.value ? (
              <Check size={20} color={c.primary} weight="bold" />
            ) : (
              <CaretRight size={18} color={c.textTertiary} weight="bold" />
            )}
          </PressableScale>
        ))}
      </View>
      <ErrorMessage message={errors.sport} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Modalidad
// ---------------------------------------------------------------------------

function Step2Modality({ draft, setKey, errors }: StepProps) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const modalities = useMemo(
    () => (draft.sport ? sportModalities[draft.sport] : []),
    [draft.sport],
  );
  const hasPlayerCount = draft.sport === 'futbol' || draft.sport === 'basket';

  return (
    <View style={staticStyles.step}>
      {(() => {
        const sportEmoji = SPORTS.find((sp) => sp.value === draft.sport)?.emoji ?? '';
        const modalidadSub: Record<string, string> = {
          futbol: '¿A 5, a 7 o full 11?',
          basket: '¿3 contra 3 o el equipo completo?',
          tenis: '¿Juegas solo o en pareja?',
          beachTennis: '¿1v1 o en pareja?',
        };
        return (
          <StepHeader
            title={`Modalidad ${sportEmoji}`}
            sub={draft.sport ? (modalidadSub[draft.sport] ?? 'Elige cómo van a jugar') : 'Elige cómo van a jugar'}
          />
        );
      })()}

      <View style={staticStyles.modalityList}>
        {modalities.map((m) => {
          const active = draft.modality === m;
          return (
            <PressableScale
              key={m}
              onPress={() => {
                setKey('modality', m as Modality);
                setKey('positions', []);
              }}
              style={[
                s.modalityRow,
                active ? s.modalityRowActive : null,
              ]}
              scaleTo={0.97}
            >
              {draft.sport ? (
                <MiniPitchPreview
                  sport={draft.sport}
                  modality={m as Modality}
                  active={active}
                />
              ) : (
                <View style={s.modalityIcon}>
                  <Text variant="bodySemibold" color="primary">
                    {modalityShortLabel(m as Modality)}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text variant="bodySemibold" color="textPrimary">
                  {labelModality(m as Modality)}
                </Text>
                {hasPlayerCount ? (
                  <Text variant="small" color="textSecondary">
                    {modalityShortLabel(m as Modality)} jugadores por equipo
                  </Text>
                ) : null}
              </View>
              {active ? (
                <Check size={20} color={c.primary} weight="bold" />
              ) : null}
            </PressableScale>
          );
        })}
      </View>
      <ErrorMessage message={errors.modality} />
    </View>
  );
}

function modalityShortLabel(m: Modality): string {
  if (m.startsWith('futbol')) return m.replace('futbol', '');
  if (m === 'basket3v3') return '3';
  if (m === 'basket5v5') return '5';
  if (m === 'tenisSingles') return '1v1';
  if (m === 'tenisDobles') return '2v2';
  if (m === 'padelDobles') return '2v2';
  if (m === 'beachDobles') return '2v2';
  if (m === 'beachSimples') return '1v1';
  return '2v2';
}

// ---------------------------------------------------------------------------
// Step 3 — Tipo + Nivel + Posiciones
// ---------------------------------------------------------------------------

function Step3TypeLevelPositions({
  draft,
  setKey,
  togglePosition,
  errors,
}: StepProps & { togglePosition: (p: Position) => void }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const levels: SkillLevel[] = [1, 2, 3, 4, 5];
  const hasPitch = draft.sport === 'futbol' || draft.sport === 'basket';
  const noPositions =
    draft.sport !== null && NO_POSITION_SPORTS.includes(draft.sport);

  const positions = useMemo(
    () => positionsForModality(draft.sport, draft.modality) as Position[],
    [draft.sport, draft.modality],
  );

  return (
    <View style={staticStyles.step}>
      <StepHeader
        title="Tipo, nivel y posiciones"
        sub="Configura los detalles del partido"
      />

      {/* Match type */}
      <View>
        <Text variant="caption" color="textSecondary" style={staticStyles.sectionLabel}>
          Tipo de partida
        </Text>
        <View style={staticStyles.typeList}>
          {(['chill', 'seria', 'competencia'] as MatchType[]).map((t) => {
            const m = matchTypeMeta[t];
            const active = draft.type === t;
            const typeClr = t === 'chill' ? c.chill : t === 'seria' ? c.seria : c.competencia;
            const typeSoft = t === 'chill' ? c.chillSoft : t === 'seria' ? c.seriaSoft : c.competenciaSoft;
            return (
              <PressableScale
                key={t}
                onPress={() => setKey('type', t)}
                style={[
                  staticStyles.typeRow,
                  {
                    borderColor: active ? typeClr : c.border,
                    backgroundColor: active ? typeSoft : c.surface,
                  },
                ]}
                scaleTo={0.98}
              >
                <Text style={staticStyles.typeEmoji}>{m.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text variant="bodySemibold" style={{ color: typeClr }}>
                    {m.label}
                  </Text>
                  <Text variant="small" color="textSecondary">
                    {m.description}
                  </Text>
                </View>
                {active ? (
                  <Check size={20} color={typeClr} weight="bold" />
                ) : null}
              </PressableScale>
            );
          })}
        </View>
        <ErrorMessage message={errors.type} />
      </View>

      {/* Skill level */}
      <View>
        <Text variant="caption" color="textSecondary" style={staticStyles.sectionLabel}>
          Nivel de jugadores requerido
        </Text>
        <View style={staticStyles.levelStars}>
          {levels.map((lvl) => {
            const active = draft.skillLevel === lvl;
            return (
              <PressableScale
                key={lvl}
                onPress={() => setKey('skillLevel', lvl)}
                style={[
                  s.levelBtn,
                  active ? s.levelBtnActive : null,
                ]}
                scaleTo={0.94}
              >
                <Stars level={lvl} size={10} />
              </PressableScale>
            );
          })}
        </View>
        {draft.skillLevel ? (
          <View style={staticStyles.levelLabel}>
            <Text variant="bodySemibold" color="primary">
              {labelSkill(draft.skillLevel)}
            </Text>
          </View>
        ) : null}
        <ErrorMessage message={errors.skillLevel} />
      </View>

      {/* Positions */}
      {noPositions ? (
        <View>
          <Text variant="caption" color="textSecondary" style={staticStyles.sectionLabel}>
            Posiciones
          </Text>
          <Text variant="body" color="textTertiary">
            Este deporte no requiere selección de posición.
          </Text>
        </View>
      ) : (
        <View>
          <Text variant="caption" color="textSecondary" style={staticStyles.sectionLabel}>
            Posiciones que buscas
          </Text>
          {hasPitch && draft.modality ? (
            <View style={staticStyles.pitchWrap}>
              <PositionPitch
                sport={draft.sport ?? undefined}
                modality={draft.modality}
                selectedPositions={draft.positions}
                onSetPositions={(positions) => setKey('positions', positions)}
              />
            </View>
          ) : null}
          <View style={staticStyles.chipsWrap}>
            {positions.map((p) => (
              <Chip
                key={p}
                label={labelPosition(p)}
                selected={draft.positions.includes(p)}
                onPress={() => togglePosition(p)}
              />
            ))}
          </View>
          <ErrorMessage message={errors.positions} />

          {/* Missing count stepper */}
          <View style={staticStyles.countBlock}>
            <Text variant="caption" color="textSecondary">
              ¿Cuántos jugadores faltan?
            </Text>
            <View style={s.counterRow}>
              <PressableScale
                style={s.counterBtn}
                scaleTo={0.9}
                onPress={() =>
                  setKey('missingCount', Math.max(1, draft.missingCount - 1))
                }
              >
                <Minus size={18} color={c.textPrimary} weight="bold" />
              </PressableScale>
              <Text variant="h2" color="textPrimary" style={staticStyles.counterNum}>
                {draft.missingCount}
              </Text>
              <PressableScale
                style={s.counterBtn}
                scaleTo={0.9}
                onPress={() =>
                  setKey('missingCount', Math.min(22, draft.missingCount + 1))
                }
              >
                <Plus size={18} color={c.textPrimary} weight="bold" />
              </PressableScale>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Step 4 — Ubicación + Fecha + Precio
// ---------------------------------------------------------------------------

const PRICE_ACCESSORY_ID = 'price-done';

function Step4LocationPrice({ draft, setKey, errors }: StepProps) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const priceNum = Number(draft.pricePerHour) || 0;
  const vesAmount = usdToVes(priceNum);
  const [locationOpen, setLocationOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [durationOpen, setDurationOpen] = useState(false);

  return (
    <View style={staticStyles.step}>
      <StepHeader
        title="Ubicación, fecha y precio"
        sub="¿Dónde, cuándo y cuánto costará?"
      />

      <View style={staticStyles.fieldGroup}>
        <TextInput
          label="Cancha"
          placeholder="Nombre de la cancha"
          value={draft.locationName}
          onChangeText={(v) => setKey('locationName', v)}
          leading={<MapPin size={18} color={c.textSecondary} weight="fill" />}
          error={errors.locationName}
        />
        <PressableScale
          style={s.mapBtn}
          scaleTo={0.97}
          onPress={() => setLocationOpen(true)}
        >
          <MapPin size={16} color={c.primary} weight="bold" />
          <Text variant="smallMedium" color="primary">
            Seleccionar en mapa
          </Text>
        </PressableScale>
      </View>

      <TextInput
        label="Dirección (opcional)"
        placeholder="Av. Principal, ciudad"
        value={draft.locationAddress}
        onChangeText={(v) => setKey('locationAddress', v)}
      />

      <RowBlock
        label="Fecha"
        icon={<CalendarBlank size={18} color={c.textSecondary} weight="fill" />}
        value={formatDateLabel(draft.date)}
        onPress={() => setDateOpen(true)}
      />
      <RowBlock
        label="Hora de inicio"
        icon={<ClockCounterClockwise size={18} color={c.textSecondary} weight="fill" />}
        value={formatTimeLabel(draft.date)}
        onPress={() => setTimeOpen(true)}
      />
      <RowBlock
        label="Duración estimada"
        value={`${draft.durationMin} minutos`}
        onPress={() => setDurationOpen(true)}
      />

      {/* Price */}
      <View style={staticStyles.priceField}>
        <Text variant="caption" color="textSecondary">
          Precio por hora de la cancha
        </Text>
        <View
          style={[
            s.priceRow,
            errors.pricePerHour ? s.priceRowError : null,
          ]}
        >
          <View style={staticStyles.priceInputWrap}>
            <Text variant="h1" color="textPrimary">
              $
            </Text>
            <TextInput
              variant="plain"
              value={draft.pricePerHour}
              onChangeText={(v) =>
                setKey('pricePerHour', v.replace(/[^0-9]/g, ''))
              }
              keyboardType="numeric"
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
              inputAccessoryViewID={Platform.OS === 'ios' ? PRICE_ACCESSORY_ID : undefined}
              inputStyle={staticStyles.priceInput}
              containerStyle={staticStyles.priceInputContainer}
            />
          </View>
          <View style={s.currencyPill}>
            <Text variant="smallMedium" color="textPrimary">
              USD
            </Text>
          </View>
        </View>
        <View style={staticStyles.conversionRow}>
          <Text variant="small" color="textSecondary">
            ≈ {formatVes(vesAmount)}
          </Text>
          <Text variant="caption" color="textTertiary">
            BCV {BCV_RATE.toFixed(2)} Bs/USD
          </Text>
        </View>
        <ErrorMessage message={errors.pricePerHour} />
      </View>

      {Platform.OS === 'ios' ? (
        <InputAccessoryView nativeID={PRICE_ACCESSORY_ID}>
          <View style={s.inputAccessory}>
            <PressableScale onPress={Keyboard.dismiss} scaleTo={0.95}>
              <Text variant="bodySemibold" color="primary">
                Listo
              </Text>
            </PressableScale>
          </View>
        </InputAccessoryView>
      ) : null}

      <LocationPickerSheet
        visible={locationOpen}
        onClose={() => setLocationOpen(false)}
        filterSport={draft.sport}
        onSelect={(cancha) => {
          setKey('locationAddress', cancha.address);
          setKey('locationLat', cancha.lat);
          setKey('locationLng', cancha.lng);
        }}
      />
      <DateTimePickerSheet
        visible={dateOpen}
        onClose={() => setDateOpen(false)}
        value={draft.date}
        mode="date"
        onChange={(d) => {
          const next = new Date(draft.date);
          next.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
          setKey('date', next);
        }}
      />
      <DateTimePickerSheet
        visible={timeOpen}
        onClose={() => setTimeOpen(false)}
        value={draft.date}
        mode="time"
        onChange={(d) => {
          const next = new Date(draft.date);
          next.setHours(d.getHours(), d.getMinutes(), 0, 0);
          setKey('date', next);
        }}
      />
      <DurationPickerSheet
        visible={durationOpen}
        onClose={() => setDurationOpen(false)}
        value={draft.durationMin}
        onChange={(min) => setKey('durationMin', min)}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Step 5 — Pagos + Requisitos + Resumen
// ---------------------------------------------------------------------------

function Step5PaymentsExtras({
  draft,
  setKey,
  togglePayment,
  toggleRequirement,
  errors,
}: StepProps & {
  togglePayment: (m: PaymentMethod) => void;
  toggleRequirement: (r: string) => void;
}) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const typeMeta = draft.type ? matchTypeMeta[draft.type] : null;
  const priceNum = Number(draft.pricePerHour) || 0;
  const reqs = draft.sport ? REQUIREMENTS_BY_SPORT[draft.sport] : DEFAULT_REQUIREMENTS;

  return (
    <View style={staticStyles.step}>
      <StepHeader
        title="Pagos, requisitos y resumen"
        sub="Configura cómo pagan y qué se requiere"
      />

      {/* Payment methods */}
      <View>
        <Text variant="caption" color="textSecondary" style={staticStyles.sectionLabel}>
          Métodos de pago aceptados
        </Text>
        <Card>
          {PAYMENT_METHODS.map((m, i) => (
            <View key={m}>
              <PressableScale
                onPress={() => togglePayment(m)}
                style={staticStyles.payRow}
                scaleTo={0.98}
              >
                <Text variant="body" color="textPrimary">
                  {labelPayment(m)}
                </Text>
                <View
                  style={[
                    s.check,
                    draft.paymentMethods.includes(m) ? s.checkOn : null,
                  ]}
                >
                  {draft.paymentMethods.includes(m) ? (
                    <Check size={14} color={c.bg} weight="bold" />
                  ) : null}
                </View>
              </PressableScale>
              {i < PAYMENT_METHODS.length - 1 ? (
                <View style={s.payDivider} />
              ) : null}
            </View>
          ))}
        </Card>
        <ErrorMessage message={errors.paymentMethods} />
      </View>

      {/* Exchange rate */}
      <View>
        <Text variant="caption" color="textSecondary" style={staticStyles.sectionLabel}>
          Tasa de cambio
        </Text>
        <Card>
          <View style={staticStyles.payRow}>
            <Text variant="body" color="textPrimary">
              BCV
            </Text>
            <Text variant="small" color="textSecondary">
              {BCV_RATE.toFixed(2)} Bs / USD
            </Text>
          </View>
        </Card>
      </View>

      {/* Requirements */}
      <View>
        <Text variant="caption" color="textSecondary">
          Verificaciones / Requisitos (opcional)
        </Text>
        <View style={staticStyles.reqList}>
          {reqs.map((r) => (
            <PressableScale
              key={r}
              onPress={() => toggleRequirement(r)}
              style={s.reqRow}
              scaleTo={0.98}
            >
              <View
                style={[
                  s.check,
                  draft.requirements.includes(r) ? s.checkOn : null,
                ]}
              >
                {draft.requirements.includes(r) ? (
                  <Check size={14} color={c.bg} weight="bold" />
                ) : null}
              </View>
              <Text variant="body" color="textPrimary" style={{ flex: 1 }}>
                {r}
              </Text>
            </PressableScale>
          ))}
        </View>
        <View style={staticStyles.customReqWrap}>
          <TextInput
            label="Requisito personalizado (opcional)"
            placeholder="Ej: Camiseta blanca obligatoria"
            value={draft.extraRequirement}
            onChangeText={(v) => setKey('extraRequirement', v)}
            maxLength={100}
          />
        </View>
      </View>

      {/* Summary */}
      <Text variant="caption" color="textSecondary" style={staticStyles.sectionLabel}>
        Resumen de tu partida
      </Text>
      <Card>
        <View style={staticStyles.summaryRow}>
          <Text style={staticStyles.summaryEmoji}>{typeMeta?.emoji ?? '⚽'}</Text>
          <View style={{ flex: 1 }}>
            <Text variant="bodySemibold" color="textPrimary">
              {draft.modality ? labelModality(draft.modality) : '—'}
            </Text>
            <Text variant="small" color="textSecondary">
              {draft.locationName || 'Sin ubicación'} ·{' '}
              {formatTimeLabel(draft.date)} · {draft.durationMin} min
            </Text>
            {priceNum > 0 ? (
              <Text variant="small" color="textTertiary">
                ≈ {formatVes(usdToVes(priceNum))}
              </Text>
            ) : null}
          </View>
          <Badge label={`$${draft.pricePerHour}/h`} tone="primary" />
        </View>
      </Card>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Shared helper
// ---------------------------------------------------------------------------

function RowBlock({
  label,
  value,
  icon,
  onPress,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
  onPress?: () => void;
}) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const content = (
    <View style={staticStyles.rowBlock}>
      <Text variant="caption" color="textSecondary">
        {label}
      </Text>
      <View style={s.rowField}>
        {icon}
        <Text variant="body" color="textPrimary" style={{ flex: 1 }}>
          {value}
        </Text>
        <CaretRight size={16} color={c.textTertiary} weight="bold" />
      </View>
    </View>
  );
  if (onPress) {
    return (
      <PressableScale onPress={onPress} scaleTo={0.98}>
        {content}
      </PressableScale>
    );
  }
  return content;
}

// ---------------------------------------------------------------------------
// Static styles (no color tokens)
// ---------------------------------------------------------------------------

const staticStyles = StyleSheet.create({
  step: { gap: spacing.lg, paddingTop: spacing.md },
  stepHead: { gap: spacing.xs },
  sportList: { gap: spacing.sm },
  sportEmoji: { fontSize: 24, lineHeight: 30, textAlign: 'center' },
  modalityList: { gap: spacing.sm },
  typeList: { gap: spacing.sm },
  typeEmoji: { fontSize: 28, lineHeight: 36, width: 36, textAlign: 'center' },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  sectionLabel: { marginBottom: spacing.sm },
  levelStars: {
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
  levelLabel: { alignItems: 'center', marginTop: spacing.sm },
  pitchWrap: { marginBottom: spacing.md },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  countBlock: {
    gap: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  counterNum: { minWidth: 32, textAlign: 'center' },
  fieldGroup: { gap: spacing.sm },
  rowBlock: { gap: spacing.xs },
  priceField: { gap: spacing.sm },
  priceInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  priceInputContainer: { flex: 1 },
  priceInput: { fontSize: 28, paddingVertical: 0 },
  conversionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  payRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  reqList: { gap: spacing.sm, marginTop: spacing.sm, marginBottom: spacing.lg },
  customReqWrap: { marginTop: spacing.sm },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  summaryEmoji: { fontSize: 22, lineHeight: 28, width: 28, textAlign: 'center' },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
});

// ---------------------------------------------------------------------------
// Dynamic styles factory
// ---------------------------------------------------------------------------

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    stepperWrap: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    scroll: {
      paddingHorizontal: spacing.lg,
      paddingBottom: 120,
    },
    sportRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
    },
    sportEmojiWrap: {
      width: 44,
      height: 44,
      borderRadius: radius.full,
      backgroundColor: c.primarySoft,
      borderWidth: 1,
      borderColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sportRowActive: {
      borderColor: c.primary,
      backgroundColor: c.primarySoft,
    },
    modalityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.lg,
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
    },
    modalityRowActive: {
      borderColor: c.primary,
      backgroundColor: c.primarySoft,
    },
    modalityIcon: {
      width: 44,
      height: 44,
      borderRadius: radius.sm,
      backgroundColor: c.primarySoft,
      borderWidth: 1,
      borderColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    levelBtn: {
      flex: 1,
      paddingVertical: spacing.md,
      backgroundColor: c.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      minHeight: 44,
      justifyContent: 'center',
    },
    levelBtnActive: {
      backgroundColor: c.primarySoft,
      borderColor: c.primary,
    },
    counterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xl,
      backgroundColor: c.surface,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: c.border,
    },
    counterBtn: {
      width: 36,
      height: 36,
      borderRadius: radius.full,
      backgroundColor: c.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
    },
    mapBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      alignSelf: 'flex-start',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: c.primarySoft,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: c.primary,
    },
    rowField: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      backgroundColor: c.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.border,
      minHeight: 50,
    },
    priceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
      backgroundColor: c.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.border,
    },
    priceRowError: { borderColor: c.alert },
    currencyPill: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.sm,
      backgroundColor: c.surfaceElevated,
    },
    payDivider: { height: 1, backgroundColor: c.border },
    check: {
      width: 22,
      height: 22,
      borderRadius: radius.sm,
      borderWidth: 1.5,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkOn: { backgroundColor: c.primary, borderColor: c.primary },
    reqRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
      backgroundColor: c.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.border,
    },
    inputAccessory: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      backgroundColor: c.surface,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
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
  });
}
