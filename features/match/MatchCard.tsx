import { Clock, MapPin, UsersThree } from 'phosphor-react-native';
import { StyleSheet, View } from 'react-native';

import { AvatarStack } from '@/components/ui/AvatarStack';
import { Card } from '@/components/ui/Card';
import { Stars } from '@/components/ui/Stars';
import { Text } from '@/components/ui/Text';
import {
  formatMatchTime,
  formatPrice,
  labelPosition,
  labelSkill,
  pluralize,
} from '@/lib/format';
import { colors, spacing } from '@/theme';
import type { Match } from '@/types/domain';

import { MatchTypeBadge } from './MatchTypeBadge';
import { matchTypeMeta } from './matchTypeMeta';

const SPORTS_WITH_POSITIONS = new Set(['futbol', 'basket']);

interface Props {
  match: Match;
  onPress?: () => void;
}

export function MatchCard({ match, onPress }: Props) {
  const typeMeta = matchTypeMeta[match.type];
  return (
    <Card onPress={onPress} padded={false} style={styles.card}>
      <View
        style={[
          styles.accent,
          { backgroundColor: typeMeta.color },
        ]}
      />
      <View style={styles.body}>
        <View style={styles.headRow}>
          <MatchTypeBadge type={match.type} />
          <View style={styles.priceCol}>
            <Text variant="bodySemibold" color="primary">
              {formatPrice(match.pricePerHour, match.currency)}/h
            </Text>
            <Text variant="caption" color="textTertiary">
              Por hora
            </Text>
          </View>
        </View>

        <Text variant="h3" color="textPrimary">
          Faltan {match.missingCount}{' '}
          {pluralize(match.missingCount, 'jugador', 'jugadores')}
        </Text>

        <View style={styles.metaRow}>
          <MapPin size={14} color={colors.textSecondary} weight="fill" />
          <Text variant="small" color="textSecondary" style={styles.metaText}>
            {match.location.name}
            {match.location.distanceKm != null
              ? ` · ${match.location.distanceKm.toFixed(1)} km`
              : ''}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Clock size={14} color={colors.textSecondary} weight="fill" />
          <Text variant="small" color="textSecondary" style={styles.metaText}>
            {formatMatchTime(match.startsAt)}
          </Text>
        </View>

        {SPORTS_WITH_POSITIONS.has(match.sport) ? (
          <View style={styles.metaRow}>
            <UsersThree size={14} color={colors.primary} weight="fill" />
            <Text variant="small" color="textSecondary" style={styles.metaText}>
              {match.missingPositions.length === 0 ||
              match.missingPositions.includes('cualquiera')
                ? 'Cualquier posición'
                : match.missingPositions.map(labelPosition).join(' · ')}
            </Text>
          </View>
        ) : null}

        <View style={styles.footRow}>
          <View style={styles.skillRow}>
            <Stars level={match.skillLevel} size={13} />
            <Text variant="caption" color="textSecondary">
              {labelSkill(match.skillLevel)}
            </Text>
          </View>
          <AvatarStack players={match.joinedPlayers} max={3} size={28} />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row' },
  accent: { width: 4 },
  body: { flex: 1, padding: spacing.lg, gap: spacing.sm },
  headRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  priceCol: { alignItems: 'flex-end' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  metaText: { flexShrink: 1 },
  footRow: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skillRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
