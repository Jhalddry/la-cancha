import { useRouter } from 'expo-router';
import { CheckCircle, Eye, EyeSlash } from 'phosphor-react-native';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { supabase } from '@/lib/supabase';
import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { TextInput } from '@/components/ui/TextInput';
import { useColors } from '@/hooks/useColors';
import { spacing } from '@/theme';
import type { ColorPalette } from '@/theme/palettes';

export default function CambiarContrasenaScreen() {
  const router = useRouter();
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [tried, setTried] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!current) e.current = 'Ingresa tu contraseña actual';
    if (!next) e.next = 'Ingresa la nueva contraseña';
    else if (next.length < 6) e.next = 'Mínimo 6 caracteres';
    else if (next === current) e.next = 'Debe ser diferente a la actual';
    if (!confirm) e.confirm = 'Confirma la nueva contraseña';
    else if (confirm !== next) e.confirm = 'Las contraseñas no coinciden';
    return e;
  }, [current, next, confirm]);

  const shown = tried ? errors : {};

  const handleSave = async () => {
    setTried(true);
    setAuthError(null);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    try {
      const { data } = await supabase.auth.getUser();
      const email = data.user?.email;
      if (!email) {
        setAuthError('No se pudo verificar tu sesión.');
        return;
      }

      // Verify current password by re-signing in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: current,
      });
      if (signInError) {
        setAuthError('La contraseña actual es incorrecta.');
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: next });
      if (updateError) {
        setAuthError(updateError.message);
        return;
      }
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  function EyeToggle({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
    return (
      <PressableScale onPress={onToggle} scaleTo={0.9}>
        {visible
          ? <EyeSlash size={18} color={c.textTertiary} weight="regular" />
          : <Eye size={18} color={c.textTertiary} weight="regular" />
        }
      </PressableScale>
    );
  }

  if (saved) {
    return (
      <Screen>
        <BackHeader title="Contraseña" onBack={() => router.back()} />
        <View style={s.successWrap}>
          <Card>
            <View style={s.successRow}>
              <CheckCircle size={28} color={c.primary} weight="fill" />
              <View style={{ flex: 1, gap: 4 }}>
                <Text variant="h3" color="textPrimary">
                  Contraseña actualizada
                </Text>
                <Text variant="body" color="textSecondary">
                  Tu contraseña se cambió correctamente.
                </Text>
              </View>
            </View>
          </Card>
          <Button
            label="Volver"
            variant="secondary"
            onPress={() => router.back()}
            style={{ marginTop: spacing.md }}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <BackHeader title="Contraseña" onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="caption" color="textTertiary" style={s.sectionLabel}>
          CONTRASEÑA ACTUAL
        </Text>
        <TextInput
          value={current}
          onChangeText={setCurrent}
          secureTextEntry={!showCurrent}
          placeholder="••••••••"
          error={shown.current ?? authError ?? undefined}
          trailing={
            <EyeToggle visible={showCurrent} onToggle={() => setShowCurrent((v) => !v)} />
          }
        />

        <View style={s.dividerRow}>
          <View style={s.dividerLine} />
        </View>

        <Text variant="caption" color="textTertiary" style={s.sectionLabel}>
          NUEVA CONTRASEÑA
        </Text>
        <TextInput
          value={next}
          onChangeText={setNext}
          secureTextEntry={!showNext}
          placeholder="••••••••"
          error={shown.next}
          trailing={
            <EyeToggle visible={showNext} onToggle={() => setShowNext((v) => !v)} />
          }
        />
        <TextInput
          label="Confirmar"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry={!showConfirm}
          placeholder="••••••••"
          error={shown.confirm}
          trailing={
            <EyeToggle visible={showConfirm} onToggle={() => setShowConfirm((v) => !v)} />
          }
        />

        <View style={s.requirements}>
          <Requirement met={next.length >= 6} label="Mínimo 6 caracteres" c={c} />
          <Requirement met={next.length > 0 && next !== current} label="Diferente a la actual" c={c} />
          <Requirement met={confirm.length > 0 && confirm === next} label="Las contraseñas coinciden" c={c} />
        </View>
      </ScrollView>

      <View style={s.footer}>
        <Button
          label={saving ? 'Guardando…' : 'Guardar contraseña'}
          onPress={() => void handleSave()}
          disabled={saving}
        />
      </View>
    </Screen>
  );
}

function Requirement({ met, label, c }: { met: boolean; label: string; c: ColorPalette }) {
  return (
    <View style={reqStyles.row}>
      <View style={[reqStyles.dot, { backgroundColor: met ? c.primary : c.border }]} />
      <Text variant="small" style={{ color: met ? c.primary : c.textTertiary }}>
        {label}
      </Text>
    </View>
  );
}

const reqStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 6, height: 6, borderRadius: 3 },
});

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    scroll: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: 120,
      gap: spacing.md,
    },
    sectionLabel: { marginBottom: -spacing.xs },
    dividerRow: {
      paddingVertical: spacing.xs,
    },
    dividerLine: {
      height: 1,
      backgroundColor: c.border,
    },
    requirements: {
      gap: spacing.xs,
      paddingTop: spacing.xs,
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
    successWrap: {
      flex: 1,
      padding: spacing.lg,
    },
    successRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
    },
  });
}
