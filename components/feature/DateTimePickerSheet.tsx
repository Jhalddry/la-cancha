import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { TextInput } from '@/components/ui/TextInput';
import { colors, radius, spacing } from '@/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  value: Date;
  onChange: (d: Date) => void;
  mode: 'date' | 'time';
  title?: string;
}

export function DateTimePickerSheet({
  visible,
  onClose,
  value,
  onChange,
  mode,
  title,
}: Props) {
  const minimumDate = mode === 'date' ? new Date() : undefined;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={title ?? (mode === 'date' ? 'Selecciona fecha' : 'Selecciona hora')}
    >
      <View style={styles.wrap}>
        <DateTimePicker
          value={value}
          mode={mode}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, date) => {
            if (date) onChange(date);
            if (Platform.OS !== 'ios') onClose();
          }}
          minimumDate={minimumDate}
          textColor={colors.textPrimary}
          themeVariant="dark"
        />
        {Platform.OS === 'ios' ? (
          <Button label="Listo" onPress={onClose} />
        ) : null}
      </View>
    </Sheet>
  );
}

interface DurationProps {
  visible: boolean;
  onClose: () => void;
  value: number;
  onChange: (min: number) => void;
}

const DURATION_PRESETS = [30, 45, 60, 75, 90, 105, 120, 150, 180];

export function DurationPickerSheet({
  visible,
  onClose,
  value,
  onChange,
}: DurationProps) {
  const isPreset = DURATION_PRESETS.includes(value);
  const [customMode, setCustomMode] = useState(!isPreset);
  const [customValue, setCustomValue] = useState(
    isPreset ? '' : value.toString(),
  );
  const [error, setError] = useState<string | undefined>();

  const confirmCustom = () => {
    const n = Number(customValue);
    if (!n || n < 5) {
      setError('Mínimo 5 minutos.');
      return;
    }
    if (n > 480) {
      setError('Máximo 480 minutos (8 horas).');
      return;
    }
    setError(undefined);
    onChange(n);
    onClose();
  };

  const handleClose = () => {
    setError(undefined);
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={handleClose} title="Duración estimada">
      <View style={styles.durationList}>
        {DURATION_PRESETS.map((d) => {
          const active = d === value && !customMode;
          return (
            <PressableScale
              key={d}
              onPress={() => {
                setCustomMode(false);
                onChange(d);
                onClose();
              }}
              style={[
                styles.durationRow,
                active ? styles.durationRowActive : null,
              ]}
              scaleTo={0.98}
            >
              <Text
                variant="bodyMedium"
                color={active ? 'primary' : 'textPrimary'}
              >
                {d} minutos
              </Text>
              {d >= 60 ? (
                <Text variant="small" color="textTertiary">
                  {(d / 60).toFixed(d % 60 === 0 ? 0 : 1)}h
                </Text>
              ) : null}
            </PressableScale>
          );
        })}

        <PressableScale
          onPress={() => setCustomMode(true)}
          style={[
            styles.durationRow,
            customMode ? styles.durationRowActive : null,
          ]}
          scaleTo={0.98}
        >
          <Text
            variant="bodyMedium"
            color={customMode ? 'primary' : 'textPrimary'}
          >
            Personalizada
          </Text>
        </PressableScale>

        {customMode ? (
          <View style={styles.customWrap}>
            <TextInput
              label="Minutos"
              placeholder="Ej: 75"
              keyboardType="numeric"
              value={customValue}
              onChangeText={(v) => {
                setCustomValue(v.replace(/[^0-9]/g, ''));
                setError(undefined);
              }}
              error={error}
            />
            <Button label="Aplicar" onPress={confirmCustom} />
          </View>
        ) : null}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md, alignItems: 'stretch' },
  durationList: { gap: spacing.xs },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  durationRowActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  customWrap: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
