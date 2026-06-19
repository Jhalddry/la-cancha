import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, House, Star } from 'phosphor-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput as RNTextInput,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { Stars } from '@/components/ui/Stars';
import { Text } from '@/components/ui/Text';
import { useColors } from '@/hooks/useColors';
import { useProfile, profileKeys, ratingKeys } from '@/hooks/useProfiles';
import { submitRating, updateAttendancePct } from '@/lib/ratingsApi';
import { queryClient } from '@/lib/queryClient';
import { useSession } from '@/store/session';
import { fonts, radius, spacing } from '@/theme';
import type { ColorPalette } from '@/theme/palettes';
import type { Player } from '@/types/domain';

// TOTAL_STEPS is dynamic based on isOrgEval — defined inside CalificarScreen

const RATING_LABEL: Record<number, string> = {
  1: 'Muy malo',
  2: 'Regular',
  3: 'Bueno',
  4: 'Muy bueno',
  5: '¡Excelente!',
};

const POSITIVE_TAGS = ['Puntual', 'Fair Play', 'Buena actitud', 'Organizado', 'Nivel acorde', 'Buen compañero'];
const NEGATIVE_TAGS = ['Tóxico', 'Abandonó', 'Impuntual', 'Nivel no acorde'];

const MAX_COMMENT = 200;

export default function CalificarScreen() {
  const router = useRouter();
  const { id, matchId, isOrganizer } = useLocalSearchParams<{ id: string; matchId?: string; isOrganizer?: string }>();
  const isOrgEval = isOrganizer === 'true';
  const userId = useSession((st) => st.user?.id);
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);

  const { data: player, isLoading: playerLoading } = useProfile(id);

  // 4 steps for everyone: Stars → Check → Tags → Comment
  const TOTAL_STEPS = 4;
  const [step, setStep] = useState(1);
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState<Set<string>>(new Set());
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [attended, setAttended] = useState<boolean | null>(null);
  const [punctual, setPunctual] = useState<boolean | null>(null);
  const [locationOk, setLocationOk] = useState<boolean | null>(null);

  const successStep = TOTAL_STEPS + 1;

  const toggleTag = (t: string) =>
    setTags((cur) => {
      const next = new Set(cur);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });

  const handleSubmit = async () => {
    if (!userId || !player) return;
    if (!matchId) {
      Alert.alert(
        'Sin partida',
        'No se encontró la partida asociada. Regresa y vuelve a intentarlo.',
      );
      return;
    }
    setSending(true);
    try {
      const extraTags: string[] = [];
      if (attended === true) extraTags.push('Asistió');
      if (attended === false) extraTags.push('No asistió');
      if (punctual === true) extraTags.push('Puntual');
      if (punctual === false) extraTags.push('Impuntual');
      if (isOrgEval && locationOk === true) extraTags.push('Lugar correcto');
      if (isOrgEval && locationOk === false) extraTags.push('Lugar incorrecto');
      await submitRating(matchId, userId, player.id, rating, [...tags, ...extraTags], comment);
      if (attended !== null) void updateAttendancePct(player.id);
      // Invalidate profile reputation, player ratings, and my given ratings list
      void queryClient.invalidateQueries({ queryKey: profileKeys.detail(player.id) });
      void queryClient.invalidateQueries({ queryKey: ratingKeys.forPlayer(player.id) });
      void queryClient.invalidateQueries({ queryKey: ratingKeys.given(userId) });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep(successStep);
    } catch (e) {
      Alert.alert(
        'Error al enviar',
        e instanceof Error ? e.message : 'Intenta de nuevo.',
      );
    } finally {
      setSending(false);
    }
  };

  if (playerLoading || !player) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={c.primary} size="large" />
        </View>
      </Screen>
    );
  }

  if (step === successStep) {
    return <SuccessStep player={player} rating={rating} router={router} />;
  }

  return (
    <Screen edges={['top']}>
      <View style={s.header}>
        <PressableScale
          onPress={() => (step === 1 ? router.back() : setStep(step - 1))}
          scaleTo={0.9}
        >
          <Text variant="bodyMedium" color="textTertiary">
            {step === 1 ? 'Cancelar' : 'Atrás'}
          </Text>
        </PressableScale>
        <Text variant="bodySemibold">Calificación</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Step indicator dots */}
      <View style={s.dotsRow}>
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <View key={i} style={[s.dot, i < step ? s.dotActive : null]} />
        ))}
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {step === 1 ? (
          <RatingStep c={c} player={player} rating={rating} onRate={setRating} />
        ) : null}
        {step === 2 ? (
          <CheckStep
            c={c}
            attended={attended}
            setAttended={setAttended}
            punctual={punctual}
            setPunctual={setPunctual}
            locationOk={locationOk}
            setLocationOk={setLocationOk}
            showLocation={isOrgEval}
          />
        ) : null}
        {step === 3 ? (
          <TagsStep c={c} tags={tags} onToggle={toggleTag} />
        ) : null}
        {step === 4 ? (
          <CommentStep c={c} comment={comment} onChange={setComment} />
        ) : null}
      </ScrollView>

      <View style={s.footer}>
        {step < TOTAL_STEPS ? (
          <Button
            label="Continuar"
            disabled={step === 1 && rating === 0}
            onPress={() => setStep(step + 1)}
          />
        ) : (
          <Button
            label={sending ? 'Enviando…' : 'Enviar calificación'}
            disabled={sending}
            onPress={handleSubmit}
          />
        )}
        {step === TOTAL_STEPS ? (
          <PressableScale scaleTo={0.97} onPress={handleSubmit} disabled={sending}>
            <Text variant="body" color="textTertiary" style={{ textAlign: 'center' }}>
              Omitir comentario
            </Text>
          </PressableScale>
        ) : null}
      </View>
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// Step 1 — Calificación general
// ---------------------------------------------------------------------------

function StarItem({
  n,
  rating,
  borderColor,
  onRate,
}: {
  n: number;
  rating: number;
  borderColor: string;
  onRate: (r: number) => void;
}) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const active = n <= rating;
  const prevActive = useRef(active);

  useEffect(() => {
    if (prevActive.current && !active) {
      scale.value = withSpring(1, { damping: 20, stiffness: 200 });
    }
    prevActive.current = active;
  }, [active, scale]);

  const handlePress = () => {
    onRate(n);
    scale.value = withSequence(
      withSpring(1.22, { damping: 10, stiffness: 280 }),
      withSpring(1, { damping: 20, stiffness: 200 }),
    );
  };

  return (
    <Pressable onPress={handlePress}>
      <Animated.View style={style}>
        <Star
          size={48}
          color={active ? '#FFD93D' : borderColor}
          weight={active ? 'fill' : 'regular'}
        />
      </Animated.View>
    </Pressable>
  );
}

function RatingStep({
  c,
  player,
  rating,
  onRate,
}: {
  c: ColorPalette;
  player: Player;
  rating: number;
  onRate: (r: number) => void;
}) {
  const s = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={s.step}>
      <View style={s.stepHeader}>
        <Text variant="h2" style={{ textAlign: 'center' }}>
          ¿Cómo fue tu experiencia
        </Text>
        <Text variant="h2" style={{ textAlign: 'center' }}>
          con {player.name}?
        </Text>
        <Text variant="body" color="textSecondary" style={{ textAlign: 'center' }}>
          Tu opinión ayuda a la comunidad
        </Text>
      </View>

      <View style={s.avatarWrap}>
        <Avatar name={player.name} uri={player.avatarUrl} size={80} />
        {player.verified ? <View style={s.verifiedDot} /> : null}
      </View>

      <View style={s.starsRow}>
        {[1, 2, 3, 4, 5].map((n) => (
          <StarItem key={n} n={n} rating={rating} borderColor={c.border} onRate={onRate} />
        ))}
      </View>

      {rating > 0 ? (
        <Text variant="h3" color="primary" style={{ textAlign: 'center' }}>
          {RATING_LABEL[rating]}
        </Text>
      ) : (
        <Text variant="body" color="textTertiary" style={{ textAlign: 'center' }}>
          Toca una estrella para calificar
        </Text>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Asistencia, puntualidad (todos) + ubicación (solo org eval)
// ---------------------------------------------------------------------------

function BinaryChoice({
  question,
  value,
  onChange,
  c,
  s,
}: {
  question: string;
  value: boolean | null;
  onChange: (v: boolean) => void;
  c: ColorPalette;
  s: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={s.orgCheckWrap}>
      <Text variant="bodyMedium" color="textPrimary" style={{ marginBottom: spacing.sm }}>
        {question}
      </Text>
      <View style={s.orgCheckRow}>
        <PressableScale
          scaleTo={0.93}
          style={[s.orgBinaryBtn, {
            borderColor: value === true ? c.primary : c.border,
            backgroundColor: value === true ? `${c.primary}18` : c.surface,
          }]}
          onPress={() => onChange(true)}
        >
          <Text variant="bodyMedium" style={{ color: value === true ? c.primary : c.textSecondary }}>Sí</Text>
        </PressableScale>
        <PressableScale
          scaleTo={0.93}
          style={[s.orgBinaryBtn, {
            borderColor: value === false ? c.alert : c.border,
            backgroundColor: value === false ? `${c.alert}18` : c.surface,
          }]}
          onPress={() => onChange(false)}
        >
          <Text variant="bodyMedium" style={{ color: value === false ? c.alert : c.textSecondary }}>No</Text>
        </PressableScale>
      </View>
    </View>
  );
}

function CheckStep({
  c,
  attended,
  setAttended,
  punctual,
  setPunctual,
  locationOk,
  setLocationOk,
  showLocation,
}: {
  c: ColorPalette;
  attended: boolean | null;
  setAttended: (v: boolean) => void;
  punctual: boolean | null;
  setPunctual: (v: boolean) => void;
  locationOk: boolean | null;
  setLocationOk: (v: boolean) => void;
  showLocation: boolean;
}) {
  const s = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={s.step}>
      <View style={s.stepHeader}>
        <Text variant="h2" style={{ textAlign: 'center' }}>Asistencia y puntualidad</Text>
        <Text variant="body" color="textSecondary" style={{ textAlign: 'center' }}>
          Esto afecta el perfil del jugador
        </Text>
      </View>
      <BinaryChoice
        question="¿Asistió a la partida?"
        value={attended}
        onChange={setAttended}
        c={c}
        s={s}
      />
      <BinaryChoice
        question="¿Llegó puntual?"
        value={punctual}
        onChange={setPunctual}
        c={c}
        s={s}
      />
      {showLocation ? (
        <BinaryChoice
          question="¿El lugar de la partida era el correcto?"
          value={locationOk}
          onChange={setLocationOk}
          c={c}
          s={s}
        />
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Step 2 (normal) / Step 3 (isOrgEval) — Etiquetas rápidas
// ---------------------------------------------------------------------------

function TagsStep({
  c,
  tags,
  onToggle,
}: {
  c: ColorPalette;
  tags: Set<string>;
  onToggle: (t: string) => void;
}) {
  const s = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={s.step}>
      <View style={s.stepHeader}>
        <Text variant="h2" style={{ textAlign: 'center' }}>
          ¿Qué destacarías?
        </Text>
        <Text variant="body" color="textSecondary" style={{ textAlign: 'center' }}>
          Selecciona todas las que apliquen
        </Text>
      </View>

      <View style={s.tagsSection}>
        <Text variant="caption" color="textSecondary" style={s.tagsGroupLabel}>
          Positivo
        </Text>
        <View style={s.tagsWrap}>
          {POSITIVE_TAGS.map((t) => (
            <TagChip c={c} key={t} label={t} selected={tags.has(t)} onPress={() => onToggle(t)} positive />
          ))}
        </View>
      </View>

      <View style={s.tagsSection}>
        <Text variant="caption" color="textSecondary" style={s.tagsGroupLabel}>
          Negativo
        </Text>
        <View style={s.tagsWrap}>
          {NEGATIVE_TAGS.map((t) => (
            <TagChip c={c} key={t} label={t} selected={tags.has(t)} onPress={() => onToggle(t)} positive={false} />
          ))}
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Step 3 — Comentario
// ---------------------------------------------------------------------------

function CommentStep({
  c,
  comment,
  onChange,
}: {
  c: ColorPalette;
  comment: string;
  onChange: (v: string) => void;
}) {
  const s = useMemo(() => makeStyles(c), [c]);
  const pulseScale = useSharedValue(1);
  const prevLen = useRef(0);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulseScale.value }] }));
  const isWarning = comment.length >= 180;

  useEffect(() => {
    if (comment.length >= 180 && comment.length > prevLen.current) {
      pulseScale.value = withSequence(
        withTiming(1.2, { duration: 120 }),
        withSpring(1, { damping: 8 }),
      );
    }
    prevLen.current = comment.length;
  }, [comment.length, pulseScale]);

  return (
    <View style={s.step}>
      <View style={s.stepHeader}>
        <Text variant="h2" style={{ textAlign: 'center' }}>
          Comentario opcional
        </Text>
        <Text variant="body" color="textSecondary" style={{ textAlign: 'center' }}>
          Cuéntanos más (opcional)
        </Text>
      </View>

      <View style={s.textareaWrap}>
        <RNTextInput
          style={s.textarea}
          placeholder="Gran partido, todos muy respetuosos..."
          placeholderTextColor={c.textTertiary}
          multiline
          numberOfLines={5}
          value={comment}
          onChangeText={(v) => onChange(v.slice(0, MAX_COMMENT))}
          textAlignVertical="top"
        />
        <Animated.View style={[s.charCount, pulseStyle]}>
          <Text variant="caption" style={{ color: isWarning ? c.alert : c.textTertiary }}>
            {comment.length}/{MAX_COMMENT}
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Step 4 — Éxito
// ---------------------------------------------------------------------------

function SuccessStep({
  player,
  rating,
  router,
}: {
  player: Player;
  rating: number;
  router: ReturnType<typeof useRouter>;
}) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 12, stiffness: 120 });
    opacity.value = withDelay(200, withSpring(1));
  }, []);

  const checkStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const contentStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={s.successWrap}>
        <ConfettiDecor c={c} />

        <Animated.View style={[s.checkCircle, checkStyle]}>
          <Check size={52} color={c.bg} weight="bold" />
        </Animated.View>

        <Animated.View style={[s.successContent, contentStyle]}>
          <Text variant="h1" color="textPrimary">¡Gracias!</Text>
          <Text variant="body" color="textSecondary" style={{ textAlign: 'center' }}>
            Tu calificación ha sido enviada.
          </Text>

          <View style={s.ratedCard}>
            <Avatar name={player.name} uri={player.avatarUrl} size={48} />
            <View style={{ flex: 1 }}>
              <Text variant="bodySemibold" color="textPrimary">{player.name}</Text>
              <Text variant="caption" color="textSecondary">Tu calificación</Text>
              {rating > 0 ? (
                <View style={{ marginTop: 2 }}>
                  <Stars level={rating as 1 | 2 | 3 | 4 | 5} size={14} />
                </View>
              ) : null}
            </View>
          </View>

          <Button
            label="Volver al inicio"
            onPress={() => router.replace('/(tabs)')}
            leading={<House size={18} color={c.bg} weight="fill" />}
          />
        </Animated.View>
      </View>
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function TagChip({
  c,
  label,
  selected,
  positive,
  onPress,
}: {
  c: ColorPalette;
  label: string;
  selected: boolean;
  positive: boolean;
  onPress: () => void;
}) {
  const s = useMemo(() => makeStyles(c), [c]);
  const activeColor = positive ? c.primary : c.alert;
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.93}
      style={[
        s.tagChip,
        selected ? { borderColor: activeColor, backgroundColor: `${activeColor}30` } : null,
      ]}
    >
      <Text
        variant="smallMedium"
        style={{ color: selected ? activeColor : c.textSecondary }}
      >
        {label}
      </Text>
    </PressableScale>
  );
}

function ConfettiDecor({ c }: { c: ColorPalette }) {
  const dots = [
    { top: 40, left: 30, size: 10, color: c.primary },
    { top: 80, left: 55, size: 7, color: '#FF6B6B' },
    { top: 55, right: 40, size: 12, color: '#FFD93D' },
    { top: 110, left: 20, size: 8, color: '#4D96FF' },
    { top: 30, right: 65, size: 9, color: '#FF6B6B' },
    { top: 95, right: 25, size: 7, color: c.primary },
    { top: 140, left: 75, size: 6, color: '#FFD93D' },
    { top: 125, right: 55, size: 10, color: '#4D96FF' },
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
            ...('right' in d
              ? { right: d.right, top: d.top }
              : { left: d.left, top: d.top }),
          }}
        />
      ))}
    </View>
  );
}

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
    dotsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md,
    },
    dot: { width: 28, height: 4, borderRadius: 2, backgroundColor: c.border },
    dotActive: { backgroundColor: c.primary },
    scroll: { paddingHorizontal: spacing.lg, paddingBottom: 120 },
    step: { gap: spacing.xl, paddingTop: spacing.lg },
    stepHeader: { gap: spacing.xs },
    avatarWrap: { alignSelf: 'center' },
    verifiedDot: {
      position: 'absolute',
      bottom: 2,
      right: 2,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: c.primary,
    },
    starsRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
    tagsSection: { gap: spacing.sm },
    tagsGroupLabel: { marginBottom: 2 },
    tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    tagChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    orgCheckWrap: { gap: spacing.xs },
    orgCheckRow: { flexDirection: 'row', gap: spacing.md },
    orgBinaryBtn: {
      flex: 1,
      paddingVertical: spacing.md,
      borderRadius: radius.lg,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    textareaWrap: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      padding: spacing.md,
      gap: spacing.sm,
    },
    textarea: {
      color: c.textPrimary,
      fontFamily: fonts.regular,
      fontSize: 15,
      minHeight: 120,
    },
    charCount: { alignSelf: 'flex-end' as const },
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
      gap: spacing.sm,
    },
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
    ratedCard: {
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
  });
}
