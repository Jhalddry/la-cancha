# La Cancha — Claude Code Guide

> **CRITICAL: Expo SDK 54.** Read versioned docs at <https://docs.expo.dev/versions/v54.0.0/> before writing any Expo/React Native code. APIs change between SDKs — do not trust pre-SDK-54 docs or training data.

---

## 1. What is La Cancha

**La Cancha** is a mobile-first sports matchmaking app for Venezuela (initial market). Tagline: *"Arma tu partida en segundos"*.

Users do three things:
1. **Find matches** near them — filter by sport, type, level, distance.
2. **Create matches** — pick sport, modality, type, level, position needs, location, date, price, payment methods.
3. **Communicate** — chat with organizers/players inside the app.

Core sports supported: **fútbol** (5/7/11), **basket** (3v3/5v5), **tenis** (singles/dobles), **pádel** (dobles only — no 1v1 variant exists), **beach tennis** (dobles + singles).

Match metadata covers Venezuelan context: bolívar/USD pricing with live BCV exchange rate, payment methods like **Pago Móvil**, **Zelle**, **USDT (Binance)**.

**Design language**: dark-first, neon-green accent (`#7BFF00`), modern sports aesthetic. Full dark/light mode — all screens use `useColors()` + `makeStyles(c)` pattern.

**Status**: Phase A + B (partial) complete. Real auth, real data, React Query, Supabase Realtime in chat, avatar upload, pull-to-refresh + skeletons + infinite scroll + error states on all list screens, real GPS distance in buscar. Mock data files still exist but are no longer used by screens.

---

## 2. Tech Stack

### Runtime
- **Expo SDK 54** managed workflow.
- **React Native 0.81.5** + **React 19.1**.
- **TypeScript 5.9** with `"strict": true`.

### Navigation
- **expo-router 6.0.x** (file-based routing). `typedRoutes: false` in `app.json` — string interpolation in route paths (e.g. `` `/match/${id}` ``) doesn't satisfy generated typed-route unions. `.expo/types/router.d.ts` excluded from `tsconfig.json`.

### Backend
- **Supabase** — postgres + auth + storage + realtime.
- Client in `lib/supabase.ts`. Env vars: `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY` (required at startup, throws if missing).
- DB tables: `profiles`, `matches`, `match_participants`, `messages`, `notifications`, `ratings`.

### Data fetching
- **@tanstack/react-query** — all server state. `QueryClient` in `lib/queryClient.ts` (staleTime 60s, gcTime 5min, retry 1, no refetchOnWindowFocus).
- Hooks in `hooks/` wrap API functions from `lib/*Api.ts`.
- **No mock data in screens** — all screens use hooks.

### State (Zustand 5.0)
- `useSession` — auth + user profile (real Supabase auth).
- `useDraftMatch` — 5-step create wizard draft.
- `useTheme` — dark/light/system mode.
- `useMatchOverrides` — local in-memory match edits (legacy, mostly superseded by API mutations).
- `useJoinedMatches` — local join tracking (legacy, superseded by `useMyParticipantStatus`).

### UI primitives
- **React Native built-ins** (`View`, `Text`, `ScrollView`, `Pressable`).
- **react-native-reanimated 4.1** — `PressableScale` + `calificar` success animation.
- **react-native-gesture-handler 2.28**.
- **react-native-safe-area-context 5.6**.
- **react-native-screens 4.16**.

### Icons & Graphics
- **phosphor-react-native 3.0** — all icons. `weight="fill"` active, `"regular"` inactive, `"bold"` emphasis.
- **react-native-svg 15.12** — `Crosshair`, `PositionPitch`, `BasketCourt`.

### Typography
- **@expo-google-fonts/inter** — 6 weights loaded via `useFonts` in `app/_layout.tsx`. Splash held until fonts resolve.

### Maps & DateTime
- **react-native-maps 1.x** — `LocationPickerSheet` + map modal in match detail.
- **@react-native-community/datetimepicker** — native date/time picker.

### Other Expo modules
- `expo-haptics`, `expo-linear-gradient`, `expo-splash-screen`, `expo-status-bar`, `expo-image`, `expo-symbols`, `expo-system-ui`, `expo-web-browser`, `expo-constants`.

### What is NOT wired yet
- Push notifications (`expo-notifications` not configured).
- Supabase realtime channels (chat reads from DB on mount, no live updates).
- Analytics, error monitoring.
- Test runner.

---

## 3. Folder Structure

```
la-cancha/
├── app/                          # expo-router routes (file = route)
│   ├── _layout.tsx               # Root Stack + ThemeProvider + fonts + QueryClientProvider
│   ├── index.tsx                 # Splash / auth gate
│   ├── login.tsx
│   ├── register.tsx
│   ├── onboarding.tsx
│   ├── notificaciones.tsx        # Notifications feed (Supabase-powered)
│   ├── ajustes.tsx               # Settings (dark mode, notifications, account)
│   ├── historial.tsx             # Match history (hardcoded mock for now)
│   ├── reputacion.tsx            # Reputation + reviews (Supabase-powered)
│   ├── terminos.tsx
│   ├── privacidad.tsx
│   ├── (tabs)/                   # Tab group (5 tabs)
│   │   ├── _layout.tsx
│   │   ├── index.tsx             # Home
│   │   ├── buscar.tsx            # Search + filters (Supabase-powered)
│   │   ├── mis-partidas.tsx      # Tabs: Próximas / Pasadas / Activas
│   │   ├── chats.tsx             # Chat list (Supabase-powered)
│   │   └── perfil.tsx            # Own profile
│   ├── match/[id].tsx            # Match detail (Supabase)
│   ├── chat/[id].tsx             # Chat thread (Supabase)
│   ├── unirse/[id].tsx           # Join flow — 4-step wizard
│   ├── editar/[id].tsx           # Edit match — settings-style
│   ├── calificar/[id].tsx        # Post-match rating — 3-step wizard + success
│   ├── crear/
│   │   ├── _layout.tsx
│   │   ├── index.tsx             # 5-step create wizard
│   │   └── confirmacion.tsx      # Success screen post-create
│   ├── perfil/
│   │   ├── [id].tsx              # Player profile (Supabase)
│   │   └── editar.tsx            # Edit own profile
│   └── cuenta/
│       ├── correo.tsx            # Change email
│       └── contrasena.tsx        # Change password
│
├── components/
│   ├── brand/                    # Logo, Crosshair, SportIcon
│   ├── ui/                       # Reusable primitives (see §8)
│   └── feature/
│       ├── DateTimePickerSheet.tsx
│       └── LocationPickerSheet.tsx
│
├── features/
│   └── match/
│       ├── MatchCard.tsx
│       ├── MiniPitchPreview.tsx  # Modality-aware dot-grid previews
│       ├── MatchTypeBadge.tsx
│       ├── MatchTypePromoCard.tsx
│       ├── PositionPitch.tsx     # SVG courts (football + basket)
│       ├── matchTypeMeta.ts
│       └── helpers.ts
│
├── store/                        # Zustand
│   ├── session.ts                # Auth + user profile (real Supabase auth)
│   ├── draftMatch.ts             # Wizard state
│   ├── theme.ts                  # dark | light | system
│   ├── matchOverrides.ts         # Local match edits (legacy)
│   └── joinedMatches.ts          # Local join tracking (legacy)
│
├── hooks/
│   ├── useColors.ts              # Returns active ColorPalette
│   ├── useMatches.ts             # useMatches, useMatch, useMyMatches, useJoinMatch,
│   │                             #   useLeaveMatch, useUpdateMatch, useDeleteMatch,
│   │                             #   useStartMatch, useEndMatch, useApproveParticipant,
│   │                             #   useRejectParticipant, useInviteToMatch,
│   │                             #   useMyParticipantStatus, usePendingParticipants
│   ├── useNotifications.ts       # useNotifications, useUnreadCount, useMarkAllRead, useMarkRead
│   ├── useProfiles.ts            # useProfile
│   └── useChat.ts                # useChat, useSendMessage
│
├── lib/                          # Pure async helpers (no React)
│   ├── supabase.ts               # Supabase client (reads env vars, throws if missing)
│   ├── queryClient.ts            # Shared QueryClient instance
│   ├── matchesApi.ts             # CRUD + participant management for matches
│   ├── profilesApi.ts            # fetchProfile
│   ├── notificationsApi.ts       # fetchNotifications, markRead, etc.
│   ├── chatApi.ts                # fetchThread, sendMessage, fetchSharedMatchId
│   ├── ratingsApi.ts             # submitRating, fetchMyRatings
│   ├── mappers.ts                # rowToPlayer (DB row → Player)
│   ├── format.ts                 # labelSport, labelModality, formatPrice, etc.
│   ├── time.ts                   # relativeTime, sameDay
│   ├── exchange.ts               # BCV_RATE, usdToVes, formatVes
│   └── cities.ts                 # Venezuelan city list
│
├── data/                         # Legacy mock data — NOT used by screens
│   ├── players.ts
│   ├── matches.ts
│   ├── chats.ts
│   └── canchas.ts                # Still used by LocationPickerSheet
│
├── types/
│   ├── domain.ts                 # All domain types (see §7)
│   └── chat.ts                   # ChatMessageData, ChatParticipant, ChatThread
│
├── theme/
│   ├── colors.ts                 # Re-exports darkPalette (back-compat)
│   ├── palettes.ts               # darkPalette + lightPalette
│   ├── typography.ts
│   ├── spacing.ts                # xxs..giant (4pt grid)
│   ├── radius.ts
│   ├── shadows.ts
│   └── index.ts
│
├── assets/
├── app.json
├── tsconfig.json                 # strict, @/* alias
├── package.json
└── CLAUDE.md (this file)
```

### Path alias
`@/*` → project root. Always use `@/components/ui/Text`, never relative paths.

---

## 4. Theme System

### Two palettes
`theme/palettes.ts` exports `darkPalette` and `lightPalette` with identical keys. `ColorPalette = typeof darkPalette`.

`theme/colors.ts` re-exports `darkPalette` as `colors` — back-compat only. **Do not use in new code.**

### Required pattern — every screen and component

```ts
const c = useColors();
const s = useMemo(() => makeStyles(c), [c]);

// Color-independent styles only:
const staticStyles = StyleSheet.create({ row: { flexDirection: 'row' } });

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    container: { backgroundColor: c.bg },
  });
}
```

### Key palette tokens

```
primary      #7BFF00 (dark) / #1A7A00 (light)   — neon / dark green
primaryBg    same as primary — use for filled button backgrounds
primarySoft  rgba(123,255,0,.12) / rgba(26,122,0,.12)
textOnPrimary  #0B0F0C / #FFFFFF — text ON primaryBg fills
bg           #0B0F0C / #F5F5F5
surface      #12161C / #FFFFFF
border       #1F2630 / #E0E0E0
textPrimary  #FFFFFF / #0B0F0C
seria        amber — match type accent
seriaSoft    soft amber background
chill        green-ish — match type accent
chillSoft
competencia  red — match type accent
competenciaSoft
alert        red — errors, destructive
```

### Spacing scale (4pt grid)
```
xxs:2  xs:4  sm:8  md:12  lg:16  xl:20  xxl:24  xxxl:32  huge:48  giant:64
```

---

## 5. State Management

### `useSession` (store/session.ts) — real Supabase auth
```ts
{
  user: Player | null,
  isAuthed: boolean,
  isLoading: boolean,       // true during session restore on app open
  isOnboarded: boolean,
  setUser, setOnboarded,
  setCity: (city: string) => Promise<void>,
  signIn: (email, password) => Promise<string | null>,   // returns error msg or null
  signUp: (name, email, password) => Promise<string | null>,
  signOut: () => Promise<void>,
  initialize: () => () => void,   // call once in _layout, returns unsubscribe
}
```
`initialize()` restores session from AsyncStorage + subscribes to `onAuthStateChange`. Call once in root layout. Returns unsubscribe cleanup.

### `useDraftMatch` (store/draftMatch.ts)
5-step wizard state. `draft: DraftMatch` (sport, modality, type, level, positions, location, date, price, payments, requirements). `step: 1..5`, `next()`, `prev()`, `reset()`. Date is `Date` (never null), initialized to today 20:00.

### `useTheme` (store/theme.ts)
`{ mode: 'dark' | 'light' | 'system', setMode }`. Wired to ajustes toggle.

### React Query hooks (the main data layer)
See `hooks/useMatches.ts`, `hooks/useProfiles.ts`, `hooks/useNotifications.ts`, `hooks/useChat.ts`. All mutations invalidate relevant query keys on success.

---

## 6. Routing (expo-router)

File-based. `typedRoutes: false` — string interpolation works.

### Stack in `app/_layout.tsx`
- `index` (splash / auth gate)
- `onboarding`
- `login`, `register` (slide_from_right)
- `(tabs)` — tab group
- `match/[id]`, `chat/[id]`, `perfil/[id]`, `perfil/editar`, `editar/[id]` (slide_from_right)
- `unirse/[id]`, `calificar/[id]` (slide_from_bottom)
- `crear` (slide_from_bottom)
- `notificaciones`, `ajustes`, `historial`, `reputacion`, `terminos`, `privacidad` (slide_from_right)
- `cuenta/correo`, `cuenta/contrasena` (slide_from_right)

### Navigation patterns
```ts
const router = useRouter();
router.push('/match/abc');
router.push(`/calificar/${playerId}?matchId=${matchId}`);  // calificar takes optional matchId param
router.replace('/(tabs)');
router.back();
const { id, matchId } = useLocalSearchParams<{ id: string; matchId?: string }>();
```

---

## 7. Domain Model (`types/domain.ts`)

### Sport
`'futbol' | 'tenis' | 'padel' | 'beachTennis' | 'basket'`

### Modality
- Football: `'futbol5' | 'futbol7' | 'futbol11'`
- Basket: `'basket3v3' | 'basket5v5'`
- Tennis: `'tenisSingles' | 'tenisDobles'`
- Padel: `'padelDobles'` — single modality only (no 1v1)
- Beach Tennis: `'beachDobles' | 'beachSimples'`

`SINGLE_MODALITY_SPORTS: Sport[] = ['padel']` in `features/match/helpers.ts` — skips modality step in wizard.

### MatchType
`'chill' | 'seria' | 'competencia'`

### SkillLevel
`1 | 2 | 3 | 4 | 5`

### PaymentMethod
`'pagoMovil' | 'transferencia' | 'efectivo' | 'zelle' | 'usdt'`

### Currency
`'USD' | 'VES'`

### ExchangeRateSource
`'bcv' | 'paralelo' | 'custom'`

### Player
```ts
interface Player {
  id: string;
  name: string;
  username?: string;
  avatarUrl?: string;           // Supabase Storage URL
  skillLevel: 1|2|3|4|5;
  sports: Sport[];
  positions: Position[];
  bio?: string;
  verified?: boolean;
  reputation?: number;          // 1.0–5.0
  matchesPlayed?: number;
  matchesOrganized?: number;
  attendancePct?: number;       // 0–100
  badges?: string[];
  city?: string;                // Venezuelan city name
  onboarded?: boolean;          // whether onboarding completed
}
```

### Match
```ts
interface Match {
  id: string;
  sport: Sport;
  modality: Modality;
  type: MatchType;
  skillLevel: SkillLevel;
  missingPositions: Position[];
  missingCount: number;
  location: MatchLocation;      // { name, address?, lat?, lng?, distanceKm? }
  startsAt: string;             // ISO string
  durationMin: number;
  pricePerHour: number;
  currency: Currency;
  paymentMethods: PaymentMethod[];
  requirements: string[];
  optionalRequirements?: string[];
  organizer: Player;
  joinedPlayers: MatchParticipant[];
  startedAt?: string;           // set when organizer starts match
  endedAt?: string;             // set when organizer ends match
}
```

### MatchParticipant
```ts
interface MatchParticipant extends Player {
  paymentMethod?: PaymentMethod;
  checkedRequirements?: string[];
}
type PendingParticipant = MatchParticipant;
```

### Positions
- Football: `portero | defensa | lateral | mediocampo | extremo | delantero`
- Basket: `base | escolta | alero | aleroPivot | pivot`
- Others: `'cualquiera'`

Per-modality lists in `features/match/helpers.ts` → `positionsForModality(sport, modality)`.

---

## 8. UI Component Library (`components/ui/`)

| Component | Purpose | Notes |
|---|---|---|
| `Screen` | Root container with SafeArea | Props: `edges`, `bg` |
| `Text` | All text — typed `variant` + `color` | NEVER use raw `<RNText>` |
| `Button` | Primary/secondary/ghost CTAs | Props: `variant`, `fullWidth`, `leading`, `disabled` |
| `PressableScale` | Tap with reanimated scale | `children`, `scaleTo` (0.9 typical) |
| `Card` | Surface container | `padded` (default true), `onPress` |
| `Chip` | Pill label | `selected`, `onPress`, `tone`. Has `flexShrink:0` + `numberOfLines:1` |
| `Badge` | Small static label | `tone: 'default' \| 'primary' \| 'accent' \| 'alert' \| 'neutral'` |
| `Avatar` | Initials or image avatar | `name`, `size`, `uri` (Supabase URL), `bg` |
| `AvatarStack` | Overlapping avatars | `players`, `max` |
| `Stars` | 1-5 star row | `level`, `size`. Use size 10–12 inside compressed buttons |
| `TextInput` | Labeled input with error | `label`, `error`, `leading`, `trailing`, `variant` |
| `BackHeader` | Top bar with back button | `title`, `transparent`, `trailing`, `onBack` |
| `EmptyState` | Icon + title + description | `icon`, `title`, `description`, `action` |
| `SegmentedTabs` | Inline tab switcher | `options`, `value`, `onChange` |
| `StepperBar` | Wizard step indicator | `total`, `current` |
| `ProgressDots` | Onboarding dot indicator | `count`, `index` |
| `Sheet` | Bottom modal | `visible`, `onClose`, `title`, children |
| `ConfirmSheet` | Confirm/cancel modal | `visible`, `onClose`, `title`, `description`, `confirmLabel`, `confirmColor`, `countdown?`, `onConfirm` |
| `Divider` | 1px horizontal line | `inset` |
| `IconCircle` | Circular icon container | `size`, `bg`, `border`, children |

### `ConfirmSheet`
Used for destructive actions: leave match, start/end match, cancel match, invite confirmation. `countdown` prop shows a numeric countdown before enabling confirm button (used for end-match to prevent accidents).

### Feature composites
- `DateTimePickerSheet` — date or time picker inside Sheet. `DurationPickerSheet` with 9 presets + custom (5–480 min).
- `LocationPickerSheet` — fullscreen Modal with MapView + `mockCanchas` markers. `onSelect(cancha)`.
- `MiniPitchPreview` — modality-aware dot-grid. Football: `66×58` landscape. Basket/racket: `44×66` portrait. `MiniBeachTennisCourt` accepts `modality` prop (simples=1v1, dobles=2v2).

---

## 9. Data Layer

### API modules (`lib/`)
| File | What it does |
|---|---|
| `supabase.ts` | Supabase client. Reads env vars at startup. Manages token refresh via AppState. |
| `matchesApi.ts` | `fetchMatches`, `fetchMatch`, `fetchMyMatches`, `createMatch`, `updateMatch`, `deleteMatch`, `joinMatch`, `leaveMatch`, `startMatch`, `endMatch`, `approveParticipant`, `rejectParticipant`, `inviteToMatch`, `fetchMyParticipantStatus`, `fetchPendingParticipants` |
| `profilesApi.ts` | `fetchProfile` |
| `notificationsApi.ts` | `fetchNotifications`, `countUnreadNotifications`, `markNotificationRead`, `markAllNotificationsRead` |
| `chatApi.ts` | `fetchThread`, `sendMessage`, `fetchSharedMatchId` — only players who shared a match can chat |
| `ratingsApi.ts` | `submitRating` (inserts to `ratings` table + creates notification), `fetchMyRatings` |
| `mappers.ts` | `rowToPlayer(row)` — DB snake_case → `Player` camelCase |

### DB schema (Supabase tables)
- `profiles` — mirrors `Player` fields: `id (uuid, FK auth.users)`, `name`, `username`, `avatar_url`, `skill_level`, `sports[]`, `positions[]`, `bio`, `verified`, `reputation`, `matches_played`, `matches_organized`, `attendance_pct`, `badges[]`, `city`, `onboarded`
- `matches` — mirrors `Match` fields. Key cols: `organizer_id`, `started_at`, `ended_at`, `missing_positions[]`, `payment_methods[]`, `requirements[]`, `optional_requirements[]`
- `match_participants` — `match_id`, `profile_id`, `status (pending|joined|rejected)`, `payment_method`, `checked_requirements[]`
- `messages` — `match_id` (thread), `author_id`, `body`, `sent_at`
- `notifications` — `profile_id`, `kind`, `payload (jsonb)`, `read`, `navigate_to`
- `ratings` — `match_id`, `rater_id`, `ratee_id`, `stars`, `tags[]`, `comment`, unique(match_id, rater_id, ratee_id)

### Environment variables
```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```
Both required. App throws at startup if missing.

### Legacy mock data (`data/`)
Files still exist but screens no longer import them. `data/canchas.ts` still used by `LocationPickerSheet`.

---

## 10. Key Features Implemented

### Auth
Real Supabase auth. Login + Register with inline validation. `useSession.initialize()` called in root layout restores session on app open. `signIn`/`signUp`/`signOut` wired. Profile auto-created via DB trigger on `auth.users` insert (with race-condition fallback upsert in `fetchOrCreateProfile`).

### Home
Greeting + city picker (Sheet with Venezuelan cities from `lib/cities.ts`), bell icon → `/notificaciones`, 2 CTAs (search / create), 3 type promo cards, nearby match list (Supabase).

### Buscar
Search bar + filter sheet (chill/seria/torneo/level/distance/sport). All matches from Supabase. Empty state. `paddingBottom: 160` to clear nav bar.

### Create wizard (5 steps)
1. **Deporte** — sport list
2. **Modalidad** — skipped for padel (`SINGLE_MODALITY_SPORTS`). Informal Venezuelan subtitle per sport. Beach tennis shows correct 1v1 vs 2v2 dot preview.
3. **Tipo + Nivel + Posiciones** — type cards, skill buttons, SVG courts (fútbol/basket).
4. **Ubicación + Fecha + Precio** — map picker, date/time/duration pickers, price with BCV conversion. iOS "Listo" button via `InputAccessoryView`.
5. **Pagos + Requisitos + Resumen** — payment checklist, sport requirements, custom req input, summary card.

On submit: `createMatch` → `router.push('/crear/confirmacion?matchId=...')`.

### Match detail (`match/[id].tsx`)
Uses `useMatch(id)` (Supabase). Hero: sport emoji, status (active / ended / missing count), price. Info card: date/location/type/level. Positions, payment, requirements, organizer card (→ `/perfil/[id]`). Map modal when lat/lng available.

**Organizer view**: pending participants panel with approve/reject (per-participant detail Sheet), joined players list with payment info. Edit button in header → `/editar/[id]`.

**Player view**: joined players avatars (→ `/perfil/[id]`). Footer CTAs:
- `pending` → "Solicitud enviada — en espera"
- `joined` → "Ya estás unido" badge + "Salirme" button
- `rejected` → "Tu solicitud no fue aceptada"
- default → "Quiero unirme" → `/unirse/[id]`

### Join flow (`unirse/[id]`) — 4 steps
1. Match summary (sport, type, date, location, price + BCV, organizer)
2. Payment method radio-select
3. Requirements checkboxes + master toggle
4. Success (animated checkmark + confetti)

Calls `joinMatch` on Supabase.

### Edit match (`editar/[id].tsx`)
Settings-style. Tappable rows: Fecha y hora → DateTimePickerSheet, Duración → DurationPickerSheet, Ubicación → LocationPickerSheet. Danger zone: "Cancelar partida" + "Eliminar partida" with `ConfirmSheet`. Calls `useUpdateMatch` / `useDeleteMatch`.

### Mis partidas (`(tabs)/mis-partidas.tsx`)
Tabs: **Próximas** / **Pasadas** / **Activas**. Uses `useMyMatches()` (returns `{ upcoming, past, created }`).

- **Activas**: matches created by user that haven't ended. Shows "Editar partida" strip, "Iniciar partida" strip (before `startedAt`), "Finalizar partida" strip (after `startedAt`, before `endedAt`). Each has `ConfirmSheet`. Start/end call `useStartMatch`/`useEndMatch`.
- **Pasadas**: shows "Calificar jugadores (N)" strip. Tapping opens Sheet listing all rateable players → navigates to `/calificar/${playerId}?matchId=${matchId}`.

### Post-match rating (`calificar/[id].tsx`)
`[id]` = player being rated. `matchId` optional query param. 3 steps + success.
1. Stars (1–5, interactive 48px stars)
2. Tags (positive=green, negative=red multi-select chips)
3. Comment (textarea, 200 char max)
4. Success (animated checkmark scale-in)

Calls `submitRating(matchId, raterId, rateeId, stars, tags, comment)` which also inserts a `rating_received` notification.

### Player profile (`perfil/[id].tsx`)
Uses `useProfile(id)`. Stats row, sports grid, positions, bio, badges, recent matches. Footer (hidden when viewing own profile): "Enviar mensaje" (checks `fetchSharedMatchId` — only allowed for shared-match players) + "Invitar a jugar" → Sheet → `ConfirmSheet` → `useInviteToMatch`. Menu (⋮): report + block flows with `ConfirmSheet`.

### Chat (`chat/[id].tsx`)
`[id]` = match ID (thread). Uses `useChat`. `KeyboardAvoidingView`, day-grouped bubbles, composer. Only available between players who share a match (enforced in `fetchSharedMatchId`).

### Notificaciones
Uses `useNotifications`. Kinds: `join_request`, `join_approved`, `join_rejected`, `match_started`, `match_ended`, `match_cancelled`, `rating_received`, `match_invitation`. Unread dot indicator. "Marcar todas" button. Tap → deep-link via `notif.navigateTo`.

### Reputación
Uses `useQuery` + `fetchMyRatings`. Shows overall rating, stars, review count, stats. Review list with rater avatar, stars, tags, comment.

### Own profile (`(tabs)/perfil.tsx`)
Avatar (Supabase Storage), bio, sports emojis, level stars, position chips, settings card. Cerrar sesión → `signOut()` + `router.replace('/login')`.

### Auth screens
Login + Register: inline validation (email regex, password min 6, terms checkbox). Real Supabase auth calls. Social buttons stubbed (Alert "próximamente").

### Other screens
`ajustes` (theme toggle, notification toggles, account links), `historial` (hardcoded mock cards — not yet connected to API), `reputacion`, `terminos`, `privacidad`, `onboarding` (3 slides + ProgressDots), `cuenta/correo`, `cuenta/contrasena`.

---

## 11. Roadmap / Next Steps

### Immediate
- [ ] `historial.tsx` — connect to real past matches API (currently hardcoded mock list)
- [x] ~~Supabase realtime — chat messages~~ — done: `useChat` subscribes to `chat_messages` INSERT/DELETE
- [x] ~~Unread notification badge on bell icon~~ — done: `useUnreadCount` + dot in home header
- [ ] Unread notification badge on **tab bar** — count badge on Chats/Notificaciones tabs

### Phase B — Real-time + Notifications
- [x] ~~Supabase realtime: `messages` channel~~ — done in `hooks/useChat.ts`
- [ ] Supabase realtime: `match_participants` + `notifications` channels
- [ ] `expo-notifications` setup: APNs + FCM credentials, permission request, token registration
- [ ] Notification deeplinks (tap → `/match/[id]` or `/chat/[id]`)

### Phase C — Location
- [x] ~~`expo-location` permission + current position~~ — done: `hooks/useUserLocation.ts`
- [x] ~~Real `distanceKm` (haversine using user coords)~~ — done: `lib/geo.ts` + wired in `buscar.tsx`
- [ ] Replace `mockCanchas` in `LocationPickerSheet` with geocoded DB or Google Places
- [ ] Reverse geocoding on custom pin drop

### Phase D — Storage & Avatars
- [x] ~~Avatar upload in `perfil/editar.tsx` → Supabase Storage~~ — done
- [ ] Cancha photos (organizer can attach photo to match location)

### Phase E — Payments
- [ ] Payment flow is currently honor-system (user selects method, organizer trusts them)
- [ ] Phase E: escrow via Stripe Connect or local processor

### Phase F — Reputation refinement
- [ ] Auto-trigger `calificar` prompt after `endedAt` (in-app banner)
- [x] ~~Aggregate ratings → `profiles.reputation` via DB trigger~~ — done: `sync_reputation` trigger
- [ ] Display received ratings breakdown (per tag frequency)

### Phase G — Quality
- [x] ~~UX: pull-to-refresh, loading skeletons, infinite scroll, error states~~ — done on all list screens
- [ ] Test runner: `jest` + `@testing-library/react-native`
- [ ] Accessibility audit (`accessibilityLabel` on all PressableScale)
- [ ] i18n (all strings currently Spanish hardcoded)
- [ ] Error monitoring (Sentry)

### Phase H — Build & Store
- [ ] EAS Build profiles (development, preview, production)
- [ ] iOS: Apple Developer enrollment, bundle id `com.lacancha.app`
- [ ] Android: Play Console + signing key
- [ ] AltStore distribution for personal device (no store needed)
- [ ] App icons + splash at all sizes (currently template)
- [ ] Privacy policy at public URL

---

## 12. How-To

### Add a new screen
1. Create `app/<name>.tsx` with `export default function NameScreen()`.
2. Register in `app/_layout.tsx` `<Stack>` block.
3. Link: `router.push('/<name>')`.
4. Pattern: `Screen` + `BackHeader` + `useColors()` + `makeStyles(c)`.

### Add a new API hook
1. Add fetch function in relevant `lib/*Api.ts`.
2. Add React Query hook in relevant `hooks/*.ts`.
3. Use in screen: `const { data, isLoading } = useMyHook()`.

### Add a new sport
1. Add to `Sport` union in `types/domain.ts`.
2. Add label in `lib/format.ts` (`SPORT_LABEL`).
3. Add icon in `components/brand/SportIcon.tsx`.
4. Add to `sportModalities` in `features/match/helpers.ts`.
5. If positions apply, add to `positionsForModality()`.
6. Add to `REQUIREMENTS_BY_SPORT` in `app/crear/index.tsx`.
7. Add to `SPORTS` const in `app/crear/index.tsx`.
8. Add dot layout to `MiniPitchPreview.tsx`.
9. Add `modalidadSub` entry in Step2Modality (if not single-modality).

### Add a new modality
1. Add key to modality type in `types/domain.ts` (sport-prefixed: `futbol3` not `3v3`).
2. Add labels in `lib/format.ts` `MODALITY_LABEL` + `MODALITY_SHORT`.
3. Add to `sportModalities[sport]`.
4. Add per-modality positions to helpers.
5. Add layout to `PositionPitch.tsx`.
6. Update `modalityShortLabel()` in `app/crear/index.tsx`.
7. Add dot layout to `MiniPitchPreview.tsx`.

### Add validation to a form
```ts
const errors = useMemo(() => {
  const e: Record<string, string> = {};
  if (!field) e.field = 'Mensaje de error';
  return e;
}, [field]);
const [tried, setTried] = useState(false);
const shown = tried ? errors : {};
// On submit: setTried(true); if (Object.keys(errors).length > 0) return;
// Pass shown.field as error prop to TextInput
```
Never disable submit button — validate on tap.

### Add iOS keyboard "Listo" button
```tsx
import { InputAccessoryView, Keyboard, Platform } from 'react-native';
const ACCESSORY_ID = 'my-input';
// On TextInput:
inputAccessoryViewID={Platform.OS === 'ios' ? ACCESSORY_ID : undefined}
returnKeyType="done"
onSubmitEditing={Keyboard.dismiss}
// Below screen JSX:
{Platform.OS === 'ios' && (
  <InputAccessoryView nativeID={ACCESSORY_ID}>
    <View style={styles.accessory}>
      <PressableScale onPress={Keyboard.dismiss} scaleTo={0.95}>
        <Text variant="bodyMedium" color="primary">Listo</Text>
      </PressableScale>
    </View>
  </InputAccessoryView>
)}
```

### Use ConfirmSheet for destructive actions
```tsx
<ConfirmSheet
  visible={open}
  onClose={() => setOpen(false)}
  title="Eliminar partida"
  description="Esta acción no se puede deshacer."
  confirmLabel="Eliminar"
  confirmColor={c.alert}
  countdown={5}           // optional: seconds before confirm enables
  onConfirm={() => { deleteMatch(id); setOpen(false); }}
/>
```

---

## 13. Conventions

### Styling — mandatory pattern
```ts
const c = useColors();
const s = useMemo(() => makeStyles(c), [c]);
// Color-independent: module-level staticStyles

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({ ... });
}
```
Never hardcode hex colors in components. Never import `colors` (dark-only) in new code.

### TypeScript
- `"strict": true` — no implicit any.
- `interface` for public shapes, `type` for unions/aliases.
- Domain types in `types/`. UI prop types inline as `interface Props`.

### Imports order
External → `@/components` → `@/features` → `@/hooks` → `@/lib` → `@/store` → `@/theme` → `@/types`.

### Language
- UI strings: **Spanish** (es-VE).
- Code identifiers, types, comments: **English**.
- Domain values like `'cualquiera'`, `'portero'`: Spanish (serialized to DB).

### Icon weights
- `weight="fill"` — active / primary.
- `weight="bold"` — emphasis.
- `weight="regular"` — inactive / secondary.

---

## 14. Known Gotchas

### Supabase env vars required at startup
`lib/supabase.ts` throws `Error('Missing EXPO_PUBLIC_SUPABASE_URL...')` if either var is absent. Make sure `.env` is present before `npx expo start`.

### `expo-router` typed routes off
`typedRoutes: false`. `.expo/types/router.d.ts` excluded from tsconfig. String-interpolation pushes work fine.

### Can't nest dynamic routes under flat dynamic file
`match/[id].tsx` is flat — cannot create `match/[id]/foo.tsx` without restructuring. Use flat siblings (`editar/[id].tsx`) instead.

### `calificar/[id]` takes optional `matchId` query param
`router.push('/calificar/${playerId}?matchId=${matchId}')`. The screen reads it via `useLocalSearchParams<{ id: string; matchId?: string }>()`. The `matchId` is passed to `submitRating` to link rating to the correct match.

### `fetchSharedMatchId` gates chat
Players can only open a chat thread if they shared a match. `perfil/[id].tsx` calls `fetchSharedMatchId(myId, theirId)` — if null, shows "Sin partida compartida" sheet instead of navigating to chat.

### `Stars` overflow
5 stars at size 16 = 88px. In ~72px columns → overflow. Use size 10–12 inside compressed buttons.

### `Avatar` uri prop
Accepts Supabase Storage public URL. If `uri` is undefined, falls back to initials. Always pass `uri={player.avatarUrl}`.

### `InputAccessoryView` iOS-only
Always gate with `Platform.OS === 'ios'`. Android handles `returnKeyType="done"` natively.

### Reanimated worklets
`PressableScale` runs on UI thread. No hooks or non-worklet functions inside `useAnimatedStyle`.

### Splash hide
`SplashScreen.preventAutoHideAsync()` at module load, `hideAsync()` after fonts load. Don't move.

### `ConfirmSheet` countdown
When `countdown` prop is set, confirm button shows a timer and is disabled until it reaches 0. Used for irreversible actions (end match).

---

## 15. Development Workflow

### Start
```bash
npx expo start              # Metro + QR for Expo Go
npx expo start --ios        # iOS simulator
npx expo start --android    # Android emulator
```

### Env file required
```bash
# .env at project root:
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### Lint + types
```bash
npx tsc --noEmit
npx expo lint
```

### Add Expo-managed native module
```bash
npx expo install <pkg>
```
Never `npm install` directly for native modules.

### Clean install
```bash
rm -rf node_modules .expo
npm install
npx expo start --clear
```

### Reset wizard state
`useDraftMatch.getState().reset()` in React Native Debugger console.

---

## 16. Build & Deploy

### AltStore (personal device, free)
1. Install AltServer on PC/Mac → installs AltStore on iPhone via USB.
2. Build IPA: `eas build --platform ios --profile preview`
3. Install `.ipa` via AltStore. Re-signs every 7 days automatically while AltServer runs.

### EAS Build
```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform ios --profile preview
eas build --platform android --profile preview
```

### Required before App Store
- Apple Developer ($99/yr) + Google Play Console.
- App icons + splash at all sizes.
- Privacy policy at public URL.
- BCV rate API (currently hardcoded constant).
- Error monitoring (Sentry).

---

## 17. Quick Reference

| Task | Where |
|---|---|
| Add mock cancha to map | `data/canchas.ts` |
| Change BCV rate | `lib/exchange.ts` (`BCV_RATE`) |
| Edit wizard step copy | `app/crear/index.tsx` `<StepHeader>` |
| Add payment method | `types/domain.ts` + `lib/format.ts` + `app/crear/index.tsx` |
| Change tab icons | `app/(tabs)/_layout.tsx` |
| Change app name / splash bg | `app.json` |
| Navigate to player profile | `router.push('/perfil/${playerId}')` |
| Navigate to join flow | `router.push('/unirse/${matchId}')` |
| Navigate to edit match | `router.push('/editar/${matchId}')` |
| Navigate to rate player | `router.push('/calificar/${playerId}?matchId=${matchId}')` |
| Navigate to chat | `router.push('/chat/${matchId}')` (matchId = thread id) |
| Invalidate matches cache | `queryClient.invalidateQueries({ queryKey: matchKeys.lists() })` |
| Invalidate profile cache | `queryClient.invalidateQueries({ queryKey: ['profile', userId] })` |
