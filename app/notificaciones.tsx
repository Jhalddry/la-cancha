import { useRouter } from 'expo-router';
import {
  Bell,
  CheckCircle,
  Flag,
  Play,
  Star,
  UserPlus,
  Warning,
  X,
} from 'phosphor-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconCircle } from '@/components/ui/IconCircle';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useColors } from '@/hooks/useColors';
import { useNotifications, useMarkAllRead, useMarkRead, useDeleteNotification, useDeleteAllNotifications } from '@/hooks/useNotifications';
import type { NotificationKind } from '@/lib/notificationsApi';
import type { ColorPalette } from '@/theme/palettes';
import { radius, spacing } from '@/theme';

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `Hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Ayer';
  return `Hace ${days} días`;
}

function NotifIcon({ kind, read }: { kind: NotificationKind; read: boolean }) {
  const c = useColors();
  const bg = read ? c.surface : c.primarySoft;
  const border = read ? c.border : c.primary;
  const col = read ? c.textSecondary : c.primary;
  const size = 20;

  let icon: React.ReactNode;
  if (kind === 'join_request') icon = <Bell size={size} color={col} weight="bold" />;
  else if (kind === 'join_approved') icon = <CheckCircle size={size} color={col} weight="fill" />;
  else if (kind === 'join_rejected') icon = <X size={size} color={col} weight="bold" />;
  else if (kind === 'match_started') icon = <Play size={size} color={col} weight="fill" />;
  else if (kind === 'match_ended') icon = <Flag size={size} color={col} weight="fill" />;
  else if (kind === 'match_cancelled') icon = <Warning size={size} color={col} weight="fill" />;
  else if (kind === 'rating_received') icon = <Star size={size} color={col} weight="fill" />;
  else if (kind === 'match_invitation') icon = <UserPlus size={size} color={col} weight="fill" />;
  else icon = <Bell size={size} color={col} weight="bold" />;

  return <IconCircle size={44} bg={bg} border={border}>{icon}</IconCircle>;
}

export default function NotificacionesScreen() {
  const router = useRouter();
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const { data: notifications, isLoading, isError } = useNotifications();
  const { mutate: markAllRead } = useMarkAllRead();
  const { mutate: markRead } = useMarkRead();
  const { mutate: deleteOne } = useDeleteNotification();
  const { mutate: deleteAll } = useDeleteAllNotifications();
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [deleteAllConfirm, setDeleteAllConfirm] = useState(false);

  const all = notifications ?? [];
  const unreadCount = all.filter((n) => !n.read).length;
  const displayed = showUnreadOnly ? all.filter((n) => !n.read) : all;

  const handlePress = (id: string, navigateTo?: string, read?: boolean) => {
    if (!read) markRead(id);
    if (navigateTo) router.push(navigateTo as never);
  };

  return (
    <Screen>
      <BackHeader
        title="Notificaciones"
        trailing={
          all.length > 0 ? (
            <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
              {unreadCount > 0 ? (
                <PressableScale onPress={() => markAllRead()} scaleTo={0.9}>
                  <Text variant="smallMedium" color="primary">Leer todas</Text>
                </PressableScale>
              ) : null}
              <PressableScale onPress={() => setDeleteAllConfirm(true)} scaleTo={0.9}>
                <Text variant="smallMedium" color="alert">Borrar todas</Text>
              </PressableScale>
            </View>
          ) : undefined
        }
      />

      {/* Filter pills */}
      <View style={s.filterRow}>
        <PressableScale
          scaleTo={0.95}
          onPress={() => setShowUnreadOnly(false)}
          style={[s.filterPill, !showUnreadOnly && s.filterPillActive]}
        >
          <Text
            variant="smallMedium"
            color={!showUnreadOnly ? 'primary' : 'textSecondary'}
          >
            Todas
          </Text>
        </PressableScale>
        <PressableScale
          scaleTo={0.95}
          onPress={() => setShowUnreadOnly(true)}
          style={[s.filterPill, showUnreadOnly && s.filterPillActive]}
        >
          <Text
            variant="smallMedium"
            color={showUnreadOnly ? 'primary' : 'textSecondary'}
          >
            Sin leer{unreadCount > 0 ? ` (${unreadCount})` : ''}
          </Text>
          {unreadCount > 0 && !showUnreadOnly ? <View style={s.filterDot} /> : null}
        </PressableScale>
      </View>

      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator color={c.primary} size="large" />
        </View>
      ) : isError ? (
        <EmptyState
          icon={<Warning size={36} color={c.alert} weight="fill" />}
          title="Error al cargar"
          description="No se pudieron cargar las notificaciones. Intenta de nuevo."
        />
      ) : displayed.length === 0 ? (
        <EmptyState
          icon={<Bell size={36} color={c.primary} weight="fill" />}
          title={showUnreadOnly ? 'Sin notificaciones sin leer' : 'Sin notificaciones'}
          description={
            showUnreadOnly
              ? 'Estás al día. No tienes notificaciones pendientes.'
              : 'Aquí verás tus notificaciones de partidas, calificaciones y más.'
          }
        />
      ) : (
        <ScrollView
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
        >
          {displayed.map((notif) => (
            <View key={notif.id} style={[s.row, notif.read ? s.rowRead : s.rowUnread]}>
              <PressableScale
                onPress={() => handlePress(notif.id, notif.navigateTo, notif.read)}
                scaleTo={0.98}
                style={s.rowInner}
              >
                <NotifIcon kind={notif.kind} read={notif.read} />
                <View style={staticStyles.textBlock}>
                  <Text
                    variant="bodyMedium"
                    color={notif.read ? 'textSecondary' : 'textPrimary'}
                    numberOfLines={2}
                  >
                    {notif.title}
                  </Text>
                  <Text variant="caption" color="textTertiary">
                    {relativeTime(notif.createdAt)}
                  </Text>
                </View>
                {!notif.read && <View style={s.unreadDot} />}
              </PressableScale>
              <PressableScale onPress={() => deleteOne(notif.id)} scaleTo={0.85} style={s.deleteBtn}>
                <X size={14} color={c.textTertiary} weight="bold" />
              </PressableScale>
            </View>
          ))}
        </ScrollView>
      )}
      <ConfirmSheet
        visible={deleteAllConfirm}
        onClose={() => setDeleteAllConfirm(false)}
        title="Borrar todas las notificaciones"
        description="Se eliminarán todas tus notificaciones. Esta acción no se puede deshacer."
        confirmLabel="Borrar todas"
        confirmColor={c.alert}
        onConfirm={() => {
          deleteAll();
          setDeleteAllConfirm(false);
        }}
      />
    </Screen>
  );
}

const staticStyles = StyleSheet.create({
  textBlock: { flex: 1, gap: spacing.xs },
});

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    filterRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.md,
    },
    filterPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    filterPillActive: {
      borderColor: c.primary,
      backgroundColor: c.primarySoft,
    },
    filterDot: {
      width: 7,
      height: 7,
      borderRadius: radius.full,
      backgroundColor: c.alert,
    },
    content: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xs,
      paddingBottom: spacing.huge,
      gap: spacing.xs,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: radius.lg,
      borderWidth: 1,
      overflow: 'hidden',
    },
    rowInner: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md,
      paddingLeft: spacing.md,
      paddingRight: spacing.xs,
    },
    rowUnread: {
      backgroundColor: c.primarySoft,
      borderColor: `${c.primary}44`,
    },
    rowRead: {
      backgroundColor: c.surface,
      borderColor: c.border,
    },
    deleteBtn: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      alignSelf: 'stretch',
      alignItems: 'center',
      justifyContent: 'center',
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: radius.full,
      backgroundColor: c.primary,
    },
  });
}
