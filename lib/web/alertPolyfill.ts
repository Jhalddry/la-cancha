import { Alert, Platform, type AlertButton } from 'react-native';

// react-native-web ships Alert.alert as a no-op, so every confirmation and
// error alert in the app silently vanishes on web. Map it to the browser dialogs.
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  Alert.alert = (title: string, message?: string, buttons?: AlertButton[]) => {
    const text = [title, message].filter(Boolean).join('\n\n');
    const actions = buttons ?? [];
    if (actions.length < 2) {
      window.alert(text);
      actions[0]?.onPress?.();
      return;
    }
    const cancel = actions.find((b) => b.style === 'cancel');
    const confirm = [...actions].reverse().find((b) => b.style !== 'cancel') ?? actions[actions.length - 1];
    if (window.confirm(text)) confirm.onPress?.();
    else cancel?.onPress?.();
  };
}
