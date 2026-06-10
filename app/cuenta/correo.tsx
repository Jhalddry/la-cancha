import { useRouter } from 'expo-router';
import { CheckCircle, EnvelopeSimple } from 'phosphor-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { TextInput } from '@/components/ui/TextInput';
import { useColors } from '@/hooks/useColors';
import { supabase } from '@/lib/supabase';
import { spacing } from '@/theme';
import type { ColorPalette } from '@/theme/palettes';

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export default function CambiarCorreoScreen() {
  const router = useRouter();
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);

  const [currentEmail, setCurrentEmail] = useState<string>('');
  const [newEmail, setNewEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [tried, setTried] = useState(false);
  const [sent, setSent] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setCurrentEmail(data.user.email);
    });
  }, []);

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!newEmail) e.newEmail = 'Ingresa el nuevo correo';
    else if (!isValidEmail(newEmail)) e.newEmail = 'Correo inválido';
    else if (newEmail.trim().toLowerCase() === currentEmail.toLowerCase()) e.newEmail = 'Es el mismo correo actual';
    if (!confirmEmail) e.confirmEmail = 'Confirma el correo';
    else if (confirmEmail.trim().toLowerCase() !== newEmail.trim().toLowerCase())
      e.confirmEmail = 'Los correos no coinciden';
    return e;
  }, [newEmail, confirmEmail, currentEmail]);

  const shown = tried ? errors : {};

  const handleSave = async () => {
    setTried(true);
    if (Object.keys(errors).length > 0) return;
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    setSaving(false);
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    setSent(true);
  };

  return (
    <Screen>
      <BackHeader title="Correo electrónico" onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Current email */}
        <Card>
          <View style={s.currentRow}>
            <EnvelopeSimple size={20} color={c.textSecondary} weight="regular" />
            <View style={{ flex: 1 }}>
              <Text variant="caption" color="textTertiary">
                CORREO ACTUAL
              </Text>
              <Text variant="bodyMedium" color="textPrimary">
                {currentEmail || '—'}
              </Text>
            </View>
          </View>
        </Card>

        {sent ? (
          <Card>
            <View style={s.sentRow}>
              <CheckCircle size={24} color={c.primary} weight="fill" />
              <View style={{ flex: 1, gap: 4 }}>
                <Text variant="bodyMedium" color="textPrimary">
                  Verificación enviada
                </Text>
                <Text variant="small" color="textSecondary">
                  Revisa tu bandeja en {newEmail.trim()} y confirma el enlace para completar el cambio.
                </Text>
              </View>
            </View>
          </Card>
        ) : (
          <>
            <View style={s.fields}>
              <Text variant="caption" color="textTertiary" style={s.sectionLabel}>
                NUEVO CORREO
              </Text>
              <TextInput
                value={newEmail}
                onChangeText={setNewEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                error={shown.newEmail}
                placeholder="nuevo@correo.com"
              />
              <TextInput
                label="Confirmar"
                value={confirmEmail}
                onChangeText={setConfirmEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                error={shown.confirmEmail}
                placeholder="nuevo@correo.com"
              />
            </View>

            <Text variant="small" color="textTertiary" style={s.note}>
              Recibirás un correo de verificación. El cambio se aplica cuando confirmes el enlace.
            </Text>
          </>
        )}
      </ScrollView>

      {!sent ? (
        <View style={s.footer}>
          <Button
            label={saving ? 'Enviando…' : 'Enviar verificación'}
            onPress={() => void handleSave()}
            disabled={saving}
          />
        </View>
      ) : null}
    </Screen>
  );
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    scroll: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: 120,
      gap: spacing.xl,
    },
    currentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    fields: { gap: spacing.md },
    sectionLabel: { marginBottom: -spacing.xs },
    note: { lineHeight: 20 },
    sentRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
    },
    footer: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      padding: spacing.lg,
      paddingBottom: spacing.xxl,
      backgroundColor: c.bg,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
  });
}
