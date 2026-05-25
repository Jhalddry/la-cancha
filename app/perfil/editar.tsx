import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Trash } from 'phosphor-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';

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
import { supabase, SUPABASE_URL } from '@/lib/supabase';
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
  const [username, setUsername] = useState(user?.username ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [skill, setSkill] = useState<SkillLevel>(user?.skillLevel ?? 3);
  const [sports, setSports] = useState<Sport[]>(user?.sports ?? []);
  const [positions, setPositions] = useState<Position[]>(user?.positions ?? []);
  const [saving, setSaving] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | undefined>(user?.avatarUrl);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);

  const toggleSport = (sp: Sport) =>
    setSports((cur) => (cur.includes(sp) ? cur.filter((x) => x !== sp) : [...cur, sp]));
  const togglePosition = (p: Position) =>
    setPositions((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));

  const availablePositions: Position[] = (() => {
    const set = new Set<Position>();
    if (sports.includes('futbol')) footballPositionsByModality.futbol11.forEach((p) => set.add(p));
    if (sports.includes('basket')) basketPositionsByModality.basket5v5.forEach((p) => set.add(p));
    return set.size > 0 ? Array.from(set) : ['cualquiera'];
  })();

  // Fixed storage path — always overwrite the same object so URL stays stable.
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
    // Determine MIME from mimeType field (most reliable in SDK 54)
    const mimeType = asset.mimeType ?? 'image/jpeg';

    setUploadingAvatar(true);
    try {
      const response = await fetch(asset.uri);
      const arrayBuffer = await response.arrayBuffer();

      // Delete old object first so storage doesn't accumulate stale files
      await supabase.storage.from('avatars').remove([AVATAR_STORAGE_PATH]);

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(AVATAR_STORAGE_PATH, arrayBuffer, {
          contentType: mimeType,
          upsert: true,
        });

      if (uploadError) {
        Alert.alert('Error al subir foto', uploadError.message);
        return;
      }

      // Append cache-buster so Image component skips its local cache
      const baseUrl = `${SUPABASE_URL}/storage/v1/object/public/avatars/${AVATAR_STORAGE_PATH}`;
      const publicUrl = `${baseUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) {
        Alert.alert('Error al guardar foto', updateError.message);
        return;
      }

      setAvatarUri(publicUrl);
      setUser({ ...user, avatarUrl: publicUrl });
    } catch (e) {
      Alert.alert('Error', 'No se pudo subir la imagen. Intenta de nuevo.');
      console.error('[uploadAvatar]', e);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const deleteAvatar = async () => {
    if (!user) return;
    setUploadingAvatar(true);
    try {
      await supabase.storage.from('avatars').remove([AVATAR_STORAGE_PATH]);
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user.id);
      if (error) {
        Alert.alert('Error', error.message);
        return;
      }
      setAvatarUri(undefined);
      setUser({ ...user, avatarUrl: undefined });
    } catch (e) {
      Alert.alert('Error', 'No se pudo eliminar la foto.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const onAvatarPress = () => {
    if (avatarUri) {
      Alert.alert('Foto de perfil', undefined, [
        { text: 'Cambiar foto', onPress: uploadAvatar },
        {
          text: 'Eliminar foto',
          style: 'destructive',
          onPress: () =>
            Alert.alert('Eliminar foto', '¿Estás seguro?', [
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
        .from('profiles')
        .select('id')
        .eq('username', trimmedUsername)
        .neq('id', user.id)
        .maybeSingle();
      if (existing) {
        setSaving(false);
        Alert.alert('Nombre de usuario no disponible', 'Ese @usuario ya está en uso. Elige otro.');
        return;
      }
    }

    const trimmedBio = bio.trim().slice(0, 300);

    const { error } = await supabase
      .from('profiles')
      .update({
        name: name.trim().slice(0, 60) || user.name,
        username: trimmedUsername || null,
        bio: trimmedBio || null,
        skill_level: skill,
        sports,
        positions,
      })
      .eq('id', user.id);

    setSaving(false);
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    setUser({
      ...user,
      name: name.trim().slice(0, 60) || user.name,
      username: trimmedUsername || undefined,
      bio: trimmedBio || undefined,
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
          <Avatar name={name || '?'} uri={avatarUri} size={96} />
          <PressableScale
            style={s.cameraBtn}
            scaleTo={0.9}
            onPress={onAvatarPress}
          >
            {uploadingAvatar ? (
              <ActivityIndicator size="small" color={c.bg} />
            ) : avatarUri ? (
              <Trash size={18} color={c.bg} weight="fill" />
            ) : (
              <Camera size={18} color={c.bg} weight="fill" />
            )}
          </PressableScale>
        </View>

        <TextInput
          label="Nombre"
          placeholder="Tu nombre"
          value={name}
          onChangeText={(t) => setName(t.slice(0, 60))}
          autoCapitalize="words"
          autoCorrect={false}
        />
        <TextInput
          label="Nombre de usuario"
          placeholder="tuusuario"
          value={username}
          onChangeText={(t) => setUsername(t.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20))}
          autoCapitalize="none"
          autoCorrect={false}
          leading={<Text variant="body" color="textSecondary">@</Text>}
        />
        <TextInput
          label="Sobre mí"
          placeholder="Cuéntale a la comunidad cómo juegas"
          value={bio}
          onChangeText={(t) => setBio(t.slice(0, 300))}
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
                  <Text variant="caption" color={active ? 'primary' : 'textSecondary'}>
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
                style={[s.levelBtn, skill === lvl ? s.levelBtnActive : null]}
                scaleTo={0.94}
              >
                <Stars
                  level={lvl}
                  size={10}
                  filledColor={skill === lvl ? c.textOnPrimary : c.primary}
                  emptyColor={skill === lvl ? `${c.textOnPrimary}55` : c.border}
                />
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
    levelBtnActive: { backgroundColor: c.primaryBg, borderColor: c.primary },
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
