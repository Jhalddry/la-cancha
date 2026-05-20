import { useColorScheme } from 'react-native';
import { darkPalette, lightPalette } from '@/theme/palettes';
import { useTheme } from '@/store/theme';

export function useColors() {
  const systemScheme = useColorScheme();
  const mode = useTheme((s) => s.mode);
  const resolved = mode === 'system' ? (systemScheme ?? 'dark') : mode;
  return resolved === 'light' ? lightPalette : darkPalette;
}
