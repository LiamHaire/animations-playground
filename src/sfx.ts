import { useEffect } from "react";
import type { ClipProps } from "./play";

// Synthesised clicks and clacks (Web Audio, no samples). A sequence supplies a cue sheet: absolute times in ms from the
// start of the animation at 1x, so the same list can drive real recorded sounds later.
export type Voice = "key" | "click" | "clack" | "thock" | "thud" | "tick" | "ping";
export type Cue = { at: number; voice: Voice; gain?: number; pitch?: number; label?: string };

type VoiceFn = (c: AudioContext, out: AudioNode, t: number, g: number, p: number) => void;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
let enabled = false;
let bus: GainNode | null = null;

function ensure() {
  if (!ctx) {
    ctx = new AudioContext();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    master = ctx.createGain();
    master.gain.value = 0.6;
    master.connect(comp);
    comp.connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return { c: ctx, out: master! };
}

export function setSoundEnabled(on: boolean) {
  enabled = on;
  if (on) void ensure().c.resume();
}

function burst(c: AudioContext, out: AudioNode, t: number, dur: number, freq: number, q: number, g: number, type: BiquadFilterType = "bandpass") {
  const src = c.createBufferSource();
  src.buffer = noise;
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const a = c.createGain();
  a.gain.setValueAtTime(0, t);
  a.gain.linearRampToValueAtTime(g, t + 0.001);
  a.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(a).connect(out);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.02);
}

function tone(c: AudioContext, out: AudioNode, t: number, dur: number, f0: number, f1: number, g: number) {
  const o = c.createOscillator();
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const a = c.createGain();
  a.gain.setValueAtTime(g, t);
  a.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(a).connect(out);
  o.start(t);
  o.stop(t + dur + 0.02);
}

const VOICES: Record<Voice, VoiceFn> = {
  // Keyboard clack: a bright snap over a short low knock. Pitch wobbles a little so repeats don't machine-gun.
  key: (c, out, t, g, p) => {
    p *= 0.94 + Math.random() * 0.12;
    burst(c, out, t, 0.022, 2200 * p, 1.2, 0.5 * g);
    burst(c, out, t, 0.012, 6000 * p, 0.8, 0.25 * g);
    tone(c, out, t, 0.05, 200 * p, 90 * p, 0.5 * g);
  },
  click: (c, out, t, g, p) => {
    burst(c, out, t, 0.008, 4500 * p, 2, 0.4 * g);
    tone(c, out, t, 0.012, 2200 * p, 1500 * p, 0.12 * g);
  },
  clack: (c, out, t, g, p) => {
    burst(c, out, t, 0.04, 1400 * p, 0.9, 0.7 * g);
    burst(c, out, t, 0.015, 5000 * p, 1, 0.3 * g);
    tone(c, out, t, 0.07, 260 * p, 110 * p, 0.55 * g);
  },
  thock: (c, out, t, g, p) => {
    tone(c, out, t, 0.11, 170 * p, 60 * p, 0.8 * g);
    burst(c, out, t, 0.03, 700 * p, 0.7, 0.35 * g, "lowpass");
  },
  thud: (c, out, t, g, p) => {
    tone(c, out, t, 0.2, 120 * p, 38 * p, 1 * g);
    burst(c, out, t, 0.09, 500 * p, 0.7, 0.5 * g, "lowpass");
    burst(c, out, t, 0.01, 3000 * p, 1, 0.25 * g);
  },
  tick: (c, out, t, g, p) => {
    burst(c, out, t, 0.005, 6000 * p, 2, 0.25 * g);
  },
  ping: (c, out, t, g, p) => {
    tone(c, out, t, 0.16, 3200 * p, 3180 * p, 0.12 * g);
  },
};

// `count` ticks across `span` ms. Each gap is `decay` times the one before: below 1 the ticks speed up, above 1 they slow.
export function ratchet(start: number, span: number, count: number, decay: number, voice: Voice, gain: number, pitch: number, pitchStep = 0): Cue[] {
  const weights = Array.from({ length: count - 1 }, (_, i) => decay ** i);
  const total = weights.reduce((a, b) => a + b, 0);
  let at = start;
  return Array.from({ length: count }, (_, i) => {
    const cue: Cue = { at, voice, gain, pitch: pitch + pitchStep * i };
    at += ((weights[i] ?? 0) / total) * span;
    return cue;
  });
}

// For sounds that follow something timer-driven (typing), played at the moment it happens.
export function playNow(voice: Voice, gain = 1, pitch = 1) {
  if (!bus || !ctx) return;
  VOICES[voice](ctx, bus, ctx.currentTime, gain, pitch);
}

function startRun(cues: Cue[], speed: number) {
  if (!enabled) return () => {};
  const { c, out } = ensure();
  const run = c.createGain();
  run.connect(out);
  bus = run;
  const t0 = c.currentTime;
  for (const cue of cues) VOICES[cue.voice](c, run, t0 + cue.at / 1000 / speed, cue.gain ?? 1, cue.pitch ?? 1);
  return () => {
    if (bus === run) bus = null;
    run.gain.setTargetAtTime(0, c.currentTime, 0.01);
    window.setTimeout(() => run.disconnect(), 150);
  };
}

// Plays the cue sheet each time the animation (re)starts, and silences it if the animation is restarted or unmounted.
export function useSfx(cues: Cue[], { runKey, speed, reduced }: ClipProps) {
  useEffect(() => (reduced ? undefined : startRun(cues, speed)), [cues, runKey, speed, reduced]);
}
