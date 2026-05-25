import { useRouter } from 'expo-router';
import {
  AppleLogo,
  Envelope,
  Eye,
  EyeSlash,
  GoogleLogo,
  Lock,
} from 'phosphor-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { Crosshair } from '@/components/brand/Crosshair';
import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { Divider } from '@/components/ui/Divider';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { TextInput } from '@/components/ui/TextInput';
import { useColors } from '@/hooks/useColors';
import { useSession } from '@/store/session';
import { spacing } from '@/theme';

export default function LoginScreen() {
  const router = useRouter();
  const signIn = useSession((s) => s.signIn);
  const c = useColors();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secure, setSecure] = useState(true);
  const [tried, setTried] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const errors = useMemo(() => {
    const e: { email?: string; password?: string } = {};
    if (!email.trim()) e.email = 'Ingresa tu correo electrónico.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      e.email = 'Correo electrónico inválido.';
    if (!password) e.password = 'Ingresa tu contraseña.';
    return e;
  }, [email, password]);
  const shown = tried ? errors : {};

  const submit = async () => {
    if (Object.keys(errors).length > 0) {
      setTried(true);
      return;
    }
    setLoading(true);
    setAuthError(null);
    const error = await signIn(email.trim().toLowerCase(), password);
    setLoading(false);
    if (error) {
      setAuthError('Correo o contraseña incorrectos.');
      return;
    }
    router.replace('/(tabs)');
  };

  const submitSocial = () => {
    // Social auth — stub for now
  };

  return (
    <Screen edges={['top']}>
      <BackHeader transparent />
      <ScrollView
        contentContainerStyle={staticStyles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={staticStyles.brandRow}>
          <Crosshair size={48} />
        </View>
        <Text variant="h1" color="textPrimary" style={staticStyles.title}>
          Iniciar sesión
        </Text>
        <Text variant="body" color="textSecondary" style={staticStyles.subtitle}>
          Bienvenido de vuelta. Arma tu próxima partida.
        </Text>

        <View style={staticStyles.form}>
          <TextInput
            label="Correo electrónico"
            placeholder="tunombre@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            leading={<Envelope size={18} color={c.textSecondary} weight="regular" />}
            error={shown.email}
          />
          <TextInput
            label="Contraseña"
            placeholder="••••••••"
            secureTextEntry={secure}
            value={password}
            onChangeText={setPassword}
            leading={<Lock size={18} color={c.textSecondary} weight="regular" />}
            trailing={
              <PressableScale onPress={() => setSecure((v) => !v)} scaleTo={0.9}>
                {secure ? (
                  <EyeSlash size={18} color={c.textTertiary} weight="regular" />
                ) : (
                  <Eye size={18} color={c.textTertiary} weight="regular" />
                )}
              </PressableScale>
            }
            error={shown.password}
          />
          <PressableScale scaleTo={0.97} style={staticStyles.forgotBtn}>
            <Text variant="smallMedium" color="primary">
              ¿Olvidaste tu contraseña?
            </Text>
          </PressableScale>
        </View>

        {authError ? (
          <Text variant="small" color="alert" style={{ textAlign: 'center' }}>
            {authError}
          </Text>
        ) : null}
        {loading ? (
          <ActivityIndicator color={c.primary} />
        ) : (
          <Button label="Iniciar sesión" onPress={submit} />
        )}

        <View style={staticStyles.dividerRow}>
          <Divider />
          <Text variant="caption" color="textTertiary" style={staticStyles.dividerLabel}>
            O continuar con
          </Text>
          <Divider />
        </View>

        <View style={staticStyles.socialRow}>
          <Button
            label="Google"
            variant="secondary"
            onPress={submitSocial}
            leading={<GoogleLogo size={18} color={c.textPrimary} weight="bold" />}
            fullWidth={false}
            style={{ flex: 1 }}
          />
          <Button
            label="Apple"
            variant="secondary"
            onPress={submitSocial}
            leading={<AppleLogo size={18} color={c.textPrimary} weight="fill" />}
            fullWidth={false}
            style={{ flex: 1 }}
          />
        </View>

        <View style={staticStyles.regRow}>
          <Text variant="small" color="textSecondary">
            ¿No tienes cuenta?{' '}
          </Text>
          <PressableScale scaleTo={0.97} onPress={() => router.push('/register')}>
            <Text variant="smallMedium" color="primary">
              Regístrate
            </Text>
          </PressableScale>
        </View>
      </ScrollView>
    </Screen>
  );
}

const staticStyles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.huge,
    gap: spacing.lg,
  },
  brandRow: { alignItems: 'center', marginVertical: spacing.md },
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center' },
  form: { gap: spacing.md },
  forgotBtn: { alignSelf: 'flex-end' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dividerLabel: { letterSpacing: 0.6 },
  socialRow: { flexDirection: 'row', gap: spacing.md },
  regRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
});
