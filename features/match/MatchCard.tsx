import { Clock, MapPin, UsersThree } from 'phosphor-react-native';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AvatarStack } from '@/components/ui/AvatarStack';
import { Card } from '@/components/ui/Card';
import { Stars } from '@/components/ui/Stars';
import { Text } from '@/components/ui/Text';
import { useColors } from '@/hooks/useColors';
import {
  formatMatchTime,
  formatPrice,
  labelPosition,
  labelSkill,
  pluralize,
} from '@/lib/format';
import { spacing } from '@/theme';
import type { ColorPalette } from '@/theme/palettes';
import type { Match, Sport } from '@/types/domain';

import { MatchTypeBadge } from './MatchTypeBadge';

const SPORTS_WITH_POSITIONS = new Set(['futbol', 'basket']);

const SPORT_EMOJI: Record<Sport, string> = {
  futbol: '⚽',
  basket: '🏀',
  tenis: '🎾',
  padel: '🏓',
  beachTennis: '🏖️',
};

interface Props {
  match: Match;
  onPress?: () => void;
  cardStyle?: import('react-native').StyleProp<import('react-native').ViewStyle>;
}

function typeColor(type: Match['type'], c: ColorPalette): string {
  switch (type) {
    case 'chill':       return c.chill;
    case 'seria':       return c.seria;
    case 'competencia': return c.competencia;
  }
}

export function MatchCard({ match, onPress, cardStyle }: Props) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const accent = typeColor(match.type, c);
  const tint = `${accent}12`;          // ~7% opacity tint
  const emoji = SPORT_EMOJI[match.sport];

  return (
    <Card
      onPress={onPress}
      padded={false}
      style={[s.card, { borderColor: accent, backgroundColor: tint }, cardStyle]}
    >
      {/* Watermark emoji */}
      <Text style={s.watermark} allowFontScaling={false}>
        {emoji}
      </Text>

      <View style={s.body}>
        <View style={s.headRow}>
          <MatchTypeBadge type={match.type} />
          <View style={s.priceCol}>
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

        <View style={s.metaRow}>
          <MapPin size={14} color={c.textSecondary} weight="fill" />
          <Text variant="small" color="textSecondary" style={s.metaText}>
            {match.location.name}
            {match.location.distanceKm != null
              ? ` · ${match.location.distanceKm.toFixed(1)} km`
              : ''}
          </Text>
        </View>
        <View style={s.metaRow}>
          <Clock size={14} color={c.textSecondary} weight="fill" />
          <Text variant="small" color="textSecondary" style={s.metaText}>
            {formatMatchTime(match.startsAt)}
          </Text>
        </View>

        {SPORTS_WITH_POSITIONS.has(match.sport) ? (
          <View style={s.metaRow}>
            <UsersThree size={14} color={c.primary} weight="fill" />
            <Text variant="small" color="textSecondary" style={s.metaText}>
              {match.missingPositions.length === 0 ||
              match.missingPositions.includes('cualquiera')
                ? 'Cualquier posición'
                : match.missingPositions.map(labelPosition).join(' · ')}
            </Text>
          </View>
        ) : null}

        <View style={s.footRow}>
          <View style={s.skillRow}>
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

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    card: { flexDirection: 'row', overflow: 'hidden' },
    watermark: {
      position: 'absolute',
      right: -6,
      bottom: -10,
      fontSize: 80,
      lineHeight: 96,
      opacity: 0.1,
      transform: [{ rotate: '12deg' }],
      pointerEvents: 'none',
    },
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
}
