import { MapPin } from 'phosphor-react-native';
import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { CARACAS_CENTER, mockCanchas, type Cancha } from '@/data/canchas';
import { useColors } from '@/hooks/useColors';
import { radius, spacing } from '@/theme';
import type { ColorPalette } from '@/theme/palettes';
import type { Sport } from '@/types/domain';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (loc: {
    name: string;
    address: string;
    lat: number;
    lng: number;
  }) => void;
  filterSport?: Sport | null;
}

type Pin =
  | { kind: 'cancha'; cancha: Cancha }
  | { kind: 'custom'; lat: number; lng: number };

export function LocationPickerSheet({
  visible,
  onClose,
  onSelect,
  filterSport,
}: Props) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const insets = useSafeAreaInsets();
  const [pin, setPin] = useState<Pin | null>(null);

  const canchas = useMemo(() => {
    if (!filterSport) return mockCanchas;
    const matching = mockCanchas.filter((ca) => ca.sports.includes(filterSport));
    return matching.length > 0 ? matching : mockCanchas;
  }, [filterSport]);

  const resetAndClose = () => {
    setPin(null);
    onClose();
  };

  const confirm = () => {
    if (!pin) return;
    if (pin.kind === 'cancha') {
      onSelect({
        name: pin.cancha.name,
        address: pin.cancha.address,
        lat: pin.cancha.lat,
        lng: pin.cancha.lng,
      });
      resetAndClose();
      return;
    }
    onSelect({
      name: '',
      address: `Ubicación personalizada · ${pin.lat.toFixed(4)}, ${pin.lng.toFixed(4)}`,
      lat: pin.lat,
      lng: pin.lng,
    });
    resetAndClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={resetAndClose}
      statusBarTranslucent
    >
      <View style={[s.container, { paddingTop: insets.top }]}>
        <View style={s.header}>
          <Pressable onPress={resetAndClose} hitSlop={12} style={s.headerBtn}>
            <Text variant="bodyMedium" color="primary">
              Cancelar
            </Text>
          </Pressable>
          <Text variant="bodySemibold">Seleccionar ubicación</Text>
          <View style={s.headerBtn} />
        </View>

        <MapView
          provider={PROVIDER_DEFAULT}
          style={s.map}
          initialRegion={{
            latitude: CARACAS_CENTER.lat,
            longitude: CARACAS_CENTER.lng,
            latitudeDelta: CARACAS_CENTER.latDelta,
            longitudeDelta: CARACAS_CENTER.lngDelta,
          }}
          onPress={(e) => {
            const { latitude, longitude } = e.nativeEvent.coordinate;
            setPin({ kind: 'custom', lat: latitude, lng: longitude });
          }}
        >
          {canchas.map((ca) => (
            <Marker
              key={ca.id}
              coordinate={{ latitude: ca.lat, longitude: ca.lng }}
              title={ca.name}
              description={ca.address}
              pinColor={
                pin?.kind === 'cancha' && pin.cancha.id === ca.id ? c.primary : '#FF3B30'
              }
              onPress={(e) => {
                e.stopPropagation();
                setPin({ kind: 'cancha', cancha: ca });
              }}
            />
          ))}
          {pin?.kind === 'custom' ? (
            <Marker
              coordinate={{ latitude: pin.lat, longitude: pin.lng }}
              pinColor={c.primary}
              title="Ubicación personalizada"
            />
          ) : null}
        </MapView>

        <View
          style={[
            s.bottomSheet,
            { paddingBottom: insets.bottom + spacing.lg },
          ]}
        >
          {pin?.kind === 'cancha' ? (
            <View style={s.selectedCard}>
              <View style={s.selectedIcon}>
                <MapPin size={20} color={c.primary} weight="fill" />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodySemibold" color="textPrimary">
                  {pin.cancha.name}
                </Text>
                <Text variant="small" color="textSecondary">
                  {pin.cancha.address}
                </Text>
              </View>
            </View>
          ) : pin?.kind === 'custom' ? (
            <View style={s.coordsRow}>
              <MapPin size={16} color={c.primary} weight="fill" />
              <Text variant="small" color="textSecondary">
                Ubicación personalizada · {pin.lat.toFixed(4)}, {pin.lng.toFixed(4)}
              </Text>
            </View>
          ) : (
            <Text variant="body" color="textSecondary" style={s.hint}>
              Toca un pin existente o cualquier punto del mapa para elegir ubicación
            </Text>
          )}
          <Button
            label="Confirmar ubicación"
            onPress={confirm}
            disabled={!pin}
          />
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    headerBtn: { minWidth: 80 },
    map: { flex: 1 },
    bottomSheet: {
      backgroundColor: c.surface,
      padding: spacing.lg,
      gap: spacing.md,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    hint: { textAlign: 'center', paddingVertical: spacing.md },
    selectedCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
      backgroundColor: c.primarySoft,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.primary,
    },
    selectedIcon: {
      width: 40,
      height: 40,
      borderRadius: radius.full,
      backgroundColor: c.bg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    coordsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
  });
}
