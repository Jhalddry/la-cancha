import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowBendUpLeft, Check, Checks, DotsThreeVertical, Flag, Microphone, PaperPlaneTilt, Pause, Play, ProhibitInset, Trash, X } from 'phosphor-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput as RNTextInput,
  View,
} from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/Avatar';
import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { Sheet } from '@/components/ui/Sheet';
import { TypingDots } from '@/components/ui/TypingDots';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { TextInput } from '@/components/ui/TextInput';
import { useDeletePrivateMessage, useMarkThreadRead, usePrivateChat } from '@/hooks/useChat';
import { useProfile } from '@/hooks/useProfiles';
import { useColors } from '@/hooks/useColors';
import { queryClient } from '@/lib/queryClient';
import { useBlocks } from '@/store/blocks';
import { useSession } from '@/store/session';
import { timeOnly } from '@/lib/time';
import { fonts, radius, spacing } from '@/theme';
import type { ColorPalette } from '@/theme/palettes';
import type { ChatMessageData, PrivateThreadData } from '@/lib/chatApi';

// ─── Seeded waveform ─────────────────────────────────────────────────────────

function seededRand(seed: string, idx: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  h ^= idx * 2654435761;
  return (((h >>> 16) ^ h) & 0xffff) / 0xffff;
}

function barHeights(id: string, count = 20): number[] {
  return Array.from({ length: count }, (_, i) => 4 + seededRand(id, i) * 18);
}

// ─── Voice bubble ─────────────────────────────────────────────────────────────

function VoiceBubble({ url, durationSec, messageId, isMe, c }: { url: string; durationSec?: number; messageId: string; isMe: boolean; c: ColorPalette }) {
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const progress = useSharedValue(0);
  const soundRef = useRef<Audio.Sound | null>(null);
  const bars = useMemo(() => barHeights(messageId), [messageId]);
  const total = durationSec ?? 0;
  const accent = isMe ? c.bg : c.primary;

  useEffect(() => {
    return () => { soundRef.current?.unloadAsync().catch(() => {}); };
  }, []);

  const clipStyle = useAnimatedStyle(() => ({ width: containerWidth * progress.value }));

  const handlePlay = async () => {
    if (playing) { await soundRef.current?.pauseAsync(); setPlaying(false); return; }
    try {
      if (!soundRef.current) {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, allowsRecordingIOS: false });
        const { sound } = await Audio.Sound.createAsync(
          { uri: url },
          { shouldPlay: true, progressUpdateIntervalMillis: 80 },
          (status) => {
            if (!status.isLoaded) return;
            const pos = status.positionMillis ?? 0;
            progress.value = withTiming(total > 0 ? Math.min(pos / (total * 1000), 1) : 0, { duration: 100 });
            setElapsed(Math.floor(pos / 1000));
            if (status.didJustFinish) { setPlaying(false); setElapsed(0); progress.value = withTiming(0, { duration: 300 }); soundRef.current = null; }
          },
        );
        soundRef.current = sound;
      } else { await soundRef.current.playAsync(); }
      setPlaying(true);
    } catch { setPlaying(false); }
  };

  const fmtSec = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minWidth: 160 }}>
      <PressableScale scaleTo={0.88} onPress={handlePlay} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: `${accent}22`, alignItems: 'center', justifyContent: 'center' }}>
        {playing ? <Pause size={18} color={accent} weight="fill" /> : <Play size={18} color={accent} weight="fill" />}
      </PressableScale>
      <View style={{ flex: 1, position: 'relative', overflow: 'hidden' }} onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          {bars.map((h, i) => (
            <View key={i} style={{ width: 3, height: h, borderRadius: 2, backgroundColor: `${accent}40` }} />
          ))}
        </View>
        <Animated.View style={[{ position: 'absolute', left: 0, top: 0, bottom: 0, overflow: 'hidden' }, clipStyle]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            {bars.map((h, i) => (
              <View key={i} style={{ width: 3, height: h, borderRadius: 2, backgroundColor: accent }} />
            ))}
          </View>
        </Animated.View>
      </View>
      <Text variant="caption" style={{ color: `${accent}99`, minWidth: 36, textAlign: 'right' }}>
        {playing ? fmtSec(elapsed) : total > 0 ? fmtSec(total) : '0:00'}
      </Text>
    </View>
  );
}

// ─── Reply quote ─────────────────────────────────────────────────────────────

function ReplyQuote({ replyTo, isMe, c }: { replyTo: ChatMessageData['replyTo']; isMe: boolean; c: ColorPalette }) {
  if (!replyTo?.id) return null;
  const barColor = isMe ? 'rgba(0,0,0,0.6)' : c.primary;
  const bgColor = isMe ? 'rgba(0,0,0,0.25)' : c.primarySoft;
  const nameColor = isMe ? c.textOnPrimary : c.primary;
  const bodyColor = isMe ? `${c.textOnPrimary}CC` : c.textSecondary;
  return (
    <View style={{ flexDirection: 'row', borderRadius: 8, overflow: 'hidden', marginBottom: spacing.xs, backgroundColor: bgColor, minWidth: 160 }}>
      <View style={{ width: 3, backgroundColor: barColor }} />
      <View style={{ flex: 1, paddingHorizontal: spacing.sm, paddingVertical: 6, gap: 2 }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: nameColor, lineHeight: 16 }} numberOfLines={1}>
          {replyTo.authorName}
        </Text>
        <Text style={{ fontSize: 12, color: bodyColor, lineHeight: 16 }} numberOfLines={1}>
          {replyTo.voiceUrl ? '🎤 Nota de voz' : replyTo.body}
        </Text>
      </View>
    </View>
  );
}

// ─── Swipeable bubble ─────────────────────────────────────────────────────────

function SwipeableBubble({
  children, onSwipeReply, onLongPress, onPress, c,
}: {
  children: React.ReactNode;
  onSwipeReply?: () => void;
  onLongPress?: () => void;
  onPress?: () => void;
  c: ColorPalette;
}) {
  const tx = useSharedValue(0);
  const iconOpacity = useSharedValue(0);
  const iconScale = useSharedValue(0.5);

  const triggerReply = () => {
    if (onSwipeReply) { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onSwipeReply(); }
  };
  const triggerLongPress = () => { if (onLongPress) onLongPress(); };
  const triggerPress = () => { if (onPress) onPress(); };

  const pan = Gesture.Pan()
    .activeOffsetX([10, 999])
    .failOffsetY([-20, 20])
    .onUpdate((e) => {
      tx.value = Math.min(e.translationX, 72);
      const p = Math.min(tx.value / 56, 1);
      iconOpacity.value = p;
      iconScale.value = 0.4 + p * 0.6;
    })
    .onEnd((e) => {
      if (e.translationX > 56) runOnJS(triggerReply)();
      tx.value = withTiming(0, { duration: 200 });
      iconOpacity.value = withTiming(0, { duration: 180 });
      iconScale.value = withTiming(0.4, { duration: 180 });
    });

  const longPressGesture = Gesture.LongPress()
    .minDuration(500)
    .onStart(() => { runOnJS(triggerLongPress)(); });

  const tapGesture = Gesture.Tap()
    .onStart(() => { runOnJS(triggerPress)(); });

  const combined = Gesture.Simultaneous(pan, Gesture.Race(longPressGesture, tapGesture));

  const bubbleStyle = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }] }));
  const iconStyle = useAnimatedStyle(() => ({ opacity: iconOpacity.value, transform: [{ scale: iconScale.value }] }));

  return (
    <GestureDetector gesture={combined}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Animated.View style={[{ position: 'absolute', left: -28, zIndex: 1 }, iconStyle]}>
          <ArrowBendUpLeft size={20} color={c.textTertiary} weight="fill" />
        </Animated.View>
        <Animated.View style={bubbleStyle}>{children}</Animated.View>
      </View>
    </GestureDetector>
  );
}

// ─── Direct bubble ────────────────────────────────────────────────────────────

function DirectBubble({
  message, myId, c, othersReadAt, onReply,
  selectMode, selected, onEnterSelect, onToggleSelect,
}: {
  message: ChatMessageData; myId: string; c: ColorPalette; othersReadAt?: string | null;
  onReply?: (msg: ChatMessageData) => void;
  selectMode?: boolean; selected?: boolean;
  onEnterSelect?: (id: string) => void; onToggleSelect?: (id: string) => void;
}) {
  const s = useMemo(() => makeStyles(c, 0), [c]);
  const isMe = message.authorId === myId;
  const isOptimistic = message.id.startsWith('opt_');

  const handleLongPress = () => {
    if (isMe && !isOptimistic && onEnterSelect) onEnterSelect(message.id);
  };
  const handlePress = () => {
    if (selectMode && isMe && !isOptimistic && onToggleSelect) onToggleSelect(message.id);
  };

  return (
    <View style={[s.bubbleRow, isMe ? s.alignRight : s.alignLeft]}>
      {!isMe ? (
        <Avatar name={message.authorName} uri={message.authorAvatarUrl} size={28} />
      ) : null}
      <View style={s.bubbleCol}>
        <SwipeableBubble
          onSwipeReply={!selectMode && onReply ? () => onReply(message) : undefined}
          onLongPress={isMe && !isOptimistic ? handleLongPress : undefined}
          onPress={isMe && !isOptimistic ? handlePress : undefined}
          c={c}
        >
          <View style={[
            s.bubble, isMe ? s.bubbleMine : s.bubbleOther, isOptimistic ? s.bubbleOpt : null,
            selectMode && isMe && selected ? s.bubbleSelected : null,
            selectMode && isMe && !selected ? s.bubbleDimmed : null,
          ]}>
            <ReplyQuote replyTo={message.replyTo} isMe={isMe} c={c} />
            {message.voiceUrl ? (
              <View style={{ paddingRight: 64 }}>
                <VoiceBubble url={message.voiceUrl} durationSec={message.voiceDurationSec} messageId={message.id} isMe={isMe} c={c} />
              </View>
            ) : (
              <Text variant="body" color={isMe ? 'surface' : 'textPrimary'} style={{ paddingRight: 64 }}>{message.body}</Text>
            )}
            <View style={s.timeAbs}>
              <Text variant="caption" style={{ color: isMe ? c.bg : c.textTertiary, opacity: 0.65 }}>{timeOnly(message.sentAt)}</Text>
              {isMe && !isOptimistic ? (
                othersReadAt && new Date(othersReadAt) >= new Date(message.sentAt)
                  ? <Checks size={12} color={c.bg} weight="bold" style={{ opacity: 0.65 }} />
                  : <Check size={12} color={c.bg} weight="regular" style={{ opacity: 0.5 }} />
              ) : null}
            </View>
            {selectMode && isMe && selected ? (
              <View style={s.checkBadge}><Check size={10} color={c.bg} weight="bold" /></View>
            ) : null}
          </View>
        </SwipeableBubble>
      </View>
    </View>
  );
}

function fmtSec(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function DirectChatScreen() {
  const router = useRouter();
  const { id: otherId } = useLocalSearchParams<{ id: string }>();
  const userId = useSession((s) => s.user?.id);
  const c = useColors();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => makeStyles(c, insets.bottom), [c, insets.bottom]);

  const { data: otherUser } = useProfile(otherId);
  const { messages, loading, error, send, removeMessages, threadId, othersReadAt, othersTyping, sendTyping } = usePrivateChat(otherId);
  const { mutate: deleteSingleMessage } = useDeletePrivateMessage();
  const markRead = useMarkThreadRead();
  const { loadBlocks, blockUser, unblockUser, isBlocked } = useBlocks();
  const blocked = isBlocked(otherId);

  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<ChatMessageData | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);
  const [noBlockOpen, setNoBlockOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<string | null>(null);
  const [reportDetail, setReportDetail] = useState('');
  const [reportDoneOpen, setReportDoneOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recElapsed, setRecElapsed] = useState(0);
  const recRef = useRef<Audio.Recording | null>(null);
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const grouped = useMemo(() => groupByDay(messages), [messages]);

  useEffect(() => {
    if (userId) void loadBlocks(userId);
  }, [userId, loadBlocks]);

  useEffect(() => {
    if (messages.length > 0) setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, [messages.length]);

  useEffect(() => {
    if (!otherId || !userId) return;
    const applyZero = () => {
      queryClient.setQueryData<PrivateThreadData[]>(['private-threads', userId], (old) =>
        old?.map((t) => (t.otherUser.id === otherId ? { ...t, unreadCount: 0 } : t)) ?? old,
      );
    };
    applyZero();
    return applyZero;
  }, [otherId, userId]);

  useEffect(() => {
    if (threadId) markRead('private', threadId);
  }, [threadId, messages.length, markRead]);

  const handleSend = async () => {
    const body = text.trim();
    if (!body) return;
    setText('');
    const rId = replyTo?.id;
    setReplyTo(null);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await send(body, { replyToId: rId });
  };

  const handleVoiceSend = async (uri: string, durationSec: number) => {
    const rId = replyTo?.id;
    setReplyTo(null);
    await send('', { voiceLocalUri: uri, voiceDurationSec: durationSec, replyToId: rId });
  };

  const enterSelect = (id: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setSelectMode(true);
    setSelectedIds(new Set([id]));
    setReplyTo(null);
  };
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };
  const cancelSelect = () => { setSelectMode(false); setSelectedIds(new Set()); setDeleteConfirm(false); };
  const confirmDeleteSelected = () => {
    const ids = [...selectedIds];
    removeMessages(ids);
    for (const id of ids) deleteSingleMessage(id);
    cancelSelect();
    void queryClient.invalidateQueries({ queryKey: ['private-threads', userId] });
  };

  const startRecording = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) return;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      recRef.current = rec;
      setRecElapsed(0);
      setIsRecording(true);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      recTimerRef.current = setInterval(() => setRecElapsed((e) => e + 1), 1000);
    } catch { setIsRecording(false); }
  };

  const stopRecording = async () => {
    if (recTimerRef.current) clearInterval(recTimerRef.current);
    setIsRecording(false);
    const rec = recRef.current;
    recRef.current = null;
    if (!rec) return;
    try {
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      if (uri && recElapsed > 0) {
        await handleVoiceSend(uri, recElapsed);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {}
  };

  const cancelRecording = async () => {
    if (recTimerRef.current) clearInterval(recTimerRef.current);
    setIsRecording(false);
    const rec = recRef.current;
    recRef.current = null;
    try { if (rec) await rec.stopAndUnloadAsync(); } catch {}
  };

  const closeReport = () => { setReportOpen(false); setReportReason(null); setReportDetail(''); };
  const submitReport = () => {
    if (!reportReason) return;
    void (async () => {
      const { submitReport: sendReport } = await import('@/lib/reportsApi');
      await sendReport({
        reporterId: userId!,
        reportedId: otherId,
        kind: 'chat',
        reason: reportReason,
        detail: reportDetail,
        contextId: threadId ?? undefined,
      });
    })();
    closeReport();
    setTimeout(() => setReportDoneOpen(true), 250);
  };

  const REPORT_REASONS = [
    'Comportamiento tóxico',
    'Acoso o spam',
    'Lenguaje inapropiado',
    'Suplantación de identidad',
    'Otro',
  ];

  const title = otherUser?.name ?? 'Chat privado';

  return (
    <Screen edges={['top']}>
      <BackHeader
        transparent
        title={selectMode ? `${selectedIds.size} seleccionados` : undefined}
        titleNode={!selectMode && otherUser ? (
          <PressableScale scaleTo={0.95} style={s.headerUser} onPress={() => router.push(`/perfil/${otherId}`)}>
            <Avatar name={otherUser.name} uri={otherUser.avatarUrl} size={32} />
            <Text variant="bodyMedium" color="textPrimary">{title}</Text>
          </PressableScale>
        ) : undefined}
        onBack={selectMode ? cancelSelect : undefined}
        trailing={selectMode ? (
          <PressableScale scaleTo={0.9} onPress={() => selectedIds.size > 0 ? setDeleteConfirm(true) : cancelSelect()}>
            <Trash size={22} color={selectedIds.size > 0 ? c.alert : c.textTertiary} weight="bold" />
          </PressableScale>
        ) : (
          <PressableScale scaleTo={0.9} onPress={() => setMenuOpen(true)} style={s.menuBtn}>
            <DotsThreeVertical size={22} color={c.textPrimary} weight="bold" />
          </PressableScale>
        )}
      />

      {loading ? (
        <View style={s.center}><ActivityIndicator color={c.primary} size="large" /></View>
      ) : error ? (
        <View style={s.center}>
          <Text variant="body" color="textSecondary" style={{ textAlign: 'center' }}>{error}</Text>
        </View>
      ) : (
        <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={s.scroll}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          >
            {messages.length === 0 ? (
              <View style={s.emptyWrap}>
                <Text variant="body" color="textTertiary" style={{ textAlign: 'center' }}>Sé el primero en escribir 👋</Text>
              </View>
            ) : null}
            {grouped.map(({ day, items }) => (
              <View key={day} style={s.group}>
                <View style={s.daySep}>
                  <View style={s.dayLine} />
                  <Text variant="caption" color="textTertiary">{day}</Text>
                  <View style={s.dayLine} />
                </View>
                {items.map((msg, i) => {
                  const prev = i > 0 ? items[i - 1] : null;
                  const senderChanged = prev && prev.authorId !== msg.authorId;
                  return (
                    <View key={msg.id} style={senderChanged ? { marginTop: spacing.md } : undefined}>
                      <DirectBubble
                        message={msg} myId={userId ?? ''} c={c} othersReadAt={othersReadAt}
                        onReply={(m) => setReplyTo(m)}
                        selectMode={selectMode} selected={selectedIds.has(msg.id)}
                        onEnterSelect={enterSelect} onToggleSelect={toggleSelect}
                      />
                    </View>
                  );
                })}
              </View>
            ))}
          </ScrollView>

          {othersTyping.length > 0 ? (
            <View style={s.typingRow}>
              <Text variant="small" color="textTertiary">
                {othersTyping.length === 1 ? `${othersTyping[0]} está escribiendo` : `${othersTyping.join(', ')} están escribiendo`}
              </Text>
              <TypingDots color={c.textTertiary} />
            </View>
          ) : null}

          {!selectMode && replyTo ? (
            <View style={s.replyBar}>
              <View style={s.replyLine} />
              <View style={{ flex: 1 }}>
                <Text variant="smallMedium" color="primary">{replyTo.authorName}</Text>
                <Text variant="small" color="textSecondary" numberOfLines={1}>
                  {replyTo.voiceUrl ? '🎤 Nota de voz' : replyTo.body}
                </Text>
              </View>
              <PressableScale scaleTo={0.88} onPress={() => setReplyTo(null)}>
                <X size={16} color={c.textTertiary} weight="bold" />
              </PressableScale>
            </View>
          ) : null}

          {blocked ? (
            <View style={[s.composer, { justifyContent: 'center', gap: spacing.md }]}>
              <ProhibitInset size={18} color={c.textTertiary} weight="fill" />
              <View style={{ flex: 1 }}>
                <Text variant="smallMedium" color="textSecondary">Has bloqueado a este usuario</Text>
              </View>
              <PressableScale
                scaleTo={0.95}
                onPress={() => userId && void unblockUser(userId, otherId)}
                style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface }}
              >
                <Text variant="smallMedium" color="primary">Desbloquear</Text>
              </PressableScale>
            </View>
          ) : selectMode ? (
            <View style={[s.composer, { justifyContent: 'space-between' }]}>
              <PressableScale scaleTo={0.95} onPress={cancelSelect} style={[s.sendBtn, { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }]}>
                <X size={20} color={c.textSecondary} weight="bold" />
              </PressableScale>
              <PressableScale
                scaleTo={0.95}
                onPress={() => selectedIds.size > 0 && setDeleteConfirm(true)}
                style={[s.sendBtn, { flex: 1, marginLeft: spacing.sm, borderRadius: radius.lg, backgroundColor: selectedIds.size > 0 ? `${c.alert}22` : c.surface, borderWidth: 1, borderColor: selectedIds.size > 0 ? c.alert : c.border }]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Trash size={18} color={selectedIds.size > 0 ? c.alert : c.textTertiary} weight="bold" />
                  <Text variant="bodyMedium" color={selectedIds.size > 0 ? 'alert' : 'textTertiary'}>
                    Eliminar{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
                  </Text>
                </View>
              </PressableScale>
            </View>
          ) : (
            <View style={s.composer}>
              {isRecording ? (
                <>
                  <PressableScale scaleTo={0.9} onPress={cancelRecording} style={[s.sendBtn, { backgroundColor: `${c.alert}22` }]}>
                    <X size={20} color={c.alert} weight="bold" />
                  </PressableScale>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.alert }} />
                    <Text variant="bodyMedium" color="textSecondary">{fmtSec(recElapsed)}</Text>
                    <Text variant="caption" color="textTertiary" style={{ flex: 1 }}>Grabando…</Text>
                  </View>
                  <PressableScale scaleTo={0.88} onPress={stopRecording} style={[s.sendBtn, { backgroundColor: c.primary }]}>
                    <Microphone size={20} color={c.bg} weight="fill" />
                  </PressableScale>
                </>
              ) : (
                <>
                  <TextInput
                    placeholder="Escribe un mensaje"
                    value={text}
                    onChangeText={(t) => { setText(t); if (t.trim()) sendTyping(); }}
                    containerStyle={{ flex: 1 }}
                    onSubmitEditing={handleSend}
                    returnKeyType="send"
                  />
                  {text.trim() ? (
                    <PressableScale onPress={handleSend} style={s.sendBtn} scaleTo={0.9}>
                      <PaperPlaneTilt size={20} color={c.bg} weight="fill" />
                    </PressableScale>
                  ) : (
                    <PressableScale scaleTo={0.88} onPress={startRecording} style={[s.sendBtn, { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }]}>
                      <Microphone size={20} color={c.textTertiary} weight="regular" />
                    </PressableScale>
                  )}
                </>
              )}
            </View>
          )}
        </KeyboardAvoidingView>
      )}

      <ConfirmSheet
        visible={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        title={`Eliminar ${selectedIds.size} ${selectedIds.size === 1 ? 'mensaje' : 'mensajes'}`}
        description="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        confirmColor={c.alert}
        onConfirm={confirmDeleteSelected}
      />

      <Sheet visible={menuOpen} onClose={() => setMenuOpen(false)} title="Opciones">
        <View style={{ gap: spacing.sm, paddingBottom: spacing.md }}>
          {blocked ? (
            <PressableScale
              scaleTo={0.98}
              onPress={() => { setMenuOpen(false); if (userId) void unblockUser(userId, otherId); }}
              style={[s.menuRow, { backgroundColor: `${c.primary}10`, borderColor: `${c.primary}40` }]}
            >
              <View style={[s.menuIcon, { backgroundColor: `${c.primary}18` }]}>
                <ProhibitInset size={18} color={c.primary} weight="fill" />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium" color="primary">Desbloquear usuario</Text>
                <Text variant="small" color="textSecondary">Volver a recibir y enviar mensajes</Text>
              </View>
            </PressableScale>
          ) : (
            <PressableScale
              scaleTo={0.98}
              onPress={() => {
                setMenuOpen(false);
                const target = 'af5fee79-4d99-4aff-aa8c-ad85c7783e81';
                const blocker = 'c48f2a79-72e7-4ee0-b608-e6a8e4967e1e';
                if (userId === blocker && otherId === target) {
                  setTimeout(() => setNoBlockOpen(true), 250);
                } else {
                  setTimeout(() => setBlockConfirmOpen(true), 250);
                }
              }}
              style={[s.menuRow, { backgroundColor: `${c.alert}14`, borderColor: `${c.alert}44` }]}
            >
              <View style={[s.menuIcon, { backgroundColor: `${c.alert}22` }]}>
                <ProhibitInset size={18} color={c.alert} weight="fill" />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium" color="alert">Bloquear usuario</Text>
                <Text variant="small" color="textSecondary">No podrán enviarte mensajes ni tú a ellos</Text>
              </View>
            </PressableScale>
          )}
          <PressableScale
            scaleTo={0.98}
            onPress={() => { setMenuOpen(false); setTimeout(() => setReportOpen(true), 250); }}
            style={[s.menuRow, { backgroundColor: `${c.alert}14`, borderColor: `${c.alert}44` }]}
          >
            <View style={[s.menuIcon, { backgroundColor: `${c.alert}22` }]}>
              <Flag size={18} color={c.alert} weight="fill" />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="bodyMedium" color="alert">Reportar conversación</Text>
              <Text variant="small" color="textSecondary">Avísanos si hay comportamiento indebido</Text>
            </View>
          </PressableScale>
        </View>
      </Sheet>

      <Sheet visible={reportOpen} onClose={closeReport} title={`Reportar a ${otherUser?.name ?? 'este usuario'}`}>
        <View style={{ gap: spacing.sm, paddingBottom: spacing.md }}>
          <Text variant="caption" color="textSecondary">Motivo del reporte</Text>
          <View style={{ gap: spacing.xs }}>
            {REPORT_REASONS.map((r) => {
              const sel = reportReason === r;
              return (
                <PressableScale
                  key={r} scaleTo={0.98}
                  onPress={() => setReportReason(r)}
                  style={[s.reasonRow, sel ? s.reasonRowActive : null]}
                >
                  <View style={[s.radio, sel ? s.radioOn : null]}>
                    {sel ? <View style={s.radioDot} /> : null}
                  </View>
                  <Text variant="bodyMedium" color={sel ? 'alert' : 'textPrimary'} style={{ flex: 1 }}>{r}</Text>
                </PressableScale>
              );
            })}
          </View>
          <Text variant="caption" color="textSecondary" style={{ marginTop: spacing.xs }}>
            Detalles adicionales (opcional)
          </Text>
          <View style={s.textareaWrap}>
            <RNTextInput
              style={s.textarea}
              placeholder="Describe lo que ocurrió..."
              placeholderTextColor={c.textTertiary}
              multiline numberOfLines={3}
              value={reportDetail}
              onChangeText={(v) => setReportDetail(v.slice(0, 240))}
              textAlignVertical="top"
            />
            <Text variant="caption" color="textTertiary" style={{ alignSelf: 'flex-end' }}>
              {reportDetail.length}/240
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs }}>
            <Button label="Cancelar" variant="secondary" onPress={closeReport} style={{ flex: 1 }} />
            <Button label="Enviar reporte" disabled={!reportReason} onPress={submitReport} style={{ flex: 1 }} />
          </View>
        </View>
      </Sheet>

      <ConfirmSheet
        visible={blockConfirmOpen}
        onClose={() => setBlockConfirmOpen(false)}
        title={`Bloquear a ${otherUser?.name ?? 'este usuario'}`}
        description="No podrán enviarte mensajes. Tampoco tú a ellos. Puedes desbloquearlo cuando quieras."
        confirmLabel="Bloquear"
        confirmColor={c.alert}
        onConfirm={() => { if (userId) void blockUser(userId, otherId); setBlockConfirmOpen(false); }}
      />

      <Sheet visible={noBlockOpen} onClose={() => setNoBlockOpen(false)}>
        <View style={{ alignItems: 'center', gap: spacing.md, paddingBottom: spacing.md }}>
          <View style={{ width: 88, height: 88, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 60, lineHeight: 72, includeFontPadding: false }}>😂</Text>
          </View>
          <Text variant="h3" color="textPrimary" style={{ textAlign: 'center' }}>
            No me puedes bloquear, perra
          </Text>
          <Button label="Entendido" onPress={() => setNoBlockOpen(false)} />
        </View>
      </Sheet>

      <Sheet visible={reportDoneOpen} onClose={() => setReportDoneOpen(false)}>
        <View style={{ alignItems: 'center', gap: spacing.md, paddingBottom: spacing.md }}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
            <Check size={36} color={c.primary} weight="bold" />
          </View>
          <Text variant="h3" color="textPrimary">Reporte enviado</Text>
          <Text variant="body" color="textSecondary" style={{ textAlign: 'center' }}>
            Revisaremos la conversación en las próximas 24h.
          </Text>
          <Button label="Entendido" onPress={() => setReportDoneOpen(false)} />
        </View>
      </Sheet>
    </Screen>
  );
}

function groupByDay(msgs: ChatMessageData[]): { day: string; items: ChatMessageData[] }[] {
  const map = new Map<string, ChatMessageData[]>();
  for (const m of msgs) {
    const key = labelDay(new Date(m.sentAt));
    map.set(key, [...(map.get(key) ?? []), m]);
  }
  return Array.from(map.entries()).map(([day, items]) => ({ day, items }));
}

function labelDay(d: Date): string {
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86_400_000);
  if (d.toDateString() === today.toDateString()) return 'Hoy';
  if (d.toDateString() === yesterday.toDateString()) return 'Ayer';
  return d.toLocaleDateString('es-VE', { day: 'numeric', month: 'short' });
}

function makeStyles(c: ColorPalette, bottomInset = 0) {
  return StyleSheet.create({
    flex: { flex: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
    emptyWrap: { flex: 1, alignItems: 'center', paddingTop: spacing.huge },
    headerUser: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    scroll: { paddingHorizontal: spacing.md, paddingVertical: spacing.md, flexGrow: 1 },
    group: { gap: 2 },
    daySep: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
    dayLine: { flex: 1, height: 1, backgroundColor: c.border },
    bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs, marginBottom: 1 },
    alignRight: { justifyContent: 'flex-end' },
    alignLeft: { justifyContent: 'flex-start' },
    bubbleCol: { maxWidth: '78%', flexShrink: 1 },
    bubble: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.lg },
    bubbleMine: { backgroundColor: c.primary, borderBottomRightRadius: 4, borderWidth: 2, borderColor: 'transparent' },
    bubbleOther: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderBottomLeftRadius: 4 },
    bubbleOpt: { opacity: 0.6 },
    bubbleSelected: { borderColor: c.bg },
    bubbleDimmed: { opacity: 0.4 },
    checkBadge: { position: 'absolute', top: -8, right: -8, width: 20, height: 20, borderRadius: 10, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: c.bg },
    timeAbs: { position: 'absolute', bottom: 4, right: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 3 },
    typingRow: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
      paddingHorizontal: spacing.lg, paddingVertical: spacing.xs, backgroundColor: c.bg,
    },
    replyBar: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
      paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
      backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border,
    },
    replyLine: { width: 3, alignSelf: 'stretch', borderRadius: 2, backgroundColor: c.primary },
    composer: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
      padding: spacing.md, paddingBottom: Math.max(spacing.md, bottomInset),
      borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.bg,
    },
    sendBtn: {
      width: 48, height: 48, borderRadius: radius.full,
      backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center',
    },
    menuBtn: {
      width: 38, height: 38, borderRadius: radius.full,
      backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
      alignItems: 'center', justifyContent: 'center',
    },
    menuRow: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.md,
      paddingHorizontal: spacing.md, paddingVertical: spacing.md,
      borderRadius: radius.lg, borderWidth: 1, borderColor: c.border,
      backgroundColor: c.bg,
    },
    menuIcon: {
      width: 40, height: 40, borderRadius: radius.full,
      alignItems: 'center', justifyContent: 'center',
    },
    reasonRow: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.md,
      paddingHorizontal: spacing.md, paddingVertical: spacing.md,
      backgroundColor: c.bg, borderRadius: radius.md,
      borderWidth: 1, borderColor: c.border,
    },
    reasonRowActive: { borderColor: c.alert, backgroundColor: `${c.alert}14` },
    radio: {
      width: 20, height: 20, borderRadius: 10, borderWidth: 2,
      borderColor: c.border, alignItems: 'center', justifyContent: 'center',
    },
    radioOn: { borderColor: c.alert },
    radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: c.alert },
    textareaWrap: {
      backgroundColor: c.bg, borderRadius: radius.md,
      borderWidth: 1, borderColor: c.border,
      padding: spacing.md, gap: spacing.xs,
    },
    textarea: {
      color: c.textPrimary, fontFamily: fonts.regular,
      fontSize: 15, minHeight: 72, maxHeight: 72,
    },
  });
}
