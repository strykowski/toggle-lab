import { spring, cubicBezier } from "motion";
import { switchSvg, svgDataUrl } from "./svgExport.js";
import { toMotion, settleMs } from "./transitions.js";
import { fingerprint } from "./presets.js";

export const FRAMES = 7;
const MIN_STEP_MS = 70; // pace the steps so the progress reads, even when rendering is instant

// Thumb or fill progress (0..1, springs may overshoot) at time ms.
function sampler(t) {
  if (!t) return (ms) => Math.min(1, ms / 200);
  if (t.type === "easing") {
    const ease = cubicBezier(...t.ease);
    const d = t.duration * 1000;
    return (ms) => (d <= 0 ? 1 : ease(Math.min(1, Math.max(0, ms / d))));
  }
  try {
    const g = spring({ keyframes: [0, 1], ...toMotion(t) });
    return (ms) => (ms <= 0 ? 0 : g.next(ms).value);
  } catch {
    return (ms) => Math.min(1, Math.max(0, ms / 300));
  }
}

const tick = () => new Promise((res) => requestAnimationFrame(() => res()));
const wait = (ms) => new Promise((res) => setTimeout(res, ms));

async function decode(url) {
  const img = new Image();
  img.src = url;
  try { await img.decode(); } catch { /* still usable as a plain <img> */ }
}

// Every image the docs page needs, as a list of small steps over `out`.
function docsTasks(v) {
  const snapshot = structuredClone(v);
  const { Track: T, Motion: M } = snapshot;
  const thumbAt = sampler(M.thumb);
  const fillAt = sampler(M.fill);
  const settle = Math.max(settleMs(M.thumb), settleMs(M.fill), 1);
  const steps = M.steps ?? 0;
  const quantize = (p) => (steps > 0 ? Math.round(p * steps) / steps : p);

  const out = {
    fp: fingerprint(snapshot),
    at: Date.now(),
    v: snapshot,
    settle,
    // Small switches are drawn larger so the states are legible; big ones stay 1:1.
    k: Math.min(2, Math.max(1, 104 / T.width)),
    shots: {},
    frames: [],
    curve: [],
  };
  // Keep the raw SVG too: the Figma copy embeds it as vectors.
  const shot = (checked, frame) => {
    const { svg, width, height, margin } = switchSvg(snapshot, checked, frame);
    return { svg, url: svgDataUrl(svg), width, height, margin };
  };

  const tasks = [
    ["Rendering states", () => { out.shots.offRest = shot(false); }],
    ["Rendering states", () => { out.shots.offPressed = shot(false, { stretch: snapshot.Thumb.pressStretch }); }],
    ["Rendering states", () => { out.shots.onRest = shot(true); }],
    ["Rendering states", () => { out.shots.onPressed = shot(true, { stretch: snapshot.Thumb.pressStretch }); }],
    ["Rendering states", () => { out.shots.offHover = shot(false, { hover: true }); out.shots.onHover = shot(true, { hover: true }); }],
  ];
  for (let i = 0; i < FRAMES; i++) {
    tasks.push(["Sampling motion", () => {
      const t = Math.round((i / (FRAMES - 1)) * settle);
      const p = quantize(thumbAt(t));
      out.frames.push({ t, p, shot: shot(true, { progress: p, fill: fillAt(t) }) });
    }]);
  }
  tasks.push(["Plotting the curve", () => {
    // Domain is padded by half a frame on each side so the curve lines up with the filmstrip.
    const half = settle / (FRAMES - 1) / 2;
    for (let i = 0; i <= 96; i++) {
      const t = -half + (i / 96) * (settle + half * 2);
      out.curve.push({ t, p: t <= 0 ? 0 : quantize(thumbAt(t)) });
    }
  }]);
  return { out, tasks };
}

// The same docs data, built in one go (a few milliseconds), for exports.
export function buildDocs(v) {
  const { out, tasks } = docsTasks(v);
  for (const [, run] of tasks) run();
  return out;
}

// Build the docs for the docs view in small steps, so the page stays responsive and
// can show progress, then decode the images so they appear all at once.
export async function generateDocs(v, onProgress, isCancelled = () => false) {
  const { out, tasks } = docsTasks(v);
  tasks.push(["Decoding images", async () => {
    const urls = [...Object.values(out.shots), ...out.frames.map((f) => f.shot)].map((s) => s.url);
    await Promise.all(urls.map(decode));
  }]);

  for (let i = 0; i < tasks.length; i++) {
    if (isCancelled()) return null;
    const [step, run] = tasks[i];
    onProgress({ step, done: i, total: tasks.length });
    const t0 = performance.now();
    await run();
    await tick();
    const left = MIN_STEP_MS - (performance.now() - t0);
    if (left > 0) await wait(left);
  }
  if (isCancelled()) return null;
  onProgress({ step: "Done", done: tasks.length, total: tasks.length });
  return out;
}

// ---------- Shared content: used by the docs view and the Figma copy ----------
const r = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

export function motionSummary(t) {
  if (!t) return "—";
  if (t.type === "easing") return `${r(t.duration * 1000, 0)} ms · cubic-bezier(${t.ease.map((x) => r(x)).join(", ")})`;
  if (t.visualDuration != null) return `spring · ${r(t.visualDuration * 1000, 0)} ms · bounce ${r(t.bounce ?? 0)}`;
  return `spring · stiffness ${r(t.stiffness ?? 100, 1)} · damping ${r(t.damping ?? 10, 1)}`;
}

// Effects that only exist in the live switch, not in still frames.
export function liveOnly(v) {
  const M = v.Motion, E = v.Effects;
  return [
    M.squash > 0 && `squash ${r(M.squash)}`,
    M.pop > 0 && `pop ${r(M.pop)}`,
    M.tilt > 0 && `${M.tilt}° tilt`,
    E.trail > 0 && `trail ×${E.trail}`,
    E.burst !== "none" && `${E.burst} burst`,
  ].filter(Boolean);
}

// Which pre-rendered image shows a given state.
export const shotKey = (on, state) => `${on ? "on" : "off"}${state === "pressed" ? "Pressed" : state === "hover" ? "Hover" : "Rest"}`;

export const DOC_STATES = [
  { id: "rest", label: "Default" },
  { id: "hover", label: "Hover" },
  { id: "focus", label: "Focus" },
  { id: "pressed", label: "Pressed" },
  { id: "disabled", label: "Disabled" },
];

export function docsSpecs(v) {
  const { Track: T, Thumb: H, Icon: I, Label: L, Motion: M, Effects: E } = v;
  const HV = v.Hover ?? { tint: 0, thumbScale: 1 };
  const hover = [HV.tint > 0 && `tint ${Math.round(HV.tint * 100)}%`, HV.thumbScale > 1 && `thumb ×${r(HV.thumbScale)}`].filter(Boolean).join(" · ") || "none";
  const sOff = Math.max(4, H.size * H.offScale);
  const anatomy = [
    ["Track", `${T.width} × ${T.height} px`],
    ["Corner radius", `${r((T.roundness * Math.min(T.width, T.height)) / 2)} px`],
    ["Padding", `${T.padding} px`],
    ["Thumb", sOff !== H.size ? `${H.size} px · ${r(sOff)} px when off` : `${H.size} px`],
    T.borderWidth > 0 && ["Border", `${T.borderWidth} px${T.borderOffOnly ? " · off only" : ""}`],
    ["Hover", hover],
    ["Press", `scale ${r(M.pressScale)} · stretch ${r(H.pressStretch)}×`],
    ["Thumb motion", motionSummary(M.thumb)],
    ["Fill motion", motionSummary(M.fill)],
  ].filter(Boolean);
  const tokens = [
    ["Track off", T.offColor],
    ["Track on", T.onColor],
    ["Thumb off", H.offColor],
    ["Thumb on", H.onColor],
    T.borderWidth > 0 && ["Border", T.borderColor],
    I.glyph !== "none" && ["Icon off", I.offColor],
    I.glyph !== "none" && ["Icon on", I.onColor],
    L.show && ["Label off", L.offColor],
    L.show && ["Label on", L.onColor],
    (E.glow > 0 || E.burst !== "none" || E.trail > 0) && ["Accent", E.color],
  ].filter(Boolean);
  return { anatomy, tokens };
}

// Backticks mark code spans.
export const A11Y = [
  "A native `button` with `role=\"switch\"`; `aria-checked` carries the state.",
  "`Space` and `Enter` toggle it. Give every switch a visible label or an `aria-label`.",
  "Focus ring: 2 px, 2 px offset, shown only for keyboard focus.",
  "Hover only applies to a mouse, so touch screens never get a stuck hover state.",
  "Disabled uses the native attribute: 50% opacity, no press feedback.",
  "With reduced motion, the thumb uses a short ease-out and effects are skipped.",
];
