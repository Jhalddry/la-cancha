import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { useColors } from '@/hooks/useColors';
import type { ColorPalette } from '@/theme/palettes';

interface ScreenProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  edges?: Edge[];
  scroll?: boolean;
}

export function Screen({ children, style, edges = ['top', 'left', 'right'] }: ScreenProps) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={styles.root}>
      <StatusBar style="auto" />
      <SafeAreaView edges={edges} style={[styles.safe, style]}>
        {children}
      </SafeAreaView>
    </View>
  );
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    safe: { flex: 1 },
  });
}
