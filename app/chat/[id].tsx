import { useLocalSearchParams } from 'expo-router';
import { PaperPlaneTilt } from 'phosphor-react-native';
import { useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/Avatar';
import { BackHeader } from '@/components/ui/BackHeader';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { TextInput } from '@/components/ui/TextInput';
import { mockChatThreads, mockMessages } from '@/data/chats';
import { mockCurrentUser } from '@/data/players';
import { useColors } from '@/hooks/useColors';
import { timeOnly } from '@/lib/time';
import { radius, spacing } from '@/theme';
import type { ColorPalette } from '@/theme/palettes';
import type { Message } from '@/types/chat';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => makeStyles(c, insets.bottom), [c, insets.bottom]);
  const thread = mockChatThreads.find((t) => t.id === id) ?? mockChatThreads[0];
  const initial = mockMessages[thread.id] ?? [];
  const [messages, setMessages] = useState<Message[]>(initial);
  const [text, setText] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const grouped = useMemo(() => groupByDay(messages), [messages]);

  const send = () => {
    const body = text.trim();
    if (!body) return;
    const next: Message = {
      id: `msg_${Date.now()}`,
      threadId: thread.id,
      authorId: mockCurrentUser.id,
      body,
      sentAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, next]);
    setText('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  };

  return (
    <Screen edges={['top']}>
      <BackHeader
        title={thread.title}
        trailing={
          <Text variant="caption" color="textTertiary">
            {thread.subtitle}
          </Text>
        }
      />
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
          {grouped.map(({ day, items }) => (
            <View key={day} style={s.group}>
              <View style={s.daySep}>
                <View style={s.dayLine} />
                <Text variant="caption" color="textTertiary">
                  {day}
                </Text>
                <View style={s.dayLine} />
              </View>
              {items.map((msg) => (
                <Bubble key={msg.id} message={msg} thread={thread} c={c} />
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
            onSubmitEditing={send}
            returnKeyType="send"
          />
          <PressableScale
            onPress={send}
            disabled={!text.trim()}
            style={[
              s.sendBtn,
              text.trim() ? null : { opacity: 0.4 },
            ]}
            scaleTo={0.9}
          >
            <PaperPlaneTilt size={20} color={c.bg} weight="fill" />
          </PressableScale>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Bubble({
  message,
  thread,
  c,
}: {
  message: Message;
  thread: (typeof mockChatThreads)[number];
  c: ColorPalette;
}) {
  const s = useMemo(() => makeStyles(c, 0), [c]);
  const isMe = message.authorId === mockCurrentUser.id;
  const author = thread.participants.find((p) => p.id === message.authorId);
  return (
    <View style={[s.bubbleRow, isMe ? s.alignRight : s.alignLeft]}>
      {!isMe ? <Avatar name={author?.name ?? '?'} size={28} /> : null}
      <View style={s.bubbleCol}>
        {!isMe && author ? (
          <Text variant="caption" color="textTertiary" style={s.author}>
            {author.name}
          </Text>
        ) : null}
        <View
          style={[
            s.bubble,
            isMe ? s.bubbleMine : s.bubbleOther,
          ]}
        >
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

function groupByDay(msgs: Message[]): { day: string; items: Message[] }[] {
  const map = new Map<string, Message[]>();
  for (const m of msgs) {
    const d = new Date(m.sentAt);
    const key = labelDay(d);
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

function makeStyles(c: ColorPalette, bottomInset: number = 0) {
  return StyleSheet.create({
    flex: { flex: 1 },
    scroll: {
      padding: spacing.lg,
      gap: spacing.sm,
    },
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
    bubbleMine: {
      backgroundColor: c.primary,
      borderBottomRightRadius: 4,
    },
    bubbleOther: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderBottomLeftRadius: 4,
    },
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
