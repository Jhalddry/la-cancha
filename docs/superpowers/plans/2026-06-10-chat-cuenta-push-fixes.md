# Chat + Cuenta + Push Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all reported bugs: chat unread badge showing at 0, stale message timestamps, missing read receipts and per-thread unread counts, fake email/password change screens, and push notifications never firing.

**Architecture:** Client fixes in `hooks/useChat.ts` + `lib/chatApi.ts` + screens; one SQL migration (DB trigger to bump `chat_threads.updated_at`); real `supabase.auth.updateUser` calls for email/password; push requires an EAS development build because Expo Go dropped remote push in SDK 53.

**Tech Stack:** Expo SDK 54, React Query 5, Supabase (postgres + auth + realtime), expo-notifications.

**Note:** Project has no test runner. Verification = `npx tsc --noEmit` + manual steps described per task. Do not add jest as part of this plan.

---

### Task 1: Fix unread badge showing when there are 0 unread chats

**Root cause:** `fetchMyThreads` (lib/chatApi.ts:496) sets `lastMessageAt: lastMsg?.sentAt ?? r.updated_at`. A thread with **no messages** gets `lastMessageAt` = thread `updated_at` and `lastMessageAuthorId` = `undefined`. In `useUnreadChatCount` (hooks/useChat.ts:208), `isUnread` only returns false when `lastAuthorId === userId` — `undefined !== userId`, so empty threads count as unread forever.

**Files:**
- Modify: `hooks/useChat.ts:208-213`

- [ ] **Step 1: Guard against threads with no real message**

In `hooks/useChat.ts`, replace the `isUnread` function inside `useUnreadChatCount`:

```ts
  const isUnread = (lastMessageAt?: string, lastReadAt?: string, lastAuthorId?: string): boolean => {
    if (!lastMessageAt) return false;
    if (!lastAuthorId) return false; // empty thread — lastMessageAt is just the thread's updated_at fallback
    if (lastAuthorId === userId) return false; // own message never unread
    if (!lastReadAt) return true; // never read
    return new Date(lastMessageAt) > new Date(lastReadAt);
  };
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual verify**

Create a match (thread auto-created, no messages). Tab badge must NOT appear. Have another account send a message → badge appears. Open chat → badge clears.

- [ ] **Step 4: Commit**

```bash
git add hooks/useChat.ts
git commit -m "fix: empty chat threads no longer count as unread (badge showed with 0 pending)"
```

---

### Task 2: Message timestamp in chat list updates correctly

**Root causes (3):**
1. `useChat.send()` (match chat) never invalidates `['chat-threads']` — list shows stale `lastMessageAt` until 15s staleTime expires + remount. (`usePrivateChat.send` already invalidates its key.)
2. `sendMessage` doesn't bump `chat_threads.updated_at` → list ordering is stale (newest-activity thread doesn't rise to top).
3. `relativeTime()` is computed once per render — sitting on the chats tab, "hace 1 min" never advances.

**Files:**
- Modify: `hooks/useChat.ts:178-184` (send function)
- Modify: `hooks/useChat.ts:27-33` (useMyThreads), `hooks/useChat.ts:191-199` (useMyPrivateThreads)
- Create: `supabase/migrations/20260610_bump_thread_updated_at.sql`

- [ ] **Step 1: Invalidate thread list after sending a match-chat message**

In `hooks/useChat.ts`, in `useChat`'s `send`:

```ts
    try {
      await sendMessage(threadId, userId, trimmed);
      void queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
    } catch {
      // Roll back optimistic message
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
    }
```

(`queryClient` is already imported at the top of the file from `@/lib/queryClient`.)

- [ ] **Step 2: Periodic refetch so relative times advance**

In `useMyThreads` and `useMyPrivateThreads`, add `refetchInterval`:

```ts
export function useMyThreads() {
  return useQuery({
    queryKey: ['chat-threads'],
    queryFn: fetchMyThreads,
    staleTime: 15_000,
    refetchInterval: 60_000,
  });
}
```

```ts
export function useMyPrivateThreads() {
  const userId = useSession((s) => s.user?.id);
  return useQuery({
    queryKey: ['private-threads', userId ?? ''],
    queryFn: () => fetchMyPrivateThreads(userId!),
    enabled: !!userId,
    staleTime: 15_000,
    refetchInterval: 60_000,
  });
}
```

The refetch produces a re-render, so `relativeTime(...)` recomputes — no extra ticking state needed.

- [ ] **Step 3: DB trigger — bump thread updated_at on new message**

Create `supabase/migrations/20260610_bump_thread_updated_at.sql`:

```sql
-- Keep chat_threads.updated_at in sync with latest message so the
-- chats list (ordered by updated_at desc) puts active threads on top.
create or replace function public.bump_chat_thread_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.chat_threads
  set updated_at = new.sent_at
  where id = new.thread_id;
  return new;
end;
$$;

drop trigger if exists trg_bump_chat_thread_updated_at on public.chat_messages;
create trigger trg_bump_chat_thread_updated_at
after insert on public.chat_messages
for each row execute function public.bump_chat_thread_updated_at();
```

- [ ] **Step 4: Apply migration**

Run: `npx supabase db push`
Expected: migration applied without error. (If the project uses the dashboard SQL editor instead, paste the SQL there and note it in the commit message.)

- [ ] **Step 5: Typecheck + manual verify**

Run: `npx tsc --noEmit` → no errors.
Manual: send a message in a match chat → go back to Chats tab → row shows new last message + "ahora", thread jumps to top.

- [ ] **Step 6: Commit**

```bash
git add hooks/useChat.ts supabase/migrations/20260610_bump_thread_updated_at.sql
git commit -m "fix: chat list timestamps — invalidate on send, 60s refetch, DB trigger bumps thread updated_at"
```

---

### Task 3: Per-thread unread message count (number badge per chat row)

**Design:** `fetchMyThreads` / `fetchMyPrivateThreads` already fetch ALL messages for the listed threads (to derive last message). Count, per thread, messages with `sent_at > lastReadAt` and `author_id !== me`. Expose as `unreadCount` on the thread types. Show a count pill on each row. Make the tab badge the SUM of message counts (was: count of unread threads).

**Files:**
- Modify: `lib/chatApi.ts` (types + both fetchers)
- Modify: `hooks/useChat.ts` (useUnreadChatCount)
- Modify: `app/(tabs)/chats.tsx` (rows)

- [ ] **Step 1: Add `unreadCount` to both thread types in `lib/chatApi.ts`**

```ts
export interface ChatThreadData {
  id: string;
  matchId: string;
  sport: string;
  modality: string;
  locationName: string;
  participants: ChatParticipant[];
  lastMessage?: string;
  lastMessageAt?: string;
  lastMessageAuthorId?: string;
  lastReadAt?: string;
  unreadCount: number;
}
```

```ts
export interface PrivateThreadData {
  id: string;
  otherUser: ChatParticipant;
  lastMessage?: string;
  lastMessageAt?: string;
  lastMessageAuthorId?: string;
  lastReadAt?: string;
  unreadCount: number;
}
```

- [ ] **Step 2: Compute unreadCount in `fetchMyThreads`**

In `lib/chatApi.ts`, after the `lastMsgByThread` loop, add a count map (reuses `allMsgs`, `readsMap`, `currentUserId` already in scope):

```ts
  const unreadByThread = new Map<string, number>();
  for (const msg of allMsgs ?? []) {
    const m = msg as unknown as { thread_id: string; sent_at: string; author_id: string };
    if (m.author_id === currentUserId) continue;
    const readAt = readsMap.get(m.thread_id);
    if (!readAt || new Date(m.sent_at) > new Date(readAt)) {
      unreadByThread.set(m.thread_id, (unreadByThread.get(m.thread_id) ?? 0) + 1);
    }
  }
```

And in the returned mapping add:

```ts
      unreadCount: unreadByThread.get(r.id) ?? 0,
```

- [ ] **Step 3: Compute unreadCount in `fetchMyPrivateThreads`**

Same pattern after its `lastMsgMap` loop (uses its own `allMsgs`, `readsMap`, `currentUserId`):

```ts
  const unreadByThread = new Map<string, number>();
  for (const msg of allMsgs ?? []) {
    const m = msg as { thread_id: string; sent_at: string; author_id: string };
    if (m.author_id === currentUserId) continue;
    const readAt = readsMap.get(m.thread_id);
    if (!readAt || new Date(m.sent_at) > new Date(readAt)) {
      unreadByThread.set(m.thread_id, (unreadByThread.get(m.thread_id) ?? 0) + 1);
    }
  }
```

And in its returned mapping add:

```ts
      unreadCount: unreadByThread.get(r.id) ?? 0,
```

- [ ] **Step 4: Tab badge = total unread messages**

Replace the body of `useUnreadChatCount` in `hooks/useChat.ts`:

```ts
export function useUnreadChatCount(): number {
  const userId = useSession((s) => s.user?.id);
  const { data: threads } = useMyThreads();
  const { data: privateThreads } = useMyPrivateThreads();

  if (!userId) return 0;

  const matchUnread = (threads ?? []).reduce((sum, t) => sum + t.unreadCount, 0);
  const privateUnread = (privateThreads ?? []).reduce((sum, t) => sum + t.unreadCount, 0);
  return matchUnread + privateUnread;
}
```

(The `isUnread` helper from Task 1 disappears — counting is now done in the API layer where empty threads naturally yield 0. Task 1's fix is still worth committing first as the minimal correctness fix; this step supersedes it.)

- [ ] **Step 5: Count pill on chat rows in `app/(tabs)/chats.tsx`**

In `MatchChatRow`, after the `lastTime` text inside `s.titleRow` — wrap time + pill in the existing row. Replace the `titleRow` block with:

```tsx
        <View style={s.titleRow}>
          <Text variant="bodySemibold" color="textPrimary" numberOfLines={1} style={{ flex: 1 }}>
            {title}
          </Text>
          {lastTime ? <Text variant="caption" color="textTertiary">{lastTime}</Text> : null}
          {thread.unreadCount > 0 ? (
            <View style={s.unreadPill}>
              <Text variant="caption" style={{ color: c.textOnPrimary }}>
                {thread.unreadCount > 99 ? '99+' : thread.unreadCount}
              </Text>
            </View>
          ) : null}
        </View>
```

Same change in `PrivateChatRow` (its `titleRow` uses `thread.otherUser.name` as title).

Add to `makeStyles`:

```ts
    unreadPill: {
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      paddingHorizontal: 5,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
```

- [ ] **Step 6: Typecheck + manual verify**

Run: `npx tsc --noEmit` → no errors.
Manual: other account sends 3 messages → row shows pill "3", tab badge "3". Open chat, go back → pill gone, badge gone.

- [ ] **Step 7: Commit**

```bash
git add lib/chatApi.ts hooks/useChat.ts "app/(tabs)/chats.tsx"
git commit -m "feat: per-thread unread message count — pill on chat rows, tab badge sums messages"
```

---

### Task 4: Read receipts (✓ / ✓✓) on own messages in match chat

**Design:** `chat_reads` table already stores `last_read_at` per user per thread. In `useChat`, fetch the other participants' `last_read_at` for the thread and subscribe to realtime changes on `chat_reads`. A message of mine is "read" if at least one other participant has `last_read_at >= sentAt`. Render ✓ (sent) / ✓✓ green (read) next to the time on own bubbles.

**Files:**
- Modify: `lib/chatApi.ts` (new fetcher)
- Modify: `hooks/useChat.ts` (useChat)
- Modify: `app/chat/[id].tsx` (Bubble)

- [ ] **Step 1: Add fetcher in `lib/chatApi.ts`** (after `markThreadRead`):

```ts
/** Latest last_read_at among OTHER users in a thread (for read receipts). */
export async function fetchOthersLastReadAt(
  threadType: 'match' | 'private',
  threadId: string,
  myId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from('chat_reads')
    .select('user_id, last_read_at')
    .eq('thread_type', threadType)
    .eq('thread_id', threadId)
    .neq('user_id', myId);

  let latest: string | null = null;
  for (const row of data ?? []) {
    const r = row as { user_id: string; last_read_at: string };
    if (!latest || new Date(r.last_read_at) > new Date(latest)) latest = r.last_read_at;
  }
  return latest;
}
```

- [ ] **Step 2: Track others' read state in `useChat`**

In `hooks/useChat.ts`, import `fetchOthersLastReadAt` from `@/lib/chatApi`. Inside `useChat` add state and an effect:

```ts
  const [othersReadAt, setOthersReadAt] = useState<string | null>(null);
```

```ts
  // Read receipts: others' last_read_at + realtime updates on chat_reads
  useEffect(() => {
    if (!threadId || !userId) return;

    void fetchOthersLastReadAt('match', threadId, userId).then(setOthersReadAt);

    const channel = supabase
      .channel(`chat-reads:${threadId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_reads', filter: `thread_id=eq.${threadId}` },
        (payload) => {
          const row = payload.new as { user_id?: string; last_read_at?: string };
          if (!row?.user_id || row.user_id === userId || !row.last_read_at) return;
          setOthersReadAt((prev) =>
            !prev || new Date(row.last_read_at!) > new Date(prev) ? row.last_read_at! : prev,
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [threadId, userId]);
```

Return it: `return { messages, participants, loading, error, send, threadId, othersReadAt };`

- [ ] **Step 3: Render checkmarks in `app/chat/[id].tsx`**

Destructure: `const { messages, loading, error, send, threadId, othersReadAt } = useChat(matchId);`

Import icons: add `Check, Checks` to the `phosphor-react-native` import.

Pass to Bubble: `<Bubble ... othersReadAt={othersReadAt} />` and extend Bubble props:

```tsx
function Bubble({
  message,
  myId,
  c,
  onDelete,
  onAvatarPress,
  othersReadAt,
}: {
  message: ChatMessageData;
  myId: string;
  c: ColorPalette;
  onDelete?: (id: string) => void;
  onAvatarPress?: (authorId: string) => void;
  othersReadAt?: string | null;
}) {
```

Replace the time `<Text>` block at the bottom of Bubble with:

```tsx
        <View style={[s.timeRow, isMe ? s.timeRight : s.timeLeft]}>
          <Text variant="caption" color="textTertiary" style={s.timeText}>
            {timeOnly(message.sentAt)}
          </Text>
          {isMe && !isOptimistic ? (
            othersReadAt && new Date(othersReadAt) >= new Date(message.sentAt) ? (
              <Checks size={14} color={c.primary} weight="bold" />
            ) : (
              <Check size={14} color={c.textTertiary} weight="regular" />
            )
          ) : null}
        </View>
```

Add styles in `makeStyles`:

```ts
    timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
```

and change `timeRight` / `timeLeft` to flexbox alignment:

```ts
    timeRight: { justifyContent: 'flex-end' },
    timeLeft: { justifyContent: 'flex-start', marginLeft: spacing.sm },
```

(`timeText` keeps only any remaining text styling; remove its `marginTop: 2` since the row now carries it.)

- [ ] **Step 4: Verify realtime is enabled for `chat_reads`**

In Supabase dashboard → Database → Replication (or SQL):

```sql
alter publication supabase_realtime add table public.chat_reads;
```

If it errors with "already member of publication", it's fine. Save this statement in the Task 2 migration file or a new `supabase/migrations/20260610_chat_reads_realtime.sql`.

- [ ] **Step 5: Typecheck + manual verify**

Run: `npx tsc --noEmit` → no errors.
Manual: two accounts in same match chat. A sends → shows single gray ✓. B opens the chat → A's checkmark flips to double green ✓✓ without reload.

- [ ] **Step 6: Commit**

```bash
git add lib/chatApi.ts hooks/useChat.ts "app/chat/[id].tsx" supabase/migrations/
git commit -m "feat: read receipts in match chat — single/double check via chat_reads + realtime"
```

---

### Task 5: Real email change (`app/cuenta/correo.tsx`)

**Root cause:** Screen is a mock — `CURRENT_EMAIL = 'jugador@lacancha.app'` hardcoded, `handleSave` only shows an Alert. Never calls Supabase.

**Files:**
- Modify: `app/cuenta/correo.tsx`

- [ ] **Step 1: Show the real current email**

Remove the `const CURRENT_EMAIL = ...` line. Inside the component:

```ts
import { supabase } from '@/lib/supabase';
// ...
const [currentEmail, setCurrentEmail] = useState<string>('');
const [saving, setSaving] = useState(false);

useEffect(() => {
  void supabase.auth.getUser().then(({ data }) => {
    if (data.user?.email) setCurrentEmail(data.user.email);
  });
}, []);
```

(Add `useEffect` to the react import.) Replace both JSX usages of `CURRENT_EMAIL` with `{currentEmail || '—'}` and the validation comparison with `currentEmail.toLowerCase()`.

- [ ] **Step 2: Call `supabase.auth.updateUser` on save**

```ts
const handleSave = async () => {
  setTried(true);
  if (Object.keys(errors).length > 0) return;
  setSaving(true);
  const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
  setSaving(false);
  if (error) {
    Alert.alert('Error', error.message);
    return;
  }
  setSent(true);
};
```

Wire button: `<Button label={saving ? 'Enviando…' : 'Enviar verificación'} onPress={() => void handleSave()} disabled={saving} />` — keep validate-on-tap behavior (button itself enabled until tapped; only disable while in-flight).

Note: Supabase default config requires confirming on **both** old and new address ("Secure email change"). The existing "Verificación enviada" card copy already matches this flow.

- [ ] **Step 3: Typecheck + manual verify**

Run: `npx tsc --noEmit` → no errors.
Manual: open screen → shows your real email. Submit a new email → verification mail arrives → after confirming, login works with new email.

- [ ] **Step 4: Commit**

```bash
git add app/cuenta/correo.tsx
git commit -m "feat: real email change via supabase.auth.updateUser (was mock)"
```

---

### Task 6: Real password change (`app/cuenta/contrasena.tsx`)

**Root cause:** `handleSave` only does `setSaved(true)`. No auth call, current password never verified.

**Files:**
- Modify: `app/cuenta/contrasena.tsx`

- [ ] **Step 1: Reauthenticate with current password, then update**

```ts
import { supabase } from '@/lib/supabase';
// ...
const [saving, setSaving] = useState(false);
const [authError, setAuthError] = useState<string | null>(null);

const handleSave = async () => {
  setTried(true);
  setAuthError(null);
  if (Object.keys(errors).length > 0) return;

  setSaving(true);
  try {
    const { data } = await supabase.auth.getUser();
    const email = data.user?.email;
    if (!email) {
      setAuthError('No se pudo verificar tu sesión.');
      return;
    }

    // Verify current password by re-signing in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: current,
    });
    if (signInError) {
      setAuthError('La contraseña actual es incorrecta.');
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: next });
    if (updateError) {
      setAuthError(updateError.message);
      return;
    }
    setSaved(true);
  } finally {
    setSaving(false);
  }
};
```

- [ ] **Step 2: Surface the error + wire button**

Pass `error={shown.current ?? authError ?? undefined}` to the CONTRASEÑA ACTUAL `TextInput` (authError shows under that field). Button:

```tsx
<Button label={saving ? 'Guardando…' : 'Guardar contraseña'} onPress={() => void handleSave()} disabled={saving} />
```

- [ ] **Step 3: Typecheck + manual verify**

Run: `npx tsc --noEmit` → no errors.
Manual: wrong current password → inline error "La contraseña actual es incorrecta." Correct current → success card → sign out → old password fails, new password works.

- [ ] **Step 4: Commit**

```bash
git add app/cuenta/contrasena.tsx
git commit -m "feat: real password change — reauth with current password, then auth.updateUser"
```

---

### Task 7: Make push notifications actually fire

**Root cause:** Code path is complete and correct (`registerForPushNotifications` on login, `sendPushToUser` on approve/reject/invite/cancel/rating, deep-link listener in `app/_layout.tsx:90`). But **Expo Go does not support remote push notifications since SDK 53** — `getExpoPushTokenAsync` fails or the token never receives. A development build (dev client) is required. iOS push credentials are auto-managed by EAS.

**Files:**
- No code changes expected; this is build + verification. One possible RLS migration.

- [ ] **Step 1: Confirm RLS lets clients read other users' push_token**

`sendPushToUser` runs on the SENDER's client and selects the RECIPIENT's `profiles.push_token`. Run in Supabase SQL editor:

```sql
select policyname, cmd, qual from pg_policies where tablename = 'profiles';
```

If the SELECT policy is restricted to own row (`auth.uid() = id`), pushes silently never send. Fix (profiles are already public-readable in this app — buscar/perfil screens read them — so this is likely already fine):

```sql
-- Only if missing:
create policy "profiles are readable by authenticated users"
on public.profiles for select to authenticated using (true);
```

- [ ] **Step 2: Build a development client for iOS**

```bash
eas build --platform ios --profile development
```

Expected: build succeeds; EAS prompts to auto-generate push credentials (accept). Install the build on the device (AltStore or QR install link).

- [ ] **Step 3: Start dev server for the dev client, log in, verify token saved**

```bash
npx expo start --dev-client
```

Log in on the device, accept the notification permission prompt. Then:

```sql
select id, name, push_token from profiles where push_token is not null;
```

Expected: your profile row has `ExponentPushToken[...]`.

- [ ] **Step 4: Send a test push from Expo's tool**

Open <https://expo.dev/notifications>, paste the token, send title/body with data `{"navigateTo": "/notificaciones"}`. App backgrounded → notification arrives; tapping it deep-links to the notifications screen.

- [ ] **Step 5: End-to-end verify in-app trigger**

Account B requests to join account A's match → A approves → B's device (with the dev build) receives "¡Solicitud aprobada! ✅".

- [ ] **Step 6: Commit (only if Step 1 produced a migration)**

```bash
git add supabase/migrations/
git commit -m "fix: profiles select policy so clients can read recipient push_token"
```

---

### Task 8: Push notification on new chat message (gap — currently no push for chat)

**Design:** `sendMessage`/`sendPrivateMessage` send no push at all. Add fire-and-forget pushes after a successful insert. Match chat: push to organizer + joined participants except the author. Private: push to the other user.

**Files:**
- Modify: `lib/chatApi.ts` (sendMessage, sendPrivateMessage)

- [ ] **Step 1: Push to match-chat participants in `sendMessage`**

In `lib/chatApi.ts`, import at top: `import { sendPushToUser } from '@/lib/pushNotifications';`

```ts
export async function sendMessage(
  threadId: string,
  authorId: string,
  body: string,
): Promise<void> {
  const { error } = await supabase
    .from('chat_messages')
    .insert({ thread_id: threadId, author_id: authorId, body });
  if (error) throw new Error(error.message);

  // Fire-and-forget push to other participants
  void (async () => {
    try {
      const { data: thread } = await supabase
        .from('chat_threads')
        .select('match_id')
        .eq('id', threadId)
        .maybeSingle();
      const matchId = thread?.match_id as string | undefined;
      if (!matchId) return;

      const [participants, { data: author }] = await Promise.all([
        fetchThreadParticipants(matchId),
        supabase.from('profiles').select('name').eq('id', authorId).maybeSingle(),
      ]);
      const authorName = (author?.name as string | undefined) ?? 'Alguien';
      const preview = body.length > 80 ? `${body.slice(0, 77)}…` : body;

      await Promise.all(
        participants
          .filter((p) => p.id !== authorId)
          .map((p) => sendPushToUser(p.id, `💬 ${authorName}`, preview, `/chat/${matchId}`)),
      );
    } catch {
      // push failures never block sending
    }
  })();
}
```

- [ ] **Step 2: Push to the other user in `sendPrivateMessage`**

```ts
export async function sendPrivateMessage(
  threadId: string,
  authorId: string,
  body: string,
): Promise<void> {
  const { error } = await supabase
    .from('private_messages')
    .insert({ thread_id: threadId, author_id: authorId, body });
  if (error) throw new Error(error.message);

  void supabase
    .from('private_threads')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', threadId);

  // Fire-and-forget push to the other user
  void (async () => {
    try {
      const { data: thread } = await supabase
        .from('private_threads')
        .select('user1_id, user2_id')
        .eq('id', threadId)
        .maybeSingle();
      if (!thread) return;
      const t = thread as { user1_id: string; user2_id: string };
      const otherId = t.user1_id === authorId ? t.user2_id : t.user1_id;

      const { data: author } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', authorId)
        .maybeSingle();
      const authorName = (author?.name as string | undefined) ?? 'Alguien';
      const preview = body.length > 80 ? `${body.slice(0, 77)}…` : body;

      await sendPushToUser(otherId, `💬 ${authorName}`, preview, `/direct/${authorId}`);
    } catch {
      // push failures never block sending
    }
  })();
}
```

- [ ] **Step 3: Typecheck + manual verify**

Run: `npx tsc --noEmit` → no errors.
Manual (requires Task 7's dev build on recipient device): send chat message → recipient gets push with author name + preview; tapping opens the right thread.

- [ ] **Step 4: Commit**

```bash
git add lib/chatApi.ts
git commit -m "feat: push notification on new chat message (match + private)"
```

---

## Out of scope — separate plans

These were discussed but are independent subsystems; each deserves its own plan:

1. **historial.tsx real** — wire to `useMyMatches().past`.
2. **RLS audit completo** — all tables, before inviting users.
3. **EAS Update (OTA)** — `eas update --channel preview` workflow (unblocked once Task 7's dev build exists).
4. **CI GitHub Actions** — tsc + lint on push.
5. **Canchas reales + Nominatim** — replace `mockCanchas`.

## Task order

Task 1 → 2 → 3 → 4 (chat, each builds on previous) → 5 → 6 (cuenta, independent) → 7 (push build) → 8 (chat push, needs 7 to verify).
