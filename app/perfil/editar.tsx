import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Check, Trash } from 'phosphor-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { TextInput } from '@/components/ui/TextInput';
import { PositionPitch } from '@/features/match/PositionPitch';
import { useColors } from '@/hooks/useColors';
import { labelPosition } from '@/lib/format';
import { supabase, SUPABASE_URL } from '@/lib/supabase';
import { useSession } from '@/store/session';
import { radius, spacing } from '@/theme';
import type { ColorPalette } from '@/theme/palettes';
import type { Position, SkillLevel, Sport } from '@/types/domain';

const ALL_SPORTS: Sport[] = ['futbol', 'basket', 'tenis', 'padel', 'beachTennis'];
const ALL_LEVELS: SkillLevel[] = [1, 2, 3, 4, 5];

const SPORT_CONFIG: Record<Sport, { color: string; emoji: string; label: string; sub: string }> = {
  futbol:      { color: '#4ade80', emoji: '⚽', label: 'Fútbol',       sub: '5 · 7 · 11' },
  basket:      { color: '#fb923c', emoji: '🏀', label: 'Basket',       sub: '3v3 · 5v5' },
  tenis:       { color: '#38bdf8', emoji: '🎾', label: 'Tenis',        sub: 'Singles · Dobles' },
  padel:       { color: '#a78bfa', emoji: '🏓', label: 'Pádel',        sub: 'Dobles' },
  beachTennis: { color: '#fbbf24', emoji: '🏖️', label: 'Beach Tennis', sub: 'Dobles · Singles' },
};

const LEVEL_COLOR: Record<SkillLevel, string> = {
  1: '#FF3B30', 2: '#FF6B00', 3: '#FF9500', 4: '#ADDE2F', 5: '#7BFF00',
};

const LEVEL_LABEL: Record<SkillLevel, string> = {
  1: 'Principiante', 2: 'Básico', 3: 'Intermedio', 4: 'Avanzado', 5: 'Elite',
};

const FOOTBALL_POSITION_IDS = ['portero', 'defensa', 'lateral', 'mediocampo', 'extremo', 'delantero'];
const BASKET_POSITION_IDS   = ['base', 'escolta', 'alero', 'aleroPivot', 'pivot'];

const FUTBOL_MODS = [
  { id: 'futbol5'  as const, label: 'F5' },
  { id: 'futbol7'  as const, label: 'F7' },
  { id: 'futbol11' as const, label: 'F11' },
];
const BASKET_MODS = [
  { id: 'basket3v3' as const, label: '3v3' },
  { id: 'basket5v5' as const, label: '5v5' },
];

export default function EditPerfilScreen() {
  const router = useRouter();
  const user = useSession((s) => s.user);
  const setUser = useSession((s) => s.setUser);

  const [name, setName] = useState(user?.name ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [sportLevels, setSportLevels] = useState<Partial<Record<Sport, SkillLevel>>>(user?.sportLevels ?? {});
  const [sports, setSports] = useState<Sport[]>(user?.sports ?? []);
  const [positions, setPositions] = useState<Position[]>(user?.positions ?? []);
  const [saving, setSaving] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | undefined>(user?.avatarUrl);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [pitchTab, setPitchTab] = useState<'futbol' | 'basket'>(
    user?.sports?.includes('futbol') || !user?.sports?.includes('basket') ? 'futbol' : 'basket',
  );
  const [futbolMod, setFutbolMod] = useState<'futbol5' | 'futbol7' | 'futbol11'>(() => {
    const pos = user?.positions ?? [];
    if (pos.includes('lateral') || pos.includes('extremo')) return 'futbol11';
    return 'futbol5';
  });
  const [basketMod, setBasketMod] = useState<'basket3v3' | 'basket5v5'>(() => {
    const pos = user?.positions ?? [];
    if (pos.includes('escolta') || pos.includes('aleroPivot')) return 'basket5v5';
    return 'basket3v3';
  });

  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);

  const hasFutbol = sports.includes('futbol');
  const hasBasket = sports.includes('basket');
  const hasPitchSport = hasFutbol || hasBasket;
  const hasBothPitch = hasFutbol && hasBasket;
  const activePitch: Sport = hasBothPitch ? pitchTab : hasFutbol ? 'futbol' : 'basket';

  const toggleSport = (sp: Sport) => {
    if (sports.includes(sp)) {
      setSports(sports.filter((x) => x !== sp));
      if (sp === 'futbol') setPositions((p) => p.filter((pos) => !FOOTBALL_POSITION_IDS.includes(pos)));
      if (sp === 'basket') setPositions((p) => p.filter((pos) => !BASKET_POSITION_IDS.includes(pos)));
    } else {
      setSports([...sports, sp]);
    }
  };

  const AVATAR_STORAGE_PATH = `${user?.id}/avatar`;

  const uploadAvatar = async () => {
    if (!user) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tus fotos para cambiar tu avatar.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const mimeType = asset.mimeType ?? 'image/jpeg';
    setUploadingAvatar(true);
    try {
      const response = await fetch(asset.uri);
      const arrayBuffer = await response.arrayBuffer();
      await supabase.storage.from('avatars').remove([AVATAR_STORAGE_PATH]);
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(AVATAR_STORAGE_PATH, arrayBuffer, { contentType: mimeType, upsert: true });
      if (uploadError) { Alert.alert('Error al subir foto', uploadError.message); return; }
      const baseUrl = `${SUPABASE_URL}/storage/v1/object/public/avatars/${AVATAR_STORAGE_PATH}`;
      const publicUrl = `${baseUrl}?t=${Date.now()}`;
      const { error: updateError } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
      if (updateError) { Alert.alert('Error al guardar foto', updateError.message); return; }
      setAvatarUri(publicUrl);
      setUser({ ...user, avatarUrl: publicUrl });
    } catch (e) {
      Alert.alert('Error', 'No se pudo subir la imagen. Intenta de nuevo.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const deleteAvatar = async () => {
    if (!user) return;
    setUploadingAvatar(true);
    try {
      await supabase.storage.from('avatars').remove([AVATAR_STORAGE_PATH]);
      const { error } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', user.id);
      if (error) { Alert.alert('Error', error.message); return; }
      setAvatarUri(undefined);
      setUser({ ...user, avatarUrl: undefined });
    } catch {
      Alert.alert('Error', 'No se pudo eliminar la foto.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const onAvatarPress = () => {
    if (avatarUri) {
      Alert.alert('Foto de perfil', undefined, [
        { text: 'Cambiar foto', onPress: () => setTimeout(uploadAvatar, 350) },
        {
          text: 'Eliminar foto', style: 'destructive',
          onPress: () => Alert.alert('Eliminar foto', '¿Estás seguro?', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Eliminar', style: 'destructive', onPress: deleteAvatar },
          ]),
        },
        { text: 'Cancelar', style: 'cancel' },
      ]);
    } else {
      uploadAvatar();
    }
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const trimmedUsername = username.trim().toLowerCase();
    if (trimmedUsername) {
      const { data: existing } = await supabase
        .from('profiles').select('id').eq('username', trimmedUsername).neq('id', user.id).maybeSingle();
      if (existing) {
        setSaving(false);
        Alert.alert('Nombre de usuario no disponible', 'Ese @usuario ya está en uso. Elige otro.');
        return;
      }
    }
    const trimmedBio = bio.trim().slice(0, 300);
    const dominantLevel: SkillLevel = sports.length > 0
      ? (Math.max(...sports.map((sp) => sportLevels[sp] ?? 3)) as SkillLevel)
      : 3;
    const { error } = await supabase.from('profiles').update({
      name: name.trim().slice(0, 60) || user.name,
      username: trimmedUsername || null,
      bio: trimmedBio || null,
      skill_level: dominantLevel,
      sports,
      positions,
      sport_levels: sportLevels,
    }).eq('id', user.id);
    setSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }
    setUser({ ...user, name: name.trim().slice(0, 60) || user.name, username: trimmedUsername || undefined, bio: trimmedBio || undefined, skillLevel: dominantLevel, sports, positions, sportLevels });
    router.back();
  };

  return (
    <Screen edges={['top']}>
      <BackHeader title="Editar perfil" transparent />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Avatar */}
        <View style={s.avatarWrap}>
          <Avatar name={name || '?'} uri={avatarUri} size={96} />
          <PressableScale style={s.cameraBtn} scaleTo={0.9} onPress={onAvatarPress}>
            {uploadingAvatar ? (
              <ActivityIndicator size="small" color={c.bg} />
            ) : avatarUri ? (
              <Trash size={18} color={c.bg} weight="fill" />
            ) : (
              <Camera size={18} color={c.bg} weight="fill" />
            )}
          </PressableScale>
        </View>

        <TextInput label="Nombre" placeholder="Tu nombre" value={name} onChangeText={(t) => setName(t.slice(0, 60))} autoCapitalize="words" autoCorrect={false} />
        <TextInput label="Nombre de usuario" placeholder="tuusuario" value={username} onChangeText={(t) => setUsername(t.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20))} autoCapitalize="none" autoCorrect={false} leading={<Text variant="body" color="textSecondary">@</Text>} />
        <TextInput label="Sobre mí" placeholder="Cuéntale a la comunidad cómo juegas" value={bio} onChangeText={(t) => setBio(t.slice(0, 300))} multiline numberOfLines={3} inputStyle={s.bioInput} />

        {/* ── Deportes ─────────────────────────────── */}
        <View style={s.section}>
          <Text variant="caption" color="textSecondary" style={s.sectionLabel}>Deportes que practicas</Text>
          <View style={s.sportsGrid}>
            {ALL_SPORTS.map((sp, i) => {
              const cfg = SPORT_CONFIG[sp];
              const active = sports.includes(sp);
              const isLast = i === ALL_SPORTS.length - 1;
              const isOdd = ALL_SPORTS.length % 2 !== 0;
              return (
                <PressableScale
                  key={sp}
                  onPress={() => toggleSport(sp)}
                  scaleTo={0.95}
                  style={[
                    s.sportCard,
                    isLast && isOdd ? s.sportCardFull : s.sportCardHalf,
                    {
                      borderColor: active ? cfg.color : c.border,
                      backgroundColor: active ? `${cfg.color}12` : c.surface,
                      borderWidth: active ? 1.5 : 1,
                    },
                  ]}
                >
                  {/* Check badge */}
                  {active && (
                    <View style={[s.sportCheckBadge, { backgroundColor: cfg.color }]}>
                      <Check size={9} color="#000" weight="bold" />
                    </View>
                  )}

                  <Text style={s.sportEmoji}>{cfg.emoji}</Text>
                  <Text variant="bodyMedium" style={{ color: active ? cfg.color : c.textPrimary, marginTop: spacing.xs }}>
                    {cfg.label}
                  </Text>
                  <Text variant="caption" color="textTertiary">{cfg.sub}</Text>
                </PressableScale>
              );
            })}
          </View>
        </View>

        {/* ── Posiciones ───────────────────────────── */}
        {hasPitchSport && (
          <View style={s.section}>
            <Text variant="caption" color="textSecondary" style={s.sectionLabel}>Posiciones que juegas</Text>

            {/* Tab switcher when both sports selected */}
            {hasBothPitch && (
              <View style={s.pitchTabs}>
                {(['futbol', 'basket'] as const).map((sp) => {
                  const cfg = SPORT_CONFIG[sp];
                  const active = pitchTab === sp;
                  return (
                    <PressableScale
                      key={sp}
                      onPress={() => setPitchTab(sp)}
                      scaleTo={0.96}
                      style={[
                        s.pitchTabBtn,
                        active && { borderColor: cfg.color, backgroundColor: `${cfg.color}12` },
                      ]}
                    >
                      <Text style={{ fontSize: 13, color: active ? cfg.color : c.textTertiary }}>
                        {cfg.emoji} {cfg.label}
                      </Text>
                    </PressableScale>
                  );
                })}
              </View>
            )}

            {/* Pitch */}
            {(() => {
              const cfg = SPORT_CONFIG[activePitch];
              const isFutbol = activePitch === 'futbol';
              const activeMod = isFutbol ? futbolMod : basketMod;
              const mods = isFutbol ? FUTBOL_MODS : BASKET_MODS;
              const selectedForSport = positions.filter((p) =>
                isFutbol ? FOOTBALL_POSITION_IDS.includes(p) : BASKET_POSITION_IDS.includes(p),
              );
              return (
                <View style={[s.pitchCard, { borderColor: `${cfg.color}40` }]}>
                  {/* Modality chips */}
                  <View style={[s.pitchHeader, { backgroundColor: `${cfg.color}0C` }]}>
                    <View style={s.modChipsRow}>
                      {mods.map((m) => {
                        const active = activeMod === m.id;
                        return (
                          <PressableScale
                            key={m.id}
                            onPress={() => isFutbol
                              ? setFutbolMod(m.id as typeof futbolMod)
                              : setBasketMod(m.id as typeof basketMod)
                            }
                            scaleTo={0.92}
                            style={[
                              s.modChip,
                              active
                                ? { borderColor: cfg.color, backgroundColor: `${cfg.color}20` }
                                : { borderColor: c.border, backgroundColor: 'transparent' },
                            ]}
                          >
                            <Text style={{ fontSize: 11, fontWeight: active ? '600' : '400', color: active ? cfg.color : c.textTertiary }}>
                              {m.label}
                            </Text>
                          </PressableScale>
                        );
                      })}
                      <Text style={{ fontSize: 11, color: c.textTertiary, marginLeft: 'auto', alignSelf: 'center' }}>
                        {selectedForSport.length > 0
                          ? `${selectedForSport.length} pos.`
                          : 'Toca la cancha'}
                      </Text>
                    </View>
                  </View>

                  <PositionPitch
                    sport={activePitch}
                    modality={activeMod}
                    selectedPositions={positions}
                    onSetPositions={setPositions}
                    accentColor={cfg.color}
                  />

                  {selectedForSport.length > 0 && (
                    <View style={s.posBadgesRow}>
                      {selectedForSport.map((p) => (
                        <View key={p} style={[s.posBadge, { borderColor: `${cfg.color}60`, backgroundColor: `${cfg.color}10` }]}>
                          <Text style={{ fontSize: 11, color: cfg.color }}>{labelPosition(p)}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })()}
          </View>
        )}

        {/* Racket sports only — no positions needed */}
        {sports.length > 0 && !hasPitchSport && (
          <View style={s.section}>
            <Text variant="caption" color="textSecondary" style={s.sectionLabel}>Posiciones que juegas</Text>
            <View style={s.cualquieraCard}>
              <View style={{ gap: 2 }}>
                <Text variant="bodyMedium" color="textPrimary">Cualquiera</Text>
                <Text variant="caption" color="textTertiary">Los deportes de raqueta no tienen posición fija</Text>
              </View>
            </View>
          </View>
        )}

        {/* ── Nivel por deporte ─── */}
        <View style={s.section}>
          <Text variant="caption" color="textSecondary" style={s.sectionLabel}>Nivel de juego</Text>
          {sports.length === 0 ? (
            <Text variant="small" color="textTertiary" style={{ textAlign: 'center', padding: spacing.md }}>
              Selecciona al menos un deporte
            </Text>
          ) : (
            <View style={{ gap: spacing.sm }}>
              {sports.map((sp) => {
                const cfg = SPORT_CONFIG[sp];
                const lvl: SkillLevel = sportLevels[sp] ?? 3;
                return (
                  <View key={sp} style={s.sportLevelRow}>
                    <View style={s.sportLevelLeft}>
                      <Text style={{ fontSize: 18 }}>{cfg.emoji}</Text>
                      <Text variant="bodyMedium" style={{ color: cfg.color }}>{cfg.label}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>
                      {ALL_LEVELS.map((n) => {
                        const active = n <= lvl;
                        const color = LEVEL_COLOR[n];
                        return (
                          <PressableScale
                            key={n}
                            onPress={() => setSportLevels((prev) => ({ ...prev, [sp]: n as SkillLevel }))}
                            scaleTo={0.85}
                            style={[s.sportLevelDot, {
                              backgroundColor: active ? color : `${color}20`,
                              borderColor: active ? color : `${color}50`,
                            }]}
                          >
                            <Text style={{ fontSize: 12, fontWeight: '600', color: active ? '#000' : color }}>{n}</Text>
                          </PressableScale>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

      </ScrollView>

      <View style={s.footer}>
        {saving ? (
          <ActivityIndicator color={c.primary} />
        ) : (
          <Button label="Guardar cambios" onPress={save} />
        )}
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
    sectionLabel: { marginBottom: spacing.xs },

    // Sport grid
    sportsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    sportCard: {
      borderRadius: radius.lg,
      padding: spacing.md,
      overflow: 'hidden',
      gap: 2,
    },
    sportCardHalf: { width: '48%' },
    sportCardFull: { width: '100%' },
    sportCheckBadge: {
      position: 'absolute',
      top: spacing.sm,
      right: spacing.sm,
      width: 18,
      height: 18,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sportEmoji: { fontSize: 28, lineHeight: 34, marginTop: spacing.sm },

    // Pitch
    pitchTabs: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xs },
    pitchTabBtn: {
      flex: 1,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
    },
    pitchCard: {
      borderRadius: radius.lg,
      borderWidth: 1,
      overflow: 'hidden',
    },
    pitchHeader: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    modChipsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    modChip: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: radius.full,
      borderWidth: 1,
    },
    posBadgesRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
      padding: spacing.md,
      paddingTop: spacing.sm,
    },
    posBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: radius.full,
      borderWidth: 1,
    },

    // Cualquiera
    cualquieraCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.lg,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },

    // Sport level
    sportLevelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      gap: spacing.sm,
    },
    sportLevelLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      flex: 1,
    },
    sportLevelDot: {
      width: 30,
      height: 30,
      borderRadius: radius.sm,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
    },

    footer: {
      padding: spacing.lg,
      paddingBottom: spacing.xxl,
      borderTopWidth: 1,
      borderTopColor: c.border,
      backgroundColor: c.bg,
    },
  });
}
