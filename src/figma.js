import { FRAMES, docsSpecs, liveOnly, A11Y } from "./docs.js";

// Figma turns SVG markup pasted onto the canvas into editable vector layers, and uses
// element ids as layer names. So "Copy to Figma" is SVG text on the clipboard.
export async function copyToFigma(svg) {
  await navigator.clipboard.writeText(svg);
}

// The thumb icon is drawn in currentColor; write the color in, Figma may not resolve it.
function resolveIconColor(svg) {
  const icon = svg.match(/<g color="([^"]+)"/);
  return icon ? svg.replaceAll("currentColor", icon[1]) : svg;
}

// A single switch, ready to paste.
export const switchForFigma = (svg) => resolveIconColor(svg);

const r = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const C = { bg: "#fafafa", card: "#ffffff", border: "#ebebeb", text: "#171717", muted: "#666666", faint: "#8f8f8f", dark: "#0a0a0a", darkLine: "#222222", ring: "#006bff" };
const FW = 1040; // frame width, matches the docs page
const P = 32;

let idSeq = 0;
const uid = (name) => `${name}-${++idSeq}`;

// Text by its vertical center; Geist ships with Figma (Google Fonts).
function text(x, cy, s, { size = 13, weight = 400, fill = C.muted, mono = false, anchor = "start", id } = {}) {
  const family = mono ? "Geist Mono" : "Geist";
  return `<text${id ? ` id="${esc(id)}"` : ""} x="${r(x)}" y="${r(cy + size * 0.36)}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${fill}"${anchor !== "start" ? ` text-anchor="${anchor}"` : ""}>${esc(s)}</text>`;
}
const rect = (x, y, w, h, attrs = "") => `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" ${attrs}/>`;
const line = (x1, y1, x2, y2, stroke, extra = "") => `<line x1="${r(x1)}" y1="${r(y1)}" x2="${r(x2)}" y2="${r(y2)}" stroke="${stroke}" ${extra}/>`;

// Place a switch SVG so its track's top-left corner lands on (x, y).
// Ids are re-prefixed per copy, so repeated switches keep their own filters and clips.
function embed(shot, x, y, k, name) {
  const n = ++idSeq;
  let inner = shot.svg
    .replace(/^<svg[^>]*>/, "")
    .replace(/<\/svg>\s*$/, "")
    .replace(/(id="|url\(#)(s\d+-)/g, `$1e${n}-$2`);
  inner = resolveIconColor(inner);
  return `<g id="${esc(name)}" fill="none" transform="translate(${r(x - shot.margin * k)} ${r(y - shot.margin * k)}) scale(${r(k, 4)})">${inner}</g>`;
}

function card(x, y, w, h, id, body, head) {
  const clip = uid("clip");
  return `<g id="${esc(id)}"><defs><clipPath id="${clip}">${rect(x, y, w, h, 'rx="12"')}</clipPath></defs>`
    + rect(x, y, w, h, `rx="12" fill="${C.card}"`)
    + `<g clip-path="url(#${clip})">${body}</g>`
    + rect(x + 0.5, y + 0.5, w - 1, h - 1, `rx="11.5" fill="none" stroke="${C.border}"`)
    + (head ? text(x + 20, y + 26, head.title, { size: 14, weight: 600, fill: C.text, id: `${id} title` })
      + (head.desc ? text(x + 20, y + 46, head.desc, { size: 13 }) : "") : "")
    + "</g>";
}

function states(docs, x, y, w) {
  const { v, k, shots } = docs;
  const { Track: T, Thumb: H, Motion: M } = v;
  const tw = T.width * k, th = T.height * k;
  const rT = ((T.roundness * Math.min(T.width, T.height)) / 2) * k;
  const surfaceW = 40, labelW = 180;
  const colW = (w - surfaceW - labelW) / 4;
  const headH = 36;
  const rowH = Math.max(72, Math.max(T.height, H.size) * k + 56);
  const top = y + 64;
  const STATES = ["Default", "Focus", "Pressed", "Disabled"];
  const parts = [line(x, top, x + w, top, C.border)];
  parts.push(rect(x, top, surfaceW + labelW, headH + rowH * 4, `fill="${C.bg}"`));
  STATES.forEach((s, i) => parts.push(text(x + surfaceW + labelW + colW * (i + 0.5), top + headH / 2, s, { size: 12, anchor: "middle" })));

  ["Light", "Dark"].forEach((surface, si) => {
    const dark = si === 1;
    const gy = top + headH + si * rowH * 2;
    parts.push(line(x, gy, x + w, gy, C.border));
    // Vertical surface label
    const cx = x + surfaceW / 2, cy = gy + rowH;
    parts.push(`<g transform="translate(${r(cx)} ${r(cy)}) rotate(-90)">${text(0, 0, surface, { size: 12, fill: C.text, anchor: "middle" })}</g>`);
    parts.push(line(x + surfaceW, gy, x + surfaceW, gy + rowH * 2, C.border));
    [false, true].forEach((on, ri) => {
      const ry = gy + ri * rowH;
      if (ri) parts.push(line(x + surfaceW, ry, x + surfaceW + labelW, ry, C.border));
      parts.push(text(x + surfaceW + 16, ry + rowH / 2 - 8, on ? "On" : "Off", { size: 13, fill: C.text }));
      parts.push(text(x + surfaceW + 16, ry + rowH / 2 + 10, `aria-checked="${on}"`, { size: 11, fill: C.faint, mono: true }));
      const cells = [];
      STATES.forEach((s, i) => {
        const cx0 = x + surfaceW + labelW + colW * i;
        cells.push(rect(cx0, ry, colW, rowH, `fill="${dark ? C.dark : C.card}"`));
        cells.push(line(cx0, ry, cx0, ry + rowH, dark ? C.darkLine : C.border));
        const ccx = cx0 + colW / 2, ccy = ry + rowH / 2;
        const sx = ccx - tw / 2, sy = ccy - th / 2;
        const name = `${surface} / ${on ? "On" : "Off"} / ${s}`;
        if (s === "Pressed") {
          cells.push(`<g transform="translate(${r(ccx)} ${r(ccy)}) scale(${r(M.pressScale, 3)}) translate(${r(-ccx)} ${r(-ccy)})">${embed(shots[on ? "onPressed" : "offPressed"], sx, sy, k, name)}</g>`);
        } else {
          const sw = embed(shots[on ? "onRest" : "offRest"], sx, sy, k, name);
          if (s === "Disabled") cells.push(`<g opacity="0.5">${sw}</g>`);
          else cells.push(sw);
          if (s === "Focus") {
            const o = 3 * k; // 2px offset + half the 2px ring, at this scale
            cells.push(rect(sx - o, sy - o, tw + o * 2, th + o * 2, `rx="${r(rT > 0 ? rT + o : 0)}" fill="none" stroke="${C.ring}" stroke-width="${r(2 * k)}"`));
          }
        }
      });
      if (ri) cells.push(line(x + surfaceW + labelW, ry, x + w, ry, dark ? C.darkLine : C.border));
      parts.push(`<g id="${surface} ${on ? "on" : "off"}">${cells.join("")}</g>`);
    });
  });
  const h = 64 + headH + rowH * 4;
  return { h, svg: card(x, y, w, h, "States", parts.join(""), { title: "States", desc: "Every state the exported code supports, on light and dark surfaces." }) };
}

function motion(docs, x, y, w) {
  const { v, frames, curve, settle } = docs;
  const T = v.Track, H = v.Thumb;
  const span = settle / (FRAMES - 1);
  const t0 = -span / 2, t1 = settle + span / 2;
  const x0 = x + 20, cw = w - 40, top = y + 64;
  const lo = Math.min(-0.05, ...curve.map((c) => c.p)), hi = Math.max(1.05, ...curve.map((c) => c.p));
  const px = (t) => x0 + ((t - t0) / (t1 - t0)) * cw;
  const py = (p) => top + 8 + (1 - (p - lo) / (hi - lo)) * 64;
  const parts = [];
  for (const p of [0, 1]) parts.push(line(x0, py(p), x0 + cw, py(p), "#e5e5e5", 'stroke-dasharray="3 3"'));
  for (const f of frames) parts.push(line(px(f.t), top, px(f.t), top + 80, "#efefef"));
  parts.push(`<path id="Thumb position" d="${curve.map((c, i) => `${i ? "L" : "M"}${r(px(c.t), 1)} ${r(py(c.p), 1)}`).join(" ")}" stroke="${C.text}" stroke-width="1.5" stroke-linejoin="round" fill="none"/>`);
  const kf = Math.min(docs.k, 112 / T.width);
  const boxH = Math.max(T.height, H.size) * kf;
  const fy = top + 80 + 18 + boxH / 2;
  frames.forEach((f, i) => {
    const cx = x0 + ((i + 0.5) / FRAMES) * cw;
    parts.push(embed(f.shot, cx - (T.width * kf) / 2, fy - (T.height * kf) / 2, kf, `Frame ${f.t} ms`));
    parts.push(text(cx, fy + boxH / 2 + 22, `${f.t} ms`, { size: 12, anchor: "middle" }));
  });
  let h = 64 + 80 + 18 + boxH + 44;
  const live = liveOnly(v);
  if (live.length) {
    parts.push(line(x, y + h, x + w, y + h, C.border));
    parts.push(text(x + 20, y + h + 20, `Live only, not shown in still frames: ${live.join(", ")}.`, { size: 12 }));
    h += 40;
  }
  const desc = `Off to on, sampled every ${Math.round(span)} ms. Settles in ${settle} ms.`;
  return { h, svg: card(x, y, w, h, "Motion", parts.join(""), { title: "Motion", desc }) };
}

function list(x, y, w, id, title, rows, swatches = false) {
  const parts = [];
  rows.forEach(([label, value], i) => {
    const ry = y + 48 + i * 36;
    parts.push(line(x + 20, ry, x + w - 20, ry, C.border));
    parts.push(text(x + 20, ry + 18, label, { size: 13 }));
    parts.push(text(x + w - 20, ry + 18, value, { size: 12, fill: C.text, mono: true, anchor: "end" }));
    if (swatches) {
      const sx = x + w - 20 - value.length * 7.2 - 15; // Geist Mono is 0.6em wide
      parts.push(`<circle cx="${r(sx)}" cy="${r(ry + 18)}" r="7" fill="${esc(value)}" stroke="#000000" stroke-opacity="0.14"/>`);
    }
  });
  const h = 48 + rows.length * 36 + 8;
  return { h, svg: card(x, y, w, h, id, parts.join(""), { title }) };
}

function a11y(x, y, w) {
  const parts = A11Y.map((s, i) => {
    const cy = y + 52 + i * 24;
    return `<circle cx="${x + 24}" cy="${cy}" r="2" fill="${C.muted}"/>` + text(x + 36, cy, s.replaceAll("`", ""), { size: 13 });
  });
  const h = 52 + A11Y.length * 24 + 8;
  return { h, svg: card(x, y, w, h, "Accessibility", parts.join(""), { title: "Accessibility" }) };
}

// The whole docs page as one SVG frame.
export function docsSvg(docs, name) {
  idSeq = 0;
  const w = FW - P * 2;
  const out = [];
  let y = P;
  const time = new Date(docs.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  out.push(`<g id="Header">${text(P, y + 14, "Switch", { size: 28, weight: 600, fill: C.text })}`
    + text(P, y + 44, 'role="switch"', { size: 12, mono: true })
    + text(FW - P, y + 44, `${name ?? "Custom"} · Generated at ${time}`, { size: 13, anchor: "end" }) + "</g>");
  y += 72;
  for (const section of [states, motion]) {
    const part = section(docs, P, y, w);
    out.push(part.svg);
    y += part.h + 16;
  }
  const { anatomy, tokens } = docsSpecs(docs.v);
  const half = (w - 16) / 2;
  const a = list(P, y, half, "Anatomy", "Anatomy", anatomy);
  const c = list(P + half + 16, y, half, "Color", "Color", tokens, true);
  out.push(a.svg, c.svg);
  y += Math.max(a.h, c.h) + 16;
  const ax = a11y(P, y, w);
  out.push(ax.svg);
  y += ax.h + P;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${FW}" height="${r(y)}" viewBox="0 0 ${FW} ${r(y)}" fill="none">`
    + `<rect id="Background" width="${FW}" height="${r(y)}" fill="${C.bg}"/>${out.join("")}</svg>`;
  return { svg, width: FW, height: y };
}
