import {
  Badge,
  Icon,
  Label,
  NativeTabs,
} from 'expo-router/unstable-native-tabs';
import { Redirect, Tabs } from 'expo-router';
import { ChatCircleDots, Flag, House, MagnifyingGlass, User } from 'phosphor-react-native';
import { DynamicColorIOS, Platform } from 'react-native';

import { useUnreadChatCount } from '@/hooks/useChat';
import { useColors } from '@/hooks/useColors';
import { useUnreadCount } from '@/hooks/useNotifications';
import { useSession } from '@/store/session';

export default function TabsLayout() {
  const isAuthed = useSession((s) => s.isAuthed);
  const isOnboarded = useSession((s) => s.isOnboarded);
  const user = useSession((s) => s.user);
  const c = useColors();
  const unreadChats = useUnreadChatCount();
  const { data: unreadNotifs = 0 } = useUnreadCount();

  if (!isAuthed) return <Redirect href="/login" />;
  if (!user) return null;
  if (!isOnboarded) return <Redirect href="/onboarding" />;

  if (Platform.OS === 'android') {
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
              <House size={24} color={color} weight={focused ? 'fill' : 'regular'} />
            ),
            tabBarBadge: unreadNotifs > 0 ? (unreadNotifs > 99 ? '99+' : String(unreadNotifs)) : undefined,
          }}
        />
        <Tabs.Screen
          name="buscar"
          options={{
            title: 'Buscar',
            tabBarIcon: ({ focused, color }) => (
              <MagnifyingGlass size={24} color={color} weight={focused ? 'fill' : 'regular'} />
            ),
          }}
        />
        <Tabs.Screen
          name="mis-partidas"
          options={{
            title: 'Mis Partidas',
            tabBarIcon: ({ focused, color }) => (
              <Flag size={24} color={color} weight={focused ? 'fill' : 'regular'} />
            ),
          }}
        />
        <Tabs.Screen
          name="chats"
          options={{
            title: 'Chats',
            tabBarIcon: ({ focused, color }) => (
              <ChatCircleDots size={24} color={color} weight={focused ? 'fill' : 'regular'} />
            ),
            tabBarBadge: unreadChats > 0 ? (unreadChats > 99 ? '99+' : String(unreadChats)) : undefined,
          }}
        />
        <Tabs.Screen
          name="perfil"
          options={{
            title: 'Perfil',
            tabBarIcon: ({ focused, color }) => (
              <User size={24} color={color} weight={focused ? 'fill' : 'regular'} />
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
        <Icon sf={{ default: 'house', selected: 'house.fill' }} />
        <Label>Inicio</Label>
        {unreadNotifs > 0 ? <Badge>{unreadNotifs > 99 ? '99+' : String(unreadNotifs)}</Badge> : null}
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
