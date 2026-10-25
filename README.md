# La Cancha 🏟️

> *Arma tu partida en segundos*

Mobile-first sports matchmaking app for Venezuela. Find pickup games, create matches, chat with players, and build reputation.

---

## What it does

- **Buscar** — nearby matches (real GPS distance) filtered by sport, type (chill / seria / competencia), skill level, and distance. Bookmark matches.
- **Crear** — 5-step wizard: sport → modality → type/level/positions → location/date/price → payments/requirements
- **Unirse** — 4-step join flow: summary, payment method, requirements, success. Organizer approves or rejects requests.
- **Mis partidas** — Próximas / Pasadas / Activas. Organizers edit, start, and end matches; players rate after.
- **Chat** — match group chats and private DMs (only between players who shared a match), with read receipts, typing indicator, voice messages, swipe-to-reply, and multi-select delete.
- **Calificar** — post-match ratings (stars, tags, comment) feeding reputation and automatic badges.
- **Fotos** — match photo gallery after the game ends.
- **Compartir** — share match and player profile as an image.

Sports: **fútbol** (5/7/11), **basket** (3v3/5v5), **tenis**, **pádel**, **beach tennis**

Venezuelan context: USD/Bolívar pricing with live BCV rate, Pago Móvil, Zelle, USDT (Binance).

---

## Status

**Working app on a real backend.** Auth, data, storage, realtime, and push all run on Supabase.

Done:
- Supabase auth (email/password), profile auto-creation via DB trigger, session restore
- React Query data layer; no mock data in screens; pull-to-refresh, skeletons, infinite scroll, error states
- Real GPS distance (`expo-location` + haversine)
- Live BCV rate (`ve.dolarapi.com`) with persisted fallback
- Realtime chat: messages, read receipts, typing indicator (Broadcast), live viewer count (Presence)
- Voice messages, swipe-to-reply, multi-select delete in chats
- Push notifications via Expo Push API (new chat messages, match events)
- Notifications feed with deep links and swipe-to-dismiss
- Avatar upload and match photos (Supabase Storage)
- Reputation, 8-tier automatic badges (DB triggers), per-sport skill levels
- Reports and block flows; admin verification screen
- Share cards (match and player) via `react-native-view-shot` + `expo-sharing`
- Premium UX: animated numbers, badge shimmer, wizard slide transitions, glass bottom sheets, confetti, 3D sport ball, parallax hero, Android tab polish, onboarding and splash revamp
- Internal analytics (`custom_events` table, no third party)
- DB security hardening (pinned `search_path`, revoked PUBLIC execute, tightened storage policies)

Pending / known:
- Google sign-in disabled for now
- Sentry removed (needs native build; incompatible with Expo Go)
- Payments are honor-system (no escrow)
- Real canchas table (map picker still uses `data/canchas.ts`)
- Tests, accessibility audit, i18n
- EAS Build profiles and store release

See `CLAUDE.md §11` for the full roadmap.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Expo SDK 58 (managed workflow), React Native 0.88, React 19.3 |
| Language | TypeScript 5.9 strict |
| Navigation | expo-router 6 (file-based) |
| Backend | Supabase (Postgres, Auth, Storage, Realtime, RPC) |
| Server state | @tanstack/react-query |
| Client state | Zustand 5 |
| UI | React Native + react-native-reanimated 4 + gesture-handler |
| Icons | phosphor-react-native 3 |
| Maps / location | react-native-maps, expo-location |
| Fonts | @expo-google-fonts/inter |

---

## Getting Started

```bash
npm install
```

Create `.env` at the project root (both required, app throws at startup if missing):

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

```bash
npx expo start
```

Scan QR with Expo Go (iOS/Android) or press `i` / `a` for simulators.

**Requirements:** Node 22.13+, Expo Go on device or Xcode/Android Studio for simulators.

### Database

Migrations live in `supabase/migrations/`. Apply them in order to your Supabase project. Manual step: create a public Storage bucket named `match-photos`.

### Lint and types

```bash
npx tsc --noEmit
npx expo lint
```

---

## Project Structure

```
app/          # Screens (expo-router file-based routing)
components/   # UI primitives, brand, feature composites
features/     # Match-domain components (MatchCard, PositionPitch, etc.)
hooks/        # React Query hooks (matches, chat, profiles, notifications, location, bookmarks)
lib/          # Pure async helpers and API modules (Supabase, format, exchange, geo, push)
store/        # Zustand stores (session, draftMatch, theme)
supabase/     # SQL migrations and config
data/         # Legacy mock data (only canchas still used)
types/        # TypeScript domain types
theme/        # Design tokens (palettes, spacing, radius, typography)
```

Full architecture docs: [`CLAUDE.md`](./CLAUDE.md)

---

## Screens

| Screen | Route |
|---|---|
| Splash / auth gate | `/` |
| Onboarding | `/onboarding` |
| Login / Register | `/login`, `/register` |
| Home | `/(tabs)` |
| Search | `/(tabs)/buscar` |
| My matches | `/(tabs)/mis-partidas` |
| Chats | `/(tabs)/chats` |
| Own profile | `/(tabs)/perfil` |
| Match detail | `/match/[id]` |
| Join flow | `/unirse/[id]` |
| Create wizard | `/crear` |
| Edit match | `/editar/[id]` |
| Rate player | `/calificar/[id]?matchId=` |
| Player profile | `/perfil/[id]` |
| Edit profile | `/perfil/editar` |
| Match chat | `/chat/[id]` |
| Private chat | `/direct/[id]` |
| Notifications | `/notificaciones` |
| Reputation | `/reputacion` |
| History | `/historial` |
| Settings | `/ajustes` |
| Change email / password | `/cuenta/correo`, `/cuenta/contrasena` |
| Admin verifications | `/admin/verificaciones` |
| Terms / Privacy | `/terminos`, `/privacidad` |

---

## Design

- **Dark-first** with full light mode support (toggle in Ajustes)
- Neon green accent `#7BFF00` (dark) / `#1A7A00` (light)
- All colors reactive via `useColors()` → `makeStyles(c: ColorPalette)` pattern
- Match type colors: chill (green), seria (amber), competencia (red)
- Inter font family, 6 weights
- UI strings in Spanish (es-VE); code and comments in English

---

## Roadmap

1. **Push** — credentials for APNs/FCM, notification deep links, realtime on `match_participants`
2. **Canchas** — real `canchas` table, reverse geocoding, cancha photos
3. **Payments** — escrow via local processor
4. **Reputation** — rating breakdown per tag, auto `calificar` banner after match end
5. **Quality** — jest + testing-library, accessibility, i18n
6. **Release** — EAS Build profiles, Apple Developer / Play Console, icons, public privacy policy
7. **Backlog** — leaderboards, recurring matches, chat reactions, referrals, map view in buscar

---

## Dev Notes

- `typedRoutes: false` in `app.json` — allows string interpolation in route paths
- Never `npm install` native modules directly; use `npx expo install <pkg>`
- All screens must use `useColors()` + `makeStyles(c)` — never the static `colors` import
- Chat is gated by `fetchSharedMatchId`: only players who shared a match can message
- Supabase migrations use unique version prefixes (letter suffixes are tracked as separate versions)
