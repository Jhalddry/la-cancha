import { useLocalSearchParams, useRouter } from 'expo-router';
import { House, Star } from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TextInput as RNTextInput, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { Stars } from '@/components/ui/Stars';
import { Text } from '@/components/ui/Text';
import { mockCurrentUser, mockPlayers } from '@/data/players';
import { colors, fonts, radius, spacing } from '@/theme';

const TOTAL_STEPS = 3;

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
  const { id } = useLocalSearchParams<{ id: string }>();
  const all = [...mockPlayers, mockCurrentUser];
  const player = all.find((p) => p.id === id) ?? mockPlayers[0];

  const [step, setStep] = useState(1);
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState<Set<string>>(new Set());
  const [comment, setComment] = useState('');

  const toggleTag = (t: string) =>
    setTags((cur) => {
      const next = new Set(cur);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });

  if (step === 4) {
    return <SuccessStep player={player} rating={rating} router={router} />;
  }

  return (
    <Screen edges={['top']}>
      <View style={styles.header}>
        <PressableScale onPress={() => (step === 1 ? router.back() : setStep(step - 1))} scaleTo={0.9}>
          <Text variant="bodyMedium" color="textTertiary">
            {step === 1 ? 'Cancelar' : 'Atrás'}
          </Text>
        </PressableScale>
        <Text variant="bodySemibold">Calificación</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Step indicator dots */}
      <View style={styles.dotsRow}>
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <View key={i} style={[styles.dot, i < step ? styles.dotActive : null]} />
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {step === 1 ? (
          <RatingStep player={player} rating={rating} onRate={setRating} />
        ) : null}
        {step === 2 ? (
          <TagsStep tags={tags} onToggle={toggleTag} />
        ) : null}
        {step === 3 ? (
          <CommentStep comment={comment} onChange={setComment} />
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        {step < TOTAL_STEPS ? (
          <Button
            label="Continuar"
            disabled={step === 1 && rating === 0}
            onPress={() => setStep(step + 1)}
          />
        ) : (
          <Button label="Enviar calificación" onPress={() => setStep(4)} />
        )}
        {step === 3 ? (
          <PressableScale scaleTo={0.97} onPress={() => setStep(4)}>
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

function RatingStep({
  player,
  rating,
  onRate,
}: {
  player: (typeof mockPlayers)[0];
  rating: number;
  onRate: (r: number) => void;
}) {
  return (
    <View style={styles.step}>
      <View style={styles.stepHeader}>
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

      <View style={styles.avatarWrap}>
        <Avatar name={player.name} size={80} />
        {player.verified ? (
          <View style={styles.verifiedDot} />
        ) : null}
      </View>

      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((n) => (
          <PressableScale key={n} onPress={() => onRate(n)} scaleTo={0.85}>
            <Star
              size={48}
              color={n <= rating ? '#FFD93D' : colors.border}
              weight={n <= rating ? 'fill' : 'regular'}
            />
          </PressableScale>
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
// Step 2 — Etiquetas rápidas
// ---------------------------------------------------------------------------

function TagsStep({
  tags,
  onToggle,
}: {
  tags: Set<string>;
  onToggle: (t: string) => void;
}) {
  return (
    <View style={styles.step}>
      <View style={styles.stepHeader}>
        <Text variant="h2" style={{ textAlign: 'center' }}>
          ¿Qué destacarías?
        </Text>
        <Text variant="body" color="textSecondary" style={{ textAlign: 'center' }}>
          Selecciona todas las que apliquen
        </Text>
      </View>

      <View style={styles.tagsSection}>
        <Text variant="caption" color="textSecondary" style={styles.tagsGroupLabel}>
          Positivo
        </Text>
        <View style={styles.tagsWrap}>
          {POSITIVE_TAGS.map((t) => (
            <TagChip key={t} label={t} selected={tags.has(t)} onPress={() => onToggle(t)} positive />
          ))}
        </View>
      </View>

      <View style={styles.tagsSection}>
        <Text variant="caption" color="textSecondary" style={styles.tagsGroupLabel}>
          Negativo
        </Text>
        <View style={styles.tagsWrap}>
          {NEGATIVE_TAGS.map((t) => (
            <TagChip key={t} label={t} selected={tags.has(t)} onPress={() => onToggle(t)} positive={false} />
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
  comment,
  onChange,
}: {
  comment: string;
  onChange: (c: string) => void;
}) {
  return (
    <View style={styles.step}>
      <View style={styles.stepHeader}>
        <Text variant="h2" style={{ textAlign: 'center' }}>
          Comentario opcional
        </Text>
        <Text variant="body" color="textSecondary" style={{ textAlign: 'center' }}>
          Cuéntanos más (opcional)
        </Text>
      </View>

      <View style={styles.textareaWrap}>
        <RNTextInput
          style={styles.textarea}
          placeholder="Gran partido, todos muy respetuosos..."
          placeholderTextColor={colors.textTertiary}
          multiline
          numberOfLines={5}
          value={comment}
          onChangeText={(v) => onChange(v.slice(0, MAX_COMMENT))}
          textAlignVertical="top"
        />
        <Text variant="caption" color="textTertiary" style={styles.charCount}>
          {comment.length}/{MAX_COMMENT}
        </Text>
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
  player: (typeof mockPlayers)[0];
  rating: number;
  router: ReturnType<typeof useRouter>;
}) {
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
      <View style={styles.successWrap}>
        <ConfettiDecor />

        <Animated.View style={[styles.checkCircle, checkStyle]}>
          <Text style={{ fontSize: 48 }}>✓</Text>
        </Animated.View>

        <Animated.View style={[styles.successContent, contentStyle]}>
          <Text variant="h1" color="textPrimary">
            ¡Gracias!
          </Text>
          <Text variant="body" color="textSecondary" style={{ textAlign: 'center' }}>
            Tu calificación ha sido enviada.
          </Text>

          <View style={styles.ratedCard}>
            <Avatar name={player.name} size={48} />
            <View style={{ flex: 1 }}>
              <Text variant="bodySemibold" color="textPrimary">
                {player.name}
              </Text>
              <Text variant="caption" color="textSecondary">
                Tu calificación
              </Text>
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
            leading={<House size={18} color={colors.bg} weight="fill" />}
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
  label,
  selected,
  positive,
  onPress,
}: {
  label: string;
  selected: boolean;
  positive: boolean;
  onPress: () => void;
}) {
  const activeColor = positive ? colors.primary : colors.alert;
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.93}
      style={[
        styles.tagChip,
        selected
          ? { borderColor: activeColor, backgroundColor: `${activeColor}18` }
          : null,
      ]}
    >
      <Text
        variant="smallMedium"
        style={{ color: selected ? activeColor : colors.textSecondary }}
      >
        {label}
      </Text>
    </PressableScale>
  );
}

function ConfettiDecor() {
  const dots = [
    { top: 40, left: 30, size: 10, color: colors.primary },
    { top: 80, left: 55, size: 7, color: '#FF6B6B' },
    { top: 55, right: 40, size: 12, color: '#FFD93D' },
    { top: 110, left: 20, size: 8, color: '#4D96FF' },
    { top: 30, right: 65, size: 9, color: '#FF6B6B' },
    { top: 95, right: 25, size: 7, color: colors.primary },
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
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  dot: {
    width: 28,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  dotActive: { backgroundColor: colors.primary },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
  },
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
    backgroundColor: colors.primary,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  tagsSection: { gap: spacing.sm },
  tagsGroupLabel: { marginBottom: 2 },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tagChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  textareaWrap: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  textarea: {
    color: colors.textPrimary,
    fontFamily: fonts.regular,
    fontSize: 15,
    minHeight: 120,
  },
  charCount: { alignSelf: 'flex-end' },
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
    gap: spacing.sm,
  },
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
  ratedCard: {
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
});
