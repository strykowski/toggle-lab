import { GLYPHS } from "./glyphs.jsx";
import { hoverTint } from "./color.js";

const r = (n) => Math.round(n * 100) / 100;
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
let uid = 0;

// Render the switch in one state as a standalone SVG string.
// `frame` draws in-between states for the docs: progress (thumb position, 0 = off, 1 = on,
// may overshoot), fill (on-color opacity 0..1), stretch (pressed thumb width factor) and
// hover (track tint and thumb scale from the Hover settings).
export function switchSvg(v, checked = true, frame = {}) {
  const { Track: T, Thumb: H, Icon: I, Label: L, Depth: D, Effects: E } = v;
  const id = `s${++uid}`;
  const W = T.width, HT = T.height, pad = T.padding, S = H.size;
  const p = frame.progress ?? (checked ? 1 : 0);
  const f = Math.max(0, Math.min(1, frame.fill ?? (checked ? 1 : 0)));
  const on = f >= 0.5; // which label, icon and border state to show
  const HV = v.Hover ?? { tint: 0, thumbScale: 1 };
  const sOff = Math.max(4, S * H.offScale);
  const size = (sOff + (S - sOff) * Math.max(0, Math.min(1, p))) * (frame.hover ? HV.thumbScale : 1);
  const tw = size * (frame.stretch ?? 1);
  const offC = pad + S / 2, onC = W - pad - S / 2;
  // A pressed thumb stretches toward the middle, anchored at its resting side.
  const c = offC + (onC - offC) * p + (p >= 0.5 ? -(tw - size) / 2 : (tw - size) / 2);
  const rT = (T.roundness * Math.min(W, HT)) / 2;
  const rTh = (H.roundness * size) / 2;
  const sh = H.shadow;
  const glow = E.glow * f;

  // Bleed so shadows, glow, overhanging and overshooting thumbs aren't cropped.
  const overshoot = Math.max(0, (p - 1) * (onC - offC), -p * (onC - offC));
  const overhang = Math.max(0, size / 2 - HT / 2, -pad) + overshoot;
  const depthBleed = D.opacity > 0 ? D.blur * 1.5 + Math.max(Math.abs(D.offsetX), Math.abs(D.offsetY)) : 0;
  const M = Math.ceil(Math.max(4, glow * 1.2, depthBleed, overhang + (sh > 0 ? 3 + 10 * sh : 2)));
  const VW = W + M * 2, VH = HT + M * 2;
  const tx = M, ty = M;
  const trackRect = (extra = "") => `<rect x="${tx}" y="${ty}" width="${W}" height="${HT}" rx="${r(rT)}" ${extra}/>`;

  const defs = [];
  const layers = [];

  // Glow
  if (glow > 0) {
    defs.push(`<filter id="${id}-glow" x="-100%" y="-200%" width="300%" height="500%"><feGaussianBlur stdDeviation="${r(glow / 2.4)}"/></filter>`);
    layers.push(trackRect(`fill="${E.color}" opacity="0.75" filter="url(#${id}-glow)"`));
  }
  // Depth / drop shadow
  if (D.opacity > 0 && (D.blur > 0 || D.offsetX || D.offsetY)) {
    if (D.blur > 0) defs.push(`<filter id="${id}-drop" x="-50%" y="-100%" width="200%" height="300%"><feGaussianBlur stdDeviation="${r(D.blur / 2)}"/></filter>`);
    layers.push(`<rect x="${tx + D.offsetX}" y="${ty + D.offsetY}" width="${W}" height="${HT}" rx="${r(rT)}" fill="${D.color}" fill-opacity="${D.opacity}"${D.blur > 0 ? ` filter="url(#${id}-drop)"` : ""}/>`);
  }

  // Track body (clipped group)
  defs.push(`<clipPath id="${id}-clip">${trackRect()}</clipPath>`);
  const body = [];
  body.push(trackRect(`fill="${T.offColor}"`));
  if (T.fillMode === "grow") {
    const o = Math.min(1, Math.max(0, p / 0.12));
    if (o > 0) body.push(`<rect x="${tx}" y="${ty}" width="${r(Math.max(0, c + size / 2))}" height="${HT}" rx="${r(rT)}" fill="${T.onColor}"${o < 1 ? ` opacity="${r(o)}"` : ""}/>`);
  } else if (f > 0) body.push(trackRect(`fill="${T.onColor}"${f < 1 ? ` opacity="${r(f)}"` : ""}`));
  if (E.finish === "plasma" && f > 0) {
    defs.push(`<linearGradient id="${id}-plasma" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#ff006e"/><stop offset=".3" stop-color="#fb5607"/><stop offset=".55" stop-color="#ffbe0b"/><stop offset=".8" stop-color="#3a86ff"/><stop offset="1" stop-color="#8338ec"/></linearGradient>`);
    body.push(trackRect(`fill="url(#${id}-plasma)" opacity="${r(0.92 * f)}"`));
  }
  if (E.finish === "holographic") {
    defs.push(holoGrad(`${id}-holo`));
    body.push(trackRect(`fill="url(#${id}-holo)" opacity="0.42"`));
  }
  if (E.finish === "chrome") {
    defs.push(chromeGrad(`${id}-chrome`));
    body.push(trackRect(`fill="url(#${id}-chrome)" opacity="0.5"`));
  }
  if (E.finish === "scanlines") {
    defs.push(`<pattern id="${id}-scan" width="3" height="3" patternUnits="userSpaceOnUse"><rect width="3" height="1" fill="#fff" fill-opacity=".1"/><rect y="1" width="3" height="1" fill="#000" fill-opacity=".18"/></pattern>`);
    body.push(trackRect(`fill="url(#${id}-scan)"`));
  }
  if (T.sheen > 0) {
    defs.push(`<linearGradient id="${id}-sheen" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="${r(0.6 * T.sheen)}"/><stop offset=".48" stop-color="#fff" stop-opacity="${r(0.12 * T.sheen)}"/><stop offset=".52" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="${r(0.06 * T.sheen)}"/></linearGradient>`);
    body.push(trackRect(`fill="url(#${id}-sheen)"`));
  }
  if (frame.hover && HV.tint > 0) {
    const [rgb, alpha] = hoverTint(on ? T.onColor : T.offColor, HV.tint).match(/rgba\((\d+, \d+, \d+), ([\d.]+)\)/).slice(1);
    body.push(trackRect(`fill="rgb(${rgb})" fill-opacity="${alpha}"`));
  }
  if (L.show) {
    const font = L.font === "mono" ? "Geist Mono, ui-monospace, Menlo, monospace" : "Geist, system-ui, -apple-system, Segoe UI, sans-serif";
    const lx = on ? (pad + (W - pad - S / 2) - S / 2) / 2 : (pad + S + W - pad) / 2;
    body.push(`<text x="${r(tx + lx)}" y="${r(ty + HT / 2)}" text-anchor="middle" dominant-baseline="central" font-family="${font}" font-weight="600" font-size="${L.size}" letter-spacing="${r(L.size * 0.02)}" fill="${on ? L.onColor : L.offColor}">${esc(on ? L.onText : L.offText)}</text>`);
  }
  if (T.inset > 0) {
    const i = T.inset;
    defs.push(innerShadow(`${id}-in1`, 2.5 * i, 2.5 * i, 3 * i, "#0f172a", 0.22 * i));
    defs.push(innerShadow(`${id}-in2`, -2.5 * i, -2.5 * i, 3 * i, "#ffffff", 0.75 * i));
    body.push(trackRect(`fill="#000" filter="url(#${id}-in1)"`));
    body.push(trackRect(`fill="#000" filter="url(#${id}-in2)"`));
  }
  if (T.borderWidth > 0 && !(T.borderOffOnly && on)) {
    const b = T.borderWidth;
    body.push(`<rect x="${tx + b / 2}" y="${ty + b / 2}" width="${W - b}" height="${HT - b}" rx="${r(Math.max(0, rT - b / 2))}" fill="none" stroke="${T.borderColor}" stroke-width="${b}"/>`);
  }
  layers.push(`<g clip-path="url(#${id}-clip)">${body.join("")}</g>`);

  // Thumb
  const thx = tx + c - tw / 2, thy = ty + HT / 2 - size / 2;
  const thumbRect = (extra) => `<rect x="${r(thx)}" y="${r(thy)}" width="${r(tw)}" height="${r(size)}" rx="${r(rTh)}" ${extra}/>`;
  if (sh > 0) {
    defs.push(`<filter id="${id}-ts" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="${r(0.5 + 3 * sh)}" stdDeviation="${r((1 + 8 * sh) / 2)}" flood-color="#000" flood-opacity="${r(0.06 + 0.24 * sh)}"/></filter>`);
  }
  if (glow > 0) {
    defs.push(`<filter id="${id}-tg" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="${r(glow / 4)}"/></filter>`);
    layers.push(thumbRect(`fill="${E.color}" opacity=".8" filter="url(#${id}-tg)"`));
  }
  layers.push(thumbRect(`fill="${f >= 1 ? H.onColor : H.offColor}"${sh > 0 ? ` filter="url(#${id}-ts)"` : ""}`));
  if (f > 0 && f < 1) layers.push(thumbRect(`fill="${H.onColor}" opacity="${r(f)}"`));
  if (E.finish === "holographic") layers.push(thumbRect(`fill="url(#${id}-holo)" opacity=".45"`));
  if (E.finish === "chrome") layers.push(thumbRect(`fill="url(#${id}-chrome)" opacity=".55"`));
  if (H.gloss > 0) {
    defs.push(`<radialGradient id="${id}-gloss" cx=".35" cy=".18" r=".7"><stop offset="0" stop-color="#fff" stop-opacity="${r(0.95 * H.gloss)}"/><stop offset=".78" stop-color="#fff" stop-opacity="0"/></radialGradient>`);
    layers.push(thumbRect(`fill="url(#${id}-gloss)"`));
  }
  if (I.glyph !== "none" && GLYPHS[I.glyph]) {
    const ip = Math.max(6, S * I.size);
    const k = ip / 24;
    layers.push(`<g color="${on ? I.onColor : I.offColor}" transform="translate(${r(tx + c - ip / 2)} ${r(ty + HT / 2 - ip / 2)}) scale(${r(k * 1000) / 1000})">${GLYPHS[I.glyph][on ? "on" : "off"]}</g>`);
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${VW}" height="${VH}" viewBox="0 0 ${VW} ${VH}" fill="none"><defs>${defs.join("")}</defs>${layers.join("")}</svg>`;
  return { svg, width: VW, height: VH, margin: M };
}

function holoGrad(id) {
  return `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff9ff3"/><stop offset=".25" stop-color="#feca57"/><stop offset=".5" stop-color="#48dbfb"/><stop offset=".75" stop-color="#a29bfe"/><stop offset="1" stop-color="#ff9ff3"/></linearGradient>`;
}
function chromeGrad(id) {
  return `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#9ca3af"/><stop offset=".5" stop-color="#4b5563"/><stop offset=".55" stop-color="#9ca3af"/><stop offset="1" stop-color="#f3f4f6"/></linearGradient>`;
}
function innerShadow(id, dx, dy, blur, color, opacity) {
  return `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feComponentTransfer in="SourceAlpha"><feFuncA type="table" tableValues="1 0"/></feComponentTransfer><feGaussianBlur stdDeviation="${r(blur)}"/><feOffset dx="${r(dx)}" dy="${r(dy)}" result="o"/><feFlood flood-color="${color}" flood-opacity="${r(opacity)}"/><feComposite in2="o" operator="in"/><feComposite in2="SourceAlpha" operator="in"/></filter>`;
}

export const svgDataUrl = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

export function svgToPngBlob(svg, width, height, scale) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      const ctx = canvas.getContext("2d");
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG encoding failed"))), "image/png");
    };
    img.onerror = () => reject(new Error("Could not render SVG"));
    img.src = svgDataUrl(svg);
  });
}
