import { useRouter } from 'expo-router';
import { ChatCircle, ChatCircleDots, Trash, WifiSlash } from 'phosphor-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, type DimensionValue, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { Divider } from '@/components/ui/Divider';
import { EmptyState } from '@/components/ui/EmptyState';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { Text } from '@/components/ui/Text';
import { useMyThreads, useDeleteThread, useMyPrivateThreads } from '@/hooks/useChat';
import { useColors } from '@/hooks/useColors';
import { labelModality } from '@/lib/format';
import { relativeTime } from '@/lib/time';
import type { ChatThreadData, PrivateThreadData } from '@/lib/chatApi';
import { radius, spacing } from '@/theme';
import type { ColorPalette } from '@/theme/palettes';

type Tab = 'partidas' | 'privados';

const OPTIONS: { value: Tab; label: string }[] = [
  { value: 'partidas', label: 'Partidas' },
  { value: 'privados', label: 'Privados' },
];

function SkeletonPulse({
  width,
  height,
  borderRadius: br,
  bgColor,
  borderColor,
}: {
  width: DimensionValue;
  height: number;
  borderRadius: number;
  bgColor: string;
  borderColor: string;
}) {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);
  return (
    <View style={{ width, height }}>
      <Animated.View
        style={{ flex: 1, borderRadius: br, backgroundColor: bgColor, borderWidth: 1, borderColor, opacity }}
      />
    </View>
  );
}

export default function ChatsScreen() {
  const router = useRouter();
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const [tab, setTab] = useState<Tab>('partidas');

  const {
    data: threads,
    isLoading: loadingThreads,
    isError: errorThreads,
    refetch: refetchThreads,
    isRefetching: refreshingThreads,
  } = useMyThreads();
  const {
    data: privateThreads,
    isLoading: loadingPrivate,
    isError: errorPrivate,
    refetch: refetchPrivate,
    isRefetching: refreshingPrivate,
  } = useMyPrivateThreads();
  const { mutate: deleteThread } = useDeleteThread();
  const [deleteThreadId, setDeleteThreadId] = useState<string | null>(null);

  const isLoading = tab === 'partidas' ? loadingThreads : loadingPrivate;
  const isError = tab === 'partidas' ? errorThreads : errorPrivate;
  const refetch = tab === 'partidas' ? refetchThreads : refetchPrivate;
  const isRefreshing = tab === 'partidas' ? refreshingThreads : refreshingPrivate;

  return (
    <Screen>
      <View style={s.head}>
        <Text variant="h2">Chats</Text>
      </View>

      <View style={s.tabsWrap}>
        <SegmentedTabs options={OPTIONS} value={tab} onChange={setTab} />
      </View>

      {isLoading ? (
        <View style={s.skeletonWrap}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={s.skeletonRow}>
              <SkeletonPulse width={44} height={44} borderRadius={22} bgColor={c.surface} borderColor={c.border} />
              <View style={{ flex: 1, gap: spacing.xs }}>
                <SkeletonPulse width="70%" height={14} borderRadius={radius.sm} bgColor={c.surface} borderColor={c.border} />
                <SkeletonPulse width="45%" height={12} borderRadius={radius.sm} bgColor={c.surface} borderColor={c.border} />
              </View>
            </View>
          ))}
        </View>
      ) : isError ? (
        <ScrollView
          contentContainerStyle={{ flex: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void refetch()}
              tintColor={c.primary}
              colors={[c.primary]}
            />
          }
        >
          <EmptyState
            icon={<WifiSlash size={36} color={c.alert} weight="bold" />}
            title="Sin conexión"
            description="No se pudieron cargar los chats."
            action={
              <Button
                label="Reintentar"
                variant="secondary"
                fullWidth={false}
                style={{ marginTop: spacing.md }}
                onPress={() => void refetch()}
              />
            }
          />
        </ScrollView>
      ) : tab === 'partidas' ? (
        !threads || threads.length === 0 ? (
          <ScrollView
            contentContainerStyle={{ flex: 1 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshingThreads}
                onRefresh={() => void refetchThreads()}
                tintColor={c.primary}
                colors={[c.primary]}
              />
            }
          >
            <EmptyState
              icon={<ChatCircleDots size={36} color={c.primary} weight="fill" />}
              title="Sin chats de partidas"
              description="Cuando te unas o crees una partida tendrás un chat con los demás jugadores."
            />
          </ScrollView>
        ) : (
          <ScrollView
            contentContainerStyle={s.scroll}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshingThreads}
                onRefresh={() => void refetchThreads()}
                tintColor={c.primary}
                colors={[c.primary]}
              />
            }
          >
            {threads.map((t, i) => (
              <View key={t.id}>
                <MatchChatRow
                  thread={t}
                  onPress={() => router.push(`/chat/${t.matchId}`)}
                  onLongPress={() => setDeleteThreadId(t.id)}
                  c={c}
                  s={s}
                />
                {i < threads.length - 1 ? <Divider inset /> : null}
              </View>
            ))}
          </ScrollView>
        )
      ) : (
        !privateThreads || privateThreads.length === 0 ? (
          <ScrollView
            contentContainerStyle={{ flex: 1 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshingPrivate}
                onRefresh={() => void refetchPrivate()}
                tintColor={c.primary}
                colors={[c.primary]}
              />
            }
          >
            <EmptyState
              icon={<ChatCircle size={36} color={c.primary} weight="fill" />}
              title="Sin mensajes privados"
              description="Envía un mensaje a un jugador desde su perfil para iniciar una conversación."
            />
          </ScrollView>
        ) : (
          <ScrollView
            contentContainerStyle={s.scroll}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshingPrivate}
                onRefresh={() => void refetchPrivate()}
                tintColor={c.primary}
                colors={[c.primary]}
              />
            }
          >
            {privateThreads.map((t, i) => (
              <View key={t.id}>
                <PrivateChatRow
                  thread={t}
                  onPress={() => router.push(`/direct/${t.otherUser.id}`)}
                  c={c}
                  s={s}
                />
                {i < privateThreads.length - 1 ? <Divider inset /> : null}
              </View>
            ))}
          </ScrollView>
        )
      )}

      <ConfirmSheet
        visible={deleteThreadId !== null}
        onClose={() => setDeleteThreadId(null)}
        title="Eliminar chat"
        description="¿Eliminar este chat y todos sus mensajes? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() => { if (deleteThreadId) deleteThread(deleteThreadId); }}
      />
    </Screen>
  );
}

// ─── Match chat row ───────────────────────────────────────────────────────────

function MatchChatRow({
  thread,
  onPress,
  onLongPress,
  c,
  s,
}: {
  thread: ChatThreadData;
  onPress: () => void;
  onLongPress: () => void;
  c: ColorPalette;
  s: ReturnType<typeof makeStyles>;
}) {
  const title = `${labelModality(thread.modality as Parameters<typeof labelModality>[0])} · ${thread.locationName}`;
  const lastTime = thread.lastMessageAt ? relativeTime(thread.lastMessageAt) : '';

  return (
    <PressableScale onPress={onPress} onLongPress={onLongPress} style={s.row} scaleTo={0.98}>
      <View style={s.avatarsWrap}>
        {thread.participants.slice(0, 3).map((p, i) => (
          <View key={p.id} style={[s.avatarOffset, { marginLeft: i === 0 ? 0 : -10, zIndex: 3 - i }]}>
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
          {lastTime ? <Text variant="caption" color="textTertiary">{lastTime}</Text> : null}
        </View>
        <Text variant="small" color="textSecondary" numberOfLines={1}>
          {thread.lastMessage ?? 'Sin mensajes aún'}
        </Text>
      </View>
    </PressableScale>
  );
}

// ─── Private DM row ──────────────────────────────────────────────────────────

function PrivateChatRow({
  thread,
  onPress,
  c,
  s,
}: {
  thread: PrivateThreadData;
  onPress: () => void;
  c: ColorPalette;
  s: ReturnType<typeof makeStyles>;
}) {
  const lastTime = thread.lastMessageAt ? relativeTime(thread.lastMessageAt) : '';

  return (
    <PressableScale onPress={onPress} style={s.row} scaleTo={0.98}>
      <Avatar name={thread.otherUser.name} uri={thread.otherUser.avatarUrl} size={44} />
      <View style={s.col}>
        <View style={s.titleRow}>
          <Text variant="bodySemibold" color="textPrimary" numberOfLines={1} style={{ flex: 1 }}>
            {thread.otherUser.name}
          </Text>
          {lastTime ? <Text variant="caption" color="textTertiary">{lastTime}</Text> : null}
        </View>
        <Text variant="small" color="textSecondary" numberOfLines={1}>
          {thread.lastMessage ?? 'Sin mensajes aún'}
        </Text>
      </View>
    </PressableScale>
  );
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    head: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xs },
    tabsWrap: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
    skeletonWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.lg },
    skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.huge },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
    avatarsWrap: { flexDirection: 'row', width: 64 },
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
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  });
}
