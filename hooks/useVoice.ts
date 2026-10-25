import {
  AudioModule,
  RecordingPresets,
  createAudioPlayer,
  setAudioModeAsync,
  useAudioRecorder,
  type AudioPlayer,
} from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSharedValue, withTiming } from 'react-native-reanimated';

interface Subscription {
  remove: () => void;
}

/** Plays one remote voice note. The native player is created lazily on first tap. */
export function useVoicePlayback(url: string, totalSec: number) {
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const progress = useSharedValue(0);
  const playerRef = useRef<AudioPlayer | null>(null);
  const subRef = useRef<Subscription | null>(null);

  const release = useCallback(() => {
    subRef.current?.remove();
    subRef.current = null;
    try {
      playerRef.current?.remove();
    } catch {}
    playerRef.current = null;
  }, []);

  useEffect(() => release, [release]);

  const toggle = async () => {
    if (playing) {
      playerRef.current?.pause();
      setPlaying(false);
      return;
    }
    try {
      if (!playerRef.current) {
        await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
        const player = createAudioPlayer({ uri: url }, { updateInterval: 80 });
        subRef.current = player.addListener('playbackStatusUpdate', (status) => {
          if (status.didJustFinish) {
            setPlaying(false);
            setElapsed(0);
            progress.value = withTiming(0, { duration: 300 });
            release();
            return;
          }
          const pos = status.currentTime ?? 0;
          progress.value = withTiming(totalSec > 0 ? Math.min(pos / totalSec, 1) : 0, { duration: 100 });
          setElapsed(Math.floor(pos));
        });
        playerRef.current = player;
      }
      playerRef.current.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  };

  return { playing, elapsed, progress, toggle };
}

export interface VoiceRecording {
  uri: string;
  durationSec: number;
}

/** Records a voice note. `stop()` resolves with the file, `cancel()` discards it. */
export function useVoiceRecorder() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  useEffect(() => clearTimer, []);

  const start = async (): Promise<boolean> => {
    try {
      const { granted } = await AudioModule.requestRecordingPermissionsAsync();
      if (!granted) return false;
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      elapsedRef.current = 0;
      setElapsed(0);
      setIsRecording(true);
      clearTimer();
      timerRef.current = setInterval(() => {
        elapsedRef.current += 1;
        setElapsed(elapsedRef.current);
      }, 1000);
      return true;
    } catch {
      setIsRecording(false);
      return false;
    }
  };

  const stop = async (): Promise<VoiceRecording | null> => {
    clearTimer();
    setIsRecording(false);
    const durationSec = elapsedRef.current;
    try {
      await recorder.stop();
      const uri = recorder.uri;
      return uri && durationSec > 0 ? { uri, durationSec } : null;
    } catch {
      return null;
    }
  };

  const cancel = async () => {
    clearTimer();
    setIsRecording(false);
    try {
      await recorder.stop();
    } catch {}
  };

  return { isRecording, elapsed, start, stop, cancel };
}
