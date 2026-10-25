import { CONFIG } from "./presets.js";
import { saturate } from "./color.js";

// Macro sliders. Each runs -1 (left word) to +1 (right word) and pulls a set of
// settings away from the design they started from (the anchor), proportionally.
export const MOODS = [
  { id: "shape", left: "Soft", right: "Sharp" },
  { id: "energy", left: "Calm", right: "Energetic" },
  { id: "depth", left: "Flat", right: "Deep" },
  { id: "tone", left: "Serious", right: "Playful" },
];
export const CENTER = { shape: 0, energy: 0, depth: 0, tone: 0 };

// Where each end of an axis pulls numeric settings.
const PULLS = {
  shape: {
    left: { "Track.roundness": 1, "Thumb.roundness": 1, "Thumb.shadow": 0.5, "Thumb.pressStretch": 1.3, "Depth.blur": 20 },
    right: { "Track.roundness": 0, "Thumb.roundness": 0, "Thumb.shadow": 0.05, "Thumb.gloss": 0, "Thumb.pressStretch": 1, "Depth.blur": 0 },
  },
  energy: {
    left: { "Motion.squash": 0, "Motion.pop": 0, "Motion.pressScale": 1, "Hover.thumbScale": 1 },
    right: { "Motion.squash": 0.4, "Motion.pop": 0.12, "Motion.pressScale": 0.9, "Hover.thumbScale": 1.1 },
  },
  depth: {
    left: { "Thumb.shadow": 0, "Thumb.gloss": 0, "Track.inset": 0, "Track.sheen": 0, "Depth.opacity": 0 },
    right: { "Thumb.shadow": 0.85, "Thumb.gloss": 0.7, "Track.inset": 0.5, "Track.sheen": 0.45, "Depth.opacity": 0.3, "Depth.blur": 22, "Depth.offsetX": 0, "Depth.offsetY": 8 },
  },
  tone: {
    left: { "Effects.glow": 0, "Effects.trail": 0 },
    right: { "Effects.glow": 18, "Effects.trail": 2 },
  },
};

const lerp = (a, b, t) => a + (b - a) * t;
const round = (x, d = 3) => Math.round(x * 10 ** d) / 10 ** d;

// Clamp to the control's range and snap to its step, so DialKit shows clean numbers.
function fit(path, x) {
  const [g, k] = path.split(".");
  const c = CONFIG[g]?.[k];
  if (!Array.isArray(c)) return x;
  const [, lo, hi, step] = c;
  const y = Math.min(hi, Math.max(lo, x));
  return round(Math.round(y / step) * step, 4);
}

// Calm ↔ energetic for the thumb transition: springs get bouncier or settle flatter;
// an easing curve slows and softens, or becomes a bouncy spring.
function energyThumb(t0, t) {
  const a = Math.abs(t);
  if (t0.type === "spring" && t0.visualDuration != null) {
    const to = t > 0 ? { vd: 0.42, bounce: 0.55 } : { vd: 0.6, bounce: 0 };
    return { type: "spring", visualDuration: round(lerp(t0.visualDuration, to.vd, a)), bounce: round(lerp(t0.bounce ?? 0, to.bounce, a)) };
  }
  if (t0.type === "easing") {
    if (t < 0) {
      return { type: "easing", duration: round(lerp(t0.duration, 0.45, a)), ease: t0.ease.map((e, i) => round(lerp(e, [0.25, 0.1, 0.25, 1][i], a))) };
    }
    return { type: "spring", visualDuration: round(Math.min(0.6, Math.max(0.15, t0.duration * 1.6))), bounce: round(lerp(0.05, 0.55, a)) };
  }
  return t0; // stiffness/damping springs are left as tuned
}

const TONE_COLORS = [["Track", "onColor"], ["Track", "borderColor"], ["Thumb", "onColor"], ["Icon", "onColor"], ["Effects", "color"]];
const TONE_SIZES = [["Track", "width"], ["Track", "height"], ["Track", "padding"], ["Thumb", "size"], ["Label", "size"]];

export function applyMood(anchor, moods) {
  const out = structuredClone(anchor);
  const get = (path) => { const [g, k] = path.split("."); return anchor[g][k]; };
  const set = (path, x) => { const [g, k] = path.split("."); out[g][k] = x; };

  // Numeric pulls add up across axes, then get clamped once.
  const delta = {};
  for (const { id } of MOODS) {
    const t = moods[id] ?? 0;
    if (!t) continue;
    for (const [path, target] of Object.entries(t > 0 ? PULLS[id].right : PULLS[id].left)) {
      delta[path] = (delta[path] ?? 0) + (target - get(path)) * Math.abs(t);
    }
  }

  // Serious ↔ playful also scales the whole switch and its color saturation.
  const tone = moods.tone ?? 0;
  if (tone) {
    const scale = tone > 0 ? 1 + 0.3 * tone : 1 - 0.12 * -tone;
    for (const [g, k] of TONE_SIZES) out[g][k] = fit(`${g}.${k}`, anchor[g][k] * scale);
    const sat = tone > 0 ? 1 + 0.6 * tone : 1 - 0.85 * -tone;
    for (const [g, k] of TONE_COLORS) out[g][k] = saturate(anchor[g][k], sat);
    if (tone > 0.5 && anchor.Effects.burst === "none") out.Effects.burst = "confetti";
    if (tone < -0.4) out.Effects.burst = "none";
    if (tone < -0.7) out.Effects.finish = "none";
  }

  for (const [path, d] of Object.entries(delta)) set(path, fit(path, get(path) + d));
  if (moods.energy) out.Motion.thumb = energyThumb(anchor.Motion.thumb, moods.energy);
  return out;
}
