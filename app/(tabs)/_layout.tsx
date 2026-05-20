import {
  Icon,
  Label,
  NativeTabs,
} from 'expo-router/unstable-native-tabs';
import { DynamicColorIOS, Platform } from 'react-native';

import { useColors } from '@/hooks/useColors';

export default function TabsLayout() {
  const c = useColors();

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
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="perfil">
        <Icon sf={{ default: 'person', selected: 'person.fill' }} />
        <Label>Perfil</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
