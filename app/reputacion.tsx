import { useRouter } from 'expo-router';
import { Check, Star, WarningCircle } from 'phosphor-react-native';
import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { Avatar } from '@/components/ui/Avatar';
import { BackHeader } from '@/components/ui/BackHeader';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { Stars } from '@/components/ui/Stars';
import { Text } from '@/components/ui/Text';
import { useColors } from '@/hooks/useColors';
import { fetchMyRatings, type RatingRow } from '@/lib/ratingsApi';
import { useSession } from '@/store/session';
import { radius, spacing } from '@/theme';

const POSITIVE_TAGS = new Set([
  'Puntual', 'Fair Play', 'Buena actitud', 'Organizado', 'Nivel acorde', 'Buen compañero',
  'Asistió', 'Lugar correcto',
]);

const SUMMARY_ATTRS: { label: string; positive: string[]; negative: string[] }[] = [
  { label: 'Puntualidad',  positive: ['Puntual'],                        negative: ['Impuntual'] },
  { label: 'Fair Play',    positive: ['Fair Play'],                      negative: ['Tóxico', 'Abandonó'] },
  { label: 'Actitud',      positive: ['Buena actitud', 'Organizado'],    negative: ['Tóxico', 'Abandonó'] },
  { label: 'Compañerismo', positive: ['Buen compañero', 'Nivel acorde'], negative: ['Nivel no acorde'] },
];

function attrPct(ratings: RatingRow[], positive: string[], negative: string[]): number | null {
  let pos = 0, neg = 0;
  for (const r of ratings) {
    const hasPos = positive.some((t) => r.tags.includes(t));
    const hasNeg = negative.some((t) => r.tags.includes(t));
    if (hasPos) pos++;
    else if (hasNeg) neg++;
  }
  const total = pos + neg;
  if (total === 0) return null;
  return Math.round((pos / total) * 100);
}
import type { ColorPalette } from '@/theme/palettes';

function StatBox({ value, label }: { value: string; label: string }) {
  return (
    <View style={staticStyles.statBox}>
      <Text variant="bodySemibold" color="textPrimary">{value}</Text>
      <Text variant="caption" color="textSecondary">{label}</Text>
    </View>
  );
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-VE', { day: 'numeric', month: 'short' });
}

export default function ReputacionScreen() {
  const router = useRouter();
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const userId = useSession((st) => st.user?.id);
  const user = useSession((st) => st.user);

  const { data: ratings, isLoading, isError } = useQuery({
    queryKey: ['my-ratings', userId ?? ''],
    queryFn: () => fetchMyRatings(userId!),
    enabled: !!userId,
    staleTime: 30_000,
  });

  const overall = useMemo(() => {
    if (!ratings || ratings.length === 0) return null;
    return ratings.reduce((sum, r) => sum + r.stars, 0) / ratings.length;
  }, [ratings]);

  const computedAttendance = useMemo(() => {
    if (!ratings || ratings.length === 0) return null;
    const attended = ratings.filter((r) => r.tags.includes('Asistió')).length;
    const missed = ratings.filter((r) => r.tags.includes('No asistió')).length;
    const total = attended + missed;
    if (total === 0) return null;
    return Math.round((attended / total) * 100);
  }, [ratings]);

  return (
    <Screen>
      <BackHeader title="Reputación" onBack={() => router.back()} />
      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={c.primary} size="large" />
        </View>
      ) : isError ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg }}>
          <Text variant="body" color="textSecondary" style={{ textAlign: 'center' }}>
            Error al cargar tus reseñas. Intenta de nuevo.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          {/* Overall rating card */}
          <Card>
            <View style={staticStyles.ratingCenter}>
              <Text variant="h1" color="primary">
                {overall != null ? overall.toFixed(1) : '—'}
              </Text>
              {overall != null ? (
                <Stars level={overall} size={20} />
              ) : null}
            </View>
            <View style={s.divider} />
            <View style={staticStyles.statsRow}>
              <StatBox
                value={computedAttendance != null ? `${computedAttendance}%` : '—'}
                label="Asistencia"
              />
              <View style={s.statSep} />
              <StatBox value={String(user?.matchesPlayed ?? 0)} label="Partidas" />
              <View style={s.statSep} />
              <StatBox value={user?.verified ? 'Verificado ✓' : 'No verificado'} label="Estado" />
            </View>
          </Card>

          {/* Summary bars */}
          {ratings && ratings.length > 0 ? (
            <Card>
              <Text variant="caption" color="textSecondary" style={{ marginBottom: spacing.sm }}>Atributos</Text>
              {SUMMARY_ATTRS.map(({ label, positive, negative }) => {
                const pct = attrPct(ratings, positive, negative);
                const color = pct == null ? c.border : pct >= 75 ? c.primary : pct >= 40 ? c.seria : c.alert;
                return (
                  <View key={label} style={staticStyles.summaryRow}>
                    <Text variant="caption" color="textSecondary" style={staticStyles.summaryLabel}>{label}</Text>
                    <View style={[staticStyles.summaryTrack, { backgroundColor: c.border }]}>
                      {pct != null ? (
                        <View style={[staticStyles.summaryFill, { backgroundColor: color, width: `${pct}%` as unknown as number }]} />
                      ) : null}
                    </View>
                    <Text variant="caption" style={[staticStyles.summaryPct, { color: pct != null ? color : c.textTertiary }]}>
                      {pct != null ? `${pct}%` : '—'}
                    </Text>
                  </View>
                );
              })}
            </Card>
          ) : null}

          {/* Reviews */}
          {!ratings || ratings.length === 0 ? (
            <EmptyState
              icon={<Stars level={3} size={32} />}
              title="Sin reseñas aún"
              description="Cuando otros jugadores te califiquen, aparecerán aquí."
            />
          ) : (
            <>
              <Text variant="bodySemibold" color="textPrimary">Reseñas</Text>
              {ratings.map((review) => (
                <Card key={review.id}>
                  {/* Header */}
                  <View style={staticStyles.reviewHeader}>
                    <View style={staticStyles.reviewAuthorRow}>
                      <Avatar name={review.raterName} uri={review.raterAvatarUrl} size={36} />
                      <View style={staticStyles.reviewAuthorInfo}>
                        <Text variant="bodyMedium" color="textPrimary">{review.raterName}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                          <Star size={11} color={c.seria} weight="fill" />
                          <Text variant="caption" color="textSecondary">{review.stars}</Text>
                        </View>
                      </View>
                    </View>
                    <Text variant="caption" color="textTertiary">{fmtDate(review.createdAt)}</Text>
                  </View>
                  {/* Comment first */}
                  {review.comment ? (
                    <Text variant="small" color="textSecondary" style={staticStyles.reviewComment}>
                      {review.comment}
                    </Text>
                  ) : null}
                  {/* Tags — subtle gray */}
                  {review.tags.length > 0 ? (
                    <View style={staticStyles.tagsRow}>
                      {review.tags.map((tag) => {
                        const pos = POSITIVE_TAGS.has(tag);
                        return (
                          <View key={tag} style={[staticStyles.tagChip, { borderColor: c.border, backgroundColor: `${c.textPrimary}06` }]}>
                            {pos
                              ? <Check size={10} color={c.textTertiary} weight="bold" />
                              : <WarningCircle size={10} color={c.textTertiary} weight="bold" />
                            }
                            <Text variant="caption" color="textTertiary">{tag}</Text>
                          </View>
                        );
                      })}
                    </View>
                  ) : null}
                </Card>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}

const staticStyles = StyleSheet.create({
  ratingCenter: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  statBox: { alignItems: 'center', gap: spacing.xs, flex: 1 },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  reviewAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  reviewAuthorInfo: { gap: spacing.xs },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  reviewComment: { lineHeight: 20, fontStyle: 'italic', marginBottom: spacing.xs },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  summaryLabel: { width: 100 },
  summaryTrack: { flex: 1, height: 3, borderRadius: 99, overflow: 'hidden' },
  summaryFill: { height: 3, borderRadius: 99 },
  summaryPct: { width: 32, textAlign: 'right' },
});

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    content: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.huge, gap: spacing.xl },
    divider: { height: 1, backgroundColor: c.border, marginBottom: spacing.lg },
    statSep: { width: 1, height: 32, backgroundColor: c.border },
  });
}
