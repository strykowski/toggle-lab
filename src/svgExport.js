import { GLYPHS } from "./glyphs.jsx";

const r = (n) => Math.round(n * 100) / 100;
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
let uid = 0;

// Render the switch in one state as a standalone SVG string.
export function switchSvg(v, checked = true) {
  const { Track: T, Thumb: H, Icon: I, Label: L, Depth: D, Effects: E } = v;
  const id = `s${++uid}`;
  const W = T.width, HT = T.height, pad = T.padding, S = H.size;
  const size = checked ? S : Math.max(4, S * H.offScale);
  const c = checked ? W - pad - S / 2 : pad + S / 2;
  const rT = (T.roundness * Math.min(W, HT)) / 2;
  const rTh = (H.roundness * size) / 2;
  const sh = H.shadow;
  const glow = checked ? E.glow : 0;

  // Bleed so shadows, glow and overhanging thumbs aren't cropped.
  const overhang = Math.max(0, size / 2 - HT / 2, -pad);
  const depthBleed = D.opacity > 0 ? D.blur * 1.5 + Math.max(Math.abs(D.offsetX), Math.abs(D.offsetY)) : 0;
  const M = Math.ceil(Math.max(4, glow * 1.2, depthBleed, overhang + (sh > 0 ? 3 + 10 * sh : 2)));
  const VW = W + M * 2, VH = HT + M * 2;
  const tx = M, ty = M;
  const trackFill = checked ? T.onColor : T.offColor;
  const thumbFill = checked ? H.onColor : H.offColor;
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
  if (checked) {
    if (T.fillMode === "grow") body.push(`<rect x="${tx}" y="${ty}" width="${r(Math.max(0, c + size / 2))}" height="${HT}" rx="${r(rT)}" fill="${T.onColor}"/>`);
    else body.push(trackRect(`fill="${T.onColor}"`));
  }
  if (E.finish === "plasma" && checked) {
    defs.push(`<linearGradient id="${id}-plasma" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#ff006e"/><stop offset=".3" stop-color="#fb5607"/><stop offset=".55" stop-color="#ffbe0b"/><stop offset=".8" stop-color="#3a86ff"/><stop offset="1" stop-color="#8338ec"/></linearGradient>`);
    body.push(trackRect(`fill="url(#${id}-plasma)" opacity="0.92"`));
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
  if (L.show) {
    const font = L.font === "mono" ? "Geist Mono, ui-monospace, Menlo, monospace" : "Geist, system-ui, -apple-system, Segoe UI, sans-serif";
    const lx = checked ? (pad + (W - pad - S / 2) - S / 2) / 2 : (pad + S + W - pad) / 2;
    body.push(`<text x="${r(tx + lx)}" y="${r(ty + HT / 2)}" text-anchor="middle" dominant-baseline="central" font-family="${font}" font-weight="600" font-size="${L.size}" letter-spacing="${r(L.size * 0.02)}" fill="${checked ? L.onColor : L.offColor}">${esc(checked ? L.onText : L.offText)}</text>`);
  }
  if (T.inset > 0) {
    const i = T.inset;
    defs.push(innerShadow(`${id}-in1`, 2.5 * i, 2.5 * i, 3 * i, "#0f172a", 0.22 * i));
    defs.push(innerShadow(`${id}-in2`, -2.5 * i, -2.5 * i, 3 * i, "#ffffff", 0.75 * i));
    body.push(trackRect(`fill="#000" filter="url(#${id}-in1)"`));
    body.push(trackRect(`fill="#000" filter="url(#${id}-in2)"`));
  }
  if (T.borderWidth > 0 && !(T.borderOffOnly && checked)) {
    const b = T.borderWidth;
    body.push(`<rect x="${tx + b / 2}" y="${ty + b / 2}" width="${W - b}" height="${HT - b}" rx="${r(Math.max(0, rT - b / 2))}" fill="none" stroke="${T.borderColor}" stroke-width="${b}"/>`);
  }
  layers.push(`<g clip-path="url(#${id}-clip)">${body.join("")}</g>`);

  // Thumb
  const thx = tx + c - size / 2, thy = ty + HT / 2 - size / 2;
  const thumbRect = (extra) => `<rect x="${r(thx)}" y="${r(thy)}" width="${r(size)}" height="${r(size)}" rx="${r(rTh)}" ${extra}/>`;
  if (sh > 0) {
    defs.push(`<filter id="${id}-ts" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="${r(0.5 + 3 * sh)}" stdDeviation="${r((1 + 8 * sh) / 2)}" flood-color="#000" flood-opacity="${r(0.06 + 0.24 * sh)}"/></filter>`);
  }
  if (glow > 0) {
    defs.push(`<filter id="${id}-tg" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="${r(glow / 4)}"/></filter>`);
    layers.push(thumbRect(`fill="${E.color}" opacity=".8" filter="url(#${id}-tg)"`));
  }
  layers.push(thumbRect(`fill="${thumbFill}"${sh > 0 ? ` filter="url(#${id}-ts)"` : ""}`));
  if (E.finish === "holographic") layers.push(thumbRect(`fill="url(#${id}-holo)" opacity=".45"`));
  if (E.finish === "chrome") layers.push(thumbRect(`fill="url(#${id}-chrome)" opacity=".55"`));
  if (H.gloss > 0) {
    defs.push(`<radialGradient id="${id}-gloss" cx=".35" cy=".18" r=".7"><stop offset="0" stop-color="#fff" stop-opacity="${r(0.95 * H.gloss)}"/><stop offset=".78" stop-color="#fff" stop-opacity="0"/></radialGradient>`);
    layers.push(thumbRect(`fill="url(#${id}-gloss)"`));
  }
  if (I.glyph !== "none" && GLYPHS[I.glyph]) {
    const ip = Math.max(6, S * I.size);
    const k = ip / 24;
    layers.push(`<g color="${checked ? I.onColor : I.offColor}" transform="translate(${r(tx + c - ip / 2)} ${r(ty + HT / 2 - ip / 2)}) scale(${r(k * 1000) / 1000})">${GLYPHS[I.glyph][checked ? "on" : "off"]}</g>`);
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
