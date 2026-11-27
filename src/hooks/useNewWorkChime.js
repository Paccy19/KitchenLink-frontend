import { useCallback, useEffect, useRef, useState } from 'react';

const PREF_KEY = 'ofk_kitchen_sound';

/**
 * Rings while new work is waiting (orders or tickets nobody has accepted:
 * GET /vendor/workspace `counts.new_work`). It repeats every few seconds
 * until the work is accepted, or the person presses "Got it"; anything newer
 * rings again. Browsers only allow sound after a tap, so the sound starts
 * once the person turns it on (remembered on this device).
 */
export default function useNewWorkChime(count = 0, { everyMs = 5000 } = {}) {
  const [soundOn, setSoundOn] = useState(() => localStorage.getItem(PREF_KEY) === 'on');
  const [acknowledged, setAcknowledged] = useState(0);
  const audio = useRef(null);

  const context = useCallback(() => {
    if (!audio.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      audio.current = new Ctx();
    }
    if (audio.current.state === 'suspended') audio.current.resume().catch(() => null);
    return audio.current;
  }, []);

  const chime = useCallback(() => {
    const ctx = context();
    if (!ctx) return;
    const start = ctx.currentTime;
    [880, 660, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = start + i * 0.18;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.17);
    });
  }, [context]);

  // After a reload the browser wants a tap again: the first tap anywhere unlocks it.
  useEffect(() => {
    if (!soundOn) return undefined;
    const unlock = () => context();
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, [soundOn, context]);

  // Fewer waiting than acknowledged: some were taken, so a new one rings again.
  useEffect(() => {
    if (count < acknowledged) setAcknowledged(count);
  }, [count, acknowledged]);

  const ringing = count > 0 && count > acknowledged;
  useEffect(() => {
    if (!soundOn || !ringing) return undefined;
    chime();
    const timer = setInterval(chime, everyMs);
    return () => clearInterval(timer);
  }, [soundOn, ringing, chime, everyMs]);

  const toggleSound = () => {
    const next = !soundOn;
    localStorage.setItem(PREF_KEY, next ? 'on' : 'off');
    setSoundOn(next);
    if (next) chime(); // the tap unlocks audio, and shows what it sounds like
  };

  return { ringing, soundOn, toggleSound, acknowledge: () => setAcknowledged(count) };
}
