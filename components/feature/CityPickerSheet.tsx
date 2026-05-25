import * as Location from 'expo-location';
import { Check, MapPin, NavigationArrow } from 'phosphor-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { PressableScale } from '@/components/ui/PressableScale';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { matchCity, VENEZUELAN_CITIES } from '@/lib/cities';
import { useColors } from '@/hooks/useColors';
import { spacing } from '@/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  currentCity?: string;
  onSelect: (city: string) => void;
}

export function CityPickerSheet({ visible, onClose, currentCity, onSelect }: Props) {
  const c = useColors();
  const [detecting, setDetecting] = useState(false);

  const detectCity = async () => {
    setDetecting(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permiso denegado',
          'Activa el permiso de ubicación en Configuración para detectar tu ciudad automáticamente.',
        );
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const [geo] = await Location.reverseGeocodeAsync(loc.coords);
      const rawCity = geo?.city ?? geo?.subregion ?? geo?.region ?? '';
      const matched = rawCity ? matchCity(rawCity) : null;

      if (matched) {
        onSelect(matched);
        onClose();
      } else {
        // Show what was detected even if not in our list
        const fallback = rawCity || 'Desconocida';
        Alert.alert(
          'Ciudad detectada',
          `Tu ubicación es: ${fallback}.\n¿Usarla de todas formas?`,
          [
            { text: 'No', style: 'cancel' },
            {
              text: 'Sí',
              onPress: () => {
                onSelect(fallback);
                onClose();
              },
            },
          ],
        );
      }
    } catch {
      Alert.alert('Error', 'No se pudo obtener tu ubicación. Selecciona tu ciudad manualmente.');
    } finally {
      setDetecting(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Tu ciudad">
      {/* GPS detect button */}
      <PressableScale
        onPress={detectCity}
        scaleTo={0.97}
        style={[
          styles.detectBtn,
          { backgroundColor: c.primarySoft, borderColor: c.primary, borderWidth: 1 },
        ]}
      >
        {detecting ? (
          <ActivityIndicator size="small" color={c.primary} />
        ) : (
          <NavigationArrow size={18} color={c.primary} weight="fill" />
        )}
        <Text variant="bodyMedium" color="primary">
          {detecting ? 'Detectando…' : 'Detectar mi ubicación'}
        </Text>
      </PressableScale>

      <Text variant="caption" color="textTertiary" style={styles.orLabel}>
        O ELIGE MANUALMENTE
      </Text>

      {/* City list */}
      <View style={styles.list}>
        {VENEZUELAN_CITIES.map((city) => {
          const active = currentCity === city;
          return (
            <PressableScale
              key={city}
              style={[styles.row, { borderBottomColor: c.border }]}
              scaleTo={0.98}
              onPress={() => {
                onSelect(city);
                onClose();
              }}
            >
              <MapPin size={16} color={active ? c.primary : c.textTertiary} weight={active ? 'fill' : 'regular'} />
              <Text variant="body" color={active ? 'primary' : 'textPrimary'} style={{ flex: 1 }}>
                {city}
              </Text>
              {active && <Check size={18} color={c.primary} weight="bold" />}
            </PressableScale>
          );
        })}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  detectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  orLabel: {
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
    marginLeft: spacing.xs,
  },
  list: { gap: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
});
