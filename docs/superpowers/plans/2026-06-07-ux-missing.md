# UX Missing Features — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add pull-to-refresh, loading skeletons, infinite scroll in buscar, and network error feedback to all list screens.

**Architecture:** Each screen handles its own refresh/skeleton/error inline. `SkeletonPulse` defined per-file (not shared). `buscar.tsx` migrates from `ScrollView` to `FlatList` + `useMatchesInfinite` (TanStack Query v5 `useInfiniteQuery`). `matchesApi.ts` gains `offset` pagination via Supabase `.range()`.

**Tech Stack:** React Native `RefreshControl`, `FlatList`, `Animated`; TanStack Query v5 `useInfiniteQuery`; phosphor-react-native `WifiSlash`; Supabase `.range()`.

---

## File Map

| File | Change |
|---|---|
| `lib/matchesApi.ts` | Add `PAGE_SIZE`, `offset` to `MatchFilters`, apply `.range()` in `fetchMatches` |
| `hooks/useMatches.ts` | Add `matchKeys.listInfinite`, `useMatchesInfinite` |
| `app/(tabs)/buscar.tsx` | `ScrollView` → `FlatList`, `useMatchesInfinite`, skeleton, refresh, error |
| `app/(tabs)/index.tsx` | `RefreshControl`, skeleton, inline error in nearby section |
| `app/(tabs)/mis-partidas.tsx` | `RefreshControl`, skeleton, error; restructure to single `ScrollView` |
| `app/(tabs)/chats.tsx` | `RefreshControl` per tab, skeleton rows, error |

---

## Task 1: matchesApi.ts — offset pagination

**Files:**
- Modify: `lib/matchesApi.ts`

- [ ] **Step 1: Add `PAGE_SIZE` constant and `offset` to `MatchFilters`**

In `lib/matchesApi.ts`, after the existing imports add the constant and extend the interface:

```ts
export const PAGE_SIZE = 20;
```

Change `MatchFilters` (around line 112):

```ts
export interface MatchFilters {
  sport?: Sport | 'all';
  types?: MatchType[];
  skillLevel?: SkillLevel;
  upcomingOnly?: boolean;
  includeFull?: boolean;
  limit?: number;
  offset?: number;          // add this
  excludeIds?: string[];
}
```

- [ ] **Step 2: Apply `.range()` in `fetchMatches` when `offset` is defined**

In `fetchMatches`, replace the existing limit/filter block (currently just `if (filters.limit) { query = query.limit(filters.limit); }`) with:

```ts
  if (filters.offset !== undefined) {
    query = query.range(filters.offset, filters.offset + PAGE_SIZE - 1);
  } else if (filters.limit) {
    query = query.limit(filters.limit);
  }
```

Leave everything else in `fetchMatches` unchanged. The `home` screen uses `limit: 3` (no `offset`) — it hits the `else if` branch and still gets 3 results.

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/matchesApi.ts
git commit -m "feat: add offset pagination to fetchMatches (PAGE_SIZE=20)"
```

---

## Task 2: useMatches.ts — useMatchesInfinite hook

**Files:**
- Modify: `hooks/useMatches.ts`

- [ ] **Step 1: Add `useInfiniteQuery` import and `listInfinite` key**

At the top of `hooks/useMatches.ts`, add `useInfiniteQuery` to the tanstack import:

```ts
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
```

Add `PAGE_SIZE` to the matchesApi import:

```ts
import {
  // ... existing imports ...
  PAGE_SIZE,
  type MatchFilters,
} from '@/lib/matchesApi';
```

In the `matchKeys` object, add:

```ts
listInfinite: (filters: MatchFilters) => [...matchKeys.all, 'listInfinite', filters] as const,
```

- [ ] **Step 2: Add `useMatchesInfinite` hook**

Add after the existing `useMatches` function:

```ts
export function useMatchesInfinite(filters: MatchFilters = {}) {
  const userId = useSession((s) => s.user?.id);

  const rejectedQuery = useQuery({
    queryKey: ['rejectedMatchIds', userId ?? ''],
    queryFn: async () => {
      if (!userId) return [];
      const { data } = await supabase
        .from('match_participants')
        .select('match_id')
        .eq('profile_id', userId)
        .eq('status', 'rejected');
      return (data ?? []).map((r) => (r as { match_id: string }).match_id);
    },
    enabled: !!userId,
    staleTime: 60_000,
  });

  return useInfiniteQuery({
    queryKey: matchKeys.listInfinite({ ...filters, excludeIds: rejectedQuery.data }),
    queryFn: ({ pageParam }) =>
      fetchMatches({
        ...filters,
        excludeIds: rejectedQuery.data ?? [],
        offset: pageParam as number,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_SIZE ? allPages.length * PAGE_SIZE : undefined,
    enabled: !rejectedQuery.isLoading,
    staleTime: 30_000,
  });
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add hooks/useMatches.ts
git commit -m "feat: add useMatchesInfinite with TanStack Query v5 useInfiniteQuery"
```

---

## Task 3: buscar.tsx — FlatList + infinite scroll + skeleton + refresh + error

**Files:**
- Modify: `app/(tabs)/buscar.tsx`

This is the largest change. The `ScrollView` wrapping match results is replaced by `FlatList`. Filter pills and search bar stay outside `FlatList` (fixed in `Screen`).

- [ ] **Step 1: Update imports**

Replace the React import line to add `useRef` and `useEffect`:

```ts
import { useMemo, useRef, useEffect, useState } from 'react';
```

Replace the React Native import line — remove `ScrollView`, add `Animated`, `FlatList`, `RefreshControl`, `ActivityIndicator`:

```ts
import {
  Animated,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  TextInput as RNTextInput,
  View,
} from 'react-native';
```

Add `WifiSlash` to the phosphor import:

```ts
import {
  ArrowsDownUp,
  CaretDown,
  MagnifyingGlass,
  MapPin,
  Star,
  WifiSlash,
  X,
} from 'phosphor-react-native';
```

Replace the `useMatches` import with `useMatchesInfinite`:

```ts
import { useMatchesInfinite } from '@/hooks/useMatches';
```

Add `Button` import (needed for error retry):

```ts
import { Button } from '@/components/ui/Button';
```

- [ ] **Step 2: Add `SkeletonPulse` component (module-level, before `BuscarScreen`)**

```tsx
function SkeletonPulse({
  width,
  height,
  borderRadius,
  bgColor,
  borderColor,
}: {
  width: number | string;
  height: number;
  borderRadius: number;
  bgColor: string;
  borderColor: string;
}) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={{ width, height, borderRadius, backgroundColor: bgColor, borderWidth: 1, borderColor, opacity }}
    />
  );
}
```

- [ ] **Step 3: Replace `useMatches()` call and local filtering in `BuscarScreen`**

Replace:
```ts
const { data: rawMatches = [] } = useMatches();
```

With:
```ts
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
```

Everything below that (`allMatches`, `filtered`, label vars) stays unchanged.

- [ ] **Step 4: Replace `ScrollView` with `FlatList` in the JSX**

Remove the entire `<ScrollView ...>...</ScrollView>` block (lines ~279–329) and replace with:

```tsx
      {/* Results */}
      {isLoading && rawMatches.length === 0 ? (
        <View style={[s.scroll, { gap: spacing.md }]}>
          {[0, 1, 2, 3].map((i) => (
            <SkeletonPulse
              key={i}
              width="100%"
              height={120}
              borderRadius={radius.lg}
              bgColor={c.surface}
              borderColor={c.border}
            />
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
          contentContainerStyle={s.scroll}
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
          renderItem={({ item: m }) => (
            <MatchCard
              match={m}
              onPress={() => router.push(`/match/${m.id}`)}
            />
          )}
          ListEmptyComponent={
            <View style={s.empty}>
              <EmptyState
                icon={<MagnifyingGlass size={36} color={c.primary} weight="bold" />}
                title="Sin resultados"
                description="Ajusta tus filtros o intenta otra búsqueda."
                action={
                  (sport !== 'all' || type !== null || level !== null || distance !== null || position !== null) ? (
                    <Button
                      label="Limpiar filtros"
                      variant="secondary"
                      fullWidth={false}
                      style={{ marginTop: spacing.md }}
                      onPress={() => {
                        setSport('all');
                        setType(null);
                        setLevel(null);
                        setDistance(null);
                        setPosition(null);
                      }}
                    />
                  ) : undefined
                }
              />
            </View>
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={{ paddingVertical: spacing.lg, alignItems: 'center' }}>
                <ActivityIndicator color={c.primary} />
              </View>
            ) : null
          }
        />
      )}
```

- [ ] **Step 5: Add `errorWrap` style to `makeStyles`**

In the `makeStyles` function, add:

```ts
    errorWrap: { flex: 1, paddingHorizontal: spacing.lg },
```

- [ ] **Step 6: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add app/(tabs)/buscar.tsx
git commit -m "feat: buscar — FlatList infinite scroll, pull-to-refresh, skeleton, error state"
```

---

## Task 4: home/index.tsx — refresh + skeleton + inline error

**Files:**
- Modify: `app/(tabs)/index.tsx`

- [ ] **Step 1: Update imports**

Add `useRef` and `useEffect` to the React import:

```ts
import { useMemo, useRef, useEffect, useState } from 'react';
```

Add `Animated`, `RefreshControl` to the React Native import:

```ts
import { Animated, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
```

Add `WifiSlash` and `ArrowClockwise` to the phosphor import:

```ts
import { Bell, CaretRight, MagnifyingGlass, MapPin, Plus, WifiSlash } from 'phosphor-react-native';
```

- [ ] **Step 2: Add `SkeletonPulse` (module-level, before `HomeScreen`)**

```tsx
function SkeletonPulse({
  width,
  height,
  borderRadius,
  bgColor,
  borderColor,
}: {
  width: number | string;
  height: number;
  borderRadius: number;
  bgColor: string;
  borderColor: string;
}) {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);
  return (
    <Animated.View
      style={{ width, height, borderRadius, backgroundColor: bgColor, borderWidth: 1, borderColor, opacity }}
    />
  );
}
```

- [ ] **Step 3: Update `useMatches` destructuring and `ScrollView` `refreshControl`**

Replace:

```ts
  const { data: nearbyMatches = [] } = useMatches({ limit: 3 });
```

With:

```ts
  const {
    data: nearbyMatches = [],
    isLoading: matchesLoading,
    isError: matchesError,
    refetch: refetchMatches,
    isRefetching: matchesRefreshing,
  } = useMatches({ limit: 3 });
```

Add `refreshControl` to the `ScrollView`:

```tsx
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={matchesRefreshing}
            onRefresh={() => void refetchMatches()}
            tintColor={c.primary}
            colors={[c.primary]}
          />
        }
      >
```

- [ ] **Step 4: Replace the nearby matches list with skeleton/error/data**

Replace the `<View style={s.matchList}>` block:

```tsx
          <View style={s.matchList}>
            {nearbyMatches.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                onPress={() => router.push(`/match/${m.id}`)}
              />
            ))}
          </View>
```

With:

```tsx
          <View style={s.matchList}>
            {matchesLoading && nearbyMatches.length === 0 ? (
              <>
                <SkeletonPulse width="100%" height={120} borderRadius={radius.lg} bgColor={c.surface} borderColor={c.border} />
                <SkeletonPulse width="100%" height={120} borderRadius={radius.lg} bgColor={c.surface} borderColor={c.border} />
              </>
            ) : matchesError ? (
              <View style={s.inlineError}>
                <WifiSlash size={18} color={c.alert} weight="bold" />
                <Text variant="small" color="textTertiary" style={{ flex: 1 }}>
                  Error al cargar partidas
                </Text>
                <PressableScale scaleTo={0.95} onPress={() => void refetchMatches()}>
                  <Text variant="smallMedium" color="primary">Reintentar</Text>
                </PressableScale>
              </View>
            ) : (
              nearbyMatches.map((m) => (
                <MatchCard
                  key={m.id}
                  match={m}
                  onPress={() => router.push(`/match/${m.id}`)}
                />
              ))
            )}
          </View>
```

- [ ] **Step 5: Add `inlineError` style to `makeStyles`**

```ts
    inlineError: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      backgroundColor: c.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.border,
    },
```

- [ ] **Step 6: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add app/(tabs)/index.tsx
git commit -m "feat: home — pull-to-refresh, skeleton, inline error for nearby matches"
```

---

## Task 5: mis-partidas.tsx — refresh + skeleton + error

**Files:**
- Modify: `app/(tabs)/mis-partidas.tsx`

- [ ] **Step 1: Update imports**

Add `useRef` and `useEffect` to the React import (it already has `useCallback`, `useMemo`, `useState`):

```ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
```

Add `Animated`, `RefreshControl` to the React Native import:

```ts
import {
  Animated,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text as RNText,
  View,
} from 'react-native';
```

Add `WifiSlash` to the phosphor import (it already has others):

```ts
import {
  ClockCounterClockwise,
  Flag,
  PencilSimple,
  Play,
  Plus,
  Star,
  WifiSlash,
} from 'phosphor-react-native';
```

- [ ] **Step 2: Add `SkeletonPulse` (module-level, before `MisPartidasScreen`)**

```tsx
function SkeletonPulse({
  width,
  height,
  borderRadius,
  bgColor,
  borderColor,
}: {
  width: number | string;
  height: number;
  borderRadius: number;
  bgColor: string;
  borderColor: string;
}) {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);
  return (
    <Animated.View
      style={{ width, height, borderRadius, backgroundColor: bgColor, borderWidth: 1, borderColor, opacity }}
    />
  );
}
```

- [ ] **Step 3: Update `useMyMatches` destructuring**

Replace:

```ts
  const { data: myMatches } = useMyMatches();
```

With:

```ts
  const {
    data: myMatches,
    isLoading: matchesLoading,
    isError: matchesError,
    refetch: refetchMatches,
    isRefetching: matchesRefreshing,
  } = useMyMatches();
```

- [ ] **Step 4: Restructure the body to single `ScrollView` wrapping everything**

The current pattern is:

```tsx
{showEmpty ? (
  <EmptyState ... />
) : (
  <ScrollView ...>...</ScrollView>
)}
```

Replace the entire block (from `{showEmpty ?` through the closing `</ScrollView>}`) with a single `ScrollView` that always renders, containing either skeleton / error / empty / content:

```tsx
      {matchesLoading && !myMatches ? (
        <View style={[s.scroll, { gap: spacing.md }]}>
          <SkeletonPulse width="100%" height={120} borderRadius={radius.lg} bgColor={c.surface} borderColor={c.border} />
          <SkeletonPulse width="100%" height={120} borderRadius={radius.lg} bgColor={c.surface} borderColor={c.border} />
          <SkeletonPulse width="100%" height={120} borderRadius={radius.lg} bgColor={c.surface} borderColor={c.border} />
        </View>
      ) : matchesError ? (
        <ScrollView
          contentContainerStyle={{ flex: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={matchesRefreshing}
              onRefresh={() => void refetchMatches()}
              tintColor={c.primary}
              colors={[c.primary]}
            />
          }
        >
          <EmptyState
            icon={<WifiSlash size={36} color={c.alert} weight="bold" />}
            title="Sin conexión"
            description="No se pudieron cargar tus partidas."
            action={
              <Button
                label="Reintentar"
                variant="secondary"
                fullWidth={false}
                style={{ marginTop: spacing.md }}
                onPress={() => void refetchMatches()}
              />
            }
          />
        </ScrollView>
      ) : showEmpty ? (
        <ScrollView
          contentContainerStyle={{ flex: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={matchesRefreshing}
              onRefresh={() => void refetchMatches()}
              tintColor={c.primary}
              colors={[c.primary]}
            />
          }
        >
          <EmptyState
            icon={<RNText style={{ fontSize: 36, lineHeight: 40, includeFontPadding: false } as object}>⚽</RNText>}
            title={emptyTitle}
            description={emptyDesc}
            action={
              tab === 'activas' ? (
                <Button
                  label="Crear partida"
                  onPress={() => router.push('/crear')}
                  fullWidth={false}
                  leading={<Plus size={18} color={c.bg} weight="bold" />}
                  style={{ marginTop: spacing.md }}
                />
              ) : undefined
            }
          />
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={matchesRefreshing}
              onRefresh={() => void refetchMatches()}
              tintColor={c.primary}
              colors={[c.primary]}
            />
          }
        >
          {/* ── Próximas ────────────────────────────────── */}
          {tab === 'proximas'
            ? proximasList.map((m) => (
                <MatchCard
                  key={m.id}
                  match={m}
                  onPress={() => router.push(`/match/${m.id}`)}
                />
              ))
            : null}

          {/* ── Activas ─────────────────────────────────── */}
          {tab === 'activas'
            ? activasList.map((m) => (
                <View key={m.id} style={s.cardWrap}>
                  <MatchCard
                    match={m}
                    onPress={() => router.push(`/match/${m.id}`)}
                    cardStyle={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottomWidth: 0 }}
                  />
                  <View style={s.actionRow}>
                    <PressableScale
                      style={s.actionBtnSecondary}
                      scaleTo={0.97}
                      onPress={() => router.push(`/editar/${m.id}`)}
                    >
                      <PencilSimple size={16} color={c.textPrimary} weight="fill" />
                      <Text variant="bodyMedium" color="textPrimary">Editar partida</Text>
                    </PressableScale>
                    {!m.startedAt ? (
                      <PressableScale
                        style={[s.actionBtnPrimary, isStarting && { opacity: 0.6 }]}
                        scaleTo={0.97}
                        onPress={() => !isStarting && setStartConfirmMatchId(m.id)}
                      >
                        <Play size={16} color={c.textOnPrimary} weight="fill" />
                        <Text variant="bodyMedium" style={{ color: c.textOnPrimary }}>
                          {isStarting ? 'Iniciando…' : 'Iniciar partida'}
                        </Text>
                      </PressableScale>
                    ) : null}
                    {m.startedAt && !m.endedAt ? (
                      <PressableScale
                        style={[s.actionBtnSeria, isEnding && { opacity: 0.6 }]}
                        scaleTo={0.97}
                        onPress={() => !isEnding && setEndConfirmMatchId(m.id)}
                      >
                        <Flag size={16} color="#fff" weight="fill" />
                        <Text variant="bodyMedium" style={{ color: '#fff' }}>
                          {isEnding ? 'Finalizando…' : 'Finalizar partida'}
                        </Text>
                      </PressableScale>
                    ) : null}
                  </View>
                </View>
              ))
            : null}

          {/* ── Calificar ───────────────────────────────── */}
          {tab === 'calificar'
            ? calificarList.map((m) => {
                const pending = toRate(m);
                return (
                  <View key={m.id} style={s.calificarGroup}>
                    <PressableScale
                      style={s.matchRow}
                      scaleTo={0.98}
                      onPress={() => router.push(`/match/${m.id}`)}
                    >
                      <Text style={s.emoji}>{SPORT_EMOJIS[m.sport] ?? '🏅'}</Text>
                      <View style={{ flex: 1 }}>
                        <Text variant="bodySemibold" color="textPrimary">
                          {labelSport(m.sport)} · {labelModality(m.modality)}
                        </Text>
                        <Text variant="small" color="textSecondary">
                          {m.location.name} · {formatMatchTime(m.startsAt)}
                        </Text>
                      </View>
                      <Text variant="caption" color="textTertiary">
                        {pending.length} pendiente{pending.length !== 1 ? 's' : ''}
                      </Text>
                    </PressableScale>
                    <View style={s.playerList}>
                      {pending.map((p, i) => {
                        const isOrg = p.id === m.organizer.id;
                        return (
                          <View key={p.id}>
                            <PressableScale
                              scaleTo={0.97}
                              style={s.playerRow}
                              onPress={() => router.push(`/calificar/${p.id}?matchId=${m.id}${isOrg ? '&isOrganizer=true' : ''}`)}
                            >
                              <Avatar name={p.name} uri={p.avatarUrl} size={38} />
                              <View style={{ flex: 1 }}>
                                <Text variant="bodyMedium" color="textPrimary">{p.name}</Text>
                                <Text variant="caption" color="textTertiary">
                                  {isOrg ? 'Organizador' : 'Jugador'}
                                </Text>
                              </View>
                              <View style={s.rateBtn}>
                                <Star size={13} color={c.bg} weight="fill" />
                                <Text variant="smallMedium" style={{ color: c.bg }}>Calificar</Text>
                              </View>
                            </PressableScale>
                            {i < pending.length - 1 ? <Divider inset /> : null}
                          </View>
                        );
                      })}
                    </View>
                  </View>
                );
              })
            : null}
        </ScrollView>
      )}
```

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add app/(tabs)/mis-partidas.tsx
git commit -m "feat: mis-partidas — pull-to-refresh, skeleton, error state"
```

---

## Task 6: chats.tsx — refresh + skeleton rows + error

**Files:**
- Modify: `app/(tabs)/chats.tsx`

- [ ] **Step 1: Update imports**

Add `useRef` and `useEffect` to the React import:

```ts
import { useMemo, useRef, useEffect, useState } from 'react';
```

Add `Animated`, `RefreshControl` to the React Native import:

```ts
import { Animated, ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
```

Add `WifiSlash` to the phosphor import:

```ts
import { ChatCircle, ChatCircleDots, Trash, WifiSlash } from 'phosphor-react-native';
```

Add `Button` import:

```ts
import { Button } from '@/components/ui/Button';
```

- [ ] **Step 2: Add `SkeletonPulse` (module-level, before `ChatsScreen`)**

```tsx
function SkeletonPulse({
  width,
  height,
  borderRadius,
  bgColor,
  borderColor,
}: {
  width: number | string;
  height: number;
  borderRadius: number;
  bgColor: string;
  borderColor: string;
}) {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);
  return (
    <Animated.View
      style={{ width, height, borderRadius, backgroundColor: bgColor, borderWidth: 1, borderColor, opacity }}
    />
  );
}
```

- [ ] **Step 3: Update hook destructuring to include error and refetch**

Replace:

```ts
  const { data: threads, isLoading: loadingThreads } = useMyThreads();
  const { data: privateThreads, isLoading: loadingPrivate } = useMyPrivateThreads();
```

With:

```ts
  const {
    data: threads,
    isLoading: loadingThreads,
    isError: errorThreads,
    refetch: refetchThreads,
    isRefetching: refreshingThreads,
  } = useMyThreads();
  const {
    data: privateThreads,
    isLoading: loadingPrivate,
    isError: errorPrivate,
    refetch: refetchPrivate,
    isRefetching: refreshingPrivate,
  } = useMyPrivateThreads();
```

Also derive `isError` and `refetch`/`isRefetching` per tab:

```ts
  const isLoading = tab === 'partidas' ? loadingThreads : loadingPrivate;
  const isError = tab === 'partidas' ? errorThreads : errorPrivate;
  const refetch = tab === 'partidas' ? refetchThreads : refetchPrivate;
  const isRefreshing = tab === 'partidas' ? refreshingThreads : refreshingPrivate;
```

- [ ] **Step 4: Replace the body content with skeleton/error/list**

Replace the entire conditional block after `isLoading ?` (currently lines ~52–101 in the JSX) with:

```tsx
      {isLoading ? (
        <View style={s.skeletonWrap}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={s.skeletonRow}>
              <SkeletonPulse width={44} height={44} borderRadius={22} bgColor={c.surface} borderColor={c.border} />
              <View style={{ flex: 1, gap: spacing.xs }}>
                <SkeletonPulse width="70%" height={14} borderRadius={radius.sm} bgColor={c.surface} borderColor={c.border} />
                <SkeletonPulse width="45%" height={12} borderRadius={radius.sm} bgColor={c.surface} borderColor={c.border} />
              </View>
            </View>
          ))}
        </View>
      ) : isError ? (
        <ScrollView
          contentContainerStyle={{ flex: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void refetch()}
              tintColor={c.primary}
              colors={[c.primary]}
            />
          }
        >
          <EmptyState
            icon={<WifiSlash size={36} color={c.alert} weight="bold" />}
            title="Sin conexión"
            description="No se pudieron cargar los chats."
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
        </ScrollView>
      ) : tab === 'partidas' ? (
        !threads || threads.length === 0 ? (
          <ScrollView
            contentContainerStyle={{ flex: 1 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshingThreads}
                onRefresh={() => void refetchThreads()}
                tintColor={c.primary}
                colors={[c.primary]}
              />
            }
          >
            <EmptyState
              icon={<ChatCircleDots size={36} color={c.primary} weight="fill" />}
              title="Sin chats de partidas"
              description="Cuando te unas o crees una partida tendrás un chat con los demás jugadores."
            />
          </ScrollView>
        ) : (
          <ScrollView
            contentContainerStyle={s.scroll}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshingThreads}
                onRefresh={() => void refetchThreads()}
                tintColor={c.primary}
                colors={[c.primary]}
              />
            }
          >
            {threads.map((t, i) => (
              <View key={t.id}>
                <MatchChatRow
                  thread={t}
                  onPress={() => router.push(`/chat/${t.matchId}`)}
                  onLongPress={() => setDeleteThreadId(t.id)}
                  c={c}
                  s={s}
                />
                {i < threads.length - 1 ? <Divider inset /> : null}
              </View>
            ))}
          </ScrollView>
        )
      ) : (
        !privateThreads || privateThreads.length === 0 ? (
          <ScrollView
            contentContainerStyle={{ flex: 1 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshingPrivate}
                onRefresh={() => void refetchPrivate()}
                tintColor={c.primary}
                colors={[c.primary]}
              />
            }
          >
            <EmptyState
              icon={<ChatCircle size={36} color={c.primary} weight="fill" />}
              title="Sin mensajes privados"
              description="Envía un mensaje a un jugador desde su perfil para iniciar una conversación."
            />
          </ScrollView>
        ) : (
          <ScrollView
            contentContainerStyle={s.scroll}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshingPrivate}
                onRefresh={() => void refetchPrivate()}
                tintColor={c.primary}
                colors={[c.primary]}
              />
            }
          >
            {privateThreads.map((t, i) => (
              <View key={t.id}>
                <PrivateChatRow
                  thread={t}
                  onPress={() => router.push(`/direct/${t.otherUser.id}`)}
                  c={c}
                  s={s}
                />
                {i < privateThreads.length - 1 ? <Divider inset /> : null}
              </View>
            ))}
          </ScrollView>
        )
      )}
```

- [ ] **Step 5: Remove the old `center` style; add `skeletonWrap` and `skeletonRow` styles**

In `makeStyles`, remove `center` (no longer used) and add:

```ts
    skeletonWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.lg },
    skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
```

- [ ] **Step 6: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add app/(tabs)/chats.tsx
git commit -m "feat: chats — pull-to-refresh per tab, skeleton rows, error state"
```

---

## Self-Review

**Spec coverage:**
- Pull-to-refresh: home ✓, buscar ✓, mis-partidas ✓, chats (both tabs) ✓
- Skeletons: home ✓, buscar ✓, mis-partidas ✓, chats ✓
- Infinite scroll buscar: FlatList + useMatchesInfinite ✓
- Error feedback: all 4 screens ✓

**Placeholders:** None found.

**Type consistency:**
- `SkeletonPulse` props identical across all 4 files ✓
- `useMatchesInfinite` return shape used correctly in buscar.tsx ✓
- `PAGE_SIZE` exported from matchesApi, imported in useMatches ✓
- `matchKeys.listInfinite` defined in Task 2, used in Task 2 only ✓
