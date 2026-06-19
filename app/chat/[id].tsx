import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, Checks, PaperPlaneTilt, Users } from 'phosphor-react-native';
import { useEffect, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/Avatar';
import { BackHeader } from '@/components/ui/BackHeader';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { Sheet } from '@/components/ui/Sheet';
import { TypingDots } from '@/components/ui/TypingDots';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { TextInput } from '@/components/ui/TextInput';
import { useChat, useDeleteMessage, useMarkThreadRead } from '@/hooks/useChat';
import { useMatch } from '@/hooks/useMatches';
import { useColors } from '@/hooks/useColors';
import { queryClient } from '@/lib/queryClient';
import { useSession } from '@/store/session';
import { timeOnly } from '@/lib/time';
import { labelModality } from '@/lib/format';
import { radius, spacing } from '@/theme';
import type { ColorPalette } from '@/theme/palettes';
import type { ChatMessageData, ChatThreadData } from '@/lib/chatApi';
import { useState } from 'react';

export default function ChatScreen() {
  const { id: matchId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const userId = useSession((s) => s.user?.id);
  const c = useColors();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => makeStyles(c, insets.bottom), [c, insets.bottom]);

  const { data: match } = useMatch(matchId);
  const { messages, loading, error, send, threadId, othersReadAt, othersTyping, sendTyping } = useChat(matchId);
  const { mutate: deleteMessage } = useDeleteMessage();
  const markRead = useMarkThreadRead();
  const [text, setText] = useState('');
  const [deleteMessageId, setDeleteMessageId] = useState<string | null>(null);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const grouped = useMemo(() => groupByDay(messages), [messages]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [messages.length]);

  // Zero the cache immediately on mount (by matchId, no network wait) and again on unmount
  // (catches any background refetch that fired while the chat was open)
  useEffect(() => {
    if (!matchId) return;
    const applyZero = () => {
      queryClient.setQueryData<ChatThreadData[]>(['chat-threads'], (old) =>
        old?.map((t) => (t.matchId === matchId ? { ...t, unreadCount: 0 } : t)) ?? old,
      );
    };
    applyZero();
    return applyZero;
  }, [matchId]);

  // DB write: mark thread read when threadId is known; re-run on new messages
  useEffect(() => {
    if (threadId) markRead('match', threadId);
  }, [threadId, messages.length, markRead]);

  const handleSend = async () => {
    const body = text.trim();
    if (!body) return;
    setText('');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await send(body);
  };

  const title = match
    ? `${labelModality(match.modality)} · ${match.location.name}`
    : 'Chat';

  return (
    <Screen edges={['top']}>
      <BackHeader
        title={title}
        trailing={
          match ? (
            <PressableScale scaleTo={0.9} onPress={() => setParticipantsOpen(true)}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Users size={16} color={c.textTertiary} weight="regular" />
                <Text variant="caption" color="textTertiary">
                  {match.joinedPlayers.length + 1}
                </Text>
              </View>
            </PressableScale>
          ) : undefined
        }
      />

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={c.primary} size="large" />
        </View>
      ) : error ? (
        <View style={s.center}>
          <Text variant="body" color="textSecondary" style={{ textAlign: 'center' }}>
            {error}
          </Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={s.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={s.scroll}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          >
            {messages.length === 0 ? (
              <View style={s.emptyWrap}>
                <Text variant="body" color="textTertiary" style={{ textAlign: 'center' }}>
                  Sé el primero en escribir 👋
                </Text>
              </View>
            ) : null}
            {grouped.map(({ day, items }) => (
              <View key={day} style={s.group}>
                <View style={s.daySep}>
                  <View style={s.dayLine} />
                  <Text variant="caption" color="textTertiary">{day}</Text>
                  <View style={s.dayLine} />
                </View>
                {items.map((msg) => (
                  <Bubble
                    key={msg.id}
                    message={msg}
                    myId={userId ?? ''}
                    c={c}
                    othersReadAt={othersReadAt}
                    onDelete={(id) => setDeleteMessageId(id)}
                    onAvatarPress={(authorId) => router.push(`/perfil/${authorId}`)}
                  />
                ))}
              </View>
            ))}
          </ScrollView>

          {othersTyping.length > 0 ? (
            <View style={s.typingRow}>
              <Text variant="small" color="textTertiary">
                {othersTyping.length === 1
                  ? `${othersTyping[0]} está escribiendo`
                  : `${othersTyping.join(', ')} están escribiendo`}
              </Text>
              <TypingDots color={c.textTertiary} />
            </View>
          ) : null}
          <View style={s.composer}>
            <TextInput
              placeholder="Escribe un mensaje"
              value={text}
              onChangeText={(t) => { setText(t); if (t.trim()) sendTyping(); }}
              containerStyle={{ flex: 1 }}
              onSubmitEditing={handleSend}
              returnKeyType="send"
            />
            <PressableScale
              onPress={handleSend}
              disabled={!text.trim()}
              style={[s.sendBtn, !text.trim() ? { opacity: 0.4 } : null]}
              scaleTo={0.9}
            >
              <PaperPlaneTilt size={20} color={c.bg} weight="fill" />
            </PressableScale>
          </View>
        </KeyboardAvoidingView>
      )}
      <Sheet
        visible={participantsOpen}
        onClose={() => setParticipantsOpen(false)}
        title="Participantes"
      >
        <View style={{ gap: spacing.sm, paddingBottom: spacing.xl }}>
          {match?.organizer ? (
            <PressableScale
              scaleTo={0.97}
              onPress={() => { setParticipantsOpen(false); setTimeout(() => router.push(`/perfil/${match.organizer.id}`), 200); }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm }}
            >
              <Avatar name={match.organizer.name} uri={match.organizer.avatarUrl} size={40} />
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium" color="textPrimary">{match.organizer.name}</Text>
                <Text variant="caption" color="primary">Organizador</Text>
              </View>
            </PressableScale>
          ) : null}
          {match?.joinedPlayers.map((p) => (
            <PressableScale
              key={p.id}
              scaleTo={0.97}
              onPress={() => { setParticipantsOpen(false); setTimeout(() => router.push(`/perfil/${p.id}`), 200); }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm }}
            >
              <Avatar name={p.name} uri={p.avatarUrl} size={40} />
              <Text variant="bodyMedium" color="textPrimary">{p.name}</Text>
            </PressableScale>
          ))}
        </View>
      </Sheet>
      <ConfirmSheet
        visible={deleteMessageId !== null}
        onClose={() => setDeleteMessageId(null)}
        title="Eliminar mensaje"
        description="¿Eliminar este mensaje para todos?"
        confirmLabel="Eliminar"
        onConfirm={() => { if (deleteMessageId) deleteMessage(deleteMessageId); }}
      />
    </Screen>
  );
}

function Bubble({
  message,
  myId,
  c,
  othersReadAt,
  onDelete,
  onAvatarPress,
}: {
  message: ChatMessageData;
  myId: string;
  c: ColorPalette;
  othersReadAt?: string | null;
  onDelete?: (id: string) => void;
  onAvatarPress?: (authorId: string) => void;
}) {
  const s = useMemo(() => makeStyles(c, 0), [c]);
  const isMe = message.authorId === myId;
  const isOptimistic = message.id.startsWith('opt_');
  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      style={[s.bubbleRow, isMe ? s.alignRight : s.alignLeft]}
    >
      {!isMe ? (
        <PressableScale scaleTo={0.9} onPress={() => onAvatarPress?.(message.authorId)}>
          <Avatar name={message.authorName} uri={message.authorAvatarUrl} size={28} />
        </PressableScale>
      ) : null}
      <View style={s.bubbleCol}>
        {!isMe ? (
          <PressableScale scaleTo={0.95} onPress={() => onAvatarPress?.(message.authorId)}>
            <Text variant="caption" color="primary" style={s.author}>
              {message.authorName}
            </Text>
          </PressableScale>
        ) : null}
        <PressableScale
          scaleTo={0.97}
          onLongPress={isMe && !isOptimistic && onDelete ? () => onDelete(message.id) : undefined}
        >
          <View style={[s.bubble, isMe ? s.bubbleMine : s.bubbleOther, isOptimistic ? s.bubbleOptimistic : null]}>
            <Text variant="body" color={isMe ? 'surface' : 'textPrimary'}>
              {message.body}
            </Text>
          </View>
        </PressableScale>
        <View style={[s.timeRow, isMe ? s.timeRight : s.timeLeft]}>
          <Text variant="caption" color="textTertiary">
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
      </View>
    </Animated.View>
  );
}

function groupByDay(msgs: ChatMessageData[]): { day: string; items: ChatMessageData[] }[] {
  const map = new Map<string, ChatMessageData[]>();
  for (const m of msgs) {
    const key = labelDay(new Date(m.sentAt));
    map.set(key, [...(map.get(key) ?? []), m]);
  }
  return Array.from(map.entries()).map(([day, items]) => ({ day, items }));
}

function labelDay(d: Date): string {
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86_400_000);
  if (d.toDateString() === today.toDateString()) return 'Hoy';
  if (d.toDateString() === yesterday.toDateString()) return 'Ayer';
  return d.toLocaleDateString('es-VE', { day: 'numeric', month: 'short' });
}

function makeStyles(c: ColorPalette, bottomInset = 0) {
  return StyleSheet.create({
    flex: { flex: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
    emptyWrap: { flex: 1, alignItems: 'center', paddingTop: spacing.huge },
    scroll: { padding: spacing.lg, gap: spacing.sm, flexGrow: 1 },
    group: { gap: spacing.sm },
    daySep: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.sm,
    },
    dayLine: { flex: 1, height: 1, backgroundColor: c.border },
    bubbleRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: spacing.sm,
      maxWidth: '85%',
    },
    alignRight: { alignSelf: 'flex-end', justifyContent: 'flex-end' },
    alignLeft: { alignSelf: 'flex-start' },
    bubbleCol: { flexShrink: 1 },
    author: { marginBottom: 2, marginLeft: spacing.sm },
    bubble: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
      borderRadius: radius.lg,
    },
    bubbleMine: { backgroundColor: c.primary, borderBottomRightRadius: 4 },
    bubbleOptimistic: { opacity: 0.6 },
    bubbleOther: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderBottomLeftRadius: 4,
    },
    timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    timeRight: { justifyContent: 'flex-end' },
    timeLeft: { justifyContent: 'flex-start', marginLeft: spacing.sm },
    typingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.xs,
      backgroundColor: c.bg,
    },
    composer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      padding: spacing.md,
      paddingBottom: Math.max(spacing.md, bottomInset),
      borderTopWidth: 1,
      borderTopColor: c.border,
      backgroundColor: c.bg,
    },
    sendBtn: {
      width: 48,
      height: 48,
      borderRadius: radius.full,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
