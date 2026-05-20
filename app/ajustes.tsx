import { useRouter } from 'expo-router';
import { CaretRight } from 'phosphor-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Card } from '@/components/ui/Card';
import { Divider } from '@/components/ui/Divider';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { colors, spacing, radius } from '@/theme';
import { useTheme, type ThemeMode } from '@/store/theme';

const THEME_OPTIONS: { label: string; value: ThemeMode }[] = [
  { label: 'Oscuro', value: 'dark' },
  { label: 'Claro', value: 'light' },
  { label: 'Sistema', value: 'system' },
];

function SectionLabel({ title }: { title: string }) {
  return (
    <Text variant="small" color="textTertiary" style={styles.sectionLabel}>
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
  const content = (
    <View style={styles.settingsRow}>
      <Text variant="bodyMedium" color={danger ? 'alert' : 'textPrimary'}>
        {label}
      </Text>
      {trailing ?? (
        <CaretRight size={16} color={danger ? colors.alert : colors.textTertiary} />
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
  const [nearbyMatches, setNearbyMatches] = useState(true);
  const [newMessages, setNewMessages] = useState(true);
  const [myMatches, setMyMatches] = useState(true);

  return (
    <Screen>
      <BackHeader title="Ajustes" onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Appearance */}
        <SectionLabel title="Apariencia" />
        <Card>
          <View style={styles.themeRow}>
            <Text variant="bodyMedium" color="textPrimary">
              Tema
            </Text>
            <View style={styles.pillGroup}>
              {THEME_OPTIONS.map((opt) => {
                const selected = mode === opt.value;
                return (
                  <PressableScale
                    key={opt.value}
                    onPress={() => setMode(opt.value)}
                    scaleTo={0.94}
                    style={[
                      styles.pill,
                      selected ? styles.pillSelected : styles.pillDefault,
                    ]}
                  >
                    <Text
                      variant="smallMedium"
                      color={selected ? 'primary' : 'textSecondary'}
                    >
                      {opt.label}
                    </Text>
                  </PressableScale>
                );
              })}
            </View>
          </View>
        </Card>

        {/* Notifications */}
        <SectionLabel title="Notificaciones" />
        <Card padded={false}>
          <View style={styles.toggleRow}>
            <Text variant="bodyMedium" color="textPrimary">
              Partidas cercanas
            </Text>
            <Switch
              value={nearbyMatches}
              onValueChange={setNearbyMatches}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.bg}
            />
          </View>
          <Divider inset />
          <View style={styles.toggleRow}>
            <Text variant="bodyMedium" color="textPrimary">
              Nuevos mensajes
            </Text>
            <Switch
              value={newMessages}
              onValueChange={setNewMessages}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.bg}
            />
          </View>
          <Divider inset />
          <View style={styles.toggleRow}>
            <Text variant="bodyMedium" color="textPrimary">
              Mis partidas
            </Text>
            <Switch
              value={myMatches}
              onValueChange={setMyMatches}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.bg}
            />
          </View>
        </Card>

        {/* Account */}
        <SectionLabel title="Cuenta" />
        <Card padded={false}>
          <SettingsRow label="Cambiar contraseña" onPress={() => {}} />
          <Divider inset />
          <SettingsRow label="Correo electrónico" onPress={() => {}} />
          <Divider inset />
          <SettingsRow label="Eliminar cuenta" danger onPress={() => {}} />
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.huge,
    gap: spacing.xl,
  },
  sectionLabel: {
    marginBottom: -spacing.md,
    marginLeft: spacing.xs,
  },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  pillGroup: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  pillSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  pillDefault: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
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
