import { StyleSheet, Text, View } from 'react-native';

import { labelSport } from '@/lib/format';
import type { Player } from '@/types/domain';

const BG = '#0B0F0C';
const PRIMARY = '#7BFF00';
const TEXT = '#FFFFFF';
const TEXT_DIM = 'rgba(255,255,255,0.55)';
const BORDER = '#1F2630';
const SURFACE = '#12161C';

const SPORT_EMOJI: Record<string, string> = {
  futbol: '⚽',
  basket: '🏀',
  tenis: '🎾',
  padel: '🏓',
  beachTennis: '🏖️',
};

const SKILL_LABEL: Record<number, string> = {
  1: 'Principiante',
  2: 'Básico',
  3: 'Intermedio',
  4: 'Avanzado',
  5: 'Competitivo',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function StarRow({ level }: { level: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Text key={i} style={{ fontSize: 12, color: i <= level ? PRIMARY : 'rgba(255,255,255,0.2)' }}>
          ★
        </Text>
      ))}
    </View>
  );
}

interface Props {
  player: Player;
  width?: number;
}

export function PlayerShareCard({ player, width = 320 }: Props) {
  const initials = getInitials(player.name);

  return (
    <View style={[s.card, { width }]}>
      {/* Header: avatar + name + rep */}
      <View style={s.header}>
        <View style={s.avatar}>
          <Text style={s.initials}>{initials}</Text>
        </View>
        <View style={s.headerInfo}>
          <View style={s.nameRow}>
            <Text style={s.name} numberOfLines={1}>{player.name}</Text>
            {player.verified ? <Text style={s.verified}>✓</Text> : null}
          </View>
          {player.reputation ? (
            <View style={s.repRow}>
              <StarRow level={Math.round(player.reputation)} />
              <Text style={s.repNum}>{player.reputation.toFixed(1)}</Text>
            </View>
          ) : null}
          <Text style={s.skill}>{SKILL_LABEL[player.skillLevel] ?? 'Intermedio'}</Text>
        </View>
      </View>

      <View style={s.divider} />

      {/* Stats */}
      <View style={s.statsRow}>
        {player.matchesPlayed != null ? (
          <View style={s.stat}>
            <Text style={s.statNum}>{player.matchesPlayed}</Text>
            <Text style={s.statLabel}>jugadas</Text>
          </View>
        ) : null}
        {player.matchesOrganized != null ? (
          <View style={s.stat}>
            <Text style={s.statNum}>{player.matchesOrganized}</Text>
            <Text style={s.statLabel}>organizadas</Text>
          </View>
        ) : null}
        {player.attendancePct != null ? (
          <View style={s.stat}>
            <Text style={s.statNum}>{player.attendancePct}%</Text>
            <Text style={s.statLabel}>asistencia</Text>
          </View>
        ) : null}
      </View>

      {/* Sports */}
      {player.sports.length > 0 ? (
        <View style={s.sportsRow}>
          {player.sports.map((sp) => (
            <View key={sp} style={s.sportChip}>
              <Text style={s.sportEmoji}>{SPORT_EMOJI[sp] ?? '🏅'}</Text>
              <Text style={s.sportLabel}>{labelSport(sp)}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {player.city ? (
        <Text style={s.city}>📍 {player.city}</Text>
      ) : null}

      <View style={s.divider} />

      {/* Footer brand */}
      <View style={s.footer}>
        <View>
          <Text style={s.brandName}>La Cancha</Text>
          <Text style={s.brandTag}>Arma tu partida en segundos</Text>
        </View>
        <Text style={s.footIcon}>🏟️</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    overflow: 'hidden',
    padding: 20,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1A7A00',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  initials: {
    color: TEXT,
    fontSize: 22,
    fontWeight: '700',
  },
  headerInfo: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    color: TEXT,
    fontSize: 18,
    fontWeight: '700',
    flexShrink: 1,
  },
  verified: {
    color: '#1D9BF0',
    fontSize: 14,
    fontWeight: '700',
  },
  repRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  repNum: {
    color: TEXT_DIM,
    fontSize: 12,
  },
  skill: {
    color: PRIMARY,
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: BORDER,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 24,
  },
  stat: {
    alignItems: 'center',
    gap: 2,
  },
  statNum: {
    color: TEXT,
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    color: TEXT_DIM,
    fontSize: 11,
  },
  sportsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sportChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  sportEmoji: {
    fontSize: 13,
  },
  sportLabel: {
    color: TEXT,
    fontSize: 12,
  },
  city: {
    color: TEXT_DIM,
    fontSize: 13,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandName: {
    color: PRIMARY,
    fontSize: 16,
    fontWeight: '800',
  },
  brandTag: {
    color: TEXT_DIM,
    fontSize: 11,
    marginTop: 2,
  },
  footIcon: {
    fontSize: 24,
  },
});
