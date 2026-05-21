import { useRouter } from 'expo-router';
import { Camera } from 'phosphor-react-native';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { IconCircle } from '@/components/ui/IconCircle';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { Stars } from '@/components/ui/Stars';
import { Text } from '@/components/ui/Text';
import { TextInput } from '@/components/ui/TextInput';
import { footballPositionsByModality, basketPositionsByModality } from '@/features/match/helpers';
import { useColors } from '@/hooks/useColors';
import { labelPosition, labelSkill, labelSport } from '@/lib/format';
import { useSession } from '@/store/session';
import { radius, spacing } from '@/theme';
import type { ColorPalette } from '@/theme/palettes';
import type { Position, SkillLevel, Sport } from '@/types/domain';

const ALL_SPORTS: Sport[] = ['futbol', 'tenis', 'padel', 'beachTennis', 'basket'];

const SPORT_EMOJIS: Record<Sport, string> = {
  futbol: '⚽',
  tenis: '🎾',
  padel: '🏓',
  beachTennis: '🏖️',
  basket: '🏀',
};
const ALL_LEVELS: SkillLevel[] = [1, 2, 3, 4, 5];

export default function EditPerfilScreen() {
  const router = useRouter();
  const user = useSession((s) => s.user);
  const setUser = useSession((s) => s.setUser);

  const [name, setName] = useState(user?.name ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [skill, setSkill] = useState<SkillLevel>(user?.skillLevel ?? 3);
  const [sports, setSports] = useState<Sport[]>(user?.sports ?? []);
  const [positions, setPositions] = useState<Position[]>(user?.positions ?? []);

  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);

  const toggleSport = (sp: Sport) =>
    setSports((cur) => (cur.includes(sp) ? cur.filter((x) => x !== sp) : [...cur, sp]));
  const togglePosition = (p: Position) =>
    setPositions((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));

  // Union of all football + basket positions for sports the user practices.
  const availablePositions: Position[] = (() => {
    const set = new Set<Position>();
    if (sports.includes('futbol')) {
      footballPositionsByModality.futbol11.forEach((p) => set.add(p));
    }
    if (sports.includes('basket')) {
      basketPositionsByModality.basket5v5.forEach((p) => set.add(p));
    }
    return set.size > 0 ? Array.from(set) : ['cualquiera'];
  })();

  const save = () => {
    if (!user) return;
    setUser({
      ...user,
      name: name.trim() || user.name,
      bio: bio.trim(),
      skillLevel: skill,
      sports,
      positions,
    });
    router.back();
  };

  return (
    <Screen edges={['top']}>
      <BackHeader title="Editar perfil" transparent />
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.avatarWrap}>
          <Avatar name={name || '?'} size={96} />
          <PressableScale style={s.cameraBtn} scaleTo={0.9}>
            <Camera size={18} color={c.bg} weight="fill" />
          </PressableScale>
        </View>

        <TextInput
          label="Nombre"
          placeholder="Tu nombre"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          label="Sobre mí"
          placeholder="Cuéntale a la comunidad cómo juegas"
          value={bio}
          onChangeText={setBio}
          multiline
          numberOfLines={3}
          inputStyle={s.bioInput}
        />

        <View style={s.section}>
          <Text variant="caption" color="textSecondary">
            Deportes que practicas
          </Text>
          <View style={s.sportsRow}>
            {ALL_SPORTS.map((sp) => {
              const active = sports.includes(sp);
              return (
                <PressableScale
                  key={sp}
                  onPress={() => toggleSport(sp)}
                  style={s.sportItem}
                  scaleTo={0.94}
                >
                  <IconCircle
                    size={56}
                    bg={active ? c.primarySoft : c.surface}
                    border={active ? c.primary : c.border}
                  >
                    <Text style={s.sportEmoji}>{SPORT_EMOJIS[sp]}</Text>
                  </IconCircle>
                  <Text
                    variant="caption"
                    color={active ? 'primary' : 'textSecondary'}
                  >
                    {labelSport(sp)}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
        </View>

        <View style={s.section}>
          <Text variant="caption" color="textSecondary">
            Nivel de juego
          </Text>
          <View style={s.levelRow}>
            {ALL_LEVELS.map((lvl) => (
              <PressableScale
                key={lvl}
                onPress={() => setSkill(lvl)}
                style={[
                  s.levelBtn,
                  skill === lvl ? s.levelBtnActive : null,
                ]}
                scaleTo={0.94}
              >
                <Stars level={lvl} size={10} />
              </PressableScale>
            ))}
          </View>
          <Text variant="bodySemibold" color="primary" style={s.levelLabel}>
            {labelSkill(skill)}
          </Text>
        </View>

        <View style={s.section}>
          <Text variant="caption" color="textSecondary">
            Posiciones que juegas
          </Text>
          <View style={s.chipsWrap}>
            {availablePositions.map((p) => (
              <Chip
                key={p}
                label={labelPosition(p)}
                selected={positions.includes(p)}
                onPress={() => togglePosition(p)}
              />
            ))}
          </View>
        </View>
      </ScrollView>
      <View style={s.footer}>
        <Button label="Guardar cambios" onPress={save} />
      </View>
    </Screen>
  );
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    scroll: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: 120,
      gap: spacing.lg,
    },
    avatarWrap: { alignSelf: 'center', marginVertical: spacing.md },
    cameraBtn: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 36,
      height: 36,
      borderRadius: radius.full,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: c.bg,
    },
    bioInput: { minHeight: 88, textAlignVertical: 'top', paddingTop: spacing.md },
    section: { gap: spacing.sm },
    sportsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
    sportItem: { alignItems: 'center', gap: spacing.xs, width: 64 },
    sportEmoji: { fontSize: 24, lineHeight: 30, textAlign: 'center' },
    levelRow: { flexDirection: 'row', gap: spacing.xs },
    levelBtn: {
      flex: 1,
      paddingVertical: spacing.md,
      paddingHorizontal: 0,
      backgroundColor: c.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
    },
    levelBtnActive: { backgroundColor: c.primarySoft, borderColor: c.primary },
    levelLabel: { textAlign: 'center' },
    chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    footer: {
      padding: spacing.lg,
      paddingBottom: spacing.xxl,
      borderTopWidth: 1,
      borderTopColor: c.border,
      backgroundColor: c.bg,
    },
  });
}
