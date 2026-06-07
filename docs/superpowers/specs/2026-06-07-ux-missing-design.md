# UX Missing — Design Spec
Date: 2026-06-07

## Scope

Four orange-priority UX gaps:
1. Pull-to-refresh on all list screens
2. Loading skeletons (no blank screens during initial load)
3. Infinite scroll / pagination in buscar
4. Network error feedback on all list screens

Chats empty state already implemented — skipped.

---

## 1. Pull-to-refresh

**Approach:** Add `RefreshControl` from React Native to each scrollable list. React Query's `refetch` + `isRefetching` drive it.

| Screen | Target | Hook |
|---|---|---|
| `home/index.tsx` | `ScrollView` | `useMatches({ limit: 3 })` |
| `buscar.tsx` | `FlatList` (post-refactor) | `useMatchesInfinite` |
| `mis-partidas.tsx` | `ScrollView` | `useMyMatches()` |
| `chats.tsx` | both `ScrollView`s | `useMyThreads()` / `useMyPrivateThreads()` |

- `tintColor={c.primary}` on all `RefreshControl`s.
- `mis-partidas` empty state gets a `ScrollView` wrapper so pull-to-refresh works there too.

---

## 2. Loading Skeletons

**Approach:** Inline `SkeletonPulse` component per file — not a shared component (YAGNI). Uses `Animated.loop` + `Animated.sequence` to pulse opacity 0.3↔1.0.

```ts
function SkeletonPulse({ width, height, borderRadius }: { width: number | string; height: number; borderRadius: number }) { ... }
```

Show condition: `isLoading && !data` (first load only — cached data skips skeleton).

| Screen | Skeleton shape |
|---|---|
| `home` | 2 full-width cards (height 120) in the "partidas cercanas" section |
| `buscar` | 4 match cards in the FlatList |
| `mis-partidas` | 3 match cards in the active tab |
| `chats` | 4 rows: 44px avatar circle + 2 text lines |

---

## 3. Infinite Scroll in buscar

### matchesApi.ts
- Add `offset?: number` to `MatchFilters`.
- `fetchMatches` appends `.range(offset, offset + PAGE_SIZE - 1)` when `offset` is set. `PAGE_SIZE = 20`.

### useMatches hook
- Add `useMatchesInfinite(filters)` using `useInfiniteQuery`:
  - `queryFn: ({ pageParam = 0 }) => fetchMatches({ ...filters, offset: pageParam })`
  - `getNextPageParam: (lastPage, pages) => lastPage.length === PAGE_SIZE ? pages.length * PAGE_SIZE : undefined`
  - Returns `{ data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, refetch, isRefetching }`

### buscar.tsx
- Replace `ScrollView` with `FlatList`.
- `data` = all pages flattened, then filtered/sorted locally.
- `onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}`
- `onEndReachedThreshold={0.3}`
- `ListFooterComponent`: `ActivityIndicator` if `isFetchingNextPage`, else null.
- Header (search bar + filter pills) stays outside FlatList in the `Screen` container — does not scroll.
- Filter chips continue to filter the already-loaded data client-side. When filtered results < 5 and `hasNextPage`, auto-trigger `fetchNextPage`.

---

## 4. Network Error Feedback

**Approach:** Check `isError` from React Query hook per screen. Show `EmptyState` with `WifiSlash` icon (phosphor, `c.alert` color) + "Reintentar" button calling `refetch`.

| Screen | Placement | Hook error source |
|---|---|---|
| `buscar` | Full screen `EmptyState` | `useMatchesInfinite` |
| `home` | Inline text in "partidas cercanas" section | `useMatches` |
| `mis-partidas` | Full screen `EmptyState` | `useMyMatches` |
| `chats` | Full screen `EmptyState` per tab | `useMyThreads` / `useMyPrivateThreads` |

Home uses an inline error (not full-screen) because it's only one section among several.

---

## Files Changed

| File | Changes |
|---|---|
| `lib/matchesApi.ts` | Add `offset` to `MatchFilters`, apply `.range()` in `fetchMatches` |
| `hooks/useMatches.ts` | Add `useMatchesInfinite`, add `matchKeys.listInfinite` |
| `app/(tabs)/buscar.tsx` | `ScrollView` → `FlatList`, use `useMatchesInfinite`, add skeleton + error + refresh |
| `app/(tabs)/index.tsx` | Add `RefreshControl`, skeleton, inline error to nearby matches section |
| `app/(tabs)/mis-partidas.tsx` | Add `RefreshControl` + skeleton + error |
| `app/(tabs)/chats.tsx` | Add `RefreshControl` per tab + skeleton + error |

No new files required (skeletons inline, no shared component).
