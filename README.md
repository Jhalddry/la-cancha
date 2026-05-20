# LA CANCHA

> Arma tu partida. O encuentra una en segundos.

App móvil de matchmaking deportivo (fútbol, tenis, pádel, beach tennis, basket).

## Stack

- React Native 0.81 + Expo SDK 54 (new arch)
- Expo Router (file-based, typed routes)
- TypeScript estricto
- Zustand (estado)
- react-native-reanimated 4 + react-native-svg (animaciones)
- phosphor-react-native (iconografía)
- Inter (`@expo-google-fonts/inter`)
- Supabase (pendiente — Phase 2)

## Plataformas

iOS + Android únicamente. Web está fuera del scope.

## Cómo correr

```bash
npm install
npx expo start
```

- `i` → iOS simulator (macOS)
- `a` → Android emulator
- Escanea QR con Expo Go o con un dev build

## Estructura

```
app/                       Rutas (Expo Router)
  _layout.tsx              Root: fonts, SafeArea, GestureHandler, dark theme
  index.tsx                Splash animado (SVG + Reanimated) → redirige a tabs
  (tabs)/
    _layout.tsx            Bottom tabs (5 secciones)
    index.tsx              Inicio
    buscar.tsx             Búsqueda (stub)
    mis-partidas.tsx       Mis Partidas (stub)
    chats.tsx              Chats (stub)
    perfil.tsx             Perfil

theme/                     Tokens (colors, spacing, radius, typography, shadows)
components/
  ui/                      Primitivos reutilizables (Screen, Button, Card, Chip,
                           Badge, Avatar, AvatarStack, Stars, Text, PressableScale)
  brand/                   Crosshair SVG, Logo, SportIcon
features/
  match/                   MatchCard, MatchTypePromoCard, MatchTypeBadge, meta
  player/                  (placeholder)
data/                      Mocks (jugadores, partidas) — reemplazar por Supabase
types/                     Tipos de dominio
lib/                       Utilidades (format, etc.)
store/                     (placeholder — zustand stores)
assets/                    Imágenes, fuentes
```

## Sistema de diseño

Paleta:

| Token        | Hex       | Uso                        |
|--------------|-----------|----------------------------|
| `primary`    | `#7BFF00` | Verde neón — accent principal |
| `bg`         | `#0B0F0C` | Fondo                      |
| `surface`    | `#12161C` | Cards / superficies        |
| `border`     | `#1F2630` | Bordes                     |
| `accent`     | `#FFB800` | Tipo "Seria"               |
| `alert`      | `#FF3B30` | Tipo "Competencia" / alertas |

Tipos de partida:

- 😎 **Chill** — verde
- 👕 **Seria** — amarillo
- 🏆 **Competencia** — rojo

Radios: `12px` botones, `16px` cards.
Spacing: escala 4pt (`xxs`–`giant`).

## Pendiente (siguientes fases)

- Auth (Supabase)
- Crear partida (wizard 8 pasos)
- Búsqueda con filtros
- Detalle de partida + Unirse
- Chats por partida
- Mapa, reputación, historial
- Reemplazar mocks en `data/` por queries a Supabase
- Logo / iconos definitivos en `assets/images/`
