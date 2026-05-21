# La Cancha 🏟️

> *Arma tu partida en segundos*

Mobile-first sports matchmaking app for Venezuela. Find pickup games, create matches, and connect with players near you.

---

## What it does

- **Buscar** — find nearby matches filtered by sport, type (chill / seria / torneo), skill level, and distance
- **Crear** — 5-step wizard: sport → modality → type/level/positions → location/date/price → payments/requirements
- **Unirse** — join flow with payment method selection and requirements confirmation
- **Chat** — messaging with organizers and teammates
- **Calificar** — post-match player ratings (stars, tags, comment)

Sports: **fútbol** (5/7/11), **basket** (3v3/5v5), **tenis**, **pádel**, **beach tennis**

Venezuelan context: USD/Bolívar pricing with BCV rate, Pago Móvil, Zelle, USDT (Binance).

---

## Status

**Frontend-complete MVP.** All screens built, dark/light mode fully implemented, local state wired via Zustand. No backend yet — all data is mocked.

**Next step:** Supabase backend (auth, CRUD, realtime chat). See `CLAUDE.md §11`.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Expo SDK 54 (managed workflow) |
| Language | TypeScript 5.9 strict |
| Navigation | expo-router 6 (file-based) |
| State | Zustand 5 |
| UI | React Native + react-native-reanimated 4 |
| Icons | phosphor-react-native 3 |
| Maps | react-native-maps |
| Fonts | @expo-google-fonts/inter |

---

## Getting Started

```bash
npm install
npx expo start
```

Scan QR with Expo Go (iOS/Android) or press `i` / `a` for simulators.

**Requirements:** Node 18+, Expo Go on device or Xcode/Android Studio for simulators.

---

## Project Structure

```
app/          # All screens (expo-router file-based routing)
components/   # UI primitives + feature composites
features/     # Match-domain components (MatchCard, PositionPitch, etc.)
store/        # Zustand stores (session, draftMatch, theme, matchOverrides, joinedMatches)
lib/          # Pure helpers (format, exchange, time)
data/         # Mock data (matches, players, chats, canchas)
types/        # TypeScript domain types
theme/        # Design tokens (palettes, spacing, radius, typography)
```

Full architecture docs: [`CLAUDE.md`](./CLAUDE.md)

---

## Screens

| Screen | Route |
|---|---|
| Home | `/(tabs)` |
| Search | `/(tabs)/buscar` |
| My matches | `/(tabs)/mis-partidas` |
| Chats | `/(tabs)/chats` |
| Own profile | `/(tabs)/perfil` |
| Match detail | `/match/[id]` |
| Join flow | `/unirse/[id]` |
| Create wizard | `/crear` |
| Edit match | `/editar/[id]` |
| Rate player | `/calificar/[id]` |
| Player profile | `/perfil/[id]` |
| Edit profile | `/perfil/editar` |
| Chat thread | `/chat/[id]` |
| Settings | `/ajustes` |
| Change email | `/cuenta/correo` |
| Change password | `/cuenta/contrasena` |

---

## Design

- **Dark-first** with full light mode support (toggle in Ajustes)
- Neon green accent `#7BFF00` (dark) / `#1A7A00` (light)
- All colors reactive via `useColors()` → `makeStyles(c: ColorPalette)` pattern
- Match type colors: chill (green), seria (amber), torneo (red)
- MatchCard: type-tinted background + colored border + sport emoji watermark
- Inter font family, 6 weights

---

## Roadmap

1. **Phase A** — Supabase backend (auth, CRUD, storage, realtime)
2. **Phase B** — Push notifications (`expo-notifications`)
3. **Phase C** — Real location (`expo-location`, haversine distance)
4. **Phase D** — Payments (Pago Móvil API / Stripe Connect)
5. **Phase E** — Reputation system + match recommendations
6. **Phase F** — Tests, accessibility, i18n
7. **Phase G** — EAS Build + App Store / Play Store

---

## Dev Notes

- `typedRoutes: false` in `app.json` — allows string interpolation in route paths
- Mock user auto-signed in for dev (`store/session.ts` → `isAuthed: true`)
- BCV rate is a hardcoded constant in `lib/exchange.ts` (`BCV_RATE = 36.72`)
- All screens must use `useColors()` + `makeStyles(c)` — never the static `colors` import
- `mockMatches[5]` (`m_6`) is organized by `mockCurrentUser` — needed for Creadas tab + invite sheet
