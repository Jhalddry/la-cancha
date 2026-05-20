import { useRouter } from 'expo-router';
import { ChatCircleDots } from 'phosphor-react-native';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AvatarStack } from '@/components/ui/AvatarStack';
import { Divider } from '@/components/ui/Divider';
import { EmptyState } from '@/components/ui/EmptyState';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { mockChatThreads } from '@/data/chats';
import { relativeTime } from '@/lib/time';
import { colors, radius, spacing } from '@/theme';
import type { ChatThread } from '@/types/chat';

export default function ChatsScreen() {
  const router = useRouter();
  const threads = mockChatThreads;

  return (
    <Screen>
      <View style={styles.head}>
        <Text variant="h2">Chats</Text>
      </View>
      {threads.length === 0 ? (
        <EmptyState
          icon={<ChatCircleDots size={36} color={colors.primary} weight="fill" />}
          title="Sin conversaciones"
          description="Cuando te unas a una partida tendrás un chat con los demás jugadores."
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {threads.map((t, i) => (
            <View key={t.id}>
              <ChatRow thread={t} onPress={() => router.push(`/chat/${t.id}`)} />
              {i < threads.length - 1 ? <Divider inset /> : null}
            </View>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}

function ChatRow({ thread, onPress }: { thread: ChatThread; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} style={styles.row} scaleTo={0.98}>
      <AvatarStack players={thread.participants} max={3} size={40} />
      <View style={styles.col}>
        <View style={styles.titleRow}>
          <Text variant="bodySemibold" color="textPrimary" numberOfLines={1}>
            {thread.title}
          </Text>
          <Text variant="caption" color="textTertiary">
            {relativeTime(thread.lastMessageAt)}
          </Text>
        </View>
        <View style={styles.titleRow}>
          <Text
            variant="small"
            color={thread.unreadCount > 0 ? 'textPrimary' : 'textSecondary'}
            numberOfLines={1}
            style={{ flex: 1 }}
          >
            {thread.lastMessage}
          </Text>
          {thread.unreadCount > 0 ? (
            <View style={styles.badge}>
              <Text variant="caption" color="bg">
                {thread.unreadCount}
              </Text>
            </View>
          ) : null}
        </View>
        {thread.subtitle ? (
          <Text variant="caption" color="textTertiary">
            {thread.subtitle}
          </Text>
        ) : null}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.huge },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  col: { flex: 1, gap: 2 },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  badge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
