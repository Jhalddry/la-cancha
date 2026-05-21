import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { BackHeader } from '@/components/ui/BackHeader';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Stars } from '@/components/ui/Stars';
import { Text } from '@/components/ui/Text';
import { useColors } from '@/hooks/useColors';
import type { ColorPalette } from '@/theme/palettes';
import { spacing } from '@/theme';
import type { SkillLevel } from '@/types/domain';

interface Review {
  author: string;
  rating: SkillLevel;
  comment: string;
  date: string;
}

const REVIEWS: Review[] = [
  { author: 'Carlos M.', rating: 5, comment: 'Excelente jugador, muy puntual y fair play.', date: '10 Mayo' },
  { author: 'Luis G.', rating: 4, comment: 'Buena actitud, llegó a tiempo.', date: '5 Mayo' },
  { author: 'Andrés P.', rating: 5, comment: 'Gran organizador, la partida estuvo perfecta.', date: '28 Abr' },
  { author: 'Roberto S.', rating: 3, comment: 'Bien, pero llegó 15 min tarde.', date: '20 Abr' },
  { author: 'Miguel T.', rating: 5, comment: 'Muy buen nivel y compañerismo.', date: '12 Abr' },
];

const OVERALL_RATING = 4.3;
const TOTAL_REVIEWS = 12;
const ATTENDANCE = '94%';

function StatBox({ value, label }: { value: string; label: string }) {
  return (
    <View style={staticStyles.statBox}>
      <Text variant="bodySemibold" color="textPrimary">
        {value}
      </Text>
      <Text variant="caption" color="textSecondary">
        {label}
      </Text>
    </View>
  );
}

export default function ReputacionScreen() {
  const router = useRouter();
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);

  return (
    <Screen>
      <BackHeader title="Reputación" onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Overall rating card */}
        <Card>
          <View style={staticStyles.ratingCenter}>
            <Text variant="h1" color="primary">
              {OVERALL_RATING.toFixed(1)}
            </Text>
            <Stars level={Math.round(OVERALL_RATING) as SkillLevel} size={20} />
            <Text variant="caption" color="textSecondary">
              {TOTAL_REVIEWS} reseñas
            </Text>
          </View>
          <View style={s.divider} />
          <View style={staticStyles.statsRow}>
            <StatBox value={ATTENDANCE} label="Asistencia" />
            <View style={s.statSep} />
            <StatBox value={String(TOTAL_REVIEWS)} label="Partidas" />
            <View style={s.statSep} />
            <StatBox value="Verificado ✓" label="Estado" />
          </View>
        </Card>

        {/* Reviews */}
        <Text variant="bodySemibold" color="textPrimary">
          Reseñas
        </Text>
        {REVIEWS.map((review, index) => (
          <Card key={index}>
            <View style={staticStyles.reviewHeader}>
              <View style={staticStyles.reviewAuthorRow}>
                <Avatar name={review.author} size={36} />
                <View style={staticStyles.reviewAuthorInfo}>
                  <Text variant="bodyMedium" color="textPrimary">
                    {review.author}
                  </Text>
                  <Stars level={review.rating} size={12} />
                </View>
              </View>
              <Text variant="caption" color="textTertiary">
                {review.date}
              </Text>
            </View>
            <Text variant="body" color="textSecondary" style={staticStyles.reviewComment}>
              {review.comment}
            </Text>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}

const staticStyles = StyleSheet.create({
  ratingCenter: {
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  reviewAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  reviewAuthorInfo: {
    gap: spacing.xs,
  },
  reviewComment: {
    lineHeight: 20,
  },
});

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    content: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.huge,
      gap: spacing.xl,
    },
    divider: {
      height: 1,
      backgroundColor: c.border,
      marginBottom: spacing.lg,
    },
    statSep: {
      width: 1,
      height: 32,
      backgroundColor: c.border,
    },
  });
}
