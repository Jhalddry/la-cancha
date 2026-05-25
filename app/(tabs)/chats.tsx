import { useRouter } from 'expo-router';
import { ChatCircleDots } from 'phosphor-react-native';
import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Divider } from '@/components/ui/Divider';
import { EmptyState } from '@/components/ui/EmptyState';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useMyThreads } from '@/hooks/useChat';
import { useColors } from '@/hooks/useColors';
import { labelModality } from '@/lib/format';
import { relativeTime } from '@/lib/time';
import type { ChatThreadData } from '@/lib/chatApi';
import { radius, spacing } from '@/theme';
import type { ColorPalette } from '@/theme/palettes';

export default function ChatsScreen() {
  const router = useRouter();
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const { data: threads, isLoading } = useMyThreads();

  return (
    <Screen>
      <View style={s.head}>
        <Text variant="h2">Chats</Text>
      </View>

      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator color={c.primary} size="large" />
        </View>
      ) : !threads || threads.length === 0 ? (
        <EmptyState
          icon={<ChatCircleDots size={36} color={c.primary} weight="fill" />}
          title="Sin conversaciones"
          description="Cuando te unas o crees una partida tendrás un chat con los demás jugadores."
        />
      ) : (
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
        >
          {threads.map((t, i) => (
            <View key={t.id}>
              <ChatRow
                thread={t}
                onPress={() => router.push(`/chat/${t.matchId}`)}
                c={c}
                s={s}
              />
              {i < threads.length - 1 ? <Divider inset /> : null}
            </View>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}

function ChatRow({
  thread,
  onPress,
  c,
  s,
}: {
  thread: ChatThreadData;
  onPress: () => void;
  c: ColorPalette;
  s: ReturnType<typeof makeStyles>;
}) {
  const title = `${labelModality(thread.modality as Parameters<typeof labelModality>[0])} · ${thread.locationName}`;
  const lastTime = thread.lastMessageAt ? relativeTime(thread.lastMessageAt) : '';

  return (
    <PressableScale onPress={onPress} style={s.row} scaleTo={0.98}>
      {/* Avatar stack from first 3 participants */}
      <View style={s.avatarsWrap}>
        {thread.participants.slice(0, 3).map((p, i) => (
          <View
            key={p.id}
            style={[s.avatarOffset, { marginLeft: i === 0 ? 0 : -10, zIndex: 3 - i }]}
          >
            <Avatar name={p.name} uri={p.avatarUrl} size={40} />
          </View>
        ))}
        {thread.participants.length === 0 ? (
          <View style={s.emptyAvatar}>
            <ChatCircleDots size={20} color={c.textTertiary} />
          </View>
        ) : null}
      </View>

      <View style={s.col}>
        <View style={s.titleRow}>
          <Text variant="bodySemibold" color="textPrimary" numberOfLines={1} style={{ flex: 1 }}>
            {title}
          </Text>
          {lastTime ? (
            <Text variant="caption" color="textTertiary">
              {lastTime}
            </Text>
          ) : null}
        </View>
        <Text
          variant="small"
          color="textSecondary"
          numberOfLines={1}
        >
          {thread.lastMessage ?? 'Sin mensajes aún'}
        </Text>
      </View>
    </PressableScale>
  );
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    head: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
    },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.huge },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md,
    },
    avatarsWrap: { flexDirection: 'row', width: 52 },
    avatarOffset: {},
    emptyAvatar: {
      width: 40,
      height: 40,
      borderRadius: radius.full,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    col: { flex: 1, gap: 2 },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
  });
}
