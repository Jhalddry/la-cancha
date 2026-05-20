import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  CalendarBlank,
  CaretRight,
  ClockCounterClockwise,
  MapPin,
  ShieldCheck,
  Siren,
  Trash,
  Users,
  Wallet,
  X,
} from 'phosphor-react-native';
import { useState, type ReactNode } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import {
  DateTimePickerSheet,
  DurationPickerSheet,
} from '@/components/feature/DateTimePickerSheet';
import { LocationPickerSheet } from '@/components/feature/LocationPickerSheet';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { mockMatches } from '@/data/matches';
import { MatchTypeBadge } from '@/features/match/MatchTypeBadge';
import { formatMatchTime, labelModality, labelPayment, labelPosition } from '@/lib/format';
import { colors, radius, spacing } from '@/theme';
import type { Sport } from '@/types/domain';

const SPORT_EMOJIS: Record<Sport, string> = {
  futbol: '⚽',
  tenis: '🎾',
  padel: '🏓',
  beachTennis: '🏖️',
  basket: '🏀',
};

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function fmtDate(d: Date) {
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
function fmtTime(d: Date) {
  const h = d.getHours();
  const m = d.getMinutes();
  const period = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${period}`;
}

export default function EditarPartidaScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const match = mockMatches.find((m) => m.id === id) ?? mockMatches[0];

  const [date, setDate] = useState(() => new Date(match.startsAt));
  const [durationMin, setDurationMin] = useState(match.durationMin);
  const [locationName, setLocationName] = useState(match.location.name);
  const [locationAddress, setLocationAddress] = useState(match.location.address ?? '');

  const [dateOpen, setDateOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [durationOpen, setDurationOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);

  const handleCancel = () => {
    Alert.alert(
      'Cancelar partida',
      'Se notificará a todos los jugadores que la partida fue cancelada.',
      [
        { text: 'No cancelar', style: 'cancel' },
        {
          text: 'Cancelar partida',
          style: 'destructive',
          onPress: () => router.replace('/(tabs)'),
        },
      ],
    );
  };

  const handleDelete = () => {
    Alert.alert(
      'Eliminar partida',
      'Esta acción no se puede deshacer. La partida será eliminada permanentemente.',
      [
        { text: 'No eliminar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => router.replace('/(tabs)'),
        },
      ],
    );
  };

  return (
    <Screen edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <PressableScale onPress={() => router.back()} scaleTo={0.9}>
          <X size={22} color={colors.textPrimary} weight="bold" />
        </PressableScale>
        <Text variant="bodySemibold">Editar partida</Text>
        <PressableScale scaleTo={0.95} onPress={() => router.back()}>
          <Text variant="bodySemibold" color="primary">
            Guardar
          </Text>
        </PressableScale>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Match identity card */}
        <Card>
          <View style={styles.matchIdRow}>
            <Text style={styles.sportEmoji}>{SPORT_EMOJIS[match.sport]}</Text>
            <View style={{ flex: 1 }}>
              <View style={styles.badgeRow}>
                <Text variant="bodySemibold" color="textPrimary">
                  {labelModality(match.modality)}
                </Text>
                <MatchTypeBadge type={match.type} />
              </View>
              <Text variant="small" color="textTertiary">
                Creada el {fmtDate(new Date(match.startsAt))}, {fmtTime(new Date(match.startsAt))}
              </Text>
            </View>
          </View>
        </Card>

        {/* Settings rows */}
        <View style={styles.settingsGroup}>
          <SettingsRow
            icon={<CalendarBlank size={18} color={colors.primary} weight="fill" />}
            label="Fecha y hora"
            value={`${fmtDate(date)} · ${fmtTime(date)}`}
            onPress={() => setDateOpen(true)}
          />
          <View style={styles.rowDivider} />
          <SettingsRow
            icon={<ClockCounterClockwise size={18} color={colors.primary} weight="fill" />}
            label="Duración"
            value={`${durationMin} minutos`}
            onPress={() => setDurationOpen(true)}
          />
          <View style={styles.rowDivider} />
          <SettingsRow
            icon={<MapPin size={18} color={colors.primary} weight="fill" />}
            label="Ubicación"
            value={locationName || 'Sin cancha'}
            sub={locationAddress || undefined}
            onPress={() => setLocationOpen(true)}
          />
        </View>

        <View style={styles.settingsGroup}>
          <SettingsRow
            icon={<Users size={18} color={colors.primary} weight="fill" />}
            label="Posiciones faltantes"
            value={`${match.missingCount} jugadores · ${match.missingPositions.map(labelPosition).join(', ')}`}
          />
          <View style={styles.rowDivider} />
          <SettingsRow
            icon={<Wallet size={18} color={colors.primary} weight="fill" />}
            label="Precio y pagos"
            value={`$${match.pricePerHour}/h · ${match.paymentMethods.length} métodos`}
            sub={match.paymentMethods.map(labelPayment).join(', ')}
          />
          <View style={styles.rowDivider} />
          <SettingsRow
            icon={<ShieldCheck size={18} color={colors.primary} weight="fill" />}
            label="Requisitos"
            value={`${match.requirements.length} configurados`}
          />
        </View>

        {/* Danger zone */}
        <View style={styles.dangerSection}>
          <View style={styles.dangerHeader}>
            <Siren size={15} color={colors.alert} weight="fill" />
            <Text variant="caption" color="alert">
              Zona peligrosa
            </Text>
          </View>
          <View style={styles.dangerGroup}>
            <PressableScale style={styles.dangerRow} scaleTo={0.98} onPress={handleCancel}>
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium" color="alert">
                  Cancelar partida
                </Text>
                <Text variant="small" color="textTertiary">
                  Se notificará a todos los jugadores
                </Text>
              </View>
              <CaretRight size={16} color={colors.alert} weight="bold" />
            </PressableScale>
            <View style={styles.rowDivider} />
            <PressableScale style={styles.dangerRow} scaleTo={0.98} onPress={handleDelete}>
              <Trash size={18} color={colors.alert} weight="fill" />
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium" color="alert">
                  Eliminar partida
                </Text>
                <Text variant="small" color="textTertiary">
                  Esta acción no se puede deshacer
                </Text>
              </View>
              <CaretRight size={16} color={colors.alert} weight="bold" />
            </PressableScale>
          </View>
        </View>
      </ScrollView>

      {/* Pickers */}
      <DateTimePickerSheet
        visible={dateOpen}
        onClose={() => setDateOpen(false)}
        value={date}
        mode="date"
        onChange={(d) => {
          const next = new Date(date);
          next.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
          setDate(next);
        }}
      />
      <DateTimePickerSheet
        visible={timeOpen}
        onClose={() => setTimeOpen(false)}
        value={date}
        mode="time"
        onChange={(d) => {
          const next = new Date(date);
          next.setHours(d.getHours(), d.getMinutes(), 0, 0);
          setDate(next);
        }}
      />
      <DurationPickerSheet
        visible={durationOpen}
        onClose={() => setDurationOpen(false)}
        value={durationMin}
        onChange={setDurationMin}
      />
      <LocationPickerSheet
        visible={locationOpen}
        onClose={() => setLocationOpen(false)}
        filterSport={match.sport}
        onSelect={(c) => {
          setLocationName(c.name || c.address);
          setLocationAddress(c.address);
        }}
      />
    </Screen>
  );
}

function SettingsRow({
  icon,
  label,
  value,
  sub,
  onPress,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  sub?: string;
  onPress?: () => void;
}) {
  const inner = (
    <View style={styles.settingsRow}>
      <View style={styles.settingsIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text variant="caption" color="textTertiary">
          {label}
        </Text>
        <Text variant="bodyMedium" color="textPrimary" numberOfLines={1}>
          {value}
        </Text>
        {sub ? (
          <Text variant="small" color="textSecondary" numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </View>
      {onPress ? (
        <CaretRight size={16} color={colors.textTertiary} weight="bold" />
      ) : null}
    </View>
  );
  if (onPress) {
    return (
      <PressableScale scaleTo={0.98} onPress={onPress}>
        {inner}
      </PressableScale>
    );
  }
  return inner;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 60,
    gap: spacing.md,
  },
  matchIdRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  sportEmoji: { fontSize: 28, lineHeight: 36 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  settingsGroup: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  settingsIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowDivider: { height: 1, backgroundColor: colors.border, marginLeft: 68 },
  dangerSection: { gap: spacing.sm },
  dangerHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dangerGroup: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: `${colors.alert}44`,
    overflow: 'hidden',
  },
  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
});
