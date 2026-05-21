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

**Design language**: dark-first, neon-green accent (`#7BFF00`), modern sports aesthetic. Full dark/light mode support — all screens use `useColors()` + `makeStyles(c)` pattern.

**Status**: Frontend-complete MVP with mock data. No backend, no auth, no real-time. State held in Zustand stores. Authentication is faked (`useSession.signIn()` toggles a flag). Next step: Supabase backend (Phase A).

---

## 2. Tech Stack

### Runtime
- **Expo SDK 54** managed workflow — chosen for fast iteration in Expo Go.
- **React Native 0.81.5** + **React 19.1**.
- **TypeScript 5.9** with `"strict": true`.

### Navigation
- **expo-router 6.0.x** (file-based routing). `typedRoutes: false` in `app.json` because string interpolation in route paths (e.g. `` `/match/${id}` ``) doesn't satisfy generated typed-route unions. The `.expo/types/router.d.ts` file is excluded from `tsconfig.json` to silence regeneration noise.

### State
- **Zustand 5.0** — `useSession`, `useDraftMatch`, `useTheme`, `useMatchOverrides`, `useJoinedMatches`. No middleware (no persist, no devtools wired). Simple `create<T>()(set => ({...}))` shape.

### UI primitives
- **React Native built-ins** (`View`, `Text`, `ScrollView`, `Pressable`).
- **react-native-reanimated 4.1** — `PressableScale` uses worklets for scale animations.
- **react-native-gesture-handler 2.28**.
- **react-native-safe-area-context 5.6**.
- **react-native-screens 4.16**.

### Icons & Graphics
- **phosphor-react-native 3.0** — all icons. Use `weight="fill"` for active states, `"regular"` for inactive, `"bold"` for emphasis.
- **react-native-svg 15.12** — used by `Crosshair`, `PositionPitch` (football + basket courts), `BasketCourt`.

### Typography
- **@expo-google-fonts/inter** — 6 weights loaded via `useFonts` in `app/_layout.tsx`. Splash held until fonts resolve.

### Maps & DateTime
- **react-native-maps 1.x** — `LocationPickerSheet` shows mock canchas as markers on a Caracas-centered map.
- **@react-native-community/datetimepicker** — native date/time picker, plugin registered in `app.json`.

### Forms / Validation
- No form library. Validation is plain `useMemo` returning a `{ fieldKey: errorMessage }` object, gated by a `tried: boolean` flag flipped on submit.

### Other Expo modules
- `expo-haptics`, `expo-linear-gradient`, `expo-splash-screen`, `expo-status-bar`, `expo-image`, `expo-symbols`, `expo-system-ui`, `expo-web-browser`, `expo-constants`.

### What is NOT installed
- No Supabase, no Firebase, no GraphQL client, no API layer.
- No real-time (no socket / pusher).
- No push notifications wired.
- No analytics.
- No test runner.

---

## 3. Folder Structure

```
la-cancha/
├── app/                          # expo-router routes (file = route)
│   ├── _layout.tsx               # Root Stack + ThemeProvider + fonts
│   ├── index.tsx                 # Splash animation (SVG + Reanimated)
│   ├── login.tsx
│   ├── register.tsx
│   ├── onboarding.tsx
│   ├── notificaciones.tsx
│   ├── ajustes.tsx               # Settings (dark mode toggle, notifications, account)
│   ├── historial.tsx
│   ├── reputacion.tsx
│   ├── terminos.tsx
│   ├── privacidad.tsx
│   ├── (tabs)/                   # Tab group (5 tabs)
│   │   ├── _layout.tsx
│   │   ├── index.tsx             # Home
│   │   ├── buscar.tsx
│   │   ├── mis-partidas.tsx
│   │   ├── chats.tsx
│   │   └── perfil.tsx
│   ├── match/[id].tsx            # Match detail (dynamic)
│   ├── chat/[id].tsx             # Chat thread (dynamic)
│   ├── unirse/[id].tsx           # Join flow — 4-step wizard (slide_from_bottom)
│   ├── editar/[id].tsx           # Edit match — settings-style screen (slide_from_right)
│   ├── calificar/[id].tsx        # Post-match rating — 4-step wizard (slide_from_bottom)
│   ├── crear/
│   │   ├── _layout.tsx
│   │   ├── index.tsx             # 5-step create wizard
│   │   └── confirmacion.tsx
│   ├── perfil/
│   │   ├── [id].tsx              # Player profile (dynamic, slide_from_right)
│   │   └── editar.tsx            # Edit own profile
│   └── cuenta/                   # Account settings (from ajustes)
│       ├── correo.tsx            # Change email
│       └── contrasena.tsx        # Change password
│
├── components/
│   ├── brand/                    # Logo, Crosshair, SportIcon
│   ├── ui/                       # Reusable primitives (see §8)
│   └── feature/                  # Feature-level composites
│       ├── DateTimePickerSheet.tsx
│       └── LocationPickerSheet.tsx
│
├── features/
│   └── match/                    # Match-domain composites
│       ├── MatchCard.tsx         # Type-tinted border + sport emoji watermark
│       ├── MiniPitchPreview.tsx  # Modality-aware dot-grid court previews
│       ├── MatchTypeBadge.tsx
│       ├── MatchTypePromoCard.tsx
│       ├── PositionPitch.tsx     # Football + basket SVG courts (full-size)
│       ├── matchTypeMeta.ts      # Chill/Seria/Torneo metadata
│       └── helpers.ts            # sportModalities, positions per modality
│
├── store/                        # Zustand
│   ├── session.ts                # Current user + auth flag
│   ├── draftMatch.ts             # Wizard state (5 steps)
│   ├── theme.ts                  # dark | light | system
│   ├── matchOverrides.ts         # Local edits to matches (editar screen)
│   └── joinedMatches.ts          # Tracks which matches user has joined (unirse flow)
│
├── hooks/
│   └── useColors.ts              # Returns active palette
│
├── lib/                          # Pure helpers (no React)
│   ├── format.ts                 # labelSport, labelModality, formatPrice, etc.
│   ├── time.ts                   # relativeTime, sameDay
│   └── exchange.ts               # BCV_RATE, usdToVes, formatVes
│
├── data/                         # Mock data
│   ├── players.ts                # mockCurrentUser, mockPlayers (with extended stats)
│   ├── matches.ts                # mockMatches (6 matches incl. one by mockCurrentUser)
│   ├── chats.ts                  # mockChatThreads + mockMessages
│   └── canchas.ts                # Caracas-area venues with lat/lng
│
├── types/                        # Pure TypeScript types
│   ├── domain.ts                 # Sport, Modality, Match, Player, etc.
│   └── chat.ts                   # Message, ChatThread
│
├── theme/                        # Design tokens
│   ├── colors.ts                 # Re-exports darkPalette (back-compat)
│   ├── palettes.ts               # darkPalette + lightPalette
│   ├── typography.ts             # text variants + fonts
│   ├── spacing.ts                # xxs..giant (4pt grid)
│   ├── radius.ts                 # none..xxl, full
│   ├── shadows.ts                # card, glow, glowSoft
│   └── index.ts                  # Barrel export
│
├── assets/                       # Icons, fonts, images
├── app.json                      # Expo config (plugins, splash, icons)
├── tsconfig.json                 # strict, path alias @/*
├── package.json
└── CLAUDE.md (this file)
```

### Path alias
`@/*` → project root. Configured in `tsconfig.json`. Use `@/components/ui/Text`, never relative paths like `../../components`.

---

## 4. Theme System

### Two palettes

`theme/palettes.ts` exports `darkPalette` and `lightPalette` with **identical keys**. Type `ColorPalette = typeof darkPalette`. Brand colors (primary, accent, alert, chill/seria/competencia) are shared; only neutral surfaces/text differ.

`theme/colors.ts` re-exports `darkPalette` as `colors` — kept for back-compat only. **Do not use in new code.**

### Reactive theme — required pattern for all screens

```ts
// Every screen and component must follow this pattern:
const c = useColors();
const s = useMemo(() => makeStyles(c), [c]);

// styles at bottom of file:
function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    container: { backgroundColor: c.bg },
    // ...
  });
}
```

For styles that don't use colors (spacing/radius only), use a module-level `staticStyles` to avoid recreation:
```ts
const staticStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md },
});
```

### Key palette tokens

```ts
// Dark                          Light
primary:    '#7BFF00'            '#1A7A00'   // neon vs dark green
primaryBg:  '#7BFF00'            '#1A7A00'   // use for filled button backgrounds
primarySoft:'rgba(123,255,0,.12)' 'rgba(26,122,0,.12)'
textOnPrimary: '#0B0F0C'         '#FFFFFF'   // text/icons ON primaryBg fills
bg:         '#0B0F0C'            '#F5F5F5'
surface:    '#12161C'            '#FFFFFF'
border:     '#1F2630'            '#E0E0E0'
textPrimary:'#FFFFFF'            '#0B0F0C'
chill/seria/competencia — sport type accent colors, both modes
```

### Reactive theme store

```ts
useTheme.mode: 'dark' | 'light' | 'system'
useTheme.setMode(m)
// Toggled via Switch in ajustes.tsx
```

`app/_layout.tsx` reads `useColors()` to build a dynamic `navTheme`. `StatusBar style="auto"` adapts.

### Spacing scale (4pt grid)
```
xxs:2  xs:4  sm:8  md:12  lg:16  xl:20  xxl:24  xxxl:32  huge:48  giant:64
```

### Typography variants
See `theme/typography.ts`. Always pass `variant` to the `Text` component — never raw `<RNText>` (would skip font + variant logic).

---

## 5. State Management

### `useSession` (store/session.ts)
```ts
{ user: Player | null, isAuthed: boolean, isOnboarded: boolean,
  signIn, signOut, setUser, setOnboarded }
```
Default: `mockCurrentUser` signed in (skip the auth wall during dev).

### `useDraftMatch` (store/draftMatch.ts)
The 5-step create-match wizard state.
- `draft: DraftMatch` — all fields (sport, modality, type, level, positions, location, date, price, payments, requirements).
- `step: 1..5`, `next()`, `prev()`, `setStep(n)`.
- `togglePosition`, `togglePayment`, `toggleRequirement` — set-style toggles.
- `reset()` — resets to initial + fresh default date (today 8 PM).

**date is `Date` (never null)** — initialized to today 20:00.

### `useTheme` (store/theme.ts)
Just `{ mode, setMode }`. See §4.

### `useMatchOverrides` (store/matchOverrides.ts)
Local in-memory overrides for match fields (from `editar/[id]`).
- `overrides: Record<string, Partial<Match>>` — keyed by match ID.
- `setOverride(id, partial)` — merges fields.
- `getMatch(base)` — returns `{ ...base, ...overrides[base.id] }`.
- Used in: `match/[id]`, `editar/[id]`, `mis-partidas`.

### `useJoinedMatches` (store/joinedMatches.ts)
Tracks which matches the current user has joined via the join flow.
- `joinedIds: Set<string>`.
- `join(matchId)` — adds to set.
- `hasJoined(matchId): boolean`.
- Used in: `unirse/[id]` (join action), `match/[id]` (shows "Ya estás unido" badge).

---

## 6. Routing (expo-router)

File-based. Folders = nested groups, `[id]` = dynamic, `_layout.tsx` = stack/tabs wrapper, `(name)` = group without URL segment.

### Stack registered in `app/_layout.tsx`
- `index` (splash)
- `onboarding`
- `login`, `register` (slide_from_right)
- `(tabs)` (tab group)
- `match/[id]`, `chat/[id]`, `perfil/[id]`, `perfil/editar`, `editar/[id]` (slide_from_right)
- `unirse/[id]`, `calificar/[id]` (slide_from_bottom)
- `crear` (slide_from_bottom)
- `notificaciones`, `ajustes`, `historial`, `reputacion`, `terminos`, `privacidad` (slide_from_right)
- `cuenta/correo`, `cuenta/contrasena` (slide_from_right)

### Navigation patterns
```ts
const router = useRouter();
router.push('/match/abc');           // string interpolation works (typedRoutes off)
router.push('/cuenta/correo');       // account sub-screens
router.replace('/(tabs)');           // post-auth
router.back();
const { id } = useLocalSearchParams<{ id: string }>();
```

---

## 7. Domain Model (`types/domain.ts`)

### Sport
`'futbol' | 'tenis' | 'padel' | 'beachTennis' | 'basket'`

### Modality (unambiguous keys per sport)
- Football: `'futbol5' | 'futbol7' | 'futbol11'`
- Basket: `'basket3v3' | 'basket5v5'`
- Tennis: `'tenisSingles' | 'tenisDobles'`
- Padel: `'padelDobles'` — **single modality only** (padel has no 1v1 or 3v3 variant)
- Beach Tennis: `'beachDobles' | 'beachSimples'`

`SINGLE_MODALITY_SPORTS: Sport[] = ['padel']` in `features/match/helpers.ts` — sports in this list skip the modality step in the create wizard.

> **Don't** use `'5v5'` as a shared key — it was ambiguous between football and basket. Always use the sport-prefixed key.

### Positions (sport-specific)
- Football: `portero | defensa | lateral | mediocampo | extremo | delantero`
- Basket: `base | escolta | alero | aleroPivot | pivot`
- Other sports: `'cualquiera'` (no position selector).

Per-modality position lists live in `features/match/helpers.ts`:
- `footballPositionsByModality.futbol5` = 4 positions (no lateral, no extremo)
- `footballPositionsByModality.futbol7` = 4 positions (no lateral)
- `footballPositionsByModality.futbol11` = 6 positions (full set)
- `basketPositionsByModality.basket3v3` = 3 positions
- `basketPositionsByModality.basket5v5` = 5 positions

Helper: `positionsForModality(sport, modality)`.

### MatchType
`'chill' | 'seria' | 'competencia'`. Display labels in `features/match/matchTypeMeta.ts`:
- chill → "Chill" 😎 — color from `c.chill` / `c.chillSoft`
- seria → "Seria" 👕 — color from `c.seria` / `c.seriaSoft`
- competencia → "Torneo" 🏆 — color from `c.competencia` / `c.competenciaSoft`

> Colors must come from `useColors()` — **not** from `matchTypeMeta` (which is static and dark-only).

### SkillLevel
`1 | 2 | 3 | 4 | 5` → "Principiante" … "Competitivo" via `labelSkill()`.

### PaymentMethod
`'pagoMovil' | 'transferencia' | 'efectivo' | 'zelle' | 'usdt'`

### Currency
`'USD' | 'VES'`. BCV rate constant in `lib/exchange.ts` (`BCV_RATE = 36.72`). Replace with live API call later.

### Player
```ts
interface Player {
  id: string;
  name: string;
  username?: string;
  skillLevel: 1|2|3|4|5;
  positions: Position[];
  sports: Sport[];
  bio?: string;
  verified?: boolean;
  reputation?: number;        // 1.0–5.0
  matchesPlayed?: number;
  matchesOrganized?: number;
  attendancePct?: number;     // 0–100
  badges?: string[];
}
```

### Match, MatchLocation
See file. `MatchLocation` has optional `lat/lng` for map integration.

---

## 8. UI Component Library (`components/ui/`)

| Component | Purpose | Notes |
|---|---|---|
| `Screen` | Root container with SafeArea | Props: `edges`, `bg` |
| `Text` | All text — typed `variant` + `color` | NEVER use raw `<RNText>` |
| `Button` | Primary/secondary/ghost CTAs | Props: `variant`, `fullWidth`, `leading`, `disabled`. Uses `c.primaryBg` fill + `c.textOnPrimary` label |
| `PressableScale` | Tap with reanimated scale | Required `children`, `scaleTo` (0.9 typical) |
| `Card` | Surface container | `padded` prop (default true), `style` forwarded to inner view |
| `Chip` | Pill with optional emoji label | `selected`, `onPress`, `tone`. `flexShrink: 0` + `numberOfLines: 1` + `minHeight: 38` to prevent label clipping in horizontal ScrollViews |
| `Badge` | Small static label | `tone: 'default' \| 'primary' \| 'accent' \| 'alert'` |
| `Avatar` | Initials avatar | `name`, `size`, `bg` |
| `AvatarStack` | Overlapping avatars | Props: `players`, `max` |
| `Stars` | 1-5 star row | `level`, `size`. **Use size 10-12 inside compressed buttons** |
| `TextInput` | Labeled input with error | `label` (caption above field), `error`, `leading`, `trailing`, `variant: 'default' \| 'plain'`. Omit `label` when a section heading already describes the field |
| `BackHeader` | Top bar with back button | `title`, `transparent`, `trailing`. Uses `navigation.canGoBack()` — safe on screens reached via `router.replace` |
| `EmptyState` | Icon + title + description | `icon`, `title`, `description`, `action` |
| `SegmentedTabs` | Inline tab switcher | `tabs`, `value`, `onChange` |
| `StepperBar` | Wizard step indicator | `total`, `current` |
| `ProgressDots` | Onboarding dot indicator | `count`, `index` |
| `Sheet` | Bottom modal | `visible`, `onClose`, `title`, children |
| `Divider` | 1px line | `inset` prop |
| `IconCircle` | Circular icon container | `size`, `bg`, `border`, children |

### Components in `components/feature/`
- `DateTimePickerSheet` — native date or time picker inside a Sheet. Also exports `DurationPickerSheet` with 9 presets + "Personalizada" custom input (5–480 min, validated).
- `LocationPickerSheet` — fullscreen `Modal` with `MapView` and markers for `mockCanchas`. Filters markers by `filterSport` if passed. Calls `onSelect(cancha)` with `{ name, address, lat, lng }`.

### `MatchCard` (`features/match/MatchCard.tsx`)
- Accepts optional `cardStyle` prop — forwarded to the inner `Card` style array.
- Type-tinted background: `${typeColor}12` (~7% opacity).
- Colored border per match type (`c.chill` / `c.seria` / `c.competencia`).
- Sport emoji watermark: 80px, 10% opacity, rotated 12°, bottom-right absolute.
- Used in mis-partidas with `cardStyle={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottomWidth: 0 }}` when an action strip is attached below.

### `MiniPitchPreview` (`features/match/MiniPitchPreview.tsx`)
Modality-aware dot-grid previews. Football: landscape field. Basket / racket: portrait court. `MiniBeachTennisCourt` accepts `modality` prop.

---

## 9. Data Layer

All mocks. When wiring a real backend:

1. Replace `data/*.ts` with API calls (suggest `tanstack/react-query`).
2. Match the existing types in `types/domain.ts` — they are the contract.
3. `useSession` currently sets `mockCurrentUser` on mount. Swap for an auth check + fetch.
4. `mockCanchas` has lat/lng for Caracas venues. Replace with geocoded API result.
5. `BCV_RATE` is a constant. Wire to BCV's published rate (cache 24h).
6. `useMatchOverrides` and `useJoinedMatches` are in-memory only — replace with server mutations.

`mockMatches` contains 6 matches. `m_6` is organized by `mockCurrentUser` — required so the "Creadas" tab in mis-partidas and the invite sheet have content.

---

## 10. Key Features Implemented

### Home
Greeting + location pin (city picker Sheet with 10 Venezuelan cities), bell icon → `/notificaciones`, 2 CTAs (search / create), 3 type promo cards, list of 3 nearby `MatchCard`s (no "Ver todos" button).

### Buscar
Search bar + filter sheet (chill/seria/torneo/level/distance), sport filter chips, type filter chips, `MatchCard` list with empty state.

### Create wizard (5 steps)
1. **Deporte** — sport list
2. **Modalidad** — short label icon + full label. Padel skips this step.
3. **Tipo + Nivel + Posiciones** — type cards, skill level buttons, positions per modality. SVG courts for fútbol + basket.
4. **Ubicación + Fecha + Precio** — map picker, date/time/duration pickers, price with BCV conversion. iOS "Listo" dismiss via `InputAccessoryView`.
5. **Pagos + Requisitos + Resumen** — payment checklist, sport-specific requirements, custom requirement input, summary card.

Validation: `validateStep(step, draft)` → `{ field: message }`. Button always enabled; validates on tap.

### Match detail (`match/[id]`)
- Hero: sport emoji + modality + missing count + price.
- Info Card: date/location/type/level in a single `Card padded={false}` with `Divider inset` between rows.
- Sections: Posiciones, Formas de pago, Sobre la partida, Organizador, Jugadores confirmados — each with uppercase caption label + Card.
- Sticky footer: "Quiero unirme" CTA or "Ya estás unido" badge (from `useJoinedMatches`).
- Organizer sees pencil icon in header → `/editar/[id]`.

### Join flow (`unirse/[id]`) — 4 steps
1. **Resumen** — sport hero, info card (date/location), price card (with BCV), organizer row.
2. **Pago** — radio-select payment method with color-coded icons.
3. **Requisitos** — checkbox per requirement + master toggle.
4. **Éxito** — animated checkmark + confetti, CTAs. Calls `useJoinedMatches.join(matchId)`.

### Edit match (`editar/[id]`)
Settings-style screen. Tappable rows for date/time, duration, location. Changes persisted to `useMatchOverrides`. Danger zone with `Alert.alert` confirmation.

### Post-match rating (`calificar/[id]`)
4-step flow. Stars → Tags → Comentario → Éxito. Triggered from mis-partidas "Pasadas" tab.

### Player profile (`perfil/[id]`)
Stats, sports, positions, badges, recent matches. Footer: message + invite (with Alert feedback). Invite Sheet lists organizer's upcoming matches.

### Mis partidas (`(tabs)/mis-partidas`)
Three tabs: Próximas / Pasadas / Creadas. Matches merged with `useMatchOverrides`.
- **Creadas** tab: "Editar partida" strip attached to card bottom (`surface` bg, no top border, bottom radius only).
- **Pasadas** tab: "Calificar jugadores" strip (`c.seria` amber fill, bottom radius only).
- Both strips use `cardStyle` on MatchCard to remove bottom radius/border, creating a visual attachment.

### Chat (`chat/[id]`)
`KeyboardAvoidingView` with `keyboardVerticalOffset={0}` (BackHeader is outside KAV). Bottom padding uses `useSafeAreaInsets().bottom`. Message bubbles grouped by day.

### Own profile (`(tabs)/perfil`)
Avatar, bio, sports grid, level stars, position chips, settings card. Cerrar sesión → `signOut()` + `router.replace('/login')`.

### Auth
Login + Register with inline validation. Social buttons stub to `signIn`.

### Ajustes
Dark mode Switch (wired to `useTheme`), notification toggles (local state), account section:
- "Cambiar contraseña" → `/cuenta/contrasena`
- "Correo electrónico" → `/cuenta/correo`
- "Eliminar cuenta" → destructive `Alert.alert`

### Cuenta — Correo (`cuenta/correo`)
Shows current email. Inputs: new email + confirm. Validates format, not-same-as-current, match. On submit: Alert confirmation → success card with verification instructions.

### Cuenta — Contraseña (`cuenta/contrasena`)
Inputs: current password, new password, confirm. Eye toggle on each field. Live requirement indicators (dots): min 6 chars, different from current, passwords match. On success: inline success card.

### Other screens
`notificaciones`, `historial`, `reputacion`, `terminos`, `privacidad`, `onboarding` (3 slides + ProgressDots).

---

## 11. Roadmap / Next Steps

### Phase A — Backend (highest priority)
- [ ] **Supabase** setup: project + schema (matches, players, chats, messages, ratings).
- [ ] Real auth: replace `useSession.signIn` stub. Email/password + social providers.
- [ ] CRUD endpoints via tanstack/react-query.
- [ ] Replace `mock*` imports with `useQuery` hooks.
- [ ] Image storage for avatars + cancha photos (Supabase Storage).
- [ ] BCV rate cron job (cache server-side, expose via edge function).
- [ ] Replace `useMatchOverrides` + `useJoinedMatches` with server mutations + optimistic updates.

### Phase B — Real-time + Notifications
- [ ] Supabase realtime channels for chat messages and match-join events.
- [ ] `expo-notifications` setup: APNs + FCM credentials, permission request, token registration.
- [ ] Notification deeplinks (tap → `/match/[id]` or `/chat/[id]`).
- [ ] Replace mock notifications with real feed.

### Phase C — Location
- [ ] `expo-location` permission + current position.
- [ ] Calculate real `distanceKm` (haversine).
- [ ] Replace mock canchas with geocoded venue DB or Google Places.
- [ ] Reverse geocoding on custom pin drop.
- [ ] Map clustering on zoom out.

### Phase D — Payments
- [ ] Stripe Connect or local processor for Venezuela.
- [ ] Hold-and-release flow: pay on join, release to organizer post-match.
- [ ] Dispute / refund flow.

### Phase E — Reputation & matchmaking
- [ ] Wire `calificar/[id]` to persist ratings → recalculate `reputation`.
- [ ] Post-match rating prompt automation.
- [ ] Match recommendation engine (skill + distance + history).

### Phase F — Quality
- [ ] Test runner: `jest` + `@testing-library/react-native`. Unit tests for `lib/`, `features/match/helpers`, validation logic.
- [ ] Accessibility audit (`accessibilityLabel` on all `PressableScale`).
- [ ] i18n (currently Spanish-only hardcoded).
- [ ] Error monitoring (Sentry).
- [ ] Analytics (Posthog or Amplitude).

### Phase G — Build & Store
- [ ] EAS Build profiles (development, preview, production).
- [ ] iOS bundle id `com.lacancha.app` — Apple Developer enrollment needed.
- [ ] Android `com.lacancha.app` — Play Console + signing key.
- [ ] App Store screenshots + descriptions (es-VE).
- [ ] Privacy nutrition labels.

---

## 12. How-To

### Add a new screen
1. Create `app/<name>.tsx` with `export default function NameScreen() { ... }`.
2. Register in `app/_layout.tsx` `<Stack>` block.
3. Link: `router.push('/<name>')`.
4. Use `Screen` + `BackHeader` + `useColors()` + `makeStyles(c)`.

### Add a new sport
1. Add to `Sport` union in `types/domain.ts`.
2. Add label in `lib/format.ts` (`SPORT_LABEL`).
3. Add icon in `components/brand/SportIcon.tsx`.
4. Add to `sportModalities` in `features/match/helpers.ts`.
5. If positions apply, add entry to `positionsForModality()`.
6. Add to `REQUIREMENTS_BY_SPORT` in `app/crear/index.tsx`.
7. Add to `SPORTS` const in `app/crear/index.tsx`.
8. Add dot layout to `MiniPitchPreview.tsx`.
9. Add `modalidadSub` entry in Step2Modality (if not single-modality).

### Add a new modality to existing sport
1. Add key to modality type alias in `types/domain.ts` — use sport-prefixed key (`futbol3` not `3v3`).
2. Add label in `lib/format.ts` `MODALITY_LABEL` and `MODALITY_SHORT`.
3. Add to `sportModalities[sport]` array.
4. Add per-modality positions to relevant `*positionsByModality`.
5. Add layout to `FOOTBALL_LAYOUTS` / `BASKET_LAYOUTS` in `PositionPitch.tsx`.
6. Update `modalityShortLabel()` in `app/crear/index.tsx`.
7. Add dot layout to `MiniPitchPreview.tsx`.

### Add a new color token
1. Add to **both** `darkPalette` and `lightPalette` in `theme/palettes.ts`.
2. Use via `useColors()` only — never import `colors` directly in new code.

### Add validation to a form
```ts
const errors = useMemo(() => {
  const e: Record<string, string> = {};
  if (!field) e.field = 'Mensaje de error';
  return e;
}, [field]);
const [tried, setTried] = useState(false);
const shown = tried ? errors : {};
// On submit:
setTried(true);
if (Object.keys(errors).length > 0) return;
```
Pass `shown.field` as `error` prop to `TextInput`. Never disable the submit button.

### Add iOS keyboard "Listo" button
```tsx
import { InputAccessoryView, Keyboard, Platform } from 'react-native';
const ACCESSORY_ID = 'my-input-done';
// On TextInput:
inputAccessoryViewID={Platform.OS === 'ios' ? ACCESSORY_ID : undefined}
returnKeyType="done"
onSubmitEditing={Keyboard.dismiss}
// Below screen JSX:
{Platform.OS === 'ios' && (
  <InputAccessoryView nativeID={ACCESSORY_ID}>
    <View style={styles.inputAccessory}>
      <PressableScale onPress={Keyboard.dismiss} scaleTo={0.95}>
        <Text variant="bodyMedium" color="primary">Listo</Text>
      </PressableScale>
    </View>
  </InputAccessoryView>
)}
```

---

## 13. Conventions

### Styling — mandatory pattern
```ts
// At top of component:
const c = useColors();
const s = useMemo(() => makeStyles(c), [c]);

// At bottom of file:
function makeStyles(c: ColorPalette) {
  return StyleSheet.create({ ... });
}

// For color-independent styles only:
const staticStyles = StyleSheet.create({ ... });
```
Never use `colors` (static dark import) in new code. Never hardcode color hex values outside palette files.

### TypeScript
- `"strict": true` — no implicit any.
- `interface` for public shapes, `type` for unions/aliases.
- Domain types in `types/`. UI prop types inline as `interface Props`.

### Styling rules
- Spacing tokens (`spacing.md`), never raw numbers (except fine tweaks like `marginTop: 2`).
- `radius.*` not raw px for border radii.
- Flexbox over absolute positioning.
- Semi-transparent: `${c.alert}44` (hex alpha suffix).
- For horizontal ScrollViews of chips: add `paddingBottom` to `contentContainerStyle`.

### File naming
- Components & screens: `PascalCase.tsx` / `lowercase.tsx` (routes).
- Stores: `camelCase.ts`.
- Mocks: `mock` prefix.

### Imports order
External → `@/components` → `@/features` → `@/lib` → `@/store` → `@/theme` → `@/types`.

### Language
- UI strings: **Spanish** (es-VE).
- Code identifiers, types, comments: **English**.
- Exception: domain values like `'cualquiera'`, `'portero'` are Spanish (serialized).

### Icon weights
- `weight="fill"` — active / selected / primary.
- `weight="bold"` — emphasis.
- `weight="regular"` — inactive / secondary.

---

## 14. Known Gotchas

### `expo-router` typed routes
`typedRoutes: false`. `.expo/types/router.d.ts` excluded from tsconfig. Don't re-include without removing string-interpolation pushes.

### Can't nest dynamic routes under flat dynamic file
`match/[id].tsx` is flat. Cannot create `match/[id]/something.tsx` without converting to directory layout. Use flat siblings (`editar/[id].tsx`) instead.

### `Stars` overflow
5 stars at size 16 = 88px. In ~72px columns → overflow. Use size 10–12 inside compressed buttons.

### Chip label clipping in horizontal ScrollView
Fixed in `Chip.tsx`: `flexShrink: 0` + `numberOfLines: 1`.

### Emoji clipping
Emojis ~120% of fontSize. Need `lineHeight: fontSize * 1.3` minimum.

### MatchCard action strip in mis-partidas
The strip sits below the card with `gap: 0`. MatchCard must have `cardStyle={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottomWidth: 0 }}` to remove the bottom border and let the strip attach seamlessly.

### `MatchTypeBadge` / `MatchTypePromoCard` colors
`matchTypeMeta[type].color` is static (dark palette). Always derive colors from `useColors()` via `typeColors(type, c)` helper inside the component.

### `BackHeader` on screens reached via `router.replace`
`navigation.canGoBack()` returns false → back button hidden automatically. Safe for login/splash.

### Chat keyboard gap
`KeyboardAvoidingView` must have `keyboardVerticalOffset={0}` when `BackHeader` is outside the KAV. Safe area bottom for composer via `useSafeAreaInsets().bottom`.

### `Stars` overflow
Phosphor `Star` at size 16 with gap 2 = 88px wide for 5 stars. In flex-1 button columns on a 390px screen, available width is ~72px → overflow. **Use size 10–12 inside compressed buttons.**

### StepperBar last step compression
Fixed: dot + line rendered as siblings, `dot.flexShrink: 0`, `line.flex: 1`.

### PositionPitch height
Field uses `aspectRatio: 0.6`. Wrap `height: 260`, field `height: 252`, `overflow: hidden` as safety.

### React Native Maps + Android
For standalone builds: set `GOOGLE_MAPS_API_KEY` in `app.json android.config.googleMaps.apiKey`.

### DateTimePicker theming
`themeVariant="dark"` iOS only. Android uses system colors.

### `InputAccessoryView` iOS-only
Always gate with `Platform.OS === 'ios'`.

### Reanimated worklets
`PressableScale` runs on UI thread. No hooks or non-worklet functions inside `useAnimatedStyle`.

### Splash hide
`SplashScreen.preventAutoHideAsync()` at module load, `hideAsync()` after fonts load. Don't move.

---

## 15. Development Workflow

### Start
```bash
npx expo start              # Metro + QR for Expo Go
npx expo start --ios        # iOS simulator
npx expo start --android    # Android emulator
```

### Lint + types
```bash
npx tsc --noEmit            # 0 errors expected
npx expo lint               # 0 warnings expected
```

### Add an Expo-managed native module
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

### Reset wizard / dev data
In console: `useDraftMatch.getState().reset()`

---

## 16. Build & Deploy (future)

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform ios --profile preview
eas build --platform android --profile preview
eas submit
```

Profiles in `eas.json`: `development`, `preview`, `production`.

### Required before production
- Apple Developer + Google Play Console accounts.
- App icons + splash assets at all sizes.
- Privacy policy + ToS at public URL.
- BCV rate API.
- Error monitoring (Sentry) + analytics.

---

## 17. Quick Reference

| Task | Where |
|---|---|
| Change splash animation | `app/index.tsx` |
| Add a mock match | `data/matches.ts` |
| Change BCV rate | `lib/exchange.ts` (`BCV_RATE`) |
| Add cancha to map | `data/canchas.ts` |
| Edit wizard step copy | `app/crear/index.tsx` `<StepHeader>` |
| Add payment method | `types/domain.ts` + `lib/format.ts` + `app/crear/index.tsx` |
| Change tab icons | `app/(tabs)/_layout.tsx` |
| Change app name / splash bg | `app.json` |
| Toggle dev auth | `store/session.ts` initial `isAuthed` |
| Navigate to player profile | `router.push('/perfil/${playerId}')` |
| Navigate to join flow | `router.push('/unirse/${matchId}')` |
| Navigate to edit match | `router.push('/editar/${matchId}')` |
| Navigate to rate player | `router.push('/calificar/${playerId}')` |
| Navigate to change email | `router.push('/cuenta/correo')` |
| Navigate to change password | `router.push('/cuenta/contrasena')` |
| Override match fields locally | `useMatchOverrides.getState().setOverride(id, partial)` |
| Check if user joined match | `useJoinedMatches.getState().hasJoined(matchId)` |
