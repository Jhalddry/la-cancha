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
import { useColors } from '@/hooks/useColors';
import { radius, spacing } from '@/theme';
import type { ColorPalette } from '@/theme/palettes';
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
  c,
  s,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  active: boolean;
  onPress: () => void;
  c: ColorPalette;
  s: ReturnType<typeof makeStyles>;
}) {
  return (
    <PressableScale
      style={[s.pill, active ? s.pillActive : null]}
      scaleTo={0.96}
      onPress={onPress}
    >
      {icon}
      <View style={{ flex: 1, gap: 1 }}>
        <Text variant="caption" color="textTertiary" style={s.pillLabel}>
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
        color={active ? c.primary : c.textTertiary}
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
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);

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
  const sortLabel = SORT_OPTIONS.find((opt) => opt.value === sortBy)?.label ?? 'Más recientes';

  return (
    <Screen>
      {/* Header */}
      <View style={s.head}>
        <Text variant="h2">Buscar partida</Text>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <TextInput
          placeholder="Buscar por deporte, ubicación o cancha..."
          value={query}
          onChangeText={setQuery}
          leading={<MagnifyingGlass size={18} color={c.textSecondary} weight="regular" />}
          trailing={
            query ? (
              <PressableScale onPress={() => setQuery('')} scaleTo={0.9}>
                <X size={16} color={c.textTertiary} weight="bold" />
              </PressableScale>
            ) : null
          }
        />
      </View>

      {/* Filter pill rows */}
      <View style={s.filterRows}>
        <View style={s.pillRow}>
          <FilterPill
            icon={<Text style={s.pillEmoji}>⚽</Text>}
            label="Deporte"
            value={sportLabel}
            active={sport !== 'all'}
            onPress={() => setOpenFilter('sport')}
            c={c}
            s={s}
          />
          <FilterPill
            icon={<Text style={s.pillEmoji}>😎</Text>}
            label="Tipo"
            value={typeLabel}
            active={type !== null}
            onPress={() => setOpenFilter('type')}
            c={c}
            s={s}
          />
          <FilterPill
            icon={<Star size={13} color={c.textTertiary} weight="fill" />}
            label="Nivel"
            value={levelLabel}
            active={level !== null}
            onPress={() => setOpenFilter('level')}
            c={c}
            s={s}
          />
        </View>
        <View style={s.pillRow}>
          <FilterPill
            icon={<MapPin size={13} color={c.textTertiary} weight="fill" />}
            label="Distancia"
            value={distanceLabel}
            active={distance !== null}
            onPress={() => setOpenFilter('distance')}
            c={c}
            s={s}
          />
          <FilterPill
            icon={<ArrowsDownUp size={13} color={c.textTertiary} weight="bold" />}
            label="Ordenar"
            value={sortLabel}
            active={sortBy !== 'recientes'}
            onPress={() => setOpenFilter('sort')}
            c={c}
            s={s}
          />
        </View>
      </View>

      {/* Results */}
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.headerRow}>
          <Text variant="caption" color="textSecondary">
            Partidas cerca de ti
          </Text>
          <Text variant="caption" color="textTertiary">
            {filtered.length} resultado{filtered.length === 1 ? '' : 's'}
          </Text>
        </View>
        {filtered.length === 0 ? (
          <View style={s.empty}>
            <EmptyState
              icon={<MagnifyingGlass size={36} color={c.primary} weight="bold" />}
              title="Sin resultados"
              description="Ajusta tus filtros o intenta otra búsqueda."
            />
          </View>
        ) : (
          <View style={s.list}>
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
          <View style={s.sheetContent}>
            {SPORT_OPTIONS.map((sp) => (
              <PressableScale
                key={sp}
                style={[s.optionRow, sport === sp ? s.optionRowActive : null]}
                scaleTo={0.98}
                onPress={() => {
                  setSport(sp);
                  if (sp !== 'futbol' && sp !== 'basket') setPosition(null);
                  setOpenFilter(null);
                }}
              >
                <Text variant="body" color={sport === sp ? 'primary' : 'textPrimary'}>
                  {sp === 'all' ? 'Todos los deportes' : labelSport(sp)}
                </Text>
                {sport === sp ? (
                  <View style={s.activeDot} />
                ) : null}
              </PressableScale>
            ))}
          </View>
        ) : null}

        {openFilter === 'type' ? (
          <View style={s.sheetContent}>
            <PressableScale
              style={[s.optionRow, type === null ? s.optionRowActive : null]}
              scaleTo={0.98}
              onPress={() => { setType(null); setOpenFilter(null); }}
            >
              <Text variant="body" color={type === null ? 'primary' : 'textPrimary'}>
                Todos los tipos
              </Text>
              {type === null ? <View style={s.activeDot} /> : null}
            </PressableScale>
            {TYPE_OPTIONS.map((t) => {
              const m = matchTypeMeta[t];
              return (
                <PressableScale
                  key={t}
                  style={[s.optionRow, type === t ? s.optionRowActive : null]}
                  scaleTo={0.98}
                  onPress={() => { setType(t); setOpenFilter(null); }}
                >
                  <Text variant="body" color={type === t ? 'primary' : 'textPrimary'} style={{ flex: 1 }}>
                    {m.label}
                  </Text>
                  {type === t ? <View style={s.activeDot} /> : null}
                </PressableScale>
              );
            })}
          </View>
        ) : null}

        {openFilter === 'level' ? (
          <View style={s.sheetContent}>
            <PressableScale
              style={[s.optionRow, level === null ? s.optionRowActive : null]}
              scaleTo={0.98}
              onPress={() => { setLevel(null); setOpenFilter(null); }}
            >
              <Text variant="body" color={level === null ? 'primary' : 'textPrimary'}>
                Todos los niveles
              </Text>
              {level === null ? <View style={s.activeDot} /> : null}
            </PressableScale>
            {LEVEL_OPTIONS.map((lvl) => (
              <PressableScale
                key={lvl}
                style={[s.optionRow, level === lvl ? s.optionRowActive : null]}
                scaleTo={0.98}
                onPress={() => { setLevel(lvl); setOpenFilter(null); }}
              >
                <Stars level={lvl} size={14} />
                <Text variant="body" color={level === lvl ? 'primary' : 'textPrimary'} style={{ flex: 1 }}>
                  {labelSkill(lvl)}
                </Text>
                {level === lvl ? <View style={s.activeDot} /> : null}
              </PressableScale>
            ))}
          </View>
        ) : null}

        {openFilter === 'distance' ? (
          <View style={s.sheetContent}>
            <PressableScale
              style={[s.optionRow, distance === null ? s.optionRowActive : null]}
              scaleTo={0.98}
              onPress={() => { setDistance(null); setOpenFilter(null); }}
            >
              <Text variant="body" color={distance === null ? 'primary' : 'textPrimary'}>
                Cerca de ti
              </Text>
              {distance === null ? <View style={s.activeDot} /> : null}
            </PressableScale>
            {DISTANCE_OPTIONS.map((d) => (
              <PressableScale
                key={d}
                style={[s.optionRow, distance === d ? s.optionRowActive : null]}
                scaleTo={0.98}
                onPress={() => { setDistance(d); setOpenFilter(null); }}
              >
                <Text variant="body" color={distance === d ? 'primary' : 'textPrimary'}>
                  Menos de {d} km
                </Text>
                {distance === d ? <View style={s.activeDot} /> : null}
              </PressableScale>
            ))}

            {positionsForSport ? (
              <>
                <View style={s.divider} />
                <Text variant="caption" color="textSecondary" style={s.subLabel}>
                  Posición que buscas
                </Text>
                {positionsForSport.map((p) => (
                  <PressableScale
                    key={p}
                    style={[s.optionRow, position === p ? s.optionRowActive : null]}
                    scaleTo={0.98}
                    onPress={() => setPosition((cur) => (cur === p ? null : p))}
                  >
                    <Text variant="body" color={position === p ? 'primary' : 'textPrimary'}>
                      {labelPosition(p)}
                    </Text>
                    {position === p ? <View style={s.activeDot} /> : null}
                  </PressableScale>
                ))}
              </>
            ) : null}
          </View>
        ) : null}

        {openFilter === 'sort' ? (
          <View style={s.sheetContent}>
            {SORT_OPTIONS.map((opt) => (
              <PressableScale
                key={opt.value}
                style={[s.optionRow, sortBy === opt.value ? s.optionRowActive : null]}
                scaleTo={0.98}
                onPress={() => { setSortBy(opt.value); setOpenFilter(null); }}
              >
                <Text variant="body" color={sortBy === opt.value ? 'primary' : 'textPrimary'}>
                  {opt.label}
                </Text>
                {sortBy === opt.value ? <View style={s.activeDot} /> : null}
              </PressableScale>
            ))}
          </View>
        ) : null}
      </Sheet>
    </Screen>
  );
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
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
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.md,
      minHeight: 46,
    },
    pillActive: {
      borderColor: c.primary,
      backgroundColor: c.primarySoft,
    },
    pillEmoji: { fontSize: 13 },
    pillLabel: { fontSize: 10, lineHeight: 13 },
    scroll: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: 120,
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
      backgroundColor: c.primarySoft,
    },
    optionEmoji: { fontSize: 18 },
    activeDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: c.primary,
    },
    divider: {
      height: 1,
      backgroundColor: c.border,
      marginVertical: spacing.sm,
    },
    subLabel: { paddingHorizontal: spacing.sm, marginBottom: spacing.xs },
  });
}
