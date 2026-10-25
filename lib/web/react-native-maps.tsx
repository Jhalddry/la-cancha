// Web stand-in for react-native-maps (native-only). Metro aliases to this file
// when platform === 'web' (see metro.config.js).
import { Component, type ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

interface MapViewProps {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  [key: string]: unknown;
}

export const PROVIDER_DEFAULT = null;
export const PROVIDER_GOOGLE = 'google';

export function Marker(_props: Record<string, unknown>) {
  return null;
}

export default class MapView extends Component<MapViewProps> {
  animateToRegion() {}
  animateCamera() {}
  fitToCoordinates() {}

  render() {
    return (
      <View style={[styles.box, this.props.style]}>
        <Text style={styles.text}>Mapa disponible en la app móvil</Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: '#1F2630',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  text: { color: '#8A93A0', fontSize: 13 },
});
