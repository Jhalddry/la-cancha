import { useLocalSearchParams, useRouter } from 'expo-router';
import { PaperPlaneTilt } from 'phosphor-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/Avatar';
import { BackHeader } from '@/components/ui/BackHeader';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { TextInput } from '@/components/ui/TextInput';
import { useMarkThreadRead, usePrivateChat } from '@/hooks/useChat';
import { useProfile } from '@/hooks/useProfiles';
import { useColors } from '@/hooks/useColors';
import { useSession } from '@/store/session';
import { timeOnly } from '@/lib/time';
import { radius, spacing } from '@/theme';
import type { ColorPalette } from '@/theme/palettes';
import type { ChatMessageData } from '@/lib/chatApi';

export default function DirectChatScreen() {
  const router = useRouter();
  const { id: otherId } = useLocalSearchParams<{ id: string }>();
  const userId = useSession((s) => s.user?.id);
  const c = useColors();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => makeStyles(c, insets.bottom), [c, insets.bottom]);

  const { data: otherUser } = useProfile(otherId);
  const { messages, loading, error, send, threadId } = usePrivateChat(otherId);
  const markRead = useMarkThreadRead();
  const [text, setText] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const grouped = useMemo(() => groupByDay(messages), [messages]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [messages.length]);

  // Mark thread as read on mount and when new messages arrive
  useEffect(() => {
    if (threadId) markRead('private', threadId);
  }, [threadId, messages.length, markRead]);

  const handleSend = async () => {
    const body = text.trim();
    if (!body) return;
    setText('');
    await send(body);
  };

  const title = otherUser?.name ?? 'Chat privado';

  return (
    <Screen edges={['top']}>
      <BackHeader
        transparent
        titleNode={
          otherUser ? (
            <PressableScale
              scaleTo={0.95}
              style={s.headerUser}
              onPress={() => router.push(`/perfil/${otherId}`)}
            >
              <Avatar name={otherUser.name} uri={otherUser.avatarUrl} size={32} />
              <Text variant="bodyMedium" color="textPrimary">{title}</Text>
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
          <Text variant="body" color="textSecondary" style={{ textAlign: 'center' }}>{error}</Text>
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
                  <DirectBubble key={msg.id} message={msg} myId={userId ?? ''} c={c} />
                ))}
              </View>
            ))}
          </ScrollView>

          <View style={s.composer}>
            <TextInput
              placeholder="Escribe un mensaje"
              value={text}
              onChangeText={setText}
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
    </Screen>
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

function DirectBubble({
  message,
  myId,
  c,
}: {
  message: ChatMessageData;
  myId: string;
  c: ColorPalette;
}) {
  const s = useMemo(() => makeStyles(c, 0), [c]);
  const isMe = message.authorId === myId;
  const isOptimistic = message.id.startsWith('opt_');

  return (
    <View style={[s.bubbleRow, isMe ? s.alignRight : s.alignLeft]}>
      {!isMe ? (
        <Avatar name={message.authorName} uri={message.authorAvatarUrl} size={28} />
      ) : null}
      <View style={s.bubbleCol}>
        <View style={[s.bubble, isMe ? s.bubbleMine : s.bubbleOther, isOptimistic ? s.bubbleOpt : null]}>
          <Text variant="body" color={isMe ? 'surface' : 'textPrimary'}>
            {message.body}
          </Text>
        </View>
        <Text
          variant="caption"
          color="textTertiary"
          style={[s.timeText, isMe ? s.timeRight : s.timeLeft]}
        >
          {timeOnly(message.sentAt)}
        </Text>
      </View>
    </View>
  );
}

function makeStyles(c: ColorPalette, bottomInset = 0) {
  return StyleSheet.create({
    flex: { flex: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
    emptyWrap: { flex: 1, alignItems: 'center', paddingTop: spacing.huge },
    headerUser: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    scroll: { padding: spacing.lg, gap: spacing.sm, flexGrow: 1 },
    group: { gap: spacing.sm },
    daySep: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
    dayLine: { flex: 1, height: 1, backgroundColor: c.border },
    bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, maxWidth: '85%' },
    alignRight: { alignSelf: 'flex-end', justifyContent: 'flex-end' },
    alignLeft: { alignSelf: 'flex-start' },
    bubbleCol: { flexShrink: 1 },
    bubble: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, borderRadius: radius.lg },
    bubbleMine: { backgroundColor: c.primary, borderBottomRightRadius: 4 },
    bubbleOther: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderBottomLeftRadius: 4 },
    bubbleOpt: { opacity: 0.6 },
    timeText: { marginTop: 2 },
    timeRight: { textAlign: 'right' },
    timeLeft: { textAlign: 'left', marginLeft: spacing.sm },
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
