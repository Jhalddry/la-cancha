import { useRouter } from 'expo-router';
import {
  Bell,
  CheckCircle,
  ChatCircleDots,
  Star,
  Warning,
} from 'phosphor-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { IconCircle } from '@/components/ui/IconCircle';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { colors, spacing, radius } from '@/theme';

interface Notification {
  id: string;
  title: string;
  timestamp: string;
  read: boolean;
  icon: 'bell' | 'check' | 'warning' | 'chat' | 'star';
}

const INITIAL_NOTIFICATIONS: Notification[] = [
  { id: '1', title: 'Andrés se unió a tu partida', timestamp: 'Hace 2 min', read: false, icon: 'bell' },
  { id: '2', title: 'Tu partida de Fútbol 7 está llena', timestamp: 'Hace 1 hora', read: false, icon: 'check' },
  { id: '3', title: 'Cambio de horario en tu partida', timestamp: 'Hace 3 horas', read: true, icon: 'warning' },
  { id: '4', title: 'Nuevo mensaje de Carlos', timestamp: 'Ayer', read: true, icon: 'chat' },
  { id: '5', title: 'Luis González te dejó una reseña ⭐⭐⭐⭐⭐', timestamp: 'Hace 2 días', read: true, icon: 'star' },
  { id: '6', title: 'Partida cancelada por el organizador', timestamp: 'Hace 3 días', read: true, icon: 'warning' },
];

function NotifIcon({ icon, read }: { icon: Notification['icon']; read: boolean }) {
  const bg = read ? colors.surface : colors.primarySoft;
  const border = read ? colors.border : colors.primary;
  const iconColor = read ? colors.textSecondary : colors.primary;
  const size = 20;

  return (
    <IconCircle size={44} bg={bg} border={border}>
      {icon === 'bell' && <Bell size={size} color={iconColor} weight="bold" />}
      {icon === 'check' && <CheckCircle size={size} color={iconColor} weight="bold" />}
      {icon === 'warning' && <Warning size={size} color={iconColor} weight="bold" />}
      {icon === 'chat' && <ChatCircleDots size={size} color={iconColor} weight="bold" />}
      {icon === 'star' && <Star size={size} color={iconColor} weight="fill" />}
    </IconCircle>
  );
}

export default function NotificacionesScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <Screen>
      <BackHeader
        title="Notificaciones"
        onBack={() => router.back()}
        trailing={
          <PressableScale onPress={markAllRead} scaleTo={0.9}>
            <Text variant="smallMedium" color="primary">
              Marcar todas
            </Text>
          </PressableScale>
        }
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {notifications.map((notif) => (
          <PressableScale key={notif.id} onPress={() => {}} scaleTo={0.98} style={styles.row}>
            <NotifIcon icon={notif.icon} read={notif.read} />
            <View style={styles.textBlock}>
              <Text
                variant="bodyMedium"
                color={notif.read ? 'textSecondary' : 'textPrimary'}
                numberOfLines={2}
              >
                {notif.title}
              </Text>
              <Text
                variant="caption"
                color="textTertiary"
                style={notif.read ? styles.dimTimestamp : undefined}
              >
                {notif.timestamp}
              </Text>
            </View>
            {!notif.read && <View style={styles.unreadDot} />}
          </PressableScale>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.huge,
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  dimTimestamp: {
    opacity: 0.6,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
});
