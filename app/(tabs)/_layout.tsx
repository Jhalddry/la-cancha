import {
  Badge,
  Icon,
  Label,
  NativeTabs,
} from 'expo-router/unstable-native-tabs';
import { Redirect } from 'expo-router';
import { DynamicColorIOS, Platform } from 'react-native';

import { useUnreadChatCount } from '@/hooks/useChat';
import { useColors } from '@/hooks/useColors';
import { useSession } from '@/store/session';

export default function TabsLayout() {
  const isAuthed = useSession((s) => s.isAuthed);
  const isOnboarded = useSession((s) => s.isOnboarded);
  const user = useSession((s) => s.user);
  const c = useColors();
  const unreadChats = useUnreadChatCount();

  if (!isAuthed) return <Redirect href="/login" />;
  // isAuthed but no profile yet — fetchOrCreateProfile still running or failed.
  // Return null to block render without redirecting to onboarding.
  if (!user) return null;
  if (!isOnboarded) return <Redirect href="/onboarding" />;

  const tintColor =
    Platform.OS === 'ios'
      ? DynamicColorIOS({ dark: c.primary, light: c.primaryDim })
      : c.primary;

  return (
    <NativeTabs tintColor={tintColor}>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: 'house', selected: 'house.fill' }} />
        <Label>Inicio</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="buscar">
        <Icon sf="magnifyingglass" />
        <Label>Buscar</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="mis-partidas">
        <Icon sf={{ default: 'soccerball', selected: 'soccerball.inverse' }} />
        <Label>Mis Partidas</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="chats">
        <Icon
          sf={{
            default: 'bubble.left.and.bubble.right',
            selected: 'bubble.left.and.bubble.right.fill',
          }}
        />
        <Label>Chats</Label>
        {unreadChats > 0 ? <Badge>{unreadChats > 99 ? '99+' : String(unreadChats)}</Badge> : null}
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="perfil">
        <Icon sf={{ default: 'person', selected: 'person.fill' }} />
        <Label>Perfil</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
