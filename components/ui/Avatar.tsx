import { Image, StyleSheet, View } from 'react-native';

import { colors, radius } from '@/theme';

import { Text } from './Text';

interface Props {
  name: string;
  uri?: string;
  size?: number;
  bordered?: boolean;
}

export function Avatar({ name, uri, size = 40, bordered }: Props) {
  const initials = getInitials(name);
  const dim = { width: size, height: size, borderRadius: size / 2 };
  return (
    <View
      style={[
        styles.base,
        dim,
        bordered && { borderWidth: 2, borderColor: colors.bg },
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

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
