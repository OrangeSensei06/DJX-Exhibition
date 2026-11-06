import { useCallback, useEffect, useRef, useState } from 'react';
import type { Snapshot, WindowRole } from '../../shared/protocol';
import { activeChapter } from '../../shared/gestureRouting';

type Volumes = { ambience: number; effects: number };
const STORAGE_KEY = 'mughal-times-audio-v1';
const SOUND_BASE = './audio/sfx/';
const SOUNDS = {
  page: 'page-turn.wav',
  lift: 'send-whoosh-up.wav',
  return: 'whoosh-long-2s.wav',
  explode: 'impact-soft-1.wav',
  separate: 'whoosh-soft.wav',
  fashion: 'paper-shuffle.wav',
  snap: 'switch-1.wav',
  door: 'impact-wood-light.wav',
  passage: 'whoosh-long-2s.wav',
  vines: 'swell-soft-3s.wav',
  scroll: 'page-turn.wav',
  bloom: 'success-chime.wav',
  jewels: 'coin-clink.wav',
  exit: 'disappear.wav',
} as const;
type Cue = keyof typeof SOUNDS;
const clamp = (value: number) => Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
function readVolumes(): Volumes {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (parsed && typeof parsed.ambience === 'number' && typeof parsed.effects === 'number')
      return { ambience: clamp(parsed.ambience), effects: clamp(parsed.effects) };
  } catch { /* Start with safe exhibition defaults. */ }
  return { ambience: 35, effects: 55 };
}

export function useExhibitionAudio(role: WindowRole, snapshot: Snapshot) {
  const [volumes, setVolumes] = useState<Volumes>(readVolumes);
  const channel = useRef<BroadcastChannel | null>(null);
  const music = useRef<HTMLAudioElement | null>(null);
  const effects = useRef<Map<Cue, HTMLAudioElement>>(new Map());
  const previous = useRef<Snapshot | null>(null);

  useEffect(() => {
    const bus = new BroadcastChannel('mughal-times-audio');
    channel.current = bus;
    bus.onmessage = event => {
      const next = event.data;
      if (!next || typeof next.ambience !== 'number' || typeof next.effects !== 'number') return;
      const safe = { ambience: clamp(next.ambience), effects: clamp(next.effects) };
      setVolumes(safe);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(safe)); } catch { /* Nonpersistent session. */ }
    };
    return () => { channel.current = null; bus.close(); };
  }, []);

  const update = useCallback((key: keyof Volumes, value: number) => {
    setVolumes(current => {
      const next = { ...current, [key]: clamp(value) };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* Nonpersistent session. */ }
      channel.current?.postMessage(next);
      return next;
    });
  }, []);

  // Only the Book window owns sound, preventing duplicate audio on two displays.
  useEffect(() => {
    if (role !== 'book') return;
    const audio = new Audio('./audio/palace-evening.ogg');
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = volumes.ambience / 100;
    music.current = audio;
    const start = () => { void audio.play().catch(() => { /* A gesture will unlock audio if necessary. */ }); };
    start();
    document.addEventListener('pointerdown', start);
    document.addEventListener('keydown', start);
    return () => {
      document.removeEventListener('pointerdown', start);
      document.removeEventListener('keydown', start);
      audio.pause();
      audio.src = '';
      music.current = null;
      for (const sound of effects.current.values()) { sound.pause(); sound.src = ''; }
      effects.current.clear();
    };
  }, [role]);

  useEffect(() => {
    if (music.current) music.current.volume = volumes.ambience / 100;
    for (const sound of effects.current.values()) sound.volume = volumes.effects / 100;
  }, [volumes]);

  useEffect(() => {
    if (role !== 'book') return;
    const old = previous.current;
    previous.current = snapshot;
    if (!old) return;
    let cue: Cue | null = null;
    const chapter = activeChapter(snapshot);
    if (old.welcome !== snapshot.welcome || (!snapshot.welcome && activeChapter(old) !== chapter)) cue = 'page';
    else if (old.handoff.phase !== snapshot.handoff.phase) {
      if (snapshot.handoff.phase === 'lifting') cue = 'lift';
      if (snapshot.handoff.phase === 'returning') cue = 'return';
    } else if (chapter === 1 && old.biryaniVideo.phase !== snapshot.biryaniVideo.phase) {
      if (snapshot.biryaniVideo.phase === 'EXPLODING') cue = 'explode';
      if (snapshot.biryaniVideo.phase === 'SWEEP') cue = 'separate';
    } else if (chapter === 2) {
      if (old.fashion.startedAt !== snapshot.fashion.startedAt && snapshot.fashion.startedAt) cue = 'fashion';
      else if (old.fashion.look !== snapshot.fashion.look) cue = 'snap';
    } else if (chapter === 3 && old.architecture.phase !== snapshot.architecture.phase) {
      if (snapshot.architecture.phase === 'opening') cue = 'door';
      if (snapshot.architecture.phase === 'entering' || snapshot.architecture.phase === 'leaving') cue = 'passage';
    } else if (chapter === 4 && old.motifs.phase !== snapshot.motifs.phase) {
      if (snapshot.motifs.phase === 'VINES_GROW') cue = 'vines';
      if (snapshot.motifs.phase === 'SCROLL_OPEN') cue = 'scroll';
      if (snapshot.motifs.phase === 'EXIT_CENTER') cue = 'exit';
    } else if (chapter === 4 && old.motifs.blooms !== snapshot.motifs.blooms) cue = 'bloom';
    else if (chapter === 5 && old.jewels.phase !== snapshot.jewels.phase) {
      if (snapshot.jewels.phase === 'ROTATING') cue = 'jewels';
      if (snapshot.jewels.phase === 'GATHER') cue = 'exit';
    }
    if (!cue || !volumes.effects) return;
    let sound = effects.current.get(cue);
    if (!sound) {
      sound = new Audio(SOUND_BASE + SOUNDS[cue]);
      sound.preload = 'auto';
      effects.current.set(cue, sound);
    }
    sound.volume = volumes.effects / 100;
    sound.currentTime = 0;
    void sound.play().catch(() => { /* Continue exhibition without sound on blocked playback. */ });
  }, [role, snapshot, volumes.effects]);

  return {
    ambienceVolume: volumes.ambience,
    effectsVolume: volumes.effects,
    setAmbienceVolume: (value: number) => update('ambience', value),
    setEffectsVolume: (value: number) => update('effects', value),
  };
}
