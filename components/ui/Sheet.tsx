import { BlurView } from 'expo-blur';
import { X } from 'phosphor-react-native';
import { type ReactNode, useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/hooks/useColors';
import { radius, spacing } from '@/theme';
import type { ColorPalette } from '@/theme/palettes';

import { Text } from './Text';

interface Props {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

const SCREEN_H = Dimensions.get('window').height;

export function Sheet({ visible, onClose, title, children }: Props) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const insets = useSafeAreaInsets();
  const keyboardH = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const show = Keyboard.addListener(showEvent, (e) => {
      Animated.timing(keyboardH, {
        toValue: e.endCoordinates.height,
        duration: Platform.OS === 'ios' ? e.duration ?? 250 : 200,
        useNativeDriver: false,
      }).start();
    });

    const hide = Keyboard.addListener(hideEvent, (e) => {
      Animated.timing(keyboardH, {
        toValue: 0,
        duration: Platform.OS === 'ios' ? e.duration ?? 250 : 200,
        useNativeDriver: false,
      }).start();
    });

    return () => {
      show.remove();
      hide.remove();
    };
  }, [keyboardH]);

  const maxH = SCREEN_H - insets.top - spacing.xxl;

  const sheetPb = keyboardH.interpolate({
    inputRange: [0, 1],
    outputRange: [insets.bottom + spacing.lg, spacing.sm],
    extrapolate: 'clamp',
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <BlurView style={StyleSheet.absoluteFill} intensity={18} tint="dark" />
      <Pressable style={StyleSheet.absoluteFill} onPress={() => { Keyboard.dismiss(); onClose(); }} />
      <Animated.View style={[s.container, { paddingBottom: keyboardH }]} pointerEvents="box-none">
        <Animated.View style={[s.sheet, { maxHeight: maxH, paddingBottom: sheetPb }]}>
          <View style={s.grabber} />

          {title ? (
            <View style={s.header}>
              <Text variant="h3">{title}</Text>
              <Pressable onPress={() => { Keyboard.dismiss(); onClose(); }} hitSlop={12} style={s.close}>
                <X size={20} color={c.textSecondary} weight="bold" />
              </Pressable>
            </View>
          ) : null}

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.content}
          >
            {children}
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );

}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: c.surface,
      borderTopLeftRadius: radius.xxl,
      borderTopRightRadius: radius.xxl,
      paddingTop: spacing.sm,
      paddingHorizontal: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    grabber: {
      alignSelf: 'center',
      width: 44,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.border,
      marginBottom: spacing.md,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    close: {
      width: 32,
      height: 32,
      borderRadius: radius.full,
      backgroundColor: c.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: { paddingVertical: spacing.lg },
  });
}
