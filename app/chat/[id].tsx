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

import { Avatar } from '@/components/ui/Avatar';
import { BackHeader } from '@/components/ui/BackHeader';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { TextInput } from '@/components/ui/TextInput';
import { mockChatThreads, mockMessages } from '@/data/chats';
import { mockCurrentUser } from '@/data/players';
import { timeOnly } from '@/lib/time';
import { colors, radius, spacing } from '@/theme';
import type { Message } from '@/types/chat';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
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
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scroll}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {grouped.map(({ day, items }) => (
            <View key={day} style={styles.group}>
              <View style={styles.daySep}>
                <View style={styles.dayLine} />
                <Text variant="caption" color="textTertiary">
                  {day}
                </Text>
                <View style={styles.dayLine} />
              </View>
              {items.map((msg) => (
                <Bubble key={msg.id} message={msg} thread={thread} />
              ))}
            </View>
          ))}
        </ScrollView>

        <View style={styles.composer}>
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
              styles.sendBtn,
              text.trim() ? null : { opacity: 0.4 },
            ]}
            scaleTo={0.9}
          >
            <PaperPlaneTilt size={20} color={colors.bg} weight="fill" />
          </PressableScale>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Bubble({
  message,
  thread,
}: {
  message: Message;
  thread: (typeof mockChatThreads)[number];
}) {
  const isMe = message.authorId === mockCurrentUser.id;
  const author = thread.participants.find((p) => p.id === message.authorId);
  return (
    <View style={[styles.bubbleRow, isMe ? styles.alignRight : styles.alignLeft]}>
      {!isMe ? <Avatar name={author?.name ?? '?'} size={28} /> : null}
      <View style={styles.bubbleCol}>
        {!isMe && author ? (
          <Text variant="caption" color="textTertiary" style={styles.author}>
            {author.name}
          </Text>
        ) : null}
        <View
          style={[
            styles.bubble,
            isMe ? styles.bubbleMine : styles.bubbleOther,
          ]}
        >
          <Text variant="body" color={isMe ? 'bg' : 'textPrimary'}>
            {message.body}
          </Text>
        </View>
        <Text
          variant="caption"
          color="textTertiary"
          style={[styles.timeText, isMe ? styles.timeRight : styles.timeLeft]}
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

const styles = StyleSheet.create({
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
  dayLine: { flex: 1, height: 1, backgroundColor: colors.border },
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
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
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
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
