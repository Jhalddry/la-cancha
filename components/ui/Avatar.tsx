import { useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { useColors } from '@/hooks/useColors';
import { radius } from '@/theme';
import type { ColorPalette } from '@/theme/palettes';

import { Text } from './Text';

interface Props {
  name: string;
  uri?: string;
  size?: number;
  bordered?: boolean;
}

export function Avatar({ name, uri, size = 40, bordered }: Props) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  const initials = getInitials(name);
  const dim = { width: size, height: size, borderRadius: size / 2 };
  return (
    <View
      style={[
        styles.base,
        dim,
        bordered && { borderWidth: 2, borderColor: c.bg },
      ]}
    >
      {uri ? (
        <Image source={{ uri }} style={dim} />
      ) : (
        <Text variant="smallMedium" color="textPrimary">
          {initials}
        </Text>
      )}
    </View>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    base: {
      backgroundColor: c.surfaceElevated,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
  });
}
