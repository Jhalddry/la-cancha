# La Cancha — Claude Code Guide

> **CRITICAL: Expo SDK 54.** Read versioned docs at <https://docs.expo.dev/versions/v54.0.0/> before writing any Expo/React Native code. APIs change between SDKs — do not trust pre-SDK-54 docs or training data.

---

## 1. What is La Cancha

**La Cancha** is a mobile-first sports matchmaking app for Venezuela (initial market). Tagline: *"Arma tu partida en segundos"*.

Users do three things:
1. **Find matches** near them — filter by sport, type, level, distance.
2. **Create matches** — pick sport, modality, type, level, position needs, location, date, price, payment methods.
3. **Communicate** — chat with organizers/players inside the app.

Core sports supported: **fútbol** (5/7/11), **basket** (3v3/5v5), **tenis** (singles/dobles), **pádel** (dobles), **beach tennis** (dobles).

Match metadata covers Venezuelan context: bolívar/USD pricing with live BCV exchange rate, payment methods like **Pago Móvil**, **Zelle**, **USDT (Binance)**.

**Design language**: dark-first, neon-green accent (`#7BFF00`), modern sports aesthetic. Light mode is plumbed via theme tokens but currently most surfaces are dark-hardcoded.

**Status**: Frontend-only MVP with mock data. No backend, no auth, no real-time. State held in Zustand stores. Authentication is faked (`useSession.signIn()` toggles a flag).

---

## 2. Tech Stack

### Runtime
- **Expo SDK 54** managed workflow — chosen for fast iteration in Expo Go.
- **React Native 0.81.5** + **React 19.1**.
- **TypeScript 5.9** with `"strict": true`.

### Navigation
- **expo-router 6.0.x** (file-based routing). `typedRoutes: false` in `app.json` because string interpolation in route paths (e.g. `` `/match/${id}` ``) doesn't satisfy generated typed-route unions. The `.expo/types/router.d.ts` file is excluded from `tsconfig.json` to silence regeneration noise.

### State
- **Zustand 5.0** — `useSession`, `useDraftMatch`, `useTheme`. No middleware (no persist, no devtools wired). Simple `create<T>()(set => ({...}))` shape.

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
│   ├── ajustes.tsx
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
│   ├── crear/
│   │   ├── _layout.tsx
│   │   ├── index.tsx             # 5-step create wizard
│   │   └── confirmacion.tsx
│   └── perfil/
│       └── editar.tsx
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
│       ├── MatchCard.tsx
│       ├── MatchTypeBadge.tsx
│       ├── MatchTypePromoCard.tsx
│       ├── PositionPitch.tsx     # Football + basket SVG courts
│       ├── matchTypeMeta.ts      # Chill/Seria/Torneo metadata
│       └── helpers.ts            # sportModalities, positions per modality
│
├── store/                        # Zustand
│   ├── session.ts                # Current user + auth flag
│   ├── draftMatch.ts             # Wizard state (5 steps)
│   └── theme.ts                  # dark | light | system
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
│   ├── players.ts                # mockCurrentUser, mockPlayers
│   ├── matches.ts                # mockMatches
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

`theme/colors.ts` re-exports `darkPalette` as `colors` so existing `import { colors } from '@/theme'` keeps working (most existing screens hardcode dark).

### Reactive theme

```ts
// store/theme.ts
useTheme.mode: 'dark' | 'light' | 'system'
useTheme.setMode(m)

// hooks/useColors.ts
const c = useColors();   // returns active ColorPalette based on mode + system scheme
```

`app/_layout.tsx` reads `useColors()` to build a dynamic `navTheme` (DarkTheme vs DefaultTheme base). `StatusBar style="auto"` adapts.

### Why most screens are still dark

Migration cost: every existing `StyleSheet.create({ ... colors.surface ... })` runs at module load — not reactive. To fully support light mode, all screens would need to call `useColors()` and build styles dynamically (or pass colors via prop). This is plumbed but not retrofitted everywhere yet.

**New screens** should prefer `const c = useColors()` and inline color values. The tab bar (`app/(tabs)/_layout.tsx`) and root layout already do this.

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

**date is `Date` (never null)** — initialized to today 20:00. Sub-pickers for date/time/duration mutate it.

### `useTheme` (store/theme.ts)
Just `{ mode, setMode }`. See §4.

---

## 6. Routing (expo-router)

File-based. Folders = nested groups, `[id]` = dynamic, `_layout.tsx` = stack/tabs wrapper, `(name)` = group without URL segment.

### Stack registered in `app/_layout.tsx`
- `index` (splash)
- `onboarding`
- `login`, `register` (slide_from_right)
- `(tabs)` (tab group)
- `match/[id]`, `chat/[id]`, `perfil/editar` (slide_from_right)
- `crear` (slide_from_bottom)
- `notificaciones`, `ajustes`, `historial`, `reputacion`, `terminos`, `privacidad` (slide_from_right)

### Navigation patterns
```ts
const router = useRouter();
router.push('/match/abc');         // string interpolation works (typedRoutes off)
router.replace('/(tabs)');         // post-auth
router.back();                     // back nav
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
- Padel: `'padelDobles'`
- Beach Tennis: `'beachDobles'`

> **Don't** use `'5v5'` as a shared key — it was ambiguous between football and basket (basket showed "Fútbol 5" label). Always use the sport-prefixed key.

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
- chill → "Chill" 😎 green
- seria → "Seria" 👕 yellow
- competencia → "Torneo" 🏆 red

### SkillLevel
`1 | 2 | 3 | 4 | 5` → "Principiante" … "Competitivo" via `labelSkill()`.

### PaymentMethod
`'pagoMovil' | 'transferencia' | 'efectivo' | 'zelle' | 'usdt'`

### Currency
`'USD' | 'VES'`. BCV rate constant in `lib/exchange.ts` (`BCV_RATE = 36.72`). Replace with live API call later.

### Match, Player, MatchLocation
See file. `MatchLocation` now has optional `lat/lng` for map integration.

---

## 8. UI Component Library (`components/ui/`)

| Component | Purpose | Notes |
|---|---|---|
| `Screen` | Root container with SafeArea | Props: `edges`, `bg` |
| `Text` | All text — typed `variant` + `color` | NEVER use raw `<RNText>` |
| `Button` | Primary/secondary/ghost CTAs | Props: `variant`, `fullWidth`, `leading`, `disabled` |
| `PressableScale` | Tap with reanimated scale | Required `children`, `scaleTo` (0.9 typical) |
| `Card` | Surface container | `padded` prop (default true) |
| `Chip` | Pill with optional emoji label | `selected`, `onPress`, `tone`. `flexShrink: 0` + `numberOfLines: 1` + `minHeight: 38` to prevent label clipping in horizontal ScrollViews |
| `Badge` | Small static label | `tone: 'default' \| 'primary' \| 'accent' \| 'alert'` |
| `Avatar` | Initials avatar | `name`, `size`, `bg` |
| `AvatarStack` | Overlapping avatars | Props: `players`, `max` |
| `Stars` | 1-5 star row | `level`, `size`. **Important: use size 10-12 inside compressed buttons** (5 stars at size 16 = 88px overflows ~72px column on small screens) |
| `TextInput` | Labeled input with error | `label`, `error`, `leading`, `trailing`, `variant: 'default' \| 'plain'` |
| `BackHeader` | Top bar with back button | `title`, `transparent`, `trailing` |
| `EmptyState` | Icon + title + description | `icon`, `title`, `description`, `action` |
| `SegmentedTabs` | Inline tab switcher | `tabs`, `value`, `onChange` |
| `StepperBar` | Wizard step indicator | `total`, `current`. Uses `Fragment` + `flex: 1` lines so last dot isn't compressed |
| `ProgressDots` | Onboarding dot indicator | `count`, `index` |
| `Sheet` | Bottom modal | `visible`, `onClose`, `title`, children |
| `Divider` | 1px line | `inset` prop |
| `IconCircle` | Circular icon container | `size`, `bg`, `border`, children |

### Components in `components/feature/`
- `DateTimePickerSheet` — native date or time picker inside a Sheet. Also exports `DurationPickerSheet` with 9 presets + "Personalizada" custom input (5–480 min, validated).
- `LocationPickerSheet` — fullscreen `Modal` with `MapView` and markers for `mockCanchas`. Filters markers by `filterSport` if passed. Calls `onSelect(cancha)` with `{ name, address, lat, lng }`.

---

## 9. Data Layer

All mocks. When wiring a real backend:

1. Replace `data/*.ts` with API calls (suggest `tanstack/react-query`).
2. Match the existing types in `types/domain.ts` — they are the contract.
3. `useSession` currently sets `mockCurrentUser` on mount. Swap for an auth check + fetch.
4. `mockCanchas` has lat/lng for Caracas venues. Replace with geocoded API result (Google Places, Mapbox, or custom DB).
5. `BCV_RATE` is a constant. Wire to BCV's published rate (cache 24h).

---

## 10. Key Features Implemented

### Home
Greeting + location pin → "Caracas, Venezuela", bell icon → `/notificaciones`, 2 CTAs (search / create), 3 type promo cards, list of nearby `MatchCard`s.

### Buscar
Search bar + filter sheet (chill/seria/torneo/level/distance), horizontal sport filter chips (with `beachTennis`), horizontal type filter chips below results header, `MatchCard` list with empty state.

### Create wizard (5 steps)
1. **Deporte** — sport list
2. **Modalidad** — short label icon + full label
3. **Tipo + Nivel + Posiciones** — type cards, skill level buttons (stars size 10), positions per modality. For fútbol → `FootballField` SVG with tappable spots. For basket → `BasketCourt` SVG with tappable spots. Missing count stepper.
4. **Ubicación + Fecha + Precio** — Cancha input + "Seleccionar en mapa" button → `LocationPickerSheet`. Date / Time / Duration rows → respective pickers. Duration includes "Personalizada" with 5–480 min range. Price input with live BCV conversion ("≈ Bs. X.XX").
5. **Pagos + Requisitos + Resumen** — payment methods checklist, BCV rate display, sport-specific requirements (e.g. fútbol = canilleras, balón propio; pádel = pala, pelotas), custom requirement input, summary card.

Validation: `validateStep(step, draft)` returns `{ field: message }`. Button always enabled; `onNext` validates first, sets `triedNext=true` to render `<ErrorMessage>` inline. Resets on step change.

### Match detail (`match/[id]`)
Hero (price + missing count), DetailRows (date, location, type, level), positions chips, payment methods, requirements, organizer card, joined avatars, sticky CTA.

### Chat (`chat/[id]`)
KeyboardAvoidingView, message bubbles grouped by day, composer at bottom, auto-scroll.

### Perfil
Avatar + edit pencil, sports grid, level stars, position chips, settings card (historial, reputación, ajustes, onboarding, términos, privacidad, cerrar sesión).

### Auth
Login + Register: La Cancha logo, inline field validation (email regex, password min 6, terms checkbox). Social buttons stubbed to `signIn`.

### Other screens
`notificaciones`, `ajustes` (theme toggle wired to `useTheme`), `historial`, `reputacion`, `terminos`, `privacidad`, `onboarding` (3 slides + ProgressDots).

---

## 11. Roadmap / Next Steps

### Phase A — Backend wiring (highest priority)
- [ ] Pick backend: Supabase recommended (postgres + auth + storage + realtime in one).
- [ ] Real auth (replace `useSession.signIn` stub). Email/password + social providers.
- [ ] CRUD endpoints: matches, players, chats, messages.
- [ ] Replace `mock*` imports with `useQuery` (tanstack/react-query).
- [ ] Image storage for avatars + cancha photos.
- [ ] BCV rate cron (cache server-side).

### Phase B — Real-time + Notifications
- [ ] Supabase realtime channels for chats and match-join events.
- [ ] `expo-notifications` setup: APNs + FCM credentials, permission request, token registration.
- [ ] Notification deeplinks (tap → `/match/[id]` or `/chat/[id]`).
- [ ] Replace `mockNotifications` with real feed.

### Phase C — Location
- [ ] `expo-location` permission + current position.
- [ ] Calculate real `distanceKm` (haversine).
- [ ] Replace mock canchas with geocoded venue DB or Google Places.
- [ ] Reverse geocoding when user drops custom pin (`expo-location` `reverseGeocodeAsync`).
- [ ] Map clustering when zoom out (`react-native-maps-super-cluster` or similar).

### Phase D — Payments
- [ ] Stripe Connect or local processor for Venezuela (Pago Móvil API providers).
- [ ] Hold-and-release flow: pay on join, release to organizer post-match.
- [ ] Dispute / refund flow.

### Phase E — Reputation & matchmaking
- [ ] Post-match rating prompt (1–5 stars + tags: puntual, fair play, etc).
- [ ] Reputation score calc + persistence.
- [ ] Match recommendation engine (skill match + distance + history).

### Phase F — Polish + light mode retrofit
- [ ] Convert all `StyleSheet.create({ ...colors.X })` callsites to `useColors()`.
- [ ] Test light mode end-to-end.
- [ ] Accessibility audit (`accessibilityLabel` on all PressableScale).
- [ ] i18n (currently Spanish-only hardcoded).
- [ ] Test runner: `jest` + `@testing-library/react-native`. Snapshot tests for screens. Unit tests for `lib/`, `features/match/helpers`, validation logic.

### Phase G — Build & Store
- [ ] EAS Build profiles (development, preview, production).
- [ ] iOS bundle id `com.lacancha.app` already set. Apple Developer enrollment needed.
- [ ] Android `com.lacancha.app`. Play Console + signing key.
- [ ] App Store screenshots, descriptions (es-VE).
- [ ] Privacy nutrition labels (location, contacts not requested currently).

---

## 12. How-To

### Add a new screen
1. Create `app/<name>.tsx` with `export default function NameScreen() { ... }`.
2. Register in `app/_layout.tsx` `<Stack>` block (optional `options`).
3. Link to it: `router.push('/<name>')`.
4. Use `Screen` + `BackHeader` for consistency.

### Add a new sport
1. Add to `Sport` union in `types/domain.ts`.
2. Add label in `lib/format.ts` (`SPORT_LABEL`).
3. Add icon in `components/brand/SportIcon.tsx`.
4. Add to `sportModalities` in `features/match/helpers.ts`.
5. If positions apply, add entry to `positionsForModality()`.
6. Add to `REQUIREMENTS_BY_SPORT` in `app/crear/index.tsx`.
7. Optionally add to `SPORTS` const at top of `app/crear/index.tsx` so it appears in step 1.
8. Add icon row to `BasketCourt` / new sport pitch component if it needs a visual.

### Add a new modality to existing sport
1. Add key to the modality type alias (e.g. `FootballModality`) in `types/domain.ts` — use unambiguous prefix (`futbol3` not `3v3`).
2. Add label in `lib/format.ts` `MODALITY_LABEL` and `MODALITY_SHORT`.
3. Add to `sportModalities[sport]` array.
4. Add per-modality positions to `footballPositionsByModality` (or basket equivalent).
5. Add layout to `FOOTBALL_LAYOUTS` / `BASKET_LAYOUTS` in `PositionPitch.tsx` (spots with `x`/`y` percentages 0–100).
6. Update `modalityShortLabel()` in `app/crear/index.tsx` for the icon pill in step 2.

### Add a new position
1. Add to `FootballPosition` / `BasketPosition` union in `types/domain.ts`.
2. Add label in `lib/format.ts` `POSITION_LABEL`.
3. Add to the relevant `*positionsByModality` arrays in helpers.
4. Add spot in `PositionPitch.tsx` layouts where it should appear.

### Add a new color token
1. Add to **both** `darkPalette` and `lightPalette` in `theme/palettes.ts`.
2. `colors` re-export from `theme/colors.ts` picks it up automatically (dark).
3. For light-mode usage, components must use `useColors()` not `colors`.

### Add validation to a form
1. Build `errors` with `useMemo`: `const errors = useMemo(() => { const e = {}; if (!field) e.field = 'message'; return e; }, [deps]);`
2. Add `tried: boolean` state, flip in submit handler if invalid.
3. `const shown = tried ? errors : {};` — pass `shown.field` as `error` prop to `TextInput`.
4. Don't disable submit button — always enabled, fail loud on tap.

### Add a new modality icon mapping
Edit `modalityShortLabel()` in `app/crear/index.tsx`.

### Switch wizard to N steps
1. Change `TOTAL_STEPS` in `app/crear/index.tsx`.
2. Update `setStep` and `next` clamp in `store/draftMatch.ts` (currently `Math.min(5, ...)`).
3. Add `case N` to `validateStep()`.
4. Add step component + render branch in main wizard.

---

## 13. Conventions

### TypeScript
- `"strict": true` — no implicit any.
- Prefer `interface` for public shapes, `type` for unions / aliases.
- Domain types in `types/`. UI prop types inline as `interface Props`.
- Don't re-export types from index files unless they're used externally.

### Styling
- All styles via `StyleSheet.create({...})` at bottom of file.
- Use spacing tokens (`spacing.md`), never raw numbers (except for fine tweaks like `marginTop: 2`).
- Use `radius.*` not raw px for border radii.
- Colors via theme tokens, not hex literals — except brand colors fixed in palette files.
- Flexbox over absolute positioning.
- For horizontal ScrollViews of chips: add `paddingBottom` to `contentContainerStyle` (otherwise chip border clips).

### File naming
- Components & screens: `PascalCase.tsx` (UI) / `lowercase.tsx` (routes — expo-router rule).
- Stores: `camelCase.ts`.
- Mocks: prefix with `mock`.

### Imports
- Use `@/` alias. Order: external → `@/components` → `@/features` → `@/lib` → `@/store` → `@/theme` → `@/types`. Lint enforces partial order.

### Spanish vs English in code
- UI strings: **Spanish** (es-VE).
- Code identifiers, types, comments: **English**.
- Exception: domain values like `'cualquiera'`, `'portero'` are Spanish because they're persisted/serialized.

### Icon weights
- `weight="fill"` — active / selected / primary action.
- `weight="bold"` — emphasis (small icons).
- `weight="regular"` — inactive / secondary.

---

## 14. Known Gotchas

### `expo-router` typed routes
`typedRoutes: false` in `app.json`. `.expo/types/router.d.ts` is regenerated on every `expo start` and **excluded from tsconfig**. Don't re-include it without disabling string-interpolation route push calls.

### `Stars` overflow
Phosphor `Star` at size 16 with gap 2 = 88px wide for 5 stars. In flex-1 button columns on a 390px screen, available width is ~72px → overflow. **Use size 10–12 inside compressed buttons.**

### Chip label clipping in horizontal ScrollView
Without `flexShrink: 0` on Chip base + `numberOfLines: 1` on label, RN compresses chips in horizontal scroll causing text truncation. Already fixed in `Chip.tsx`.

### Emoji clipping
Emojis render ~120% of fontSize. Need `lineHeight: fontSize * 1.3` minimum. Already applied to wizard type cards and summary emoji.

### StepperBar last step compression
Items with `flex` distribute width; the last dot (no trailing line) can shrink. Fix: render dot and line as **siblings** (no item wrapper), give dot `flexShrink: 0` and line `flex: 1`. Already done in `StepperBar.tsx`.

### PositionPitch height
Field uses `aspectRatio: 0.6` so height is derived from width. If wrap has fixed height < derived height → overflow. Current: wrap `height: 260`, field `height: 260 - 8`, `aspectRatio: 0.6` (width derived). Wrap has `overflow: hidden` as safety.

### React Native Maps + Android
Default Google Maps API key works in Expo Go on Android. For standalone builds, set `GOOGLE_MAPS_API_KEY` in app.json `android.config.googleMaps.apiKey`.

### DateTimePicker theming
`themeVariant="dark"` only works on iOS. Android picker uses system colors.

### Reanimated worklets
`PressableScale` runs on the UI thread. Don't put hooks or non-worklet functions inside `useAnimatedStyle` callbacks.

### Splash hide
`SplashScreen.preventAutoHideAsync()` at module load, `SplashScreen.hideAsync()` once fonts load. Don't move this logic.

### Light mode is plumbed but incomplete
Most screens hardcode `colors.X` (= dark palette). Switching to light mode via `ajustes` will only retheme the tab bar, root nav theme, and components built with `useColors()`. Full retrofit pending.

---

## 15. Development Workflow

### Start
```bash
npx expo start              # Metro + QR for Expo Go
npx expo start --ios        # Open in iOS simulator
npx expo start --android    # Open in Android emulator
```

### Lint + types
```bash
npx tsc --noEmit            # 0 errors expected
npx expo lint               # 0 warnings expected
```

### Add an Expo-managed native module
```bash
npx expo install <pkg>      # picks SDK-compatible version
```
Never `npm install` directly for native modules — version mismatch with SDK breaks builds.

### Clean install
```bash
rm -rf node_modules .expo
npm install
npx expo start --clear
```

### Reset wizard / dev data
In console: `useDraftMatch.getState().reset()` (works via React Native Debugger).

---

## 16. Build & Deploy (future)

### EAS
```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform ios --profile preview
eas build --platform android --profile preview
eas submit
```

Profiles to add in `eas.json`:
- `development` — dev client with debugging
- `preview` — internal testing (TestFlight / internal track)
- `production` — store-ready

### Required before production
- Real bundle identifier ownership (Apple Developer + Google Play).
- App icons + splash assets at all sizes (currently using template).
- Privacy policy + ToS hosted at public URL (currently in-app only).
- BCV rate API or scraping job.
- Error monitoring (Sentry recommended).
- Analytics (Posthog or Amplitude).

---

## 17. Quick reference for common tasks

| Task | Where |
|---|---|
| Change splash animation | `app/index.tsx` |
| Add a mock match | `data/matches.ts` |
| Change BCV rate | `lib/exchange.ts` (`BCV_RATE`) |
| Add cancha to map | `data/canchas.ts` |
| Edit wizard step copy | `app/crear/index.tsx` `<StepHeader title sub>` |
| Add payment method | `types/domain.ts` `PaymentMethod` + `lib/format.ts` `PAYMENT_LABEL` + `app/crear/index.tsx` `PAYMENT_METHODS` |
| Change tab icons | `app/(tabs)/_layout.tsx` |
| Change app name / splash bg | `app.json` |
| Toggle dev auth | `store/session.ts` initial `isAuthed` |
