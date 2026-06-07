import { useNavigation, useRouter } from 'expo-router';
import { CaretLeft } from 'phosphor-react-native';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useColors } from '@/hooks/useColors';
import { radius, spacing } from '@/theme';
import type { ColorPalette } from '@/theme/palettes';

import { PressableScale } from './PressableScale';
import { Text } from './Text';

interface Props {
  title?: string;
  titleNode?: ReactNode;
  onBack?: () => void;
  trailing?: ReactNode;
  transparent?: boolean;
}

export function BackHeader({ title, titleNode, onBack, trailing, transparent }: Props) {
  const router = useRouter();
  const navigation = useNavigation();
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const canGoBack = onBack != null || navigation.canGoBack();
  const handleBack = onBack ?? (() => router.back());
  return (
    <View
      style={[
        styles.row,
        transparent ? null : styles.bar,
      ]}
    >
      {canGoBack ? (
        <PressableScale style={styles.iconBtn} scaleTo={0.9} onPress={handleBack}>
          <CaretLeft size={22} color={c.textPrimary} weight="bold" />
        </PressableScale>
      ) : (
        <View style={styles.iconBtn} />
      )}
      <View style={styles.titleWrap}>
        {titleNode ?? (title ? (
          <Text variant="bodySemibold" color="textPrimary" numberOfLines={1}>
            {title}
          </Text>
        ) : null)}
      </View>
      <View style={styles.trailing}>{trailing}</View>
    </View>
  );
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    bar: {
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      backgroundColor: c.bg,
    },
    iconBtn: {
      width: 40,
      height: 40,
      borderRadius: radius.full,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    titleWrap: { flex: 1, alignItems: 'center', paddingHorizontal: spacing.md },
    trailing: { minWidth: 40, alignItems: 'flex-end' },
  });
}
