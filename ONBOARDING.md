# La Cancha — Estado actual + bugs pendientes

## Stack
Expo SDK 54, React Native 0.81.5, TypeScript strict, expo-router 6 (`typedRoutes:false`), Zustand 5, React Query v5 (`@tanstack/react-query`), Supabase (Auth + Postgres + Realtime + Storage).

## Lo que ya está en DB (completamente)
- Auth: login/register/onboarding → `profiles` table
- Matches CRUD: crear, listar, buscar, detalle, editar, eliminar → `matches` + `match_participants` tables
- Join match → `match_participants` (status='joined'), trigger `sync_missing_count` actualiza `missing_count`
- Perfiles reales → `profiles` table con `useProfile(id)` hook
- Ratings → `ratings` table con trigger `sync_reputation`
- Chat real + Realtime → `chat_threads` + `chat_messages`, Supabase Realtime subscription
- Avatar upload → Supabase Storage (`avatars/` bucket)

## Schema real (importante)
- `matches`: columnas `lat`, `lng` (NO `location_lat`/`location_lng`)
- `match_participants`: columnas `match_id`, `profile_id`, `status` ('joined'/'left'/'kicked'), `payment_method`
- NO existe tabla `match_players` (era de una migración vieja, ya se eliminó)
- `chat_threads`: 1:1 con matches, creado automáticamente por trigger `create_chat_thread_for_match` (security definer)
- `ratings`: unique(match_id, rater_id, ratee_id), trigger `sync_reputation` actualiza `profiles.reputation`

## Archivos clave creados/modificados en esta sesión
```
lib/matchesApi.ts          ← fetchMatches, fetchMatch, fetchMyMatches, createMatch, joinMatch, leaveMatch, updateMatch, deleteMatch
lib/profilesApi.ts         ← fetchProfile(id)
lib/ratingsApi.ts          ← submitRating(matchId, raterId, rateeId, stars, tags, comment)
lib/chatApi.ts             ← fetchThreadByMatchId, fetchMessages, sendMessage, fetchMyThreads, fetchThreadParticipants
lib/mappers.ts             ← rowToPlayer(row) compartido

hooks/useMatches.ts        ← useMatches, useMatch, useMyMatches, useJoinMatch, useLeaveMatch, useUpdateMatch, useDeleteMatch
hooks/useProfiles.ts       ← useProfile(id)
hooks/useChat.ts           ← useChat(matchId), useMyThreads()

app/match/[id].tsx         ← datos reales, botón chat para organizer/joined, sin footer join para organizer
app/editar/[id].tsx        ← useMatch + useUpdateMatch + useDeleteMatch
app/unirse/[id].tsx        ← useMatch + useJoinMatch
app/calificar/[id].tsx     ← useProfile + submitRating, recibe ?matchId= param
app/crear/index.tsx        ← createMatch + invalidateQueries post-create
app/crear/confirmacion.tsx ← useMatch(matchId) datos reales
app/chat/[id].tsx          ← useChat(matchId), id=matchId, Realtime msgs
app/(tabs)/chats.tsx       ← useMyThreads(), navega /chat/${thread.matchId}
app/(tabs)/mis-partidas.tsx← useMyMatches(), navega /calificar/${id}?matchId=${m.id}
app/(tabs)/buscar.tsx      ← useMatches() reemplaza mockMatches
app/(tabs)/index.tsx       ← useMatches({limit:3})
app/perfil/[id].tsx        ← useProfile(id) datos reales, sin footer/menu si propio perfil
components/feature/LocationPickerSheet.tsx ← expo-location GPS, sin mock canchas, botón localizarme

supabase/migrations/
  20260526_matches.sql                    ← policies con DROP IF EXISTS
  20260527_grant_matches_to_authenticated.sql
  20260527_fix_permissions_and_schema.sql ← drop match_players, GRANTs todos los tables, chat trigger security definer
  20260527_enable_chat_realtime.sql       ← replica identity full + supabase_realtime publication
```

## Bugs pendientes a resolver (próxima sesión)

### 1. Mensajes duplicados en chat
**Síntoma**: Al enviar un mensaje se ve duplicado. Al salir y entrar se ve normal.
**Causa**: El insert optimista usa ID `opt_${Date.now()}`. El evento Realtime llega con el ID real de la DB. La dedup check `prev.some(m => m.id === row.id)` no atrapa el optimista porque tienen IDs distintos. Hay que comparar por `body + authorId + sentAt` aproximado, o reemplazar el optimista con el mensaje real cuando llega.
**Fix sugerido**: En el callback de Realtime, si el `authorId === userId` (mensaje propio), buscar y reemplazar el optimista más reciente con mismo body en lugar de agregar uno nuevo.

### 2. Chat header muestra foto propia, no del otro participante
**Síntoma**: En la pantalla de chat, el avatar que se muestra en el header o en los mensajes de otros parece ser el propio.
**Fix**: Revisar el `Bubble` component en `chat/[id].tsx` — asegurarse que `isMe = message.authorId === myId` y que el avatar solo se muestra cuando `!isMe`.

### 3. Ver mapa de ubicación de la partida
**Síntoma**: No hay forma de ver en mapa la ubicación antes ni después de unirse.
**Fix**: En `match/[id].tsx`, la fila de ubicación tiene `<Text variant="smallMedium" color="primary">Mapa</Text>` como trailing pero no está conectada a nada. Agregar `onPress` que abra un modal con MapView centrado en `match.location.lat/lng` y un Marker en esa coordenada.

### 4. Requisitos adicionales no se muestran
**Síntoma**: La sección "Sobre la partida" (requirements) no aparece aunque se hayan configurado.
**Causa probable**: `match.requirements` llega como `null` o vacío desde la DB aunque se guardaron. Verificar que `createMatch` en `matchesApi.ts` pasa `requirements: draft.requirements` correctamente y que `rowToMatch` mapea `requirements: (row.requirements as string[]) ?? []`.
**También verificar**: Que los requisitos se graban correctamente (pueden ser strings en array de Postgres `text[]`).

### 5. "Enviar mensaje" desde perfil del organizador falla
**Síntoma**: Al tocar "Enviar mensaje" en `perfil/[id].tsx` dice "no se encontró el chat de esta partida".
**Causa**: `perfil/[id].tsx` navega a `/chat/${player.id}` (player ID), pero `chat/[id].tsx` espera un matchId. No hay thread cuyo ID sea un player ID.
**Fix**: Cambiar el botón "Enviar mensaje" en perfil para:
  a) Buscar una partida compartida entre el usuario actual y ese jugador (matches donde ambos son participantes u organizer), o
  b) Mostrar un sheet con las partidas compartidas para elegir a cuál chat ir, o
  c) Deshabilitar/ocultar el botón si no hay partida compartida.
  Opción recomendada: query `match_participants` para encontrar matchIds donde `profile_id = currentUserId`, cruzar con matches donde `profile_id = viewedPlayerId` o `organizer_id = viewedPlayerId`. Si hay resultados, navegar al chat de la primera partida compartida.

### 6. Método de pago no se guarda al unirse, organizador no notificado
**Síntoma**: `match_participants` tiene columna `payment_method` pero `joinMatch` en `matchesApi.ts` no la pasa.
**Fix parte 1**: En `unirse/[id].tsx` step 4 (SuccessStep), pasar el método de pago seleccionado al `useJoinMatch` mutation. Actualizar `joinMatch(matchId, userId, paymentMethod?)` para incluirlo en el insert.
**Fix parte 2**: Notificación al organizador — insertar en tabla `notifications` (`profile_id=organizer_id, kind='player_joined', payload={matchId, playerName, paymentMethod}`). Esto se puede hacer como trigger en `match_participants` o en el API call.

### 7. Emojis de deporte/nivel no cambian en buscar
**Síntoma**: En `buscar.tsx`, los filter chips de deporte y nivel muestran siempre el emoji de fútbol y "chill" aunque se seleccione otra cosa.
**Fix**: Revisar el `FilterSheet` o los chips en `buscar.tsx`. Los emojis probablemente están hardcodeados en el render de los chips en lugar de derivarse del valor seleccionado. Mapear sport → emoji y type → emoji en base al valor activo.

## Patrones clave del proyecto

```ts
// Siempre en screens:
const c = useColors();
const s = useMemo(() => makeStyles(c), [c]);
function makeStyles(c: ColorPalette) { return StyleSheet.create({...}); }

// React Query mutation con invalidación:
const queryClient = useQueryClient();
void queryClient.invalidateQueries({ queryKey: matchKeys.mine(userId) });

// Joins en PostgREST:
supabase.from('matches').select(`id, organizer:profiles!organizer_id(id, name, avatar_url)`)

// match_participants usa profile_id (NO player_id):
supabase.from('match_participants').insert({ match_id, profile_id, status: 'joined' })

// Chat routing: /chat/[matchId] (no threadId, no playerId)
```

## Variables de entorno
```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...   ← public by design (Supabase anon)
```
Service role key: NUNCA en código. Solo en password manager.
