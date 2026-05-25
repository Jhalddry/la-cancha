import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle } from 'phosphor-react-native';
import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useMatch } from '@/hooks/useMatches';
import { useColors } from '@/hooks/useColors';
import { formatMatchTime, formatPrice, labelModality, labelSport } from '@/lib/format';
import type { ColorPalette } from '@/theme/palettes';
import { radius, spacing } from '@/theme';
import type { Sport } from '@/types/domain';

const SPORT_EMOJI: Record<Sport, string> = {
  futbol: '⚽', basket: '🏀', tenis: '🎾', padel: '🏓', beachTennis: '🏖️',
};

export default function ConfirmacionScreen() {
  const router = useRouter();
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const { data: match, isLoading } = useMatch(matchId);
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);

  return (
    <Screen>
      <View style={s.wrap}>
        <View style={s.iconCircle}>
          <CheckCircle size={64} color={c.primary} weight="fill" />
        </View>
        <Text variant="h1" color="textPrimary" style={s.center}>
          ¡Tu partida ha sido creada!
        </Text>
        <Text variant="body" color="textSecondary" style={s.center}>
          Ahora los jugadores podrán unirse.
        </Text>

        {isLoading ? (
          <ActivityIndicator color={c.primary} style={{ marginTop: spacing.xl }} />
        ) : match ? (
          <Card style={s.summary}>
            <View style={s.row}>
              <Text style={s.emoji}>{SPORT_EMOJI[match.sport]}</Text>
              <Text variant="bodySemibold">
                {labelSport(match.sport)} · {labelModality(match.modality)}
              </Text>
              <Text variant="small" color="textSecondary" style={{ textTransform: 'capitalize' }}>
                {match.type}
              </Text>
            </View>
            <View style={s.divider} />
            <Text variant="small" color="textSecondary">
              {match.location.name} · {formatMatchTime(match.startsAt)}
            </Text>
            <Text variant="bodySemibold" color="primary">
              {formatPrice(match.pricePerHour, match.currency)} · {match.durationMin} min
            </Text>
          </Card>
        ) : null}
      </View>

      <View style={s.footer}>
        <Button
          label="Ver mi partida"
          onPress={() =>
            match
              ? router.replace(`/match/${match.id}`)
              : router.replace('/(tabs)/mis-partidas')
          }
        />
        <Button
          label="Ir al inicio"
          variant="secondary"
          onPress={() => router.replace('/(tabs)')}
        />
      </View>
    </Screen>
  );
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    wrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xxl,
      gap: spacing.md,
    },
    iconCircle: {
      width: 120,
      height: 120,
      borderRadius: radius.full,
      backgroundColor: c.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
    },
    center: { textAlign: 'center' },
    summary: { width: '100%', marginTop: spacing.xl, gap: spacing.sm },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    emoji: { fontSize: 22, lineHeight: 28, width: 28, textAlign: 'center' },
    divider: { height: 1, backgroundColor: c.border, marginVertical: spacing.sm },
    footer: {
      padding: spacing.lg,
      paddingBottom: spacing.xxl,
      gap: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
  });
}
