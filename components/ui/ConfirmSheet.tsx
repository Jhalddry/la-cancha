import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useColors } from '@/hooks/useColors';
import { radius, spacing } from '@/theme';
import type { ColorPalette } from '@/theme/palettes';

import { Button } from './Button';
import { Sheet } from './Sheet';
import { Text } from './Text';

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  confirmLabel: string;
  /** Color for the confirm button background. Defaults to c.alert (destructive). */
  confirmColor?: string;
  onConfirm: () => void;
  /** If set, the confirm button will be disabled for `countdown` seconds on open, then enabled. */
  countdown?: number;
  /** Optional icon rendered above the title. */
  icon?: React.ReactNode;
}

export function ConfirmSheet({
  visible,
  onClose,
  title,
  description,
  confirmLabel,
  confirmColor,
  onConfirm,
  countdown,
  icon,
}: Props) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const [remaining, setRemaining] = useState(countdown ?? 0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset and start countdown whenever sheet opens
  useEffect(() => {
    if (visible && countdown && countdown > 0) {
      setRemaining(countdown);
      intervalRef.current = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setRemaining(0);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [visible, countdown]);

  const isCountingDown = remaining > 0;
  const btnColor = confirmColor ?? c.alert;
  const btnLabel = isCountingDown ? `${confirmLabel} (${remaining}s)` : confirmLabel;

  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <View style={s.body}>
        {icon ? <View style={s.iconWrap}>{icon}</View> : null}
        {description ? (
          <Text variant="body" color="textSecondary" style={s.desc}>
            {description}
          </Text>
        ) : null}
        <View style={s.actions}>
          <Button
            label="Cancelar"
            variant="secondary"
            onPress={onClose}
            style={{ flex: 1 }}
          />
          <Button
            label={btnLabel}
            disabled={isCountingDown}
            onPress={() => {
              onClose();
              onConfirm();
            }}
            style={[{ flex: 1 }, !isCountingDown ? { backgroundColor: btnColor } : undefined]}
          />
        </View>
      </View>
    </Sheet>
  );
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    body: { gap: spacing.lg, paddingBottom: spacing.md },
    iconWrap: { alignItems: 'center' },
    desc: { textAlign: 'center', lineHeight: 22 },
    actions: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
  });
}
