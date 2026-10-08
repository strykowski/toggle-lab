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
