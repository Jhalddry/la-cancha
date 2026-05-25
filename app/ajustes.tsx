import { useRouter } from 'expo-router';
import { CaretRight, MapPin } from 'phosphor-react-native';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Card } from '@/components/ui/Card';
import { Divider } from '@/components/ui/Divider';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { CityPickerSheet } from '@/components/feature/CityPickerSheet';
import { useColors } from '@/hooks/useColors';
import type { ColorPalette } from '@/theme/palettes';
import { spacing } from '@/theme';
import { useSession } from '@/store/session';
import { useTheme } from '@/store/theme';


function SectionLabel({ title }: { title: string }) {
  return (
    <Text variant="small" color="textTertiary" style={staticStyles.sectionLabel}>
      {title.toUpperCase()}
    </Text>
  );
}

function SettingsRow({
  label,
  onPress,
  danger,
  trailing,
}: {
  label: string;
  onPress?: () => void;
  danger?: boolean;
  trailing?: React.ReactNode;
}) {
  const c = useColors();
  const content = (
    <View style={staticStyles.settingsRow}>
      <Text variant="bodyMedium" color={danger ? 'alert' : 'textPrimary'}>
        {label}
      </Text>
      {trailing ?? (
        <CaretRight size={16} color={danger ? c.alert : c.textTertiary} />
      )}
    </View>
  );

  if (onPress) {
    return (
      <PressableScale onPress={onPress} scaleTo={0.98}>
        {content}
      </PressableScale>
    );
  }
  return content;
}

export default function AjustesScreen() {
  const router = useRouter();
  const { mode, setMode } = useTheme();
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const user = useSession((st) => st.user);
  const setCityStore = useSession((st) => st.setCity);
  const [citySheetOpen, setCitySheetOpen] = useState(false);
  const [nearbyMatches, setNearbyMatches] = useState(true);
  const [newMessages, setNewMessages] = useState(true);
  const [myMatches, setMyMatches] = useState(true);

  return (
    <Screen>
      <BackHeader title="Ajustes" onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Location */}
        <SectionLabel title="Ubicación" />
        <Card padded={false}>
          <PressableScale onPress={() => setCitySheetOpen(true)} scaleTo={0.98}>
            <View style={staticStyles.settingsRow}>
              <MapPin size={16} color={c.primary} weight="fill" />
              <Text variant="bodyMedium" color="textPrimary" style={{ flex: 1 }}>
                {user?.city ?? 'Selecciona tu ciudad'}
              </Text>
              <CaretRight size={16} color={c.textTertiary} />
            </View>
          </PressableScale>
        </Card>

        {/* Appearance */}
        <SectionLabel title="Apariencia" />
        <Card padded={false}>
          <View style={staticStyles.toggleRow}>
            <Text variant="bodyMedium" color="textPrimary">
              Modo oscuro
            </Text>
            <Switch
              value={mode === 'dark'}
              onValueChange={(v) => setMode(v ? 'dark' : 'light')}
              trackColor={{ false: c.border, true: c.primaryBg }}
              thumbColor={c.bg}
            />
          </View>
        </Card>

        {/* Notifications */}
        <SectionLabel title="Notificaciones" />
        <Card padded={false}>
          <View style={staticStyles.toggleRow}>
            <Text variant="bodyMedium" color="textPrimary">
              Partidas cercanas
            </Text>
            <Switch
              value={nearbyMatches}
              onValueChange={setNearbyMatches}
              trackColor={{ false: c.border, true: c.primaryBg }}
              thumbColor={c.bg}
            />
          </View>
          <Divider inset />
          <View style={staticStyles.toggleRow}>
            <Text variant="bodyMedium" color="textPrimary">
              Nuevos mensajes
            </Text>
            <Switch
              value={newMessages}
              onValueChange={setNewMessages}
              trackColor={{ false: c.border, true: c.primaryBg }}
              thumbColor={c.bg}
            />
          </View>
          <Divider inset />
          <View style={staticStyles.toggleRow}>
            <Text variant="bodyMedium" color="textPrimary">
              Mis partidas
            </Text>
            <Switch
              value={myMatches}
              onValueChange={setMyMatches}
              trackColor={{ false: c.border, true: c.primaryBg }}
              thumbColor={c.bg}
            />
          </View>
        </Card>

        {/* Account */}
        <SectionLabel title="Cuenta" />
        <Card padded={false}>
          <SettingsRow label="Cambiar contraseña" onPress={() => router.push('/cuenta/contrasena')} />
          <Divider inset />
          <SettingsRow label="Correo electrónico" onPress={() => router.push('/cuenta/correo')} />
          <Divider inset />
          <SettingsRow
            label="Eliminar cuenta"
            danger
            onPress={() =>
              Alert.alert(
                'Eliminar cuenta',
                '¿Estás seguro? Esta acción es irreversible y eliminarás todos tus datos.',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Eliminar', style: 'destructive', onPress: () => {} },
                ],
              )
            }
          />
        </Card>
      </ScrollView>

      <CityPickerSheet
        visible={citySheetOpen}
        onClose={() => setCitySheetOpen(false)}
        currentCity={user?.city}
        onSelect={(city) => setCityStore(city)}
      />
    </Screen>
  );
}

const staticStyles = StyleSheet.create({
  sectionLabel: {
    marginBottom: -spacing.md,
    marginLeft: spacing.xs,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
});

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    content: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.huge,
      gap: spacing.xl,
    },
  });
}
