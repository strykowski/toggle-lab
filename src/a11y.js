import { flatten, contrast } from "./color.js";
import { labelFits } from "./presets.js";

// Surfaces a switch is checked against. Gradients are sampled at their key colors and the
// worst one counts.
export const SURFACES = {
  light: { label: "light surface", colors: ["#ffffff"] },
  dark: { label: "dark surface", colors: ["#0a0a0a"] },
  paper: { label: "Paper", colors: ["#ffffff"] },
  mist: { label: "Mist", colors: ["#e9ecf1"] },
  ink: { label: "Ink", colors: ["#0a0a0a"] },
  aurora: { label: "Aurora", colors: ["#c7d2fe", "#f0abfc", "#67e8f9", "#a5b4fc"] },
};

const MIN_CONTRAST = 3; // WCAG 2.2 SC 1.4.11 Non-text Contrast
const MIN_TARGET = 24; // WCAG 2.2 SC 2.5.8 Target Size (Minimum)
const fmt = (n) => `${Math.floor(n * 100) / 100}:1`; // round down: 2.996 must not read as 3:1

// Each check: { id, label, criterion, value, status: "pass" | "fail" | "warn", detail }.
// `surfaceIds` picks which backgrounds the track is checked against.
export function a11yChecks(v, surfaceIds) {
  const { Track: T, Thumb: H, Label: L } = v;
  const checks = [];
  const surfaces = surfaceIds.map((id) => ({ id, ...SURFACES[id] }));
  const allBgs = surfaces.flatMap((s) => s.colors);

  // 1.4.11: the thumb shows the state, so it needs 3:1 against the track around it.
  for (const on of [false, true]) {
    const track = on ? T.onColor : T.offColor;
    const thumb = on ? H.onColor : H.offColor;
    const ratio = Math.min(...allBgs.map((bg) => contrast(flatten(thumb, track, bg), flatten(track, bg))));
    checks.push({
      id: `thumb-${on ? "on" : "off"}`,
      label: `Thumb vs track, ${on ? "on" : "off"}`,
      criterion: "1.4.11",
      value: fmt(ratio),
      status: ratio >= MIN_CONTRAST ? "pass" : "fail",
      detail: ratio >= MIN_CONTRAST ? "" : "Needs 3:1. Change the thumb or track color, or give the thumb a border.",
    });
  }

  // 1.4.11: the switch's edge needs 3:1 against what it sits on. The track fill or its
  // border can provide it, whichever is stronger.
  for (const s of surfaces) {
    for (const on of [false, true]) {
      const track = on ? T.onColor : T.offColor;
      const border = T.borderWidth >= 1 && !(on && T.borderOffOnly) ? T.borderColor : null;
      const ratio = Math.min(...s.colors.map((bg) => Math.max(
        contrast(flatten(track, bg), flatten(bg)),
        border ? contrast(flatten(border, bg), flatten(bg)) : 0,
      )));
      checks.push({
        id: `edge-${s.id}-${on ? "on" : "off"}`,
        label: `Track vs ${s.label}, ${on ? "on" : "off"}`,
        criterion: "1.4.11",
        value: fmt(ratio),
        status: ratio >= MIN_CONTRAST ? "pass" : "fail",
        detail: ratio >= MIN_CONTRAST ? "" : `Needs 3:1. Darken or lighten the ${on ? "on" : "off"} track, or add a 1 px border.`,
      });
    }
  }

  // 2.5.8: the clickable box is the track. Smaller targets can still pass with spacing.
  const small = Math.min(T.width, T.height) < MIN_TARGET;
  checks.push({
    id: "target",
    label: "Target size",
    criterion: "2.5.8",
    value: `${T.width} × ${T.height} px`,
    status: small ? "warn" : "pass",
    detail: small ? "Under 24 px. Passes only with 24 px of clear space around it, or a larger invisible hit area." : "",
  });

  if (L.show) {
    const fits = labelFits(v);
    checks.push({
      id: "label",
      label: "Labels fit inside the track",
      criterion: "Legibility",
      value: fits ? "Fits" : "Clipped",
      status: fits ? "pass" : "fail",
      detail: fits ? "" : "The label runs under the thumb. Widen the track, shrink the label or shorten the text.",
    });
  }
  return checks;
}

export function summarize(checks) {
  const fail = checks.filter((c) => c.status === "fail").length;
  const warn = checks.filter((c) => c.status === "warn").length;
  return { fail, warn, pass: checks.length - fail - warn, total: checks.length };
}
