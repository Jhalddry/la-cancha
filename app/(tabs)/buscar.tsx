import { useRouter } from 'expo-router';
import {
  ArrowsDownUp,
  CaretDown,
  MagnifyingGlass,
  MapPin,
  Star,
  X,
} from 'phosphor-react-native';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { Sheet } from '@/components/ui/Sheet';
import { Stars } from '@/components/ui/Stars';
import { Text } from '@/components/ui/Text';
import { TextInput } from '@/components/ui/TextInput';
import { mockMatches } from '@/data/matches';
import { MatchCard } from '@/features/match/MatchCard';
import { matchTypeMeta } from '@/features/match/matchTypeMeta';
import {
  basketPositionsByModality,
  footballPositionsByModality,
} from '@/features/match/helpers';
import { labelPosition, labelSkill, labelSport } from '@/lib/format';
import { colors, radius, spacing } from '@/theme';
import type { MatchType, Position, SkillLevel, Sport } from '@/types/domain';

type SportFilter = 'all' | Sport;
type SortOption = 'recientes' | 'distancia' | 'precio';
type OpenFilter = 'sport' | 'type' | 'level' | 'distance' | 'sort' | null;

const SPORT_OPTIONS: SportFilter[] = ['all', 'futbol', 'basket', 'padel', 'tenis', 'beachTennis'];
const TYPE_OPTIONS: MatchType[] = ['chill', 'seria', 'competencia'];
const LEVEL_OPTIONS: SkillLevel[] = [1, 2, 3, 4, 5];
const DISTANCE_OPTIONS = [1, 3, 5, 10] as const;
const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'recientes', label: 'Más recientes' },
  { value: 'distancia', label: 'Más cercanas' },
  { value: 'precio', label: 'Menor precio' },
];

const FOOTBALL_POSITIONS: Position[] = footballPositionsByModality.futbol11;
const BASKET_POSITIONS: Position[] = basketPositionsByModality.basket5v5;

const FILTER_TITLES: Record<NonNullable<OpenFilter>, string> = {
  sport: 'Deporte',
  type: 'Tipo de partida',
  level: 'Nivel',
  distance: 'Distancia máxima',
  sort: 'Ordenar por',
};

function FilterPill({
  icon,
  label,
  value,
  active,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      style={[styles.pill, active ? styles.pillActive : null]}
      scaleTo={0.96}
      onPress={onPress}
    >
      {icon}
      <View style={{ flex: 1, gap: 1 }}>
        <Text variant="caption" color="textTertiary" style={styles.pillLabel}>
          {label}
        </Text>
        <Text
          variant="small"
          color={active ? 'primary' : 'textPrimary'}
          numberOfLines={1}
        >
          {value}
        </Text>
      </View>
      <CaretDown
        size={11}
        color={active ? colors.primary : colors.textTertiary}
        weight="bold"
      />
    </PressableScale>
  );
}

export default function BuscarScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [sport, setSport] = useState<SportFilter>('all');
  const [openFilter, setOpenFilter] = useState<OpenFilter>(null);
  const [type, setType] = useState<MatchType | null>(null);
  const [level, setLevel] = useState<SkillLevel | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('recientes');

  const positionsForSport: Position[] | null =
    sport === 'futbol'
      ? FOOTBALL_POSITIONS
      : sport === 'basket'
        ? BASKET_POSITIONS
        : null;

  const filtered = useMemo(() => {
    const results = mockMatches.filter((m) => {
      if (sport !== 'all' && m.sport !== sport) return false;
      if (type && m.type !== type) return false;
      if (level && m.skillLevel !== level) return false;
      if (distance && (m.location.distanceKm ?? 99) > distance) return false;
      if (position && !m.missingPositions.includes(position)) return false;
      if (query) {
        const q = query.toLowerCase();
        const haystack = `${m.location.name} ${labelSport(m.sport)}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    if (sortBy === 'distancia') {
      results.sort((a, b) => (a.location.distanceKm ?? 99) - (b.location.distanceKm ?? 99));
    } else if (sortBy === 'precio') {
      results.sort((a, b) => a.pricePerHour - b.pricePerHour);
    }
    return results;
  }, [query, sport, type, level, distance, position, sortBy]);

  const sportLabel = sport === 'all' ? 'Todos' : labelSport(sport);
  const typeLabel = type ? matchTypeMeta[type].label : 'Todos';
  const levelLabel = level ? labelSkill(level) : 'Todos';
  const distanceLabel = distance ? `${distance} km` : 'Cerca de ti';
  const sortLabel = SORT_OPTIONS.find((s) => s.value === sortBy)?.label ?? 'Más recientes';

  return (
    <Screen>
      {/* Header */}
      <View style={styles.head}>
        <Text variant="h2">Buscar partida</Text>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <TextInput
          placeholder="Buscar por deporte, ubicación o cancha..."
          value={query}
          onChangeText={setQuery}
          leading={<MagnifyingGlass size={18} color={colors.textSecondary} weight="regular" />}
          trailing={
            query ? (
              <PressableScale onPress={() => setQuery('')} scaleTo={0.9}>
                <X size={16} color={colors.textTertiary} weight="bold" />
              </PressableScale>
            ) : null
          }
        />
      </View>

      {/* Filter pill rows */}
      <View style={styles.filterRows}>
        <View style={styles.pillRow}>
          <FilterPill
            icon={<Text style={styles.pillEmoji}>⚽</Text>}
            label="Deporte"
            value={sportLabel}
            active={sport !== 'all'}
            onPress={() => setOpenFilter('sport')}
          />
          <FilterPill
            icon={<Text style={styles.pillEmoji}>😎</Text>}
            label="Tipo"
            value={typeLabel}
            active={type !== null}
            onPress={() => setOpenFilter('type')}
          />
          <FilterPill
            icon={<Star size={13} color={colors.textTertiary} weight="fill" />}
            label="Nivel"
            value={levelLabel}
            active={level !== null}
            onPress={() => setOpenFilter('level')}
          />
        </View>
        <View style={styles.pillRow}>
          <FilterPill
            icon={<MapPin size={13} color={colors.textTertiary} weight="fill" />}
            label="Distancia"
            value={distanceLabel}
            active={distance !== null}
            onPress={() => setOpenFilter('distance')}
          />
          <FilterPill
            icon={<ArrowsDownUp size={13} color={colors.textTertiary} weight="bold" />}
            label="Ordenar"
            value={sortLabel}
            active={sortBy !== 'recientes'}
            onPress={() => setOpenFilter('sort')}
          />
        </View>
      </View>

      {/* Results */}
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Text variant="caption" color="textSecondary">
            Partidas cerca de ti
          </Text>
          <Text variant="caption" color="textTertiary">
            {filtered.length} resultado{filtered.length === 1 ? '' : 's'}
          </Text>
        </View>
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <EmptyState
              icon={<MagnifyingGlass size={36} color={colors.primary} weight="bold" />}
              title="Sin resultados"
              description="Ajusta tus filtros o intenta otra búsqueda."
            />
          </View>
        ) : (
          <View style={styles.list}>
            {filtered.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                onPress={() => router.push(`/match/${m.id}`)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Individual filter sheets */}
      <Sheet
        visible={openFilter !== null}
        onClose={() => setOpenFilter(null)}
        title={openFilter ? FILTER_TITLES[openFilter] : ''}
      >
        {openFilter === 'sport' ? (
          <View style={styles.sheetContent}>
            {SPORT_OPTIONS.map((s) => (
              <PressableScale
                key={s}
                style={[styles.optionRow, sport === s ? styles.optionRowActive : null]}
                scaleTo={0.98}
                onPress={() => {
                  setSport(s);
                  if (s !== 'futbol' && s !== 'basket') setPosition(null);
                  setOpenFilter(null);
                }}
              >
                <Text variant="body" color={sport === s ? 'primary' : 'textPrimary'}>
                  {s === 'all' ? 'Todos los deportes' : labelSport(s)}
                </Text>
                {sport === s ? (
                  <View style={styles.activeDot} />
                ) : null}
              </PressableScale>
            ))}
          </View>
        ) : null}

        {openFilter === 'type' ? (
          <View style={styles.sheetContent}>
            <PressableScale
              style={[styles.optionRow, type === null ? styles.optionRowActive : null]}
              scaleTo={0.98}
              onPress={() => { setType(null); setOpenFilter(null); }}
            >
              <Text variant="body" color={type === null ? 'primary' : 'textPrimary'}>
                Todos los tipos
              </Text>
              {type === null ? <View style={styles.activeDot} /> : null}
            </PressableScale>
            {TYPE_OPTIONS.map((t) => {
              const m = matchTypeMeta[t];
              return (
                <PressableScale
                  key={t}
                  style={[styles.optionRow, type === t ? styles.optionRowActive : null]}
                  scaleTo={0.98}
                  onPress={() => { setType(t); setOpenFilter(null); }}
                >
                  <Text variant="body" color={type === t ? 'primary' : 'textPrimary'} style={{ flex: 1 }}>
                    {m.label}
                  </Text>
                  {type === t ? <View style={styles.activeDot} /> : null}
                </PressableScale>
              );
            })}
          </View>
        ) : null}

        {openFilter === 'level' ? (
          <View style={styles.sheetContent}>
            <PressableScale
              style={[styles.optionRow, level === null ? styles.optionRowActive : null]}
              scaleTo={0.98}
              onPress={() => { setLevel(null); setOpenFilter(null); }}
            >
              <Text variant="body" color={level === null ? 'primary' : 'textPrimary'}>
                Todos los niveles
              </Text>
              {level === null ? <View style={styles.activeDot} /> : null}
            </PressableScale>
            {LEVEL_OPTIONS.map((lvl) => (
              <PressableScale
                key={lvl}
                style={[styles.optionRow, level === lvl ? styles.optionRowActive : null]}
                scaleTo={0.98}
                onPress={() => { setLevel(lvl); setOpenFilter(null); }}
              >
                <Stars level={lvl} size={14} />
                <Text variant="body" color={level === lvl ? 'primary' : 'textPrimary'} style={{ flex: 1 }}>
                  {labelSkill(lvl)}
                </Text>
                {level === lvl ? <View style={styles.activeDot} /> : null}
              </PressableScale>
            ))}
          </View>
        ) : null}

        {openFilter === 'distance' ? (
          <View style={styles.sheetContent}>
            <PressableScale
              style={[styles.optionRow, distance === null ? styles.optionRowActive : null]}
              scaleTo={0.98}
              onPress={() => { setDistance(null); setOpenFilter(null); }}
            >
              <Text variant="body" color={distance === null ? 'primary' : 'textPrimary'}>
                Cerca de ti
              </Text>
              {distance === null ? <View style={styles.activeDot} /> : null}
            </PressableScale>
            {DISTANCE_OPTIONS.map((d) => (
              <PressableScale
                key={d}
                style={[styles.optionRow, distance === d ? styles.optionRowActive : null]}
                scaleTo={0.98}
                onPress={() => { setDistance(d); setOpenFilter(null); }}
              >
                <Text variant="body" color={distance === d ? 'primary' : 'textPrimary'}>
                  Menos de {d} km
                </Text>
                {distance === d ? <View style={styles.activeDot} /> : null}
              </PressableScale>
            ))}

            {positionsForSport ? (
              <>
                <View style={styles.divider} />
                <Text variant="caption" color="textSecondary" style={styles.subLabel}>
                  Posición que buscas
                </Text>
                {positionsForSport.map((p) => (
                  <PressableScale
                    key={p}
                    style={[styles.optionRow, position === p ? styles.optionRowActive : null]}
                    scaleTo={0.98}
                    onPress={() => setPosition((cur) => (cur === p ? null : p))}
                  >
                    <Text variant="body" color={position === p ? 'primary' : 'textPrimary'}>
                      {labelPosition(p)}
                    </Text>
                    {position === p ? <View style={styles.activeDot} /> : null}
                  </PressableScale>
                ))}
              </>
            ) : null}
          </View>
        ) : null}

        {openFilter === 'sort' ? (
          <View style={styles.sheetContent}>
            {SORT_OPTIONS.map((s) => (
              <PressableScale
                key={s.value}
                style={[styles.optionRow, sortBy === s.value ? styles.optionRowActive : null]}
                scaleTo={0.98}
                onPress={() => { setSortBy(s.value); setOpenFilter(null); }}
              >
                <Text variant="body" color={sortBy === s.value ? 'primary' : 'textPrimary'}>
                  {s.label}
                </Text>
                {sortBy === s.value ? <View style={styles.activeDot} /> : null}
              </PressableScale>
            ))}
          </View>
        ) : null}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  searchWrap: { paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  filterRows: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  pillRow: { flexDirection: 'row', gap: spacing.sm },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    minHeight: 46,
  },
  pillActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  pillEmoji: { fontSize: 13 },
  pillLabel: { fontSize: 10, lineHeight: 13 },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: 160,
    gap: spacing.md,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  list: { gap: spacing.md },
  empty: { height: 320 },
  sheetContent: { gap: spacing.xs, paddingBottom: spacing.lg },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  optionRowActive: {
    backgroundColor: colors.primarySoft,
  },
  optionEmoji: { fontSize: 18 },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  subLabel: { paddingHorizontal: spacing.sm, marginBottom: spacing.xs },
});
