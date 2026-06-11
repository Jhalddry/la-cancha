import { StyleSheet, Text, View } from 'react-native';

import { formatMatchTime, formatPrice, labelModality } from '@/lib/format';
import type { Match } from '@/types/domain';

const BG = '#0B0F0C';
const PRIMARY = '#7BFF00';
const TEXT = '#FFFFFF';
const TEXT_DIM = 'rgba(255,255,255,0.55)';
const SURFACE = '#12161C';
const BORDER = '#1F2630';

const SPORT_EMOJI: Record<string, string> = {
  futbol: '⚽',
  basket: '🏀',
  tenis: '🎾',
  padel: '🏓',
  beachTennis: '🏖️',
};

const TYPE_LABEL: Record<string, string> = {
  chill: 'Chill',
  seria: 'Seria',
  competencia: 'Competencia',
};

const TYPE_COLOR: Record<string, string> = {
  chill: '#22c55e',
  seria: '#f59e0b',
  competencia: '#ef4444',
};

interface Props {
  match: Match;
  width?: number;
}

export function MatchShareCard({ match, width = 320 }: Props) {
  const typeColor = TYPE_COLOR[match.type] ?? PRIMARY;

  return (
    <View style={[s.card, { width, borderColor: `${typeColor}55` }]}>
      {/* Watermark */}
      <Text style={s.watermark} allowFontScaling={false}>
        {SPORT_EMOJI[match.sport]}
      </Text>

      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerEmoji}>{SPORT_EMOJI[match.sport]}</Text>
        <View style={s.headerText}>
          <Text style={s.modality}>{labelModality(match.modality)}</Text>
          <View style={[s.typeBadge, { backgroundColor: `${typeColor}22` }]}>
            <Text style={[s.typeLabel, { color: typeColor }]}>
              {TYPE_LABEL[match.type]}
            </Text>
          </View>
        </View>
      </View>

      {/* Divider */}
      <View style={s.divider} />

      {/* Info rows */}
      <View style={s.info}>
        <View style={s.row}>
          <Text style={s.rowIcon}>📍</Text>
          <Text style={s.rowText} numberOfLines={1}>{match.location.name}</Text>
        </View>
        <View style={s.row}>
          <Text style={s.rowIcon}>📅</Text>
          <Text style={s.rowText}>{formatMatchTime(match.startsAt)}</Text>
        </View>
        <View style={s.row}>
          <Text style={s.rowIcon}>💰</Text>
          <Text style={s.rowText}>{formatPrice(match.pricePerHour, match.currency)}/h</Text>
        </View>
        <View style={s.row}>
          <Text style={s.rowIcon}>👥</Text>
          <Text style={[s.rowText, { color: PRIMARY }]}>
            {match.missingCount} {match.missingCount === 1 ? 'lugar disponible' : 'lugares disponibles'}
          </Text>
        </View>
      </View>

      {/* Divider */}
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
    borderRadius: 16,
    overflow: 'hidden',
    padding: 20,
    gap: 16,
  },
  watermark: {
    position: 'absolute',
    right: -8,
    bottom: -16,
    fontSize: 110,
    lineHeight: 130,
    opacity: 0.07,
    pointerEvents: 'none',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  headerEmoji: {
    fontSize: 40,
    lineHeight: 48,
  },
  headerText: {
    flex: 1,
    gap: 6,
  },
  modality: {
    color: TEXT,
    fontSize: 20,
    fontWeight: '700',
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 99,
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: BORDER,
  },
  info: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowIcon: {
    fontSize: 14,
    width: 20,
    textAlign: 'center',
  },
  rowText: {
    color: TEXT,
    fontSize: 14,
    flex: 1,
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
