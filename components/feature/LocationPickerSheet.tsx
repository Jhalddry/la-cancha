import * as Location from 'expo-location';
import { Crosshair, MapPin } from 'phosphor-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useColors } from '@/hooks/useColors';
import { radius, spacing } from '@/theme';
import type { ColorPalette } from '@/theme/palettes';

const FALLBACK_REGION = {
  latitude: 10.4806,
  longitude: -66.9036,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (loc: {
    name: string;
    address: string;
    lat: number;
    lng: number;
  }) => void;
  filterSport?: unknown; // kept for API compat, ignored
}

type Pin = { lat: number; lng: number };

export function LocationPickerSheet({ visible, onClose, onSelect }: Props) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const insets = useSafeAreaInsets();
  const [pin, setPin] = useState<Pin | null>(null);
  const [initialRegion, setInitialRegion] = useState(FALLBACK_REGION);
  const [locating, setLocating] = useState(false);
  const mapRef = useRef<MapView>(null);

  const goToUserLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const region = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      };
      setInitialRegion(region);
      mapRef.current?.animateToRegion(region, 600);
    } catch {
      // permission denied or unavailable — ignore
    } finally {
      setLocating(false);
    }
  };

  // Auto-locate when sheet opens
  useEffect(() => {
    if (!visible) return;
    void goToUserLocation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const resetAndClose = () => {
    setPin(null);
    onClose();
  };

  const confirm = () => {
    if (!pin) return;
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

        <View style={s.mapContainer}>
          <MapView
            ref={mapRef}
            provider={PROVIDER_DEFAULT}
            style={s.map}
            initialRegion={initialRegion}
            showsUserLocation
            showsMyLocationButton={false}
            onPress={(e) => {
              const { latitude, longitude } = e.nativeEvent.coordinate;
              setPin({ lat: latitude, lng: longitude });
            }}
          >
            {pin ? (
              <Marker
                coordinate={{ latitude: pin.lat, longitude: pin.lng }}
                pinColor={c.primary}
                title="Ubicación seleccionada"
              />
            ) : null}
          </MapView>

          {/* Locate-me FAB */}
          <Pressable
            style={s.locateBtn}
            onPress={() => void goToUserLocation()}
            hitSlop={8}
          >
            {locating ? (
              <ActivityIndicator size="small" color={c.primary} />
            ) : (
              <Crosshair size={20} color={c.primary} weight="bold" />
            )}
          </Pressable>
        </View>

        <View style={[s.bottomSheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          {pin ? (
            <View style={s.coordsRow}>
              <MapPin size={16} color={c.primary} weight="fill" />
              <Text variant="small" color="textSecondary">
                {pin.lat.toFixed(4)}, {pin.lng.toFixed(4)}
              </Text>
            </View>
          ) : (
            <Text variant="body" color="textSecondary" style={s.hint}>
              Toca cualquier punto del mapa para elegir la ubicación
            </Text>
          )}
          <Button label="Confirmar ubicación" onPress={confirm} disabled={!pin} />
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
    mapContainer: { flex: 1 },
    map: { flex: 1 },
    locateBtn: {
      position: 'absolute',
      bottom: spacing.lg,
      right: spacing.lg,
      width: 44,
      height: 44,
      borderRadius: radius.full,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 4,
    },
    bottomSheet: {
      backgroundColor: c.surface,
      padding: spacing.lg,
      gap: spacing.md,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    hint: { textAlign: 'center', paddingVertical: spacing.md },
    coordsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
  });
}
