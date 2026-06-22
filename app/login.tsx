import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import {
  AppleLogo,
  Envelope,
  Eye,
  EyeSlash,
  Lock,
} from 'phosphor-react-native';

import { GoogleColorIcon } from '@/components/brand/GoogleColorIcon';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';

import { Crosshair } from '@/components/brand/Crosshair';
import { Button } from '@/components/ui/Button';
import { Divider } from '@/components/ui/Divider';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { TextInput } from '@/components/ui/TextInput';
import { useColors } from '@/hooks/useColors';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/store/session';
import { spacing } from '@/theme';

const EMAIL_NOT_CONFIRMED = 'Email not confirmed';

export default function LoginScreen() {
  const router = useRouter();
  const signIn = useSession((s) => s.signIn);
  const completeOAuthSignIn = useSession((s) => s.completeOAuthSignIn);
  const c = useColors();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secure, setSecure] = useState(true);
  const [tried, setTried] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);

  // Forgot password sheet state
  const [forgotSheetVisible, setForgotSheetVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

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
    setEmailNotConfirmed(false);
    const error = await signIn(email.trim().toLowerCase(), password);
    setLoading(false);
    if (error) {
      if (error.includes(EMAIL_NOT_CONFIRMED)) {
        setEmailNotConfirmed(true);
        setAuthError(
          'Debes confirmar tu correo electrónico antes de ingresar. Revisa tu bandeja de entrada.',
        );
      } else {
        setAuthError('Correo o contraseña incorrectos.');
      }
      return;
    }
    router.replace('/(tabs)');
  };

  const handleResendConfirmation = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    const { error } = await supabase.auth.resend({ type: 'signup', email: trimmed });
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert(
        'Correo enviado',
        'Te reenviamos el correo de confirmación. Revisa tu bandeja de entrada.',
      );
    }
  };

  const handleForgotPassword = async () => {
    const trimmed = resetEmail.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      Alert.alert('Correo inválido', 'Ingresa un correo electrónico válido.');
      return;
    }
    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(trimmed);
    setResetLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setForgotSheetVisible(false);
      setResetEmail('');
      Alert.alert(
        'Correo enviado',
        'Revisa tu bandeja para restablecer tu contraseña.',
      );
    }
  };

  const openForgotSheet = () => {
    if (email.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setResetEmail(email.trim().toLowerCase());
    }
    setForgotSheetVisible(true);
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setAuthError(null);
    try {
      const redirectTo = Linking.createURL('auth-callback');
      console.log('[OAuth redirectTo]', redirectTo);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error || !data.url) throw error ?? new Error('No OAuth URL');

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      console.log('[OAuth result]', result.type, 'url' in result ? result.url?.slice(0, 120) : '(no url)');
      if (result.type === 'success' && result.url) {
        const err = await completeOAuthSignIn(result.url);
        if (!err) {
          router.replace('/(tabs)');
          return;
        }
        setAuthError(err);
      }
    } catch {
      setAuthError('No se pudo iniciar sesión con Google. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen edges={['top']}>
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
          <PressableScale scaleTo={0.97} style={staticStyles.forgotBtn} onPress={openForgotSheet}>
            <Text variant="smallMedium" color="primary">
              ¿Olvidaste tu contraseña?
            </Text>
          </PressableScale>
        </View>

        {authError ? (
          <View style={staticStyles.errorBlock}>
            <Text variant="small" color="alert" style={{ textAlign: 'center' }}>
              {authError}
            </Text>
            {emailNotConfirmed ? (
              <PressableScale scaleTo={0.97} onPress={handleResendConfirmation}>
                <Text variant="smallMedium" color="primary" style={{ textAlign: 'center' }}>
                  Reenviar correo de confirmación
                </Text>
              </PressableScale>
            ) : null}
          </View>
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
            leading={<GoogleColorIcon size={18} />}
            fullWidth={false}
            style={{ flex: 1, opacity: 0.4 }}
            disabled
          />
          <Button
            label="Apple"
            variant="secondary"
            leading={<AppleLogo size={18} color={c.textPrimary} weight="fill" />}
            fullWidth={false}
            style={{ flex: 1, opacity: 0.4 }}
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

      {/* Forgot password sheet */}
      <Sheet
        visible={forgotSheetVisible}
        onClose={() => {
          setForgotSheetVisible(false);
          setResetEmail('');
        }}
        title="Restablecer contraseña"
      >
        <View style={staticStyles.sheetContent}>
          <Text variant="body" color="textSecondary">
            Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
          </Text>
          <TextInput
            label="Correo electrónico"
            placeholder="tunombre@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={resetEmail}
            onChangeText={setResetEmail}
            leading={<Envelope size={18} color={c.textSecondary} weight="regular" />}
          />
          {resetLoading ? (
            <ActivityIndicator color={c.primary} />
          ) : (
            <Button label="Enviar correo" onPress={handleForgotPassword} />
          )}
        </View>
      </Sheet>
    </Screen>
  );
}

const staticStyles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.huge,
    gap: spacing.lg,
  },
  brandRow: { alignItems: 'center', marginVertical: spacing.md },
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center' },
  form: { gap: spacing.md },
  forgotBtn: { alignSelf: 'flex-end' },
  errorBlock: { gap: spacing.sm, alignItems: 'center' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dividerLabel: { letterSpacing: 0.6 },
  socialRow: { flexDirection: 'row', gap: spacing.md },
  regRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  sheetContent: { gap: spacing.lg },
});
