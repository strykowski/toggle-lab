// Small color helpers: parsing hex (with alpha), compositing, WCAG luminance and contrast.

// "#rgb", "#rgba", "#rrggbb" or "#rrggbbaa" → { r, g, b, a } in 0..1, or null.
export function parseHex(hex) {
  if (typeof hex !== "string") return null;
  let h = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-f]+$/i.test(h) || ![3, 4, 6, 8].includes(h.length)) return null;
  if (h.length <= 4) h = [...h].map((c) => c + c).join("");
  const n = (i) => parseInt(h.slice(i, i + 2), 16) / 255;
  return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) : 1 };
}

// Paint `top` over an opaque `bottom`.
export function over(top, bottom) {
  const a = top.a ?? 1;
  return { r: top.r * a + bottom.r * (1 - a), g: top.g * a + bottom.g * (1 - a), b: top.b * a + bottom.b * (1 - a), a: 1 };
}

// Flatten a stack of hex colors, topmost first, onto the last one.
export function flatten(...hexes) {
  const cs = hexes.map((h) => parseHex(h) ?? { r: 0, g: 0, b: 0, a: 1 });
  let out = { ...cs[cs.length - 1], a: 1 };
  for (let i = cs.length - 2; i >= 0; i--) out = over(cs[i], out);
  return out;
}

const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
export const luminance = (c) => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);

export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Hover tint for a track color: darken light tracks, lighten dark ones, so it always shows.
export function hoverTint(hex, amount) {
  const c = parseHex(hex);
  const dark = c ? luminance(over(c, { r: 1, g: 1, b: 1 })) < 0.2 : false;
  const a = Math.round(Math.min(1, amount * (dark ? 1.6 : 1)) * 1000) / 1000;
  return dark ? `rgba(255, 255, 255, ${a})` : `rgba(0, 0, 0, ${a})`;
}

const hex2 = (n) => Math.round(Math.min(1, Math.max(0, n)) * 255).toString(16).padStart(2, "0");
export const toHex = (c) => `#${hex2(c.r)}${hex2(c.g)}${hex2(c.b)}${(c.a ?? 1) < 1 ? hex2(c.a) : ""}`;

// Scale a color's saturation (HSL), keeping hue, lightness and alpha. Greys stay grey.
export function saturate(hex, factor) {
  const c = parseHex(hex);
  if (!c) return hex;
  const max = Math.max(c.r, c.g, c.b), min = Math.min(c.r, c.g, c.b);
  const l = (max + min) / 2;
  if (max === min) return hex;
  const d = max - min;
  let s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === c.r ? (c.g - c.b) / d + (c.g < c.b ? 6 : 0) : max === c.g ? (c.b - c.r) / d + 2 : (c.r - c.g) / d + 4;
  h /= 6;
  s = Math.min(1, Math.max(0, s * factor));
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const ch = (t) => {
    t = (t + 1) % 1;
    return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p;
  };
  return toHex({ r: ch(h + 1 / 3), g: ch(h), b: ch(h - 1 / 3), a: c.a });
}
