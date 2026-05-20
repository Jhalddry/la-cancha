import { useRouter } from 'expo-router';
import { Camera } from 'phosphor-react-native';
import { useState } from 'react';
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
import { labelPosition, labelSkill, labelSport } from '@/lib/format';
import { useSession } from '@/store/session';
import { colors, radius, spacing } from '@/theme';
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

  const toggleSport = (s: Sport) =>
    setSports((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
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
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.avatarWrap}>
          <Avatar name={name || '?'} size={96} />
          <PressableScale style={styles.cameraBtn} scaleTo={0.9}>
            <Camera size={18} color={colors.bg} weight="fill" />
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
          inputStyle={styles.bioInput}
        />

        <View style={styles.section}>
          <Text variant="caption" color="textSecondary">
            Deportes que practicas
          </Text>
          <View style={styles.sportsRow}>
            {ALL_SPORTS.map((s) => {
              const active = sports.includes(s);
              return (
                <PressableScale
                  key={s}
                  onPress={() => toggleSport(s)}
                  style={styles.sportItem}
                  scaleTo={0.94}
                >
                  <IconCircle
                    size={56}
                    bg={active ? colors.primarySoft : colors.surface}
                    border={active ? colors.primary : colors.border}
                  >
                    <Text style={styles.sportEmoji}>{SPORT_EMOJIS[s]}</Text>
                  </IconCircle>
                  <Text
                    variant="caption"
                    color={active ? 'primary' : 'textSecondary'}
                  >
                    {labelSport(s)}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text variant="caption" color="textSecondary">
            Nivel de juego
          </Text>
          <View style={styles.levelRow}>
            {ALL_LEVELS.map((lvl) => (
              <PressableScale
                key={lvl}
                onPress={() => setSkill(lvl)}
                style={[
                  styles.levelBtn,
                  skill === lvl ? styles.levelBtnActive : null,
                ]}
                scaleTo={0.94}
              >
                <Stars level={lvl} size={10} />
              </PressableScale>
            ))}
          </View>
          <Text variant="bodySemibold" color="primary" style={styles.levelLabel}>
            {labelSkill(skill)}
          </Text>
        </View>

        <View style={styles.section}>
          <Text variant="caption" color="textSecondary">
            Posiciones que juegas
          </Text>
          <View style={styles.chipsWrap}>
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
      <View style={styles.footer}>
        <Button label="Guardar cambios" onPress={save} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.bg,
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
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  levelBtnActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  levelLabel: { textAlign: 'center' },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  footer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
});
