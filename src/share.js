import { CONFIG, BASE, PRESETS, SHAPES, fingerprint } from "./presets.js";

// ---------- Sanitizing: shared links and stored history are untrusted input ----------
// Every value is checked against CONFIG: numbers are clamped to their slider range,
// colors must be hex, selects must be a known option. Colors end up inside SVG
// attributes and generated code, so anything that isn't plainly a hex color is dropped.
const HEX = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
// Numbers may go as far as the slider or any preset does (Lightsaber's 8 px track is below
// the height slider's 12 px minimum), and no further.
const BOUNDS = {};
for (const [g, config] of Object.entries(CONFIG)) {
  for (const [k, c] of Object.entries(config)) {
    if (!Array.isArray(c)) continue;
    let [, lo, hi] = c;
    for (const values of [...PRESETS.map((p) => p.values), ...SHAPES.map((sh) => sh.values)]) {
      const x = values[g]?.[k];
      if (typeof x === "number") { lo = Math.min(lo, x); hi = Math.max(hi, x); }
    }
    BOUNDS[`${g}.${k}`] = [lo, hi];
  }
}

const num = (x, lo, hi, d) => (typeof x === "number" && Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : d);

function transition(x, d) {
  if (!x || typeof x !== "object") return d;
  if (x.type === "easing") {
    const e = Array.isArray(x.ease) && x.ease.length === 4 && x.ease.every((n) => typeof n === "number" && Number.isFinite(n))
      ? x.ease.map((n, i) => (i % 2 === 0 ? num(n, 0, 1, 0) : num(n, -2, 3, 0)))
      : [0.23, 1, 0.32, 1];
    return { type: "easing", duration: num(x.duration, 0, 5, 0.2), ease: e };
  }
  if (x.type === "spring") {
    if (x.visualDuration != null) return { type: "spring", visualDuration: num(x.visualDuration, 0.01, 5, 0.3), bounce: num(x.bounce, 0, 1, 0) };
    return { type: "spring", stiffness: num(x.stiffness, 1, 2000, 100), damping: num(x.damping, 0, 200, 10), mass: num(x.mass, 0.05, 20, 1) };
  }
  return d;
}

function sanitizeGroup(group, config, input, defaults) {
  const out = {};
  const src = input && typeof input === "object" ? input : {};
  for (const [k, c] of Object.entries(config)) {
    if (k === "_collapsed") continue;
    const x = src[k], d = defaults[k];
    if (Array.isArray(c)) out[k] = num(x, ...BOUNDS[`${group}.${k}`], d);
    else if (c && c.type === "select") out[k] = c.options.some((o) => o.value === x) ? x : d;
    else if (c && c.type === "text") out[k] = typeof x === "string" ? x.slice(0, 24) : d;
    else if (c && (c.type === "spring" || c.type === "easing")) out[k] = transition(x, d);
    else if (typeof c === "boolean") out[k] = typeof x === "boolean" ? x : d;
    else if (typeof c === "string") out[k] = typeof x === "string" && HEX.test(x) ? x : d;
    else out[k] = d;
  }
  return out;
}

// Full, valid values from any partial or hostile input; missing keys fall back to defaults.
export function sanitize(input) {
  const out = {};
  for (const [g, config] of Object.entries(CONFIG)) out[g] = sanitizeGroup(g, config, input?.[g], BASE[g]);
  return structuredClone(out); // never hand out BASE's own objects
}

export const STAGES = ["paper", "mist", "ink", "aurora"];

// ---------- Links ----------
// Only values that differ from the defaults go in the link, deflated when the browser can.
function diff(v) {
  const out = {};
  for (const [g, vals] of Object.entries(v)) {
    for (const [k, x] of Object.entries(vals)) {
      if (fingerprint(x) !== fingerprint(BASE[g]?.[k])) (out[g] ??= {})[k] = x;
    }
  }
  return out;
}

const toB64 = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64 = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

async function pipe(bytes, stream) {
  const out = new Response(new Blob([bytes]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}

export async function encodeShare(v, stage) {
  const json = new TextEncoder().encode(JSON.stringify({ v: diff(v), s: stage }));
  if (typeof CompressionStream === "function") {
    try { return `1${toB64(await pipe(json, new CompressionStream("deflate-raw")))}`; } catch { /* fall through */ }
  }
  return `0${toB64(json)}`;
}

// Returns { values, stage } or null if the link is malformed.
export async function decodeShare(code) {
  try {
    if (typeof code !== "string" || code.length > 8000) return null;
    let bytes = fromB64(code.slice(1));
    if (code[0] === "1") bytes = await pipe(bytes, new DecompressionStream("deflate-raw"));
    else if (code[0] !== "0") return null;
    const data = JSON.parse(new TextDecoder().decode(bytes));
    return { values: sanitize(data?.v), stage: STAGES.includes(data?.s) ? data.s : null };
  } catch {
    return null;
  }
}

export const shareUrl = (code) => `${location.origin}${location.pathname}#d=${code}`;
export const readShareHash = () => new URLSearchParams(location.hash.slice(1)).get("d");
