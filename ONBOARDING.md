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

## ✅ Implementado en sesión 2026-05-25

### Bug fixes implementados:
- **#1 Mensajes duplicados** → `hooks/useChat.ts`: reemplaza optimista con mensaje real del Realtime cuando authorId === userId
- **#3 Ver mapa de ubicación** → `app/match/[id].tsx`: botón "Ver mapa" abre Modal con MapView + Marker
- **#5 "Enviar mensaje" desde perfil** → `lib/chatApi.ts` `fetchSharedMatchId()` + `app/perfil/[id].tsx` async handler
- **#6/#16 Método de pago al unirse** → `joinMatch(matchId, userId, paymentMethod?)` + `useJoinMatch` acepta `{matchId, paymentMethod}` + SuccessStep recibe selectedPayment
- **#7 Emojis hardcodeados en buscar** → SPORT_EMOJI record + matchTypeMeta[type].emoji dinámico

### Features implementadas:
- **#8 Borrar mensajes** → long-press burbuja propia → Alert → `deleteMessage()` API + Realtime DELETE subscription + RLS policy en migración
- **#10 Fix chats display** → `fetchMyThreads` ahora incluye organizer en participants list
- **#11 Iniciar partida** → `startMatch()` API + `useStartMatch` hook + botón "Iniciar" en mis-partidas/creadas
- **#12 Salirse de partida** → botón "Salirme" en footer de match/[id].tsx para joined players
- **#13 Unirse fuera de posición** → check en step 1 de unirse/[id].tsx, Alert.alert con "Continuar de todas formas"
- **#14 Ocultar partidas llenas** → `fetchMatches` filtra `missing_count > 0` por defecto (bypass con `includeFull: true`)
- **#15 Notificar organizador** → `joinMatch` inserta en `notifications` tabla post-join
- **#17 Finalizar partida** → `endMatch()` API + `useEndMatch` hook + botón "Finalizar" con ConfirmSheet (countdown 10s) en mis-partidas
- **#18 ConfirmSheet** → `components/ui/ConfirmSheet.tsx` con `title`, `description`, `confirmLabel`, `confirmColor`, `countdown?`, `icon?`; usado en editar y mis-partidas

### Pendiente (sin implementar):
- **#2 Chat foto propia** → código ya correcto (`isMe = authorId === myId`), posiblemente falso positivo
- **#4 Requirements no muestran** → mapper ya correcto (`(row.requirements as string[]) ?? []`), verificar datos en DB
- **#9 Enviar fotos en chat** → requiere expo-image-picker + Supabase Storage bucket `chat-media/`

### Archivos nuevos/modificados:
```
components/ui/ConfirmSheet.tsx          ← nuevo: sheet de confirmación con countdown
supabase/migrations/20260528_match_lifecycle.sql ← started_at, ended_at, notifications table, delete RLS
types/domain.ts                         ← Match.startedAt?, Match.endedAt?
lib/matchesApi.ts                       ← joinMatch+paymentMethod, includeFull filter, startMatch, endMatch, notifications
lib/chatApi.ts                          ← fetchSharedMatchId, deleteMessage, fetchMyThreads con organizer
hooks/useMatches.ts                     ← useJoinMatch({matchId,paymentMethod}), useStartMatch, useEndMatch
hooks/useChat.ts                        ← dup-fix, DELETE realtime, useDeleteMessage
app/match/[id].tsx                      ← leave button, map modal, En curso badge
app/(tabs)/mis-partidas.tsx             ← start/end strips, ConfirmSheet
app/(tabs)/buscar.tsx                   ← dynamic emojis
app/unirse/[id].tsx                     ← payment to SuccessStep, out-of-position check
app/perfil/[id].tsx                     ← fetchSharedMatchId for Enviar mensaje
app/editar/[id].tsx                     ← ConfirmSheet para cancel/delete
app/chat/[id].tsx                       ← long-press delete, useDeleteMessage
```

## Bugs pendientes (sesión 3)

### ~~B1. Requerimientos custom no aparecen al crear partida~~ ✅ RESUELTO

### ~~B2. No se puede seleccionar método de pago al unirse~~ ✅ RESUELTO

### ~~B3. Al finalizar partida no se mueve a "Partidas pasadas"~~ ✅ RESUELTO

### B4. Al finalizar partida no se puede calificar a los usuarios
**Síntoma**: Después de `endMatch()`, no hay flujo que lleve al organizador/participantes a calificar.
**Fix**: En `mis-partidas.tsx`, cuando `m.endedAt IS NOT NULL`:
- En tab Creadas: mostrar strip "Calificar jugadores" (igual al de pasadas) debajo de la tarjeta.
- En tab Pasadas: el strip de calificar ya existe pero solo aparece si hay `joinedPlayers` con IDs distintos al userId. Verificar que se muestra post-finalización.
- Post-`endMatch`, navegar directamente al flow de calificación: `router.push('/calificar/${firstPlayer.id}?matchId=${m.id}')`.

### B5. Iconos de perfil en chat se superponen al título
**Síntoma**: En `(tabs)/chats.tsx`, el stack de avatares de participantes se superpone al texto del título de la partida.
**Fix**: En `ChatRow`, el `avatarsWrap` tiene `width: 52` fijo. Cuando hay 3 avatares con `marginLeft: -10` se sale del contenedor. Opciones:
- Aumentar `width` de `avatarsWrap` a 70px.
- Limitar stack a 2 avatares en la lista de chats.
- Usar `overflow: 'hidden'` en el wrap con `width: 64`.

### B6. Iniciar partida sin confirmation modal
**Síntoma**: El botón "Iniciar partida" en mis-partidas ejecuta `startMatch()` directamente sin confirmación.
**Fix**: Envolver en `ConfirmSheet` igual que "Finalizar". Título: "Iniciar partida", descripción: "¿Confirmas que la partida comenzó? Los jugadores serán notificados.", sin countdown.

### B7. Partida tarda en actualizarse después de iniciar/finalizar
**Síntoma**: Después de `startMatch()` o `endMatch()`, la UI tarda en reflejar el cambio (requiere pull-to-refresh o navegar fuera y volver).
**Fix**: En `useStartMatch` / `useEndMatch` `onSuccess`, además de invalidar queries, hacer `refetchQueries` inmediato o usar `setQueryData` para actualizar el caché optimistamente:
```ts
queryClient.setQueryData(matchKeys.mine(userId), (old) => {
  // update startedAt/endedAt on the matching item
});
```
También agregar `refetchOnWindowFocus: true` en `useMyMatches`.

### B8. No se puede borrar chat completo (solo mensajes individuales)
**Síntoma**: Solo existe long-press para borrar mensajes individuales. No hay opción para eliminar el thread completo.
**Fix**: 
- En `app/chat/[id].tsx`, agregar botón en header (ícono de trash o ⋮ menu) visible solo para el organizador.
- Al tocar: `ConfirmSheet` con título "Eliminar chat", descripción "Se borrarán todos los mensajes. Esta acción no se puede deshacer."
- API: `deleteChatThread(threadId)` en `chatApi.ts` → `DELETE FROM chat_threads WHERE id=? AND ...` (cascade elimina mensajes por FK).
- Migración: política RLS delete en `chat_threads` para organizer: `exists(select 1 from matches m where m.id=match_id and m.organizer_id=auth.uid())`.

---

## Features pendientes (sesión 3+)

### F1. Dos tipos de chat: Grupal de partida + Directo (User-to-User)
**Diseño actual**: Solo existe chat grupal por partida (`chat_threads.match_id`). No hay DMs.
**Diseño propuesto**:
- `chat_threads` pasa a tener `kind text NOT NULL DEFAULT 'match'` ('match' | 'direct').
- Para DMs: `chat_threads` con `kind='direct'`, `match_id=NULL`, y nueva tabla `direct_thread_members(thread_id, profile_id)` o dos columnas `user_a_id`, `user_b_id`.
- Routing: chats grupales `/chat/match/${matchId}`, DMs `/chat/dm/${threadId}` o unificar con `/chat/${threadId}` donde el thread sabe su tipo.
- "Enviar mensaje" en `perfil/[id].tsx`: si no hay partida compartida → crear/reutilizar DM thread → navegar al chat.
- `fetchMyThreads` devuelve ambos tipos; `chats.tsx` los muestra en la misma lista con indicador de tipo.
**Migración**: ALTER `chat_threads` ADD `kind`, ADD `user_a_id`/`user_b_id`; CREATE INDEX; actualizar policies RLS.
**Archivos**: `chatApi.ts`, `hooks/useChat.ts`, `app/chat/[id].tsx`, `app/(tabs)/chats.tsx`, `app/perfil/[id].tsx`, nueva migración.

### F2. Asistencia y verificación de requerimientos al iniciar partida
**Cuándo**: Una vez `started_at IS NOT NULL` para el organizador en `mis-partidas.tsx` creadas tab.
**Flujo**: Modal/Sheet que lista cada participante inscrito con checkboxes:
- ✅ Asistió
- ✅ Llevó equipamiento / cumplió requisitos del match
**DB**: Nueva tabla `match_attendance(match_id, profile_id, attended bool, requirements_met bool, note text)` o columnas en `match_participants` (`attended`, `requirements_met`).
**Migración**: `ALTER TABLE match_participants ADD attended boolean, ADD requirements_met boolean`.
**UI**: En match detail o mis-partidas, cuando `startedAt` → botón "Tomar asistencia" → Sheet con lista de jugadores + toggles.

### F3. Rating completo post-partida con flujo integrado
**Síntoma actual**: `calificar/[id].tsx` existe pero no se accede automáticamente post-finalización, y solo califica a un jugador a la vez.
**Mejoras**:
1. Post-`endMatch()`: automáticamente navegar a calificar a cada participante en secuencia (wizard multi-player).
2. El organizador califica a todos los participantes; cada participante califica al organizador y a los demás.
3. Pantalla `calificar` mejorada: estrellas + tags + comentario + checkbox "¿Asistió?" integrado.
4. Una vez calificado todos, navegar a pantalla de resumen "Partida finalizada" o volver a mis-partidas.
**Archivos**: `app/calificar/[id].tsx`, `app/(tabs)/mis-partidas.tsx` (trigger post-end), `lib/ratingsApi.ts`.

### F4. Info de participantes para el organizador (pago + posición)
**Síntoma**: El organizador no puede ver qué método de pago seleccionó cada jugador al unirse, ni sus posiciones.
**Fix**: En `match/[id].tsx`, la sección "Jugadores confirmados" debe mostrar al tocar el avatar o en un Sheet de detalle:
- Nombre + avatar (ya existe)
- Posición declarada en su perfil (de `profiles.positions`)
- Método de pago con el que se inscribió (`match_participants.payment_method`)
**API**: En `fetchJoinedPlayersByMatchIds`, incluir `payment_method` del join: `select player:profiles!profile_id(...), payment_method`.
**Mapper**: Extender `Player` con `joinPaymentMethod?: PaymentMethod` o manejar en la vista directamente.

### F5. Cooldown correcto en cancel/delete match
**Estado actual**: `ConfirmSheet` en `editar/[id].tsx` usa `countdown={match.joinedPlayers.length > 0 ? 5 : undefined}` para cancel y ninguno para delete.
**Fix**: 
- Cancelar: countdown 5s si hay ≥1 jugador inscrito. ✅ ya implementado.
- Eliminar: countdown 10s siempre (destructivo permanente).
- Actualizar `editar/[id].tsx`: `<ConfirmSheet ... countdown={10} ...>` para el sheet de eliminar.

### F6. Enviar fotos/imágenes en chat
Upload imagen a Supabase Storage bucket `chat-media/`. Guardar URL en `chat_messages.body` con prefijo `img:https://...` o agregar columna `media_url text` a `chat_messages`. En UI: botón de clip junto al composer → `expo-image-picker` → upload → send. Render: si `body` empieza con `img:` mostrar `<Image>` en lugar de texto.

### F7. Sistema de notificaciones completo
**Tabla `notifications` ya existe** (creada en migración `20260528_match_lifecycle.sql`) con `profile_id, kind, payload, read, created_at`.

**Tipos de notificación a implementar** (campo `kind`):

| kind | Quién recibe | Cuándo |
|------|-------------|--------|
| `match_created` | organizador | confirmación al crear |
| `match_cancelled` | todos los participantes | al cancelar |
| `match_deleted` | todos los participantes | al eliminar |
| `player_joined` | organizador | cuando un jugador se une ✅ parcial |
| `player_left` | organizador | cuando un jugador se va |
| `match_starting_soon` | todos (organizer+joined) | 5 min antes de `starts_at` (cron) |
| `match_started` | todos | cuando organizer hace startMatch |
| `match_ended` | todos | cuando organizer hace endMatch |
| `match_full` | organizador | cuando `missing_count === 0` |
| `rating_received` | ratee | cuando alguien lo califica |
| `review_received` | ratee | cuando dejan reseña con comentario |
| `chat_message` | todos excepto sender | nuevo mensaje en chat grupal o DM |
| `join_request` | organizador | cuando jugador solicita unirse (ver F8) |
| `join_approved` | solicitante | organizador aprueba solicitud |
| `join_rejected` | solicitante | organizador rechaza solicitud |

**Notificaciones temporales** (`match_starting_soon`): requieren Supabase Edge Function con `pg_cron` o cron job externo que corra cada minuto y ejecute:
```sql
INSERT INTO notifications(profile_id, kind, payload)
SELECT mp.profile_id, 'match_starting_soon', jsonb_build_object('matchId', m.id, 'startsAt', m.starts_at)
FROM matches m
JOIN match_participants mp ON mp.match_id = m.id
WHERE m.starts_at BETWEEN now() AND now() + interval '5 minutes'
  AND m.started_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM notifications n WHERE n.kind='match_starting_soon' AND n.payload->>'matchId'=m.id::text AND n.profile_id=mp.profile_id);
```

**UI en `app/notificaciones.tsx`**: Actualmente es pantalla mock. Reemplazar con:
- `useQuery` que llama `fetchNotifications()` → `SELECT * FROM notifications WHERE profile_id=auth.uid() ORDER BY created_at DESC`.
- Cards por tipo con íconos, título, descripción, timestamp relativo.
- Para `player_joined`: mostrar avatar del jugador + botón "Ver perfil".
- Para `join_request` (feature F8): botones "Aceptar" / "Rechazar" inline.
- Marcar como leídas: `UPDATE notifications SET read=true WHERE profile_id=auth.uid()`.
- Badge en tab icon cuando hay `read=false`.

**Archivos a crear/modificar**: `lib/notificationsApi.ts`, `hooks/useNotifications.ts`, `app/notificaciones.tsx`, `app/(tabs)/_layout.tsx` (badge), triggers en `matchesApi.ts` / `ratingsApi.ts`.

### F8. Sistema de aprobación de solicitudes de ingreso
**Diseño**: En lugar de `joinMatch` insertar directamente con `status='joined'`, cambiar a flujo de solicitud:
- `joinMatch` inserta `match_participants` con `status='pending'`.
- Organizador recibe notificación `join_request` con botones Aceptar/Rechazar.
- Aceptar: `UPDATE match_participants SET status='joined'` → notificación `join_approved` al solicitante.
- Rechazar: `UPDATE match_participants SET status='rejected'` → notificación `join_rejected`.
- `missing_count` trigger ya maneja solo `status='joined'`, no cuenta pendientes.
**UI organizador**: En `app/notificaciones.tsx` o en `app/match/[id].tsx` sección "Solicitudes pendientes".
**UI solicitante**: En `unirse/[id].tsx` SuccessStep cambiar mensaje a "Solicitud enviada, esperando aprobación".
**Nuevo estado en footer**: En `match/[id].tsx`, si `status='pending'` mostrar badge "Solicitud pendiente" en lugar de "Ya estás unido".
**Migración**: `match_participants.status` ya acepta más valores — agregar 'pending' y 'rejected' al check constraint.

### F9. Imagen compartible para partidas y perfiles (Share Card)
**Síntoma actual**: El botón `ShareNetwork` en `match/[id].tsx` llama `Share.share({ message: '...' })` — solo texto plano. En `perfil/[id].tsx` no hay botón compartir.
**Objetivo**: Al tocar compartir, generar una imagen PNG estilizada con los datos clave y compartirla vía el sheet nativo (WhatsApp, Instagram Stories, etc.).

**Librería**: `react-native-view-shot` — captura cualquier `<View>` como imagen PNG/JPG.
```bash
npx expo install react-native-view-shot
```

**Componentes a crear**:

1. `components/share/MatchShareCard.tsx` — tarjeta visual de partida:
   - Fondo oscuro con gradiente (`expo-linear-gradient` ya instalado)
   - Logo "La Cancha" arriba
   - Emoji deporte grande + modality + type badge
   - Fecha/hora · Ubicación · Precio
   - "Faltan X jugadores" + posiciones
   - Avatar del organizador + nombre
   - URL corta al fondo: `lacancha.app/match/${id}`
   - Tamaño fijo: 1080×1080 (Instagram square) o 1080×1920 crop para Stories

2. `components/share/PlayerShareCard.tsx` — tarjeta visual de perfil:
   - Avatar grande + nombre + @username
   - Stars de reputación + nivel
   - Emojis de deportes favoritos
   - Stats: partidas, organizadas, asistencia%
   - Posiciones como chips
   - "La Cancha" branding

**Flujo**:
```ts
// En match/[id].tsx y perfil/[id].tsx:
import ViewShot from 'react-native-view-shot';
const cardRef = useRef<ViewShot>(null);

const handleShare = async () => {
  // 1. Mostrar modal con la tarjeta renderizada (oculto, solo para captura)
  // 2. Capturar: const uri = await cardRef.current.capture();
  // 3. Compartir: await Share.share({ url: uri }) o usar expo-sharing
  // 4. Limpiar
};
```

**Modal de previsualización**: Antes de compartir, mostrar un `Modal` con la card renderizada + botones:
- "Compartir imagen" → captura + Share API
- "Copiar link" → Clipboard con URL
- "Cancelar"

**Dependencias adicionales**:
- `expo-sharing` (para compartir archivos locales en Android): `npx expo install expo-sharing`
- `expo-file-system` (guardar tmp file): ya disponible en managed workflow

**Archivos a crear/modificar**:
```
components/share/MatchShareCard.tsx    ← card visual de partida (View sin scroll, tamaño fijo)
components/share/PlayerShareCard.tsx   ← card visual de perfil
app/match/[id].tsx                     ← handleShare usa ViewShot, modal de previsualización
app/perfil/[id].tsx                    ← agregar botón compartir + mismo flujo
```

**Notas técnicas**:
- `ViewShot` debe envolver solo el card, no la pantalla completa.
- Renderizar el card con `position: 'absolute', left: -9999` para capturarlo sin mostrarlo, o mostrarlo en un Modal primero.
- En iOS `Share.share({ url: uri })` funciona directo. En Android usar `expo-sharing` → `Sharing.shareAsync(uri)`.
- El card usa colores del `darkPalette` siempre (independiente del tema del device) porque las imágenes compartidas deben verse igual para todos.

---

## Schema actualizado (sesión 2)
- `matches`: + `started_at timestamptz`, + `ended_at timestamptz`
- `notifications`: tabla nueva (`id`, `profile_id`, `kind`, `payload jsonb`, `read bool`, `created_at`)
- `chat_messages`: política RLS delete para `author_id = auth.uid()` (migración 20260528)

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
