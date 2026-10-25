import { NativeTabs } from 'expo-router/native-tabs';
import { Redirect, Tabs } from 'expo-router';
import { ChatCircleDots, Flag, House, MagnifyingGlass, User } from 'phosphor-react-native';
import { DynamicColorIOS, Platform } from 'react-native';

import { useUnreadChatCount } from '@/hooks/useChat';
import { useColors } from '@/hooks/useColors';
import { useUnreadCount } from '@/hooks/useNotifications';
import { useSession } from '@/store/session';

export default function TabsLayout() {
  const isAuthed = useSession((s) => s.isAuthed);
  const isGuest = useSession((s) => s.isGuest);
  const isOnboarded = useSession((s) => s.isOnboarded);
  const user = useSession((s) => s.user);
  const c = useColors();
  const unreadChats = useUnreadChatCount();
  const { data: unreadNotifs = 0 } = useUnreadCount();

  if (!isAuthed && !isGuest) return <Redirect href="/login" />;
  if (isAuthed) {
    if (!user) return null;
    if (!isOnboarded) return <Redirect href="/onboarding" />;
  }

  // Native tabs are iOS-only; Android and web use the JS tab bar.
  if (Platform.OS !== 'ios') {
    return (
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: c.primary,
          tabBarInactiveTintColor: c.textTertiary,
          tabBarStyle: {
            backgroundColor: c.surface,
            borderTopColor: c.border,
            borderTopWidth: 1,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontFamily: 'Inter_500Medium',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Inicio',
            tabBarIcon: ({ focused, color }) => (
              <House size={24} color={color as string} weight={focused ? 'fill' : 'regular'} />
            ),
            tabBarBadge: unreadNotifs > 0 ? (unreadNotifs > 99 ? '99+' : String(unreadNotifs)) : undefined,
          }}
        />
        <Tabs.Screen
          name="buscar"
          options={{
            title: 'Buscar',
            tabBarIcon: ({ focused, color }) => (
              <MagnifyingGlass size={24} color={color as string} weight={focused ? 'fill' : 'regular'} />
            ),
          }}
        />
        <Tabs.Screen
          name="mis-partidas"
          options={{
            title: 'Mis Partidas',
            tabBarIcon: ({ focused, color }) => (
              <Flag size={24} color={color as string} weight={focused ? 'fill' : 'regular'} />
            ),
          }}
        />
        <Tabs.Screen
          name="chats"
          options={{
            title: 'Chats',
            tabBarIcon: ({ focused, color }) => (
              <ChatCircleDots size={24} color={color as string} weight={focused ? 'fill' : 'regular'} />
            ),
            tabBarBadge: unreadChats > 0 ? (unreadChats > 99 ? '99+' : String(unreadChats)) : undefined,
          }}
        />
        <Tabs.Screen
          name="perfil"
          options={{
            title: 'Perfil',
            tabBarIcon: ({ focused, color }) => (
              <User size={24} color={color as string} weight={focused ? 'fill' : 'regular'} />
            ),
          }}
        />
      </Tabs>
    );
  }

  const tintColor = DynamicColorIOS({ dark: c.primary, light: c.primaryDim });

  return (
    <NativeTabs tintColor={tintColor}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} />
        <NativeTabs.Trigger.Label>Inicio</NativeTabs.Trigger.Label>
        {unreadNotifs > 0 ? <NativeTabs.Trigger.Badge>{unreadNotifs > 99 ? '99+' : String(unreadNotifs)}</NativeTabs.Trigger.Badge> : null}
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="buscar">
        <NativeTabs.Trigger.Icon sf="magnifyingglass" />
        <NativeTabs.Trigger.Label>Buscar</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="mis-partidas">
        <NativeTabs.Trigger.Icon sf={{ default: 'soccerball', selected: 'soccerball.inverse' }} />
        <NativeTabs.Trigger.Label>Mis Partidas</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="chats">
        <NativeTabs.Trigger.Icon
          sf={{
            default: 'bubble.left.and.bubble.right',
            selected: 'bubble.left.and.bubble.right.fill',
          }}
        />
        <NativeTabs.Trigger.Label>Chats</NativeTabs.Trigger.Label>
        {unreadChats > 0 ? <NativeTabs.Trigger.Badge>{unreadChats > 99 ? '99+' : String(unreadChats)}</NativeTabs.Trigger.Badge> : null}
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="perfil">
        <NativeTabs.Trigger.Icon sf={{ default: 'person', selected: 'person.fill' }} />
        <NativeTabs.Trigger.Label>Perfil</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
