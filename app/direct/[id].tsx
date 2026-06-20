import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowBendUpLeft, Check, Checks, Microphone, PaperPlaneTilt, Pause, Play, Trash, X } from 'phosphor-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
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
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { TypingDots } from '@/components/ui/TypingDots';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { TextInput } from '@/components/ui/TextInput';
import { useDeletePrivateMessage, useMarkThreadRead, usePrivateChat } from '@/hooks/useChat';
import { useProfile } from '@/hooks/useProfiles';
import { useColors } from '@/hooks/useColors';
import { queryClient } from '@/lib/queryClient';
import { useSession } from '@/store/session';
import { timeOnly } from '@/lib/time';
import { radius, spacing } from '@/theme';
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
  const textColor = isMe ? c.bg : c.textPrimary;
  return (
    <Text variant="caption" style={{ color: textColor, opacity: 0.6, marginBottom: spacing.xs }} numberOfLines={1}>
      {replyTo.voiceUrl ? '🎤 Nota de voz' : replyTo.body}
    </Text>
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
              <VoiceBubble url={message.voiceUrl} durationSec={message.voiceDurationSec} messageId={message.id} isMe={isMe} c={c} />
            ) : (
              <Text variant="body" color={isMe ? 'surface' : 'textPrimary'}>{message.body}</Text>
            )}
            <View style={[s.timeRow, isMe ? s.timeRight : s.timeLeft]}>
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
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<ChatMessageData | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recElapsed, setRecElapsed] = useState(0);
  const recRef = useRef<Audio.Recording | null>(null);
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const grouped = useMemo(() => groupByDay(messages), [messages]);

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
        ) : undefined}
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
                {items.map((msg) => (
                  <DirectBubble
                    key={msg.id} message={msg} myId={userId ?? ''} c={c} othersReadAt={othersReadAt}
                    onReply={(m) => setReplyTo(m)}
                    selectMode={selectMode} selected={selectedIds.has(msg.id)}
                    onEnterSelect={enterSelect} onToggleSelect={toggleSelect}
                  />
                ))}
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
                <Text variant="caption" color="primary">{replyTo.authorName}</Text>
                <Text variant="caption" color="textSecondary" numberOfLines={1}>
                  {replyTo.voiceUrl ? '🎤 Nota de voz' : replyTo.body}
                </Text>
              </View>
              <PressableScale scaleTo={0.88} onPress={() => setReplyTo(null)}>
                <X size={16} color={c.textTertiary} weight="bold" />
              </PressableScale>
            </View>
          ) : null}

          {selectMode ? (
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
    bubbleMine: { backgroundColor: c.primary, borderBottomRightRadius: 4 },
    bubbleOther: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderBottomLeftRadius: 4 },
    bubbleOpt: { opacity: 0.6 },
    bubbleSelected: { borderWidth: 2, borderColor: c.primary },
    bubbleDimmed: { opacity: 0.4 },
    checkBadge: { position: 'absolute', top: -8, right: -8, width: 20, height: 20, borderRadius: 10, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: c.bg },
    timeRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
    timeRight: { justifyContent: 'flex-end' },
    timeLeft: { justifyContent: 'flex-start' },
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
  });
}
