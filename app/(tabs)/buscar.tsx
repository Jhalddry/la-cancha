import { useRouter } from 'expo-router';
import {
  ArrowsDownUp,
  CaretDown,
  MagnifyingGlass,
  MapPin,
  Star,
  WifiSlash,
  X,
} from 'phosphor-react-native';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  TextInput as RNTextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { SportOrbs } from '@/components/feature/SportOrbs';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { Sheet } from '@/components/ui/Sheet';
import { Stars } from '@/components/ui/Stars';
import { ShimmerSkeleton } from '@/components/ui/ShimmerSkeleton';
import { Text } from '@/components/ui/Text';
import { TextInput } from '@/components/ui/TextInput';
import { useMatchesInfinite } from '@/hooks/useMatches';
import { useUserLocation } from '@/hooks/useUserLocation';
import { MatchCard } from '@/features/match/MatchCard';
import { haversineKm } from '@/lib/geo';
import { matchTypeMeta } from '@/features/match/matchTypeMeta';

const SPORT_EMOJI: Record<string, string> = {
  all: '🏅',
  futbol: '⚽',
  basket: '🏀',
  tenis: '🎾',
  padel: '🏓',
  beachTennis: '🏖️',
};
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
type OpenFilter = 'sport' | 'type' | 'level' | 'distance' | 'sort' | 'position' | null;

const SPORT_OPTIONS: SportFilter[] = ['all', 'futbol', 'basket', 'padel', 'tenis', 'beachTennis'];
const TYPE_OPTIONS: MatchType[] = ['chill', 'seria', 'competencia'];
const LEVEL_OPTIONS: SkillLevel[] = [1, 2, 3, 4, 5];
const LEVEL_COLOR: Record<number, string> = {
  1: '#FF3B30', 2: '#FF6B00', 3: '#FF9500', 4: '#ADDE2F', 5: '#7BFF00',
};
const LEVEL_LABEL: Record<number, string> = {
  1: 'Principiante', 2: 'Básico', 3: 'Intermedio', 4: 'Avanzado', 5: 'Elite',
};
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
  position: 'Posición',
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
  const [customDistance, setCustomDistance] = useState('');
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);

  const { coords: userCoords, status: locationStatus } = useUserLocation();

  const positionsForSport: Position[] | null =
    sport === 'futbol'
      ? FOOTBALL_POSITIONS
      : sport === 'basket'
        ? BASKET_POSITIONS
        : null;

  const {
    data: matchPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useMatchesInfinite();

  const rawMatches = useMemo(
    () => matchPages?.pages.flatMap((p) => p) ?? [],
    [matchPages],
  );

  // Inject computed distanceKm from user GPS
  const allMatches = useMemo(() => {
    if (!userCoords) return rawMatches;
    return rawMatches.map((m) => {
      if (!m.location.lat || !m.location.lng) return m;
      const distanceKm = Math.round(
        haversineKm(userCoords.lat, userCoords.lng, m.location.lat, m.location.lng) * 10,
      ) / 10;
      return { ...m, location: { ...m.location, distanceKm } };
    });
  }, [rawMatches, userCoords]);

  const filtered = useMemo(() => {
    const results = allMatches.filter((m) => {
      if (sport !== 'all' && m.sport !== sport) return false;
      if (type && m.type !== type) return false;
      if (level && m.skillLevel !== level) return false;
      const effectiveDistance = distance ?? (customDistance ? Number(customDistance) : null);
      if (effectiveDistance && (m.location.distanceKm ?? 9999) > effectiveDistance) return false;
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
  }, [allMatches, query, sport, type, level, distance, customDistance, position, sortBy]);

  const sportLabel = sport === 'all' ? 'Todos' : labelSport(sport);
  const typeLabel = type ? matchTypeMeta[type].label : 'Todos';
  const levelLabel = level ? labelSkill(level) : 'Todos';
  const distanceLabel = distance
    ? `${distance} km`
    : customDistance
      ? `${customDistance} km`
      : 'Sin límite';
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
            icon={<Text style={s.pillEmoji}>{SPORT_EMOJI[sport]}</Text>}
            label="Deporte"
            value={sportLabel}
            active={sport !== 'all'}
            onPress={() => setOpenFilter('sport')}
            c={c}
            s={s}
          />
          <FilterPill
            icon={<Text style={s.pillEmoji}>{type ? matchTypeMeta[type].emoji : '🎮'}</Text>}
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
        {positionsForSport ? (
          <View style={s.pillRow}>
            <FilterPill
              icon={<Text style={s.pillEmoji}>🏃</Text>}
              label="Posición"
              value={position ? labelPosition(position) : 'Cualquiera'}
              active={position !== null}
              onPress={() => setOpenFilter('position')}
              c={c}
              s={s}
            />
          </View>
        ) : null}
      </View>

      {/* Results */}
      {isLoading && rawMatches.length === 0 ? (
        <View style={s.skeletonWrap}>
          {[0, 1, 2, 3].map((i) => (
            <ShimmerSkeleton key={i} width="100%" height={120} borderRadius={radius.lg} />
          ))}
        </View>
      ) : isError ? (
        <View style={s.errorWrap}>
          <EmptyState
            icon={<WifiSlash size={36} color={c.alert} weight="bold" />}
            title="Sin conexión"
            description="No se pudieron cargar las partidas."
            action={
              <Button
                label="Reintentar"
                variant="secondary"
                fullWidth={false}
                style={{ marginTop: spacing.md }}
                onPress={() => void refetch()}
              />
            }
          />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(m) => m.id}
          style={{ flex: 1 }}
          contentContainerStyle={[s.scroll, filtered.length === 0 && { flexGrow: 1 }]}
          showsVerticalScrollIndicator={false}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
          }}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => void refetch()}
              tintColor={c.primary}
              colors={[c.primary]}
            />
          }
          ListHeaderComponent={
            <View style={s.headerRow}>
              <Text variant="caption" color="textSecondary">
                {filtered.length} partida{filtered.length === 1 ? '' : 's'} disponible{filtered.length === 1 ? '' : 's'}
              </Text>
              {locationStatus === 'denied' ? (
                <Text variant="caption" color="textTertiary">📍 Sin ubicación</Text>
              ) : locationStatus === 'granted' && userCoords ? (
                <Text variant="caption" color="primary">📍 Ubicación activa</Text>
              ) : null}
            </View>
          }
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          renderItem={({ item: m, index }) => (
            <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 60).duration(380).springify().damping(20)}>
              <MatchCard
                match={m}
                onPress={() => router.push(`/match/${m.id}`)}
              />
            </Animated.View>
          )}
          ListEmptyComponent={
            <View style={s.empty}>
              <SportOrbs size={260} />
              <View style={s.emptyText}>
                <Text variant="h3" color="textPrimary" style={{ textAlign: 'center' }}>Sin resultados</Text>
                <Text variant="body" color="textSecondary" style={{ textAlign: 'center' }}>
                  Ajusta tus filtros o intenta otra búsqueda.
                </Text>
              </View>
              {(sport !== 'all' || type !== null || level !== null || distance !== null || position !== null) ? (
                <Button
                  label="Limpiar filtros"
                  variant="secondary"
                  fullWidth={false}
                  onPress={() => {
                    setSport('all');
                    setType(null);
                    setLevel(null);
                    setDistance(null);
                    setPosition(null);
                  }}
                />
              ) : null}
            </View>
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={s.loadingMore}>
                <ActivityIndicator color={c.primary} />
              </View>
            ) : null
          }
        />
      )}

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
            <View style={{ flexDirection: 'row', gap: spacing.xs, justifyContent: 'space-between' }}>
              {LEVEL_OPTIONS.map((lvl) => {
                const active = level === lvl;
                const color = LEVEL_COLOR[lvl];
                return (
                  <PressableScale
                    key={lvl}
                    scaleTo={0.88}
                    onPress={() => { setLevel(active ? null : lvl); if (!active) setOpenFilter(null); }}
                    style={{
                      flex: 1, aspectRatio: 1, borderRadius: radius.lg, borderWidth: 1.5,
                      alignItems: 'center', justifyContent: 'center',
                      backgroundColor: active ? color : `${color}20`,
                      borderColor: active ? color : `${color}50`,
                    }}
                  >
                    <Text style={{ fontSize: 15, fontWeight: '600', color: active ? '#000' : color }}>{lvl}</Text>
                  </PressableScale>
                );
              })}
            </View>
            {level !== null ? (
              <View style={{ alignItems: 'center', marginTop: spacing.sm }}>
                <Text style={{ fontWeight: '600', color: LEVEL_COLOR[level] }}>
                  {LEVEL_LABEL[level]}
                </Text>
              </View>
            ) : (
              <View style={{ alignItems: 'center', marginTop: spacing.sm }}>
                <Text variant="body" color="textTertiary">Todos los niveles</Text>
              </View>
            )}
            {level !== null ? (
              <PressableScale
                scaleTo={0.97}
                onPress={() => { setLevel(null); setOpenFilter(null); }}
                style={[s.optionRow, { marginTop: spacing.sm, justifyContent: 'center' }]}
              >
                <Text variant="bodyMedium" color="textSecondary">Limpiar nivel</Text>
              </PressableScale>
            ) : null}
          </View>
        ) : null}

        {openFilter === 'distance' ? (
          <View style={s.sheetContent}>
            <PressableScale
              style={[s.optionRow, distance === null && !customDistance ? s.optionRowActive : null]}
              scaleTo={0.98}
              onPress={() => { setDistance(null); setCustomDistance(''); setOpenFilter(null); }}
            >
              <Text variant="body" color={distance === null && !customDistance ? 'primary' : 'textPrimary'}>
                Sin límite de distancia
              </Text>
              {distance === null && !customDistance ? <View style={s.activeDot} /> : null}
            </PressableScale>
            {DISTANCE_OPTIONS.map((d) => (
              <PressableScale
                key={d}
                style={[s.optionRow, distance === d ? s.optionRowActive : null]}
                scaleTo={0.98}
                onPress={() => { setDistance(d); setCustomDistance(''); setOpenFilter(null); }}
              >
                <Text variant="body" color={distance === d ? 'primary' : 'textPrimary'}>
                  Menos de {d} km
                </Text>
                {distance === d ? <View style={s.activeDot} /> : null}
              </PressableScale>
            ))}
            {/* Custom distance input */}
            <View style={s.customDistanceWrap}>
              <Text variant="caption" color="textSecondary" style={{ marginBottom: spacing.xs }}>
                Distancia personalizada
              </Text>
              <View style={s.customDistanceRow}>
                <RNTextInput
                  style={[s.customDistanceInput, { color: c.textPrimary, borderColor: customDistance ? c.primary : c.border }]}
                  placeholder="km"
                  placeholderTextColor={c.textTertiary}
                  keyboardType="numeric"
                  value={customDistance}
                  onChangeText={(v) => {
                    setCustomDistance(v.replace(/[^0-9]/g, ''));
                    setDistance(null);
                  }}
                  returnKeyType="done"
                  onSubmitEditing={() => setOpenFilter(null)}
                />
                <Text variant="body" color="textSecondary">km</Text>
              </View>
            </View>
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

        {openFilter === 'position' && positionsForSport ? (
          <View style={s.sheetContent}>
            <PressableScale
              style={[s.optionRow, position === null ? s.optionRowActive : null]}
              scaleTo={0.98}
              onPress={() => { setPosition(null); setOpenFilter(null); }}
            >
              <Text variant="body" color={position === null ? 'primary' : 'textPrimary'}>
                Cualquier posición
              </Text>
              {position === null ? <View style={s.activeDot} /> : null}
            </PressableScale>
            {positionsForSport.map((p) => (
              <PressableScale
                key={p}
                style={[s.optionRow, position === p ? s.optionRowActive : null]}
                scaleTo={0.98}
                onPress={() => { setPosition(p); setOpenFilter(null); }}
              >
                <Text variant="body" color={position === p ? 'primary' : 'textPrimary'}>
                  {labelPosition(p)}
                </Text>
                {position === p ? <View style={s.activeDot} /> : null}
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
    },
    skeletonWrap: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      gap: spacing.md,
    },
    errorWrap: { flex: 1, paddingHorizontal: spacing.lg },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingTop: '22%', gap: spacing.lg, paddingHorizontal: spacing.xxl },
    emptyText: { alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.lg },
    loadingMore: { paddingVertical: spacing.lg, alignItems: 'center' },
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
    customDistanceWrap: { paddingHorizontal: spacing.sm, marginTop: spacing.sm },
    customDistanceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    customDistanceInput: {
      flex: 1,
      borderWidth: 1,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      fontSize: 15,
      backgroundColor: c.surface,
    },
  });
}
