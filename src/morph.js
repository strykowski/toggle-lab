import { parseHex, toHex } from "./color.js";

const lerp = (a, b, t) => a + (b - a) * t;

function mixOne(x, y, t) {
  if (typeof x === "number" && typeof y === "number") {
    const v = lerp(x, y, t);
    return Number.isInteger(x) && Number.isInteger(y) ? Math.round(v) : v;
  }
  if (typeof x === "string" && typeof y === "string" && x[0] === "#" && y[0] === "#") {
    const p = parseHex(x), q = parseHex(y);
    if (p && q) return toHex({ r: lerp(p.r, q.r, t), g: lerp(p.g, q.g, t), b: lerp(p.b, q.b, t), a: lerp(p.a, q.a, t) });
  }
  // Transitions of the same kind blend their numbers; anything else switches halfway.
  if (x && y && typeof x === "object" && typeof y === "object" && !Array.isArray(x) && x.type === y.type) {
    const out = { ...(t < 0.5 ? x : y) };
    for (const k of Object.keys(out)) {
      if (typeof x[k] === "number" && typeof y[k] === "number") out[k] = lerp(x[k], y[k], t);
      else if (Array.isArray(x[k]) && Array.isArray(y[k]) && x[k].length === y[k].length) out[k] = x[k].map((v, i) => lerp(v, y[k][i], t));
    }
    return out;
  }
  return t < 0.5 ? x : y;
}

// Blend two full value sets: numbers and colors interpolate, discrete settings swap at the midpoint.
export function mixValues(a, b, t) {
  const out = {};
  for (const g of Object.keys(b)) {
    out[g] = {};
    for (const k of Object.keys(b[g])) out[g][k] = mixOne(a?.[g]?.[k], b[g][k], t);
  }
  return out;
}

export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
