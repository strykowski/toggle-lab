// DialKit control config. Keys become labels ("offColor" -> "Off Color").
// Sliders are [default, min, max, step]. Defaults here = the "Default" preset.
export const PANEL_ID = "toggle-lab";

export const CONFIG = {
  Track: {
    width: [44, 24, 160, 1],
    height: [24, 6, 80, 1], // min 6: Lightsaber is 8 px, and DialKit clamps saved values to the slider
    roundness: [1, 0, 1, 0.01],
    padding: [2, -10, 14, 0.5],
    offColor: "#d9d9d9",
    onColor: "#006bff",
    borderWidth: [0, 0, 6, 0.5],
    borderColor: "#c7c7c7",
    borderOffOnly: false,
    fillMode: {
      type: "select",
      options: [
        { value: "fade", label: "Crossfade" },
        { value: "grow", label: "Grow with thumb" },
      ],
      default: "fade",
    },
    inset: [0, 0, 1, 0.01],
    sheen: [0, 0, 1, 0.01],
    backdropBlur: [0, 0, 30, 1],
  },
  Thumb: {
    size: [20, 6, 80, 1],
    offScale: [1, 0.3, 1.5, 0.01],
    roundness: [1, 0, 1, 0.01],
    offColor: "#ffffff",
    onColor: "#ffffff",
    shadow: [0.35, 0, 1, 0.01],
    gloss: [0, 0, 1, 0.01],
    pressStretch: [1.15, 1, 2, 0.01],
  },
  Icon: {
    _collapsed: true,
    glyph: {
      type: "select",
      options: [
        { value: "none", label: "None" },
        { value: "check", label: "Check / cross" },
        { value: "sun-moon", label: "Sun / moon" },
        { value: "lock", label: "Lock" },
        { value: "io", label: "I / O" },
        { value: "power", label: "Power" },
        { value: "bolt", label: "Bolt" },
      ],
      default: "none",
    },
    onColor: "#006bff",
    offColor: "#8f8f8f",
    size: [0.55, 0.2, 0.9, 0.01],
  },
  Label: {
    _collapsed: true,
    show: false,
    onText: { type: "text", default: "ON" },
    offText: { type: "text", default: "OFF" },
    size: [9, 6, 18, 0.5],
    font: {
      type: "select",
      options: [
        { value: "sans", label: "Sans" },
        { value: "mono", label: "Mono" },
      ],
      default: "sans",
    },
    onColor: "#ffffff",
    offColor: "#666666",
  },
  Depth: {
    _collapsed: true,
    offsetX: [0, -12, 12, 1],
    offsetY: [0, -12, 12, 1],
    blur: [0, 0, 40, 1],
    color: "#000000",
    opacity: [0.15, 0, 1, 0.01],
  },
  Motion: {
    thumb: { type: "spring", visualDuration: 0.3, bounce: 0.15 },
    fill: { type: "easing", duration: 0.2, ease: [0.23, 1, 0.32, 1] },
    pressScale: [0.97, 0.8, 1, 0.01],
    squash: [0.08, 0, 0.6, 0.01],
    pop: [0, 0, 0.25, 0.01],
    steps: [0, 0, 12, 1],
    tilt: [0, 0, 30, 1],
  },
  Effects: {
    color: "#006bff",
    finish: {
      type: "select",
      options: [
        { value: "none", label: "None" },
        { value: "holographic", label: "Holographic" },
        { value: "chrome", label: "Chrome" },
        { value: "scanlines", label: "Scanlines" },
        { value: "plasma", label: "Plasma" },
      ],
      default: "none",
    },
    glow: [0, 0, 48, 1],
    burst: {
      type: "select",
      options: [
        { value: "none", label: "None" },
        { value: "ripple", label: "Ripple" },
        { value: "sparks", label: "Sparks" },
        { value: "confetti", label: "Confetti" },
        { value: "glitch", label: "Glitch" },
      ],
      default: "none",
    },
    trail: [0, 0, 5, 1],
  },
};

// Resolve the config into the value shape DialKit returns.
function defaultsFrom(config) {
  const out = {};
  for (const [k, v] of Object.entries(config)) {
    if (k === "_collapsed") continue;
    if (Array.isArray(v)) out[k] = v[0];
    else if (v && typeof v === "object" && (v.type === "select" || v.type === "text"))
      out[k] = v.default;
    else if (v && typeof v === "object" && (v.type === "spring" || v.type === "easing"))
      out[k] = { ...v };
    else if (v && typeof v === "object") out[k] = defaultsFrom(v);
    else out[k] = v;
  }
  return out;
}

export const BASE = defaultsFrom(CONFIG);

function merge(base, over) {
  const out = structuredClone(base);
  for (const [group, vals] of Object.entries(over)) {
    out[group] = { ...out[group], ...vals };
  }
  return out;
}

const preset = (id, name, stage, over, group = "Classic") => ({ id, name, stage, group, values: merge(BASE, over) });
const wild = (id, name, stage, over) => preset(id, name, stage, over, "Experimental");

export const PRESETS = [
  preset("default", "Default", "paper", {}),
  preset("ios", "Cupertino", "mist", {
    Track: { width: 51, height: 31, offColor: "#e3e3e8", onColor: "#34c759", borderColor: "#d1d5db" },
    Thumb: { size: 27, shadow: 0.55, pressStretch: 1.28 },
    Icon: { onColor: "#1f9d48", offColor: "#a1a1aa" },
    Label: { offColor: "#6b7280" },
    Effects: { color: "#34c759" },
    Motion: {
      thumb: { type: "spring", visualDuration: 0.35, bounce: 0.12 },
      fill: { type: "easing", duration: 0.25, ease: [0.25, 0.1, 0.25, 1] },
      pressScale: 1,
      squash: 0,
    },
  }),
  preset("material", "Material", "paper", {
    Track: {
      width: 52, height: 32, padding: 4, offColor: "#e6e0e9", onColor: "#6750a4",
      borderWidth: 2, borderColor: "#79747e", borderOffOnly: true,
    },
    Thumb: { size: 24, offScale: 0.667, offColor: "#79747e", onColor: "#ffffff", shadow: 0, pressStretch: 1.12 },
    Icon: { glyph: "check", onColor: "#21005d", offColor: "#e6e0e9", size: 0.62 },
    Label: { offColor: "#49454f" },
    Motion: { thumb: { type: "spring", visualDuration: 0.35, bounce: 0.2 }, squash: 0 },
    Effects: { color: "#6750a4" },
  }),
  preset("neon", "Neon", "ink", {
    Track: {
      width: 64, height: 32, padding: 3, offColor: "#18181b", onColor: "#00262e",
      borderWidth: 1.5, borderColor: "#00e5ff",
    },
    Thumb: { size: 24, offColor: "#3f3f46", onColor: "#00e5ff", shadow: 0, pressStretch: 1.2 },
    Icon: { glyph: "bolt", onColor: "#001a1f", offColor: "#a1a1aa", size: 0.58 },
    Motion: { thumb: { type: "spring", visualDuration: 0.4, bounce: 0.3 }, squash: 0.3 },
    Effects: { color: "#00e5ff", glow: 22, burst: "sparks", trail: 3 },
  }),
  preset("jelly", "Jelly", "paper", {
    Track: { width: 72, height: 40, padding: 4, offColor: "#ffe0ec", onColor: "#ff4d94" },
    Thumb: { size: 32, shadow: 0.4, pressStretch: 1.35 },
    Motion: {
      thumb: { type: "spring", visualDuration: 0.5, bounce: 0.55 },
      pressScale: 0.92, squash: 0.4, pop: 0.12,
    },
    Effects: { color: "#ff4d94", burst: "confetti" },
  }),
  preset("brutal", "Brutal", "paper", {
    Track: {
      width: 64, height: 32, roundness: 0, padding: 3, offColor: "#ffffff", onColor: "#ffde00",
      borderWidth: 3, borderColor: "#000000",
    },
    Thumb: { size: 26, roundness: 0, offColor: "#000000", onColor: "#000000", shadow: 0, pressStretch: 1 },
    Icon: { glyph: "io", onColor: "#ffde00", offColor: "#ffffff", size: 0.5 },
    Depth: { offsetX: 4, offsetY: 4, blur: 0, color: "#000000", opacity: 1 },
    Motion: {
      thumb: { type: "easing", duration: 0.14, ease: [0.77, 0, 0.175, 1] },
      fill: { type: "easing", duration: 0.06, ease: [0.23, 1, 0.32, 1] },
      pressScale: 0.96, squash: 0,
    },
  }),
  preset("soft", "Soft", "mist", {
    Track: {
      width: 72, height: 38, padding: 4, offColor: "#e6e9ef", onColor: "#dcefe4", inset: 1,
    },
    Thumb: { size: 30, offColor: "#eef1f5", onColor: "#eef1f5", shadow: 0.5, gloss: 0.25, pressStretch: 1.1 },
    Icon: { glyph: "power", onColor: "#16a34a", offColor: "#a3adbd", size: 0.5 },
    Motion: { thumb: { type: "spring", visualDuration: 0.4, bounce: 0.1 }, squash: 0.05 },
  }),
  preset("glass", "Glass", "aurora", {
    Track: {
      width: 72, height: 38, padding: 4, offColor: "#ffffff33", onColor: "#ffffff8c",
      borderWidth: 1, borderColor: "#ffffff99", sheen: 0.8, backdropBlur: 14,
    },
    Thumb: { size: 30, shadow: 0.5, gloss: 0.8, pressStretch: 1.25 },
    Depth: { offsetX: 0, offsetY: 8, blur: 24, color: "#1e1b4b", opacity: 0.25 },
    Motion: { thumb: { type: "spring", visualDuration: 0.35, bounce: 0.25 }, squash: 0.2 },
  }),
  preset("daynight", "Day & night", "paper", {
    Track: { width: 88, height: 40, padding: 4, offColor: "#7dd3fc", onColor: "#1e1b4b", inset: 0.3, sheen: 0.3 },
    Thumb: { size: 32, offColor: "#fde047", onColor: "#e5e7eb", shadow: 0.5, gloss: 0.3, pressStretch: 1.15 },
    Icon: { glyph: "sun-moon", onColor: "#475569", offColor: "#b45309", size: 0.6 },
    Motion: { thumb: { type: "spring", visualDuration: 0.55, bounce: 0.2 }, squash: 0.15 },
    Effects: { color: "#fde047", burst: "ripple" },
  }),
  preset("label", "Labeled", "paper", {
    Track: { width: 76, height: 32, padding: 3, offColor: "#e5e5e5", onColor: "#171717" },
    Thumb: { size: 26, shadow: 0.3 },
    Label: { show: true, size: 10, onColor: "#ffffff", offColor: "#666666" },
    Motion: { thumb: { type: "spring", visualDuration: 0.3, bounce: 0.1 }, squash: 0.05 },
  }),
  preset("glossy", "Glossy", "paper", {
    Track: {
      width: 70, height: 36, padding: 3, offColor: "#c9ced6", onColor: "#3b82f6",
      borderWidth: 1, borderColor: "#00000026", inset: 0.6, sheen: 0.7,
    },
    Thumb: { size: 30, offColor: "#f8fafc", onColor: "#f8fafc", shadow: 0.8, gloss: 0.9 },
    Motion: { thumb: { type: "spring", visualDuration: 0.38, bounce: 0.3 }, squash: 0.15 },
    Effects: { color: "#3b82f6", glow: 10 },
  }),
  preset("overhang", "Overhang", "paper", {
    Track: { width: 36, height: 14, padding: -3, offColor: "#bdbdbd", onColor: "#90caf9" },
    Thumb: { size: 20, offColor: "#fafafa", onColor: "#1976d2", shadow: 0.7, pressStretch: 1 },
    Motion: { thumb: { type: "easing", duration: 0.2, ease: [0.4, 0, 0.2, 1] }, squash: 0 },
    Effects: { color: "#1976d2", burst: "ripple" },
  }),
  preset("compact", "Compact", "paper", {
    Track: { width: 28, height: 16, offColor: "#d4d4d4", onColor: "#171717", borderColor: "#bdbdbd" },
    Icon: { onColor: "#171717" },
    Effects: { color: "#171717" },
    Thumb: { size: 12, shadow: 0.2, pressStretch: 1.1 },
    Motion: { thumb: { type: "easing", duration: 0.16, ease: [0.23, 1, 0.32, 1] }, squash: 0 },
  }),

  // ---------- Experimental ----------
  wild("fui", "FUI", "ink", {
    Track: {
      width: 92, height: 28, roundness: 0, padding: 3, offColor: "#00e5ff0f", onColor: "#00e5ff2e",
      borderWidth: 1, borderColor: "#00e5ff",
    },
    Thumb: { size: 22, roundness: 0, offColor: "#0e4f5c", onColor: "#00e5ff", shadow: 0, pressStretch: 1 },
    Label: { show: true, onText: "ARMED", offText: "SAFE", size: 8, font: "mono", onColor: "#00e5ff", offColor: "#5eead4" },
    Motion: {
      thumb: { type: "easing", duration: 0.2, ease: [0.77, 0, 0.175, 1] },
      fill: { type: "easing", duration: 0.12, ease: [0.23, 1, 0.32, 1] },
      pressScale: 0.98, squash: 0, steps: 0,
    },
    Effects: { color: "#00e5ff", finish: "scanlines", glow: 14, burst: "glitch", trail: 2 },
  }),
  wild("holo", "Holographic", "ink", {
    Track: { width: 76, height: 38, padding: 4, offColor: "#d9d4f5", onColor: "#b9a8ff", sheen: 0.45 },
    Thumb: { size: 30, offColor: "#ffffff", onColor: "#ffffff", shadow: 0.5, gloss: 0.8, pressStretch: 1.25 },
    Motion: { thumb: { type: "spring", visualDuration: 0.45, bounce: 0.35 }, squash: 0.2 },
    Effects: { color: "#f0abfc", finish: "holographic", glow: 18, burst: "sparks" },
  }),
  wild("saber", "Lightsaber", "ink", {
    Track: { width: 132, height: 8, padding: -9, offColor: "#1c1c1f", onColor: "#fff1f1", fillMode: "grow" },
    Thumb: { size: 26, roundness: 0.3, offColor: "#3f3f46", onColor: "#71717a", shadow: 0.6, gloss: 0.7, pressStretch: 1 },
    Motion: { thumb: { type: "spring", visualDuration: 0.5, bounce: 0.1 }, pressScale: 1, squash: 0 },
    Effects: { color: "#ff2d2d", finish: "none", glow: 22, burst: "sparks" },
  }),
  wild("pixel", "Pixel", "paper", {
    Track: { width: 64, height: 32, roundness: 0, padding: 4, offColor: "#2b2d42", onColor: "#06d6a0" },
    Thumb: { size: 24, roundness: 0, offColor: "#edf2f4", onColor: "#edf2f4", shadow: 0, pressStretch: 1 },
    Depth: { offsetX: 0, offsetY: 4, blur: 0, color: "#000000", opacity: 1 },
    Motion: {
      thumb: { type: "easing", duration: 0.28, ease: [0, 0, 1, 1] },
      fill: { type: "easing", duration: 0.01, ease: [0, 0, 1, 1] },
      pressScale: 1, squash: 0, steps: 4,
    },
    Effects: { color: "#06d6a0", finish: "scanlines", burst: "confetti" },
  }),
  wild("rocker", "Rocker", "mist", {
    Track: { width: 64, height: 36, roundness: 0.18, padding: 3, offColor: "#d4d4d8", onColor: "#ef4444", inset: 0.5, sheen: 0.4 },
    Thumb: { size: 30, roundness: 0.18, offColor: "#fafafa", onColor: "#fafafa", shadow: 0.8, gloss: 0.6, pressStretch: 1 },
    Icon: { glyph: "io", onColor: "#ef4444", offColor: "#a1a1aa", size: 0.5 },
    Motion: { thumb: { type: "spring", visualDuration: 0.3, bounce: 0.1 }, pressScale: 1, squash: 0, tilt: 22 },
    Effects: { color: "#ef4444" },
  }),
  wild("plasma", "Plasma", "ink", {
    Track: { width: 80, height: 36, padding: 4, offColor: "#1f1033", onColor: "#7c3aed" },
    Thumb: { size: 28, offColor: "#d8b4fe", onColor: "#fdf4ff", shadow: 0.4, gloss: 0.5, pressStretch: 1.3 },
    Motion: { thumb: { type: "spring", visualDuration: 0.55, bounce: 0.5 }, squash: 0.35, pop: 0.06 },
    Effects: { color: "#d946ef", finish: "plasma", glow: 26, burst: "ripple", trail: 4 },
  }),
  wild("chrome", "Chrome", "mist", {
    Track: {
      width: 70, height: 34, padding: 3, offColor: "#9ca3af", onColor: "#d1d5db",
      borderWidth: 1, borderColor: "#00000040", inset: 0.4,
    },
    Thumb: { size: 28, offColor: "#e5e7eb", onColor: "#f9fafb", shadow: 0.9, gloss: 1 },
    Depth: { offsetX: 0, offsetY: 4, blur: 10, color: "#000000", opacity: 0.3 },
    Motion: { thumb: { type: "spring", visualDuration: 0.35, bounce: 0.2 }, squash: 0.1 },
    Effects: { color: "#e5e7eb", finish: "chrome" },
  }),
  wild("glitch", "Glitch", "ink", {
    Track: { width: 64, height: 30, roundness: 0.2, padding: 3, offColor: "#111111", onColor: "#ff006e" },
    Thumb: { size: 24, roundness: 0.2, offColor: "#f5f5f5", onColor: "#ffffff", shadow: 0, pressStretch: 1.1 },
    Motion: {
      thumb: { type: "easing", duration: 0.12, ease: [0.77, 0, 0.175, 1] },
      fill: { type: "easing", duration: 0.05, ease: [0.23, 1, 0.32, 1] },
      squash: 0, steps: 3,
    },
    Effects: { color: "#00f0ff", finish: "scanlines", burst: "glitch", trail: 3 },
  }),
];

export const TRANSITION_PATHS = ["Motion.thumb", "Motion.fill"];

export function transitionMode(t) {
  if (!t) return "simple";
  if (t.type === "easing") return "easing";
  return t.visualDuration != null ? "simple" : "advanced";
}

// Stable stringify for comparing current values to a preset.
export function fingerprint(v) {
  const norm = (x) => {
    if (Array.isArray(x)) return x.map(norm);
    if (x && typeof x === "object") {
      const o = {};
      for (const k of Object.keys(x).sort()) {
        if (x[k] === undefined) continue;
        o[k] = norm(x[k]);
      }
      return o;
    }
    if (typeof x === "number") return Math.round(x * 1000) / 1000;
    if (typeof x === "string") return x.toLowerCase();
    return x;
  };
  return JSON.stringify(norm(v));
}

// ---------- Color presets: change colors only ----------
const palette = (id, name, c) => ({ id, name, c });
export const PALETTES = [
  palette("blue", "Blue", { tOff: "#d9d9d9", tOn: "#006bff", thOff: "#ffffff", thOn: "#ffffff", accent: "#006bff", iOn: "#006bff", iOff: "#8f8f8f", lOn: "#ffffff", lOff: "#666666", border: "#c7c7c7" }),
  palette("graphite", "Graphite", { tOff: "#d4d4d4", tOn: "#171717", thOff: "#ffffff", thOn: "#ffffff", accent: "#171717", iOn: "#171717", iOff: "#8f8f8f", lOn: "#ffffff", lOff: "#666666", border: "#bdbdbd" }),
  palette("mint", "Mint", { tOff: "#e3e3e8", tOn: "#34c759", thOff: "#ffffff", thOn: "#ffffff", accent: "#34c759", iOn: "#1f9d48", iOff: "#a1a1aa", lOn: "#ffffff", lOff: "#6b7280", border: "#d1d5db" }),
  palette("grape", "Grape", { tOff: "#e6e0e9", tOn: "#6750a4", thOff: "#79747e", thOn: "#ffffff", accent: "#6750a4", iOn: "#21005d", iOff: "#e6e0e9", lOn: "#ffffff", lOff: "#49454f", border: "#79747e" }),
  palette("sunset", "Sunset", { tOff: "#fde2d4", tOn: "#ff5a36", thOff: "#ffffff", thOn: "#ffffff", accent: "#ff5a36", iOn: "#ff5a36", iOff: "#c4a9a0", lOn: "#ffffff", lOff: "#9a5b45", border: "#f3c4ae" }),
  palette("rose", "Rose", { tOff: "#ffe0ec", tOn: "#ff4d94", thOff: "#ffffff", thOn: "#ffffff", accent: "#ff4d94", iOn: "#ff4d94", iOff: "#d8a7bb", lOn: "#ffffff", lOff: "#a3577a", border: "#f9bcd3" }),
  palette("ocean", "Ocean", { tOff: "#d3e7f2", tOn: "#0e7490", thOff: "#ffffff", thOn: "#ecfeff", accent: "#06b6d4", iOn: "#0e7490", iOff: "#94a3b8", lOn: "#ecfeff", lOff: "#4b6b7a", border: "#a5c9db" }),
  palette("lemon", "Lemon", { tOff: "#f4f4f5", tOn: "#ffde00", thOff: "#18181b", thOn: "#18181b", accent: "#ffb800", iOn: "#ffde00", iOff: "#ffffff", lOn: "#18181b", lOff: "#71717a", border: "#18181b" }),
  palette("midnight", "Midnight", { tOff: "#3f3f46", tOn: "#6366f1", thOff: "#a1a1aa", thOn: "#ffffff", accent: "#818cf8", iOn: "#6366f1", iOff: "#3f3f46", lOn: "#ffffff", lOff: "#d4d4d8", border: "#52525b" }),
  palette("cyber", "Cyber", { tOff: "#18181b", tOn: "#00262e", thOff: "#3f3f46", thOn: "#00e5ff", accent: "#00e5ff", iOn: "#001a1f", iOff: "#a1a1aa", lOn: "#00e5ff", lOff: "#71717a", border: "#00e5ff" }),
];

export function paletteValues({ c }) {
  return {
    Track: { offColor: c.tOff, onColor: c.tOn, borderColor: c.border },
    Thumb: { offColor: c.thOff, onColor: c.thOn },
    Icon: { onColor: c.iOn, offColor: c.iOff },
    Label: { onColor: c.lOn, offColor: c.lOff },
    Effects: { color: c.accent },
  };
}

// ---------- Shape presets: change geometry only ----------
const shape = (id, name, track, thumb) => ({ id, name, values: { Track: track, Thumb: thumb } });
export const SHAPES = [
  shape("pill", "Pill", { width: 44, height: 24, roundness: 1, padding: 2 }, { size: 20, offScale: 1, roundness: 1, pressStretch: 1.15 }),
  shape("cupertino", "Classic", { width: 51, height: 31, roundness: 1, padding: 2 }, { size: 27, offScale: 1, roundness: 1, pressStretch: 1.28 }),
  shape("rounded", "Rounded", { width: 52, height: 28, roundness: 0.4, padding: 3 }, { size: 22, offScale: 1, roundness: 0.4, pressStretch: 1.15 }),
  shape("square", "Square", { width: 48, height: 26, roundness: 0, padding: 3 }, { size: 20, offScale: 1, roundness: 0, pressStretch: 1.1 }),
  shape("slim", "Slim", { width: 40, height: 16, roundness: 1, padding: 2 }, { size: 12, offScale: 1, roundness: 1, pressStretch: 1.15 }),
  shape("wide", "Wide", { width: 88, height: 36, roundness: 1, padding: 4 }, { size: 28, offScale: 1, roundness: 1, pressStretch: 1.2 }),
  shape("chunky", "Chunky", { width: 72, height: 40, roundness: 1, padding: 4 }, { size: 32, offScale: 1, roundness: 1, pressStretch: 1.3 }),
  shape("grow", "Grow", { width: 52, height: 32, roundness: 1, padding: 4 }, { size: 24, offScale: 0.667, roundness: 1, pressStretch: 1.12 }),
  shape("dot", "Dot", { width: 48, height: 24, roundness: 1, padding: 6 }, { size: 12, offScale: 1, roundness: 1, pressStretch: 1.4 }),
  shape("rail", "Rail", { width: 36, height: 14, roundness: 1, padding: -3 }, { size: 20, offScale: 1, roundness: 1, pressStretch: 1 }),
];

export const COLOR_KEYS = {
  Track: ["offColor", "onColor", "borderColor"],
  Thumb: ["offColor", "onColor"],
  Icon: ["onColor", "offColor"],
  Label: ["onColor", "offColor"],
  Effects: ["color"],
};
export const SHAPE_KEYS = {
  Track: ["width", "height", "roundness", "padding"],
  Thumb: ["size", "offScale", "roundness", "pressStretch"],
};

export function pick(values, keys) {
  const out = {};
  for (const [g, ks] of Object.entries(keys)) {
    out[g] = {};
    for (const k of ks) out[g][k] = values[g][k];
  }
  return out;
}

export function overlay(values, partial) {
  const out = { ...values };
  for (const [g, vals] of Object.entries(partial)) out[g] = { ...values[g], ...vals };
  return out;
}

// ---------- Label fit ----------
// Inside labels sit between the track end and the thumb. Mixed presets (e.g. FUI's
// "ARMED" on a Classic shape) can leave too little room, so check before applying.
const MIN_LABEL = 7;
let measurer;
function textWidth(text, size, font) {
  const family = font === "mono"
    ? '"Geist Mono Variable", ui-monospace, monospace'
    : '"Geist Variable", ui-sans-serif, system-ui, sans-serif';
  const tracking = text.length * size * 0.02; // .tg-label letter-spacing
  try {
    measurer ??= document.createElement("canvas").getContext("2d");
    measurer.font = `600 ${size}px ${family}`;
    return measurer.measureText(text).width + tracking;
  } catch {
    return text.length * size * (font === "mono" ? 0.6 : 0.7) + tracking;
  }
}

export function labelFits(v) {
  const { Track: T, Thumb: H, Label: L } = v;
  if (!L.show) return true;
  const room = T.width - H.size - 2 * Math.max(0, T.padding);
  const gap = Math.max(4, L.size * 0.6);
  const widest = Math.max(textWidth(L.onText, L.size, L.font), textWidth(L.offText, L.size, L.font));
  return widest + gap <= room && L.size <= T.height - 4;
}

// Shrink the label until it fits; null if even the smallest size doesn't.
export function fitLabel(v) {
  if (labelFits(v)) return v;
  for (let size = v.Label.size - 0.5; size >= MIN_LABEL; size -= 0.5) {
    const next = overlay(v, { Label: { size } });
    if (labelFits(next)) return next;
  }
  return null;
}
