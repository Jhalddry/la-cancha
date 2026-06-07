import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useColors } from '@/hooks/useColors';
import { labelPosition, labelSport } from '@/lib/format';
import { radius, spacing } from '@/theme';
import type { ColorPalette } from '@/theme/palettes';
import type { Position, Sport } from '@/types/domain';

const SPORT_EMOJI: Record<Sport, string> = {
  futbol: '⚽',
  basket: '🏀',
  tenis: '🎾',
  padel: '🏓',
  beachTennis: '🏖️',
};

const FOOTBALL_POS = new Set([
  'portero', 'defensa', 'lateral', 'mediocampo', 'extremo', 'delantero',
]);
const BASKET_POS = new Set(['base', 'escolta', 'alero', 'aleroPivot', 'pivot']);
const NO_POS_SPORTS = new Set<Sport>(['tenis', 'padel', 'beachTennis']);

function getSportPositions(sport: Sport, all: Position[]): Position[] {
  if (NO_POS_SPORTS.has(sport)) return [];
  if (sport === 'futbol') return all.filter((p) => FOOTBALL_POS.has(p));
  if (sport === 'basket') return all.filter((p) => BASKET_POS.has(p));
  return [];
}

interface PlayerPositionsProps {
  sports: Sport[];
  positions: Position[];
  /**
   * When provided, chips are colored: green if position fits the match,
   * neutral if not. Used in the "review join request" modal.
   */
  matchPositions?: Set<string>;
}

function PositionChip({
  label,
  active,
  neutral,
  c,
}: {
  label: string;
  active?: boolean;    // green — fits match
  neutral?: boolean;   // explicit neutral (no match context)
  c: ColorPalette;
}) {
  return (
    <View
      style={[
        styles.chip,
        active
          ? { backgroundColor: `${c.primary}18`, borderColor: `${c.primary}44` }
          : { backgroundColor: `${c.textPrimary}08`, borderColor: `${c.textPrimary}12` },
      ]}
    >
      <Text
        variant="caption"
        style={{
          color: active ? c.primary : neutral ? c.textTertiary : c.textSecondary,
          fontWeight: active ? '600' : '400',
        }}
      >
        {label}
      </Text>
    </View>
  );
}

/**
 * Read-only positions grouped by sport.
 * Each sport is its own container block with sport header + position chips.
 */
export function PlayerPositions({ sports, positions, matchPositions }: PlayerPositionsProps) {
  const c = useColors();

  const rows = useMemo(
    () =>
      sports.map((sport) => {
        const sportPos = getSportPositions(sport, positions);
        return { sport, sportPos };
      }),
    [sports, positions],
  );

  if (rows.length === 0) return null;

  return (
    <View style={styles.root}>
      {rows.map(({ sport, sportPos }) => {
        const isNoPosS = NO_POS_SPORTS.has(sport);
        const hasPos = sportPos.length > 0;
        const showCualquiera = isNoPosS || !hasPos;

        return (
          <View
            key={sport}
            style={[styles.sportBlock, { backgroundColor: c.surface, borderColor: c.border }]}
          >
            {/* Sport header */}
            <View style={styles.sportHeader}>
              <Text style={styles.emoji}>{SPORT_EMOJI[sport]}</Text>
              <Text variant="smallMedium" color="textPrimary">{labelSport(sport)}</Text>
            </View>

            {/* Divider */}
            <View style={[styles.divider, { backgroundColor: c.border }]} />

            {/* Chips */}
            <View style={styles.chipsRow}>
              {showCualquiera ? (
                <PositionChip label="Cualquiera" neutral c={c} />
              ) : matchPositions ? (
                sportPos.map((p) => (
                  <PositionChip
                    key={p}
                    label={labelPosition(p)}
                    active={matchPositions.has(p) || p === 'cualquiera'}
                    c={c}
                  />
                ))
              ) : (
                sportPos.map((p) => (
                  <PositionChip key={p} label={labelPosition(p)} c={c} />
                ))
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  sportBlock: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    minWidth: 120,
  },
  sportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  emoji: {
    fontSize: 14,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    marginHorizontal: spacing.md,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    padding: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
  },
});
