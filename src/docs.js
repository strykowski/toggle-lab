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

// Render every image the docs page needs from a snapshot of the values.
// Runs in small steps so the page stays responsive and can show progress.
export async function generateDocs(v, onProgress, isCancelled = () => false) {
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
    k: Math.min(2, Math.max(1, 120 / T.width)),
    shots: {},
    frames: [],
    curve: [],
  };
  const shot = (checked, frame) => {
    const { svg, width, height, margin } = switchSvg(snapshot, checked, frame);
    return { url: svgDataUrl(svg), width, height, margin };
  };

  const tasks = [
    ["Rendering states", () => { out.shots.offRest = shot(false); }],
    ["Rendering states", () => { out.shots.offPressed = shot(false, { stretch: snapshot.Thumb.pressStretch }); }],
    ["Rendering states", () => { out.shots.onRest = shot(true); }],
    ["Rendering states", () => { out.shots.onPressed = shot(true, { stretch: snapshot.Thumb.pressStretch }); }],
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
