import { useRouter } from 'expo-router';
import { CaretLeft } from 'phosphor-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';

import { PressableScale } from './PressableScale';
import { Text } from './Text';

interface Props {
  title?: string;
  onBack?: () => void;
  trailing?: ReactNode;
  transparent?: boolean;
}

export function BackHeader({ title, onBack, trailing, transparent }: Props) {
  const router = useRouter();
  const handleBack = onBack ?? (() => router.back());
  return (
    <View
      style={[
        styles.row,
        transparent ? null : styles.bar,
      ]}
    >
      <PressableScale style={styles.iconBtn} scaleTo={0.9} onPress={handleBack}>
        <CaretLeft size={22} color={colors.textPrimary} weight="bold" />
      </PressableScale>
      <View style={styles.titleWrap}>
        {title ? (
          <Text variant="bodySemibold" color="textPrimary" numberOfLines={1}>
            {title}
          </Text>
        ) : null}
      </View>
      <View style={styles.trailing}>{trailing}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  bar: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.bg,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: { flex: 1, alignItems: 'center', paddingHorizontal: spacing.md },
  trailing: { minWidth: 40, alignItems: 'flex-end' },
});
