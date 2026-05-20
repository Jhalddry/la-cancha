import { useRouter } from 'expo-router';
import { Check, Envelope, Lock, User } from 'phosphor-react-native';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Crosshair } from '@/components/brand/Crosshair';
import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { TextInput } from '@/components/ui/TextInput';
import { useSession } from '@/store/session';
import { colors, radius, spacing } from '@/theme';

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
  accept?: string;
}

export default function RegisterScreen() {
  const router = useRouter();
  const signIn = useSession((s) => s.signIn);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accept, setAccept] = useState(false);
  const [tried, setTried] = useState(false);

  const errors = useMemo<FieldErrors>(() => {
    const e: FieldErrors = {};
    if (!name.trim()) e.name = 'Ingresa tu nombre.';
    if (!email.trim()) e.email = 'Ingresa tu correo electrónico.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      e.email = 'Correo electrónico inválido.';
    if (!password) e.password = 'Crea una contraseña.';
    else if (password.length < 6) e.password = 'Mínimo 6 caracteres.';
    if (!accept) e.accept = 'Debes aceptar los términos.';
    return e;
  }, [name, email, password, accept]);

  const shown: FieldErrors = tried ? errors : {};
  const isValid = Object.keys(errors).length === 0;

  const submit = () => {
    if (!isValid) {
      setTried(true);
      return;
    }
    signIn();
    router.replace('/(tabs)');
  };

  return (
    <Screen edges={['top']}>
      <BackHeader transparent />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brandRow}>
          <Crosshair size={44} />
        </View>
        <Text variant="h1" color="textPrimary" style={styles.title}>
          Crear cuenta
        </Text>
        <Text variant="body" color="textSecondary" style={styles.subtitle}>
          Únete a la comunidad y arma tu próxima partida.
        </Text>

        <View style={styles.form}>
          <TextInput
            label="Nombre"
            placeholder="Tu nombre"
            value={name}
            onChangeText={setName}
            leading={<User size={18} color={colors.textSecondary} weight="regular" />}
            error={shown.name}
          />
          <TextInput
            label="Correo electrónico"
            placeholder="tunombre@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            leading={<Envelope size={18} color={colors.textSecondary} weight="regular" />}
            error={shown.email}
          />
          <TextInput
            label="Contraseña"
            placeholder="Mínimo 6 caracteres"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            leading={<Lock size={18} color={colors.textSecondary} weight="regular" />}
            error={shown.password}
          />
          <PressableScale
            onPress={() => setAccept((a) => !a)}
            style={styles.termsRow}
            scaleTo={0.99}
          >
            <View
              style={[
                styles.check,
                accept ? styles.checkOn : null,
              ]}
            >
              {accept ? <Check size={14} color={colors.bg} weight="bold" /> : null}
            </View>
            <Text variant="small" color="textSecondary" style={{ flex: 1 }}>
              Acepto los <Text color="primary" variant="smallMedium">Términos de servicio</Text> y la{' '}
              <Text color="primary" variant="smallMedium">Política de privacidad</Text>.
            </Text>
          </PressableScale>
          {shown.accept ? (
            <Text variant="small" color="alert">
              {shown.accept}
            </Text>
          ) : null}
        </View>

        <Button label="Crear cuenta" onPress={submit} />

        <View style={styles.regRow}>
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

const styles = StyleSheet.create({
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
  check: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  regRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
});
