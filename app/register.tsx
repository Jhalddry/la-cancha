import { makeRedirectUri } from 'expo-auth-session';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Check, CheckCircle, Envelope, Eye, EyeSlash, GoogleLogo, Lock, User, XCircle } from 'phosphor-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';

import { Crosshair } from '@/components/brand/Crosshair';
import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { Divider } from '@/components/ui/Divider';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { TextInput } from '@/components/ui/TextInput';
import { useColors } from '@/hooks/useColors';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/store/session';
import { radius, spacing } from '@/theme';
import type { ColorPalette } from '@/theme/palettes';

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
  accept?: string;
}

interface PwReqs {
  length: boolean;
  upper: boolean;
  lower: boolean;
  number: boolean;
  special: boolean;
}

function PasswordRequirements({ reqs }: { reqs: PwReqs }) {
  const c = useColors();

  const items: [keyof PwReqs, string][] = [
    ['length', 'Mínimo 8 caracteres'],
    ['upper', 'Una letra mayúscula'],
    ['lower', 'Una letra minúscula'],
    ['number', 'Un número'],
    ['special', 'Un carácter especial (@$!%*?&_-#.)'],
  ];

  return (
    <View style={pwStyles.wrap}>
      {items.map(([key, label]) => {
        const ok = reqs[key];
        return (
          <View key={key} style={pwStyles.row}>
            {ok ? (
              <CheckCircle size={14} color={c.primary} weight="fill" />
            ) : (
              <XCircle size={14} color={c.textTertiary} weight="regular" />
            )}
            <Text variant="small" color={ok ? 'primary' : 'textTertiary'}>
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const pwStyles = StyleSheet.create({
  wrap: { gap: 6, paddingVertical: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});

export default function RegisterScreen() {
  const router = useRouter();
  const signUp = useSession((s) => s.signUp);
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secure, setSecure] = useState(true);
  const [accept, setAccept] = useState(false);
  const [tried, setTried] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const pwReqs = useMemo<PwReqs>(
    () => ({
      length: password.length >= 8,
      upper: /[A-Z]/.test(password),
      lower: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[@$!%*?&_\-#.]/.test(password),
    }),
    [password],
  );

  const pwStrong = Object.values(pwReqs).every(Boolean);

  const errors = useMemo<FieldErrors>(() => {
    const e: FieldErrors = {};
    if (!name.trim()) e.name = 'Ingresa tu nombre.';
    else if (name.trim().length < 2) e.name = 'Mínimo 2 caracteres.';
    if (!email.trim()) e.email = 'Ingresa tu correo electrónico.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      e.email = 'Correo electrónico inválido.';
    if (!password) e.password = 'Crea una contraseña.';
    else if (!pwStrong) e.password = 'La contraseña no cumple los requisitos.';
    if (!accept) e.accept = 'Debes aceptar los términos.';
    return e;
  }, [name, email, password, pwStrong, accept]);

  const shown: FieldErrors = tried ? errors : {};
  const isValid = Object.keys(errors).length === 0;

  const submit = async () => {
    if (!isValid) {
      setTried(true);
      return;
    }
    setLoading(true);
    setAuthError(null);
    const error = await signUp(name.trim(), email.trim().toLowerCase(), password);
    setLoading(false);
    if (error) {
      setAuthError(error);
      return;
    }
    router.replace('/(tabs)');
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setAuthError(null);
    try {
      const redirectTo = makeRedirectUri({ scheme: 'lacancha', path: 'auth-callback' });
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error || !data.url) throw error ?? new Error('No OAuth URL');

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type === 'success' && result.url) {
        const fragment = result.url.split('#')[1] ?? result.url.split('?')[1] ?? '';
        const params = new URLSearchParams(fragment);
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');
        if (access_token && refresh_token) {
          const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
          if (!sessionError) { router.replace('/(tabs)'); return; }
        }
        setAuthError('No se pudo completar el registro con Google.');
      }
    } catch {
      setAuthError('No se pudo continuar con Google. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen edges={['top']}>
      <BackHeader transparent onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={staticStyles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={staticStyles.brandRow}>
          <Crosshair size={44} />
        </View>
        <Text variant="h1" color="textPrimary" style={staticStyles.title}>
          Crear cuenta
        </Text>
        <Text variant="body" color="textSecondary" style={staticStyles.subtitle}>
          Únete a la comunidad y arma tu próxima partida.
        </Text>

        <View style={staticStyles.form}>
          <TextInput
            label="Nombre completo"
            placeholder="Tu nombre"
            value={name}
            onChangeText={(t) => setName(t.slice(0, 60))}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="next"
            leading={<User size={18} color={c.textSecondary} weight="regular" />}
            error={shown.name}
          />
          <TextInput
            label="Correo electrónico"
            placeholder="tunombre@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={(t) => setEmail(t.trim())}
            returnKeyType="next"
            leading={<Envelope size={18} color={c.textSecondary} weight="regular" />}
            error={shown.email}
          />
          <View>
            <TextInput
              label="Contraseña"
              placeholder="Mínimo 8 caracteres"
              secureTextEntry={secure}
              value={password}
              onChangeText={setPassword}
              returnKeyType="done"
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
              error={tried && !pwStrong && password.length > 0 ? shown.password : undefined}
            />
            <PasswordRequirements reqs={pwReqs} />
          </View>

          <View style={staticStyles.termsRow}>
            <PressableScale
              onPress={() => setAccept((a) => !a)}
              scaleTo={0.9}
            >
              <View style={[s.check, accept ? s.checkOn : null]}>
                {accept ? <Check size={14} color={c.bg} weight="bold" /> : null}
              </View>
            </PressableScale>
            <Text variant="small" color="textSecondary" style={{ flex: 1 }}>
              Acepto los{' '}
              <Text
                color="primary"
                variant="smallMedium"
                onPress={() => router.push('/terminos')}
              >
                Términos de servicio
              </Text>{' '}
              y la{' '}
              <Text
                color="primary"
                variant="smallMedium"
                onPress={() => router.push('/privacidad')}
              >
                Política de privacidad
              </Text>
              .
            </Text>
          </View>
          {shown.accept ? (
            <Text variant="small" color="alert">
              {shown.accept}
            </Text>
          ) : null}
        </View>

        {authError ? (
          <Text variant="small" color="alert" style={{ textAlign: 'center' }}>
            {authError}
          </Text>
        ) : null}
        {loading ? (
          <ActivityIndicator color={c.primary} />
        ) : (
          <Button label="Crear cuenta" onPress={submit} />
        )}

        <View style={staticStyles.dividerRow}>
          <Divider />
          <Text variant="caption" color="textTertiary" style={staticStyles.dividerLabel}>
            O continuar con
          </Text>
          <Divider />
        </View>

        <Button
          label="Continuar con Google"
          variant="secondary"
          leading={<GoogleLogo size={18} color={c.textPrimary} weight="bold" />}
          onPress={handleGoogleSignIn}
          disabled={loading}
        />

        <View style={staticStyles.regRow}>
          <Text variant="small" color="textSecondary">
            ¿Ya tienes cuenta?{' '}
          </Text>
          <PressableScale scaleTo={0.97} onPress={() => router.replace('/login')}>
            <Text variant="smallMedium" color="primary">
              Inicia sesión
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
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dividerLabel: { letterSpacing: 0.6 },
  regRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
});

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    check: {
      width: 22,
      height: 22,
      borderRadius: radius.sm,
      borderWidth: 1.5,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkOn: { backgroundColor: c.primary, borderColor: c.primary },
  });
}
