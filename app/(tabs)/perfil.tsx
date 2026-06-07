import { useRouter } from 'expo-router';
import {
  CaretRight,
  CheckCircle,
  FileText,
  SealCheck,
  Gear,
  Lock,
  PencilSimple,
  Shield,
  ShieldStar,
  SignOut,
  Trophy,
} from 'phosphor-react-native';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Sheet } from '@/components/ui/Sheet';
import { PlayerPositions } from '@/components/feature/PlayerPositions';
import { Stars } from '@/components/ui/Stars';
import { Divider } from '@/components/ui/Divider';
import { IconCircle } from '@/components/ui/IconCircle';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useColors } from '@/hooks/useColors';
import { useRequestVerification } from '@/hooks/useProfiles';
import { labelSkill, labelSport } from '@/lib/format';
import { useSession } from '@/store/session';
import { radius, spacing } from '@/theme';
import type { ColorPalette } from '@/theme/palettes';
import type { Sport } from '@/types/domain';

const VERIFIED_BLUE = '#1D9BF0';

const SPORT_EMOJIS: Record<Sport, string> = {
  futbol: '⚽',
  tenis: '🎾',
  padel: '🏓',
  beachTennis: '🏖️',
  basket: '🏀',
};

export default function PerfilScreen() {
  const router = useRouter();
  const u = useSession((s) => s.user);
  const signOut = useSession((s) => s.signOut);
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const [verifySheetOpen, setVerifySheetOpen] = useState(false);
  const [verifyDoneOpen, setVerifyDoneOpen] = useState(false);
  const { mutate: sendVerifyRequest } = useRequestVerification();

  if (!u) {
    return (
      <Screen>
        <View style={s.empty}>
          <Text variant="h3" style={{ marginBottom: spacing.lg }}>
            Cargando perfil…
          </Text>
          <PressableScale
            scaleTo={0.96}
            onPress={async () => {
              await signOut();
              router.replace('/login');
            }}
          >
            <Text variant="bodyMedium" color="alert">
              Cerrar sesión
            </Text>
          </PressableScale>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.head}>
          <View style={{ position: 'relative' }}>
            <Avatar name={u.name} uri={u.avatarUrl} size={88} />
            {u.verified ? (
              <View style={s.avatarVerifiedBadge}>
                <SealCheck size={20} color={VERIFIED_BLUE} weight="fill" />
              </View>
            ) : null}
          </View>
          <View style={s.headInfo}>
            <Text variant="h2">{u.name}</Text>
            {u.username ? (
              <Text variant="small" color="textSecondary">
                @{u.username}
              </Text>
            ) : null}
            <Text variant="small" color="textSecondary">
              {labelSkill(u.skillLevel)}
            </Text>
            {u.verified ? (
              <View style={s.verified}>
                <SealCheck size={16} color={VERIFIED_BLUE} weight="fill" />
                <Text variant="smallMedium" style={{ color: VERIFIED_BLUE }}>
                  Jugador verificado
                </Text>
              </View>
            ) : null}
          </View>
          <PressableScale
            onPress={() => router.push('/perfil/editar')}
            style={s.editBtn}
            scaleTo={0.9}
          >
            <PencilSimple size={18} color={c.primary} weight="bold" />
          </PressableScale>
        </View>

        {u.bio ? (
          <Card>
            <Text variant="caption" color="textSecondary">
              Sobre mí
            </Text>
            <Text variant="body" color="textPrimary" style={s.bio}>
              {u.bio}
            </Text>
          </Card>
        ) : null}

        <View>
          <Text variant="caption" color="textSecondary">
            Deportes
          </Text>
          <View style={s.sportsRow}>
            {u.sports.map((sport) => (
              <View key={sport} style={s.sportItem}>
                <View style={s.sportIconWrap}>
                  <Text style={s.sportEmoji}>{SPORT_EMOJIS[sport]}</Text>
                </View>
                <Text variant="small" color="textPrimary">
                  {labelSport(sport)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View>
          <Text variant="caption" color="textSecondary">
            Nivel de juego
          </Text>
          <Card style={s.levelCard}>
            <Stars level={u.skillLevel} size={22} />
            <Text variant="bodySemibold" color="textPrimary">
              {labelSkill(u.skillLevel)}
            </Text>
          </Card>
        </View>

        {u.sports.length > 0 ? (
          <View style={{ gap: spacing.sm }}>
            <Text variant="caption" color="textSecondary">Posiciones</Text>
            <PlayerPositions sports={u.sports} positions={u.positions} />
          </View>
        ) : null}

        <Card padded={false}>
          {u.isAdmin ? (
            <>
              <SettingsRow
                icon={<ShieldStar size={20} color={c.primary} weight="fill" />}
                label="Verificaciones pendientes"
                onPress={() => router.push('/admin/verificaciones')}
                c={c}
                s={s}
              />
              <Divider inset />
            </>
          ) : null}
          <SettingsRow
            icon={<Trophy size={20} color={c.primary} weight="fill" />}
            label="Historial de partidas"
            onPress={() => router.push('/historial')}
            c={c}
            s={s}
          />
          <Divider inset />
          <SettingsRow
            icon={<Shield size={20} color={c.primary} weight="fill" />}
            label="Mi reputación"
            onPress={() => router.push('/reputacion')}
            c={c}
            s={s}
          />
          <Divider inset />
          <SettingsRow
            icon={<Gear size={20} color={c.primary} weight="fill" />}
            label="Ajustes"
            onPress={() => router.push('/ajustes')}
            c={c}
            s={s}
          />
          <Divider inset />
          <SettingsRow
            icon={<FileText size={20} color={c.textTertiary} weight="regular" />}
            label="Términos de servicio"
            onPress={() => router.push('/terminos')}
            c={c}
            s={s}
          />
          <Divider inset />
          <SettingsRow
            icon={<Lock size={20} color={c.textTertiary} weight="regular" />}
            label="Política de privacidad"
            onPress={() => router.push('/privacidad')}
            c={c}
            s={s}
          />
          {!u.verified ? (
            <>
              <Divider inset />
              <SettingsRow
                icon={<SealCheck size={20} color={c.primary} weight="fill" />}
                label="Solicitar verificación"
                onPress={() => setVerifySheetOpen(true)}
                c={c}
                s={s}
              />
            </>
          ) : null}
          <Divider inset />
          <SettingsRow
            icon={<SignOut size={20} color={c.alert} weight="bold" />}
            label="Cerrar sesión"
            danger
            onPress={() => {
              signOut();
              router.replace('/login');
            }}
            c={c}
            s={s}
          />
        </Card>
      </ScrollView>

      <Sheet visible={verifySheetOpen} onClose={() => setVerifySheetOpen(false)} title="Verificación de jugador">
        <View style={{ gap: spacing.lg, paddingBottom: spacing.md }}>
          <View style={{ alignItems: 'center', gap: spacing.md }}>
            <View style={{
              width: 72, height: 72, borderRadius: 36,
              backgroundColor: c.primarySoft,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <SealCheck size={40} color={c.primary} weight="fill" />
            </View>
            <Text variant="body" color="textSecondary" style={{ textAlign: 'center', lineHeight: 22 }}>
              La insignia verificada confirma que eres un jugador de confianza en La Cancha.
              Revisaremos tu perfil y actividades en un plazo de 24–48 horas.
            </Text>
          </View>
          <View style={{ gap: spacing.sm }}>
            {[
              'Perfil completo con foto y bio',
              'Al menos 5 partidas jugadas',
              'Sin reportes de comportamiento',
            ].map((req) => (
              <View key={req} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <SealCheck size={14} color={c.primary} weight="fill" />
                <Text variant="small" color="textSecondary">{req}</Text>
              </View>
            ))}
          </View>
          <Button
            label="Enviar solicitud"
            onPress={() => {
              if (u?.id) sendVerifyRequest(u.id);
              setVerifySheetOpen(false);
              setTimeout(() => setVerifyDoneOpen(true), 300);
            }}
          />
        </View>
      </Sheet>

      <Sheet visible={verifyDoneOpen} onClose={() => setVerifyDoneOpen(false)}>
        <View style={{ alignItems: 'center', gap: spacing.md, paddingBottom: spacing.md }}>
          <View style={{
            width: 72, height: 72, borderRadius: 36,
            backgroundColor: c.primarySoft,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <SealCheck size={40} color={c.primary} weight="fill" />
          </View>
          <Text variant="h3" color="textPrimary">Solicitud enviada</Text>
          <Text variant="body" color="textSecondary" style={{ textAlign: 'center' }}>
            Revisaremos tu perfil en las próximas 24–48 horas. Te notificaremos cuando sea aprobado.
          </Text>
          <Button label="Entendido" onPress={() => setVerifyDoneOpen(false)} />
        </View>
      </Sheet>
    </Screen>
  );
}

function SettingsRow({
  icon,
  label,
  onPress,
  danger,
  c,
  s,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  danger?: boolean;
  c: ColorPalette;
  s: ReturnType<typeof makeStyles>;
}) {
  return (
    <PressableScale onPress={onPress} style={s.settingRow} scaleTo={0.98}>
      <IconCircle size={40} bg={c.surfaceElevated} border={c.border}>
        {icon}
      </IconCircle>
      <Text
        variant="bodyMedium"
        color={danger ? 'alert' : 'textPrimary'}
        style={{ flex: 1 }}
      >
        {label}
      </Text>
      <CaretRight size={16} color={c.textTertiary} weight="bold" />
    </PressableScale>
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
    head: { flexDirection: 'row', gap: spacing.lg, alignItems: 'center' },
    headInfo: { flex: 1, gap: spacing.xs },
    verified: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginTop: spacing.xs,
    },
    editBtn: {
      width: 40,
      height: 40,
      borderRadius: radius.full,
      backgroundColor: c.primarySoft,
      borderWidth: 1,
      borderColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarVerifiedBadge: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      backgroundColor: c.bg,
      borderRadius: radius.full,
      padding: 2,
    },
    bio: { marginTop: spacing.xs },
    sportsRow: {
      flexDirection: 'row',
      gap: spacing.lg,
      marginTop: spacing.sm,
      flexWrap: 'wrap',
    },
    sportItem: { alignItems: 'center', gap: spacing.xs, width: 64 },
    sportEmoji: { fontSize: 28, lineHeight: 36 },
    sportIconWrap: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    levelCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.sm,
    },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  });
}
