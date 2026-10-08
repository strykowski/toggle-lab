import { toCss, motionSource } from "./transitions.js";
import { GLYPHS } from "./glyphs.jsx";
import { hoverTint } from "./color.js";

const r = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
const px = (n) => `${r(n)}px`;
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const join = (...parts) => parts.filter(Boolean).join("");

function geometry(v) {
  const { Track: T, Thumb: H } = v;
  const W = T.width, HT = T.height, pad = T.padding, S = H.size;
  const sOff = Math.max(4, S * H.offScale);
  const offC = pad + S / 2, onC = W - pad - S / 2;
  return {
    W, HT, pad, S, sOff, offC, onC,
    rTrack: (T.roundness * Math.min(W, HT)) / 2,
    // Inside labels sit between the track end and the thumb, as in the live switch.
    labelOnX: (pad + onC - S / 2) / 2,
    labelOffX: (offC + S / 2 + W - pad) / 2,
  };
}

function shadows(v) {
  const { Track: T, Thumb: H, Depth: D, Effects: E } = v;
  const i = T.inset;
  const border = T.borderWidth > 0 ? `inset 0 0 0 ${r(T.borderWidth)}px ${T.borderColor}` : null;
  const inset = i > 0
    ? [
      `inset ${r(2.5 * i)}px ${r(2.5 * i)}px ${r(6 * i)}px rgba(15, 23, 42, ${r(0.22 * i)})`,
      `inset ${r(-2.5 * i)}px ${r(-2.5 * i)}px ${r(6 * i)}px rgba(255, 255, 255, ${r(0.75 * i)})`,
    ]
    : [];
  const drop = D.opacity > 0 && (D.blur > 0 || D.offsetX || D.offsetY)
    ? `${D.offsetX}px ${D.offsetY}px ${D.blur}px color-mix(in srgb, ${D.color} ${Math.round(D.opacity * 100)}%, transparent)`
    : null;
  const sh = H.shadow;
  const thumb = sh > 0
    ? `0 ${r(0.5 + 3 * sh)}px ${r(1 + 8 * sh)}px rgba(0, 0, 0, ${r(0.06 + 0.24 * sh)}), 0 0 0 0.5px rgba(0, 0, 0, ${r(0.03 + 0.07 * sh)})`
    : "none";
  const glow = E.glow > 0 ? `0 0 ${E.glow}px ${r(E.glow * 0.2)}px color-mix(in srgb, ${E.color} 70%, transparent)` : null;
  const thumbGlow = E.glow > 0 ? `0 0 ${r(E.glow * 0.5)}px ${r(E.glow * 0.1)}px color-mix(in srgb, ${E.color} 80%, transparent)` : null;
  return { border, inset, drop, thumb, glow, thumbGlow };
}

// Features an export can't express, so we say so instead of silently dropping them.
function missing(v, target) {
  const { Motion: M, Effects: E } = v;
  const out = [];
  if (target === "css" && M.squash > 0) out.push("squash and stretch");
  if (E.trail > 0) out.push("motion trail");
  if (E.burst !== "none") out.push(`${E.burst} burst`);
  if (M.pop > 0) out.push("track pop");
  if (M.steps > 0) out.push("stepped motion");
  return out;
}

const SHEEN = (s) => `linear-gradient(180deg, rgba(255,255,255,${r(0.6 * s)}) 0%, rgba(255,255,255,${r(0.12 * s)}) 48%, rgba(255,255,255,0) 52%, rgba(0,0,0,${r(0.06 * s)}) 100%)`;
const GLOSS = (g) => `radial-gradient(120% 90% at 35% 18%, rgba(255,255,255,${r(0.95 * g)}) 0%, rgba(255,255,255,0) 55%), linear-gradient(180deg, rgba(255,255,255,0) 55%, rgba(0,0,0,${r(0.12 * g)}) 100%)`;
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

// Finish overlays, matching the live switch. `shift` = animated background position.
const FINISH = {
  holographic: { image: "linear-gradient(115deg, #ff9ff3, #feca57, #48dbfb, #a29bfe, #ff9ff3, #feca57)", size: "300% 100%", blend: "soft-light", opacity: 0.95, shift: 4 },
  chrome: { image: "linear-gradient(180deg, #fff 0%, #9ca3af 45%, #4b5563 50%, #9ca3af 55%, #f3f4f6 100%)", blend: "overlay", opacity: 0.6 },
  scanlines: { image: "repeating-linear-gradient(0deg, rgba(255,255,255,0.1) 0 1px, rgba(0,0,0,0.18) 1px 2px, transparent 2px 3px)", opacity: 1 },
  plasma: { image: "linear-gradient(90deg, #ff006e, #fb5607, #ffbe0b, #3a86ff, #8338ec, #ff006e)", size: "300% 100%", opacity: 0.92, onOnly: true, shift: 3 },
};
const THUMB_FINISH = {
  holographic: { image: FINISH.holographic.image, size: "300% 100%", blend: "multiply", opacity: 0.35, shift: 3 },
  chrome: { image: "linear-gradient(160deg, #ffffff 0%, #d1d5db 35%, #6b7280 50%, #e5e7eb 70%, #ffffff 100%)", blend: "multiply", opacity: 0.7 },
};

// ---------------------------------------------------------------- HTML + CSS
export function cssExport(v) {
  const g = geometry(v);
  const { Track: T, Thumb: H, Icon: I, Label: L, Motion: M, Effects: E } = v;
  const HV = v.Hover ?? { tint: 0, thumbScale: 1 };
  const sh = shadows(v);
  const thumbT = toCss(M.thumb);
  const fillT = toCss(M.fill);
  const grow = T.fillMode === "grow";
  const icon = I.glyph !== "none" && GLYPHS[I.glyph];
  const finish = FINISH[E.finish];
  const thumbFinish = THUMB_FINISH[E.finish];
  const hasTrack = grow || L.show || HV.tint > 0;
  const tilt = M.tilt > 0;
  const persp = Math.max(220, g.W * 4);

  const stretchOff = g.sOff * H.pressStretch;
  const stretchOn = g.S * H.pressStretch;
  const offLeft = g.offC - g.sOff / 2;
  const onLeft = g.onC - g.S / 2;
  const onLeftPressed = g.onC + g.S / 2 - stretchOn;

  const list = (xs) => (xs.filter(Boolean).length ? xs.filter(Boolean).join(",\n    ") : "none");
  const trackOff = list([sh.border, ...sh.inset, sh.drop]);
  const trackOn = list([T.borderOffOnly ? null : sh.border, ...sh.inset, sh.drop, sh.glow]);
  const iconPx = Math.max(6, g.S * I.size);

  const markup = join(
    `<button class="switch" role="switch" aria-checked="false" aria-label="Notifications">\n`,
    hasTrack && `  <span class="switch-track" aria-hidden="true">\n`,
    grow && `    <span class="switch-fill"></span>\n`,
    L.show && `    <span class="switch-label switch-label-on">${esc(L.onText)}</span>\n    <span class="switch-label switch-label-off">${esc(L.offText)}</span>\n`,
    hasTrack && `  </span>\n`,
    `  <span class="switch-thumb">`,
    icon && `\n    <svg class="switch-icon switch-icon-off" viewBox="0 0 24 24" aria-hidden="true">${icon.off}</svg>\n    <svg class="switch-icon switch-icon-on" viewBox="0 0 24 24" aria-hidden="true">${icon.on}</svg>\n  `,
    `</span>\n</button>`,
  );

  const css = join(`
.switch {
  /* Thumb motion: sampled from your ${M.thumb.type === "easing" ? "easing curve" : "spring"} */
  --thumb-duration: ${thumbT.ms}ms;
  --thumb-ease: ${thumbT.easing};
  --fill-duration: ${fillT.ms}ms;
  --fill-ease: ${fillT.easing};

  position: relative;
  flex: none;
  width: ${px(g.W)};
  height: ${px(g.HT)};
  padding: 0;
  border: 0;
  border-radius: ${px(g.rTrack)};
  background-color: ${T.offColor};`,
    T.sheen > 0 && `\n  background-image: ${SHEEN(T.sheen)};`,
    T.backdropBlur > 0 && `\n  backdrop-filter: blur(${T.backdropBlur}px) saturate(1.6);`,
    tilt && `\n  transform: perspective(${persp}px) rotateY(${-M.tilt}deg);`, `
  box-shadow:
    ${trackOff};
  overflow: visible;
  cursor: pointer;
  transition:
    background-color var(--fill-duration) var(--fill-ease),
    box-shadow var(--fill-duration) var(--fill-ease),`,
    tilt && `\n    transform var(--thumb-duration) var(--thumb-ease),`, `
    scale 160ms cubic-bezier(0.23, 1, 0.32, 1);
}

.switch[aria-checked="true"] {`,
    !grow && `\n  background-color: ${T.onColor};`,
    tilt && `\n  transform: perspective(${persp}px) rotateY(${M.tilt}deg);`, `
  box-shadow:
    ${trackOn};
}

.switch:active:not(:disabled) {
  scale: ${r(M.pressScale)};
}

.switch:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.switch:focus-visible {
  outline: 2px solid #006bff;
  outline-offset: 2px;
}
`,
    finish && `
/* ${E.finish} finish */
.switch::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background-image: ${finish.image};${finish.size ? `\n  background-size: ${finish.size};` : ""}${finish.blend ? `\n  mix-blend-mode: ${finish.blend};` : ""}
  opacity: ${finish.onOnly ? 0 : finish.opacity};${finish.onOnly ? "\n  transition: opacity var(--fill-duration) var(--fill-ease);" : ""}${finish.shift ? `\n  animation: switch-shift ${finish.shift}s linear infinite;` : ""}
}
${finish.onOnly ? `.switch[aria-checked="true"]::before { opacity: ${finish.opacity}; }\n` : ""}`,
    hasTrack && `
/* Clips the fill, labels and hover tint to the track; the thumb can still overhang. */
.switch-track {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  overflow: hidden;
  pointer-events: none;
}
`,
    grow && `
.switch-fill {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: ${px(g.offC)};
  border-radius: inherit;
  background-color: ${T.onColor};
  opacity: 0;
  transition:
    width var(--thumb-duration) var(--thumb-ease),
    opacity var(--fill-duration) var(--fill-ease);
}

.switch[aria-checked="true"] .switch-fill {
  width: ${px(g.onC)};
  opacity: 1;
}
`,
    L.show && `
.switch-label {
  position: absolute;
  top: 50%;
  z-index: 1;
  font-size: ${L.size}px;
  font-weight: 600;
  line-height: 1;${L.font === "mono" ? `\n  font-family: ${MONO};` : ""}
  letter-spacing: 0.02em;
  white-space: nowrap;
  transition:
    opacity var(--fill-duration) var(--fill-ease),
    translate var(--fill-duration) var(--fill-ease);
}

.switch-label-on {
  left: ${px(g.labelOnX)};
  color: ${L.onColor};
  opacity: 0;
  translate: -30% -50%;
}

.switch-label-off {
  left: ${px(g.labelOffX)};
  color: ${L.offColor};
  translate: -50% -50%;
}

.switch[aria-checked="true"] .switch-label-on {
  opacity: 1;
  translate: -50% -50%;
}

.switch[aria-checked="true"] .switch-label-off {
  opacity: 0;
  translate: -70% -50%;
}
`,
    HV.tint > 0 && `
/* Hover tint */
.switch-track::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 2;
  background-color: ${hoverTint(T.offColor, HV.tint)};
  opacity: 0;
  transition: opacity 150ms ease-out;
}

.switch[aria-checked="true"] .switch-track::after {
  background-color: ${hoverTint(T.onColor, HV.tint)};
}
`, `
.switch-thumb {
  position: absolute;
  top: 50%;
  left: ${px(offLeft)};
  width: ${px(g.sOff)};
  height: ${px(g.sOff)};
  translate: 0 -50%;
  border-radius: ${px((H.roundness * g.sOff) / 2)};
  background-color: ${H.offColor};`,
    H.gloss > 0 && `\n  background-image: ${GLOSS(H.gloss)};`, `
  box-shadow: ${sh.thumb};
  pointer-events: none;
  transition:
    left var(--thumb-duration) var(--thumb-ease),
    width var(--thumb-duration) var(--thumb-ease),
    height var(--thumb-duration) var(--thumb-ease),
    border-radius var(--thumb-duration) var(--thumb-ease),
    scale 200ms cubic-bezier(0.34, 1.4, 0.64, 1),
    background-color var(--fill-duration) var(--fill-ease),
    box-shadow var(--fill-duration) var(--fill-ease);
}

.switch:active:not(:disabled) .switch-thumb {
  width: ${px(stretchOff)};
}

.switch[aria-checked="true"] .switch-thumb {
  left: ${px(onLeft)};
  width: ${px(g.S)};
  height: ${px(g.S)};
  border-radius: ${px((H.roundness * g.S) / 2)};
  background-color: ${H.onColor};${sh.thumbGlow ? `\n  box-shadow: ${sh.thumb === "none" ? "" : `${sh.thumb}, `}${sh.thumbGlow};` : ""}
}

.switch[aria-checked="true"]:active:not(:disabled) .switch-thumb {
  left: ${px(onLeftPressed)};
  width: ${px(stretchOn)};
}
`,
    thumbFinish && `
.switch-thumb::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background-image: ${thumbFinish.image};${thumbFinish.size ? `\n  background-size: ${thumbFinish.size};` : ""}
  mix-blend-mode: ${thumbFinish.blend};
  opacity: ${thumbFinish.opacity};${thumbFinish.shift ? `\n  animation: switch-shift ${thumbFinish.shift}s linear infinite;` : ""}
}
`,
    icon && `
.switch-icon {
  position: absolute;
  inset: 0;
  margin: auto;
  width: ${px(iconPx)};
  height: ${px(iconPx)};
  overflow: visible;
  transition:
    opacity var(--thumb-duration) var(--thumb-ease),
    scale var(--thumb-duration) var(--thumb-ease),
    rotate var(--thumb-duration) var(--thumb-ease);
}

.switch-icon-off { color: ${I.offColor}; }
.switch-icon-on { color: ${I.onColor}; opacity: 0; scale: 0.4; rotate: -90deg; }
.switch[aria-checked="true"] .switch-icon-on { opacity: 1; scale: 1; rotate: 0deg; }
.switch[aria-checked="true"] .switch-icon-off { opacity: 0; scale: 0.4; rotate: 90deg; }
`,
    (HV.tint > 0 || HV.thumbScale > 1) && `
/* Hover: mouse and trackpad only, so touch screens don't get a stuck state. */
@media (hover: hover) and (pointer: fine) {${HV.tint > 0 ? `
  .switch:hover:not(:disabled) .switch-track::after { opacity: 1; }` : ""}${HV.thumbScale > 1 ? `
  .switch:hover:not(:disabled) .switch-thumb { scale: ${r(HV.thumbScale)}; }` : ""}
}
`,
    (finish?.shift || thumbFinish?.shift) && `\n@keyframes switch-shift { to { background-position: 300% 0; } }\n`, `
@media (prefers-reduced-motion: reduce) {
  .switch,
  .switch-thumb {
    --thumb-duration: 120ms;
    --thumb-ease: ease-out;
  }
  .switch::before,
  .switch-thumb::after { animation: none; }
}`);

  const miss = missing(v, "css");
  return `<!-- Markup -->
${markup}

<script>
  document.querySelectorAll(".switch").forEach((el) =>
    el.addEventListener("click", () =>
      el.setAttribute("aria-checked", String(el.getAttribute("aria-checked") !== "true"))
    )
  );
</script>

<style>${css}
</style>
${miss.length ? `\n<!-- Not in this export (needs JavaScript): ${miss.join(", ")}. -->\n` : ""}`;
}

// ---------------------------------------------------------------- React + Motion
const q = (s) => JSON.stringify(s);

function layerStyle(extra) {
  return `{ position: "absolute", inset: 0, borderRadius: "inherit", ${extra} }`;
}

export function reactExport(v) {
  const g = geometry(v);
  const { Track: T, Thumb: H, Icon: I, Label: L, Motion: M, Effects: E } = v;
  const HV = v.Hover ?? { tint: 0, thumbScale: 1 };
  const sh = shadows(v);
  const grow = T.fillMode === "grow";
  const icon = I.glyph !== "none" && GLYPHS[I.glyph];
  const finish = FINISH[E.finish];
  const thumbFinish = THUMB_FINISH[E.finish];
  const hasSquash = M.squash > 0;
  const tilt = M.tilt > 0;
  const hoverScale = HV.thumbScale > 1;
  const animated = !!(finish?.shift || thumbFinish?.shift);
  const dist = Math.abs(g.onC - g.offC);
  const insetList = sh.inset.join(", ");
  const iconPx = r(Math.max(6, g.S * I.size));

  const shift = (secs) => `animate={reduce ? undefined : { backgroundPosition: ["0% 0%", "300% 0%"] }}
          transition={{ duration: ${secs}, repeat: Infinity, ease: "linear" }}`;

  const trackLayers = join(
    grow
      ? `
        <motion.span
          initial={false}
          animate={{ width: checked ? CENTER_ON : CENTER_OFF, opacity: checked ? 1 : 0 }}
          transition={{ width: thumb, opacity: fill }}
          style={{ position: "absolute", top: 0, bottom: 0, left: 0, borderRadius: "inherit", background: COLORS.trackOn }}
        />`
      : `
        <motion.span
          initial={false}
          animate={{ opacity: checked ? 1 : 0 }}
          transition={fill}
          style={${layerStyle("background: COLORS.trackOn")}}
        />`,
    finish && (finish.onOnly
      ? `
        <motion.span
          initial={false}
          animate={reduce ? { opacity: checked ? ${finish.opacity} : 0 } : { opacity: checked ? ${finish.opacity} : 0, backgroundPosition: ["0% 0%", "300% 0%"] }}
          transition={{ opacity: fill, backgroundPosition: { duration: ${finish.shift}, repeat: Infinity, ease: "linear" } }}
          style={${layerStyle(`backgroundImage: ${q(finish.image)}, backgroundSize: ${q(finish.size)}`)}}
        />`
      : `
        <motion.span
          ${finish.shift ? shift(finish.shift) : ""}
          style={${layerStyle(`backgroundImage: ${q(finish.image)}${finish.size ? `, backgroundSize: ${q(finish.size)}` : ""}${finish.blend ? `, mixBlendMode: ${q(finish.blend)}` : ""}, opacity: ${finish.opacity}`)}}
        />`),
    T.sheen > 0 && `
        <span style={${layerStyle(`backgroundImage: ${q(SHEEN(T.sheen))}`)}} />`,
    HV.tint > 0 && `
        <motion.span
          initial={false}
          animate={{ opacity: hovered && !disabled ? 1 : 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          style={${layerStyle(`background: checked ? COLORS.tintOn : COLORS.tintOff`)}}
        />`,
    L.show && `
        <motion.span
          initial={false}
          animate={{ opacity: checked ? 1 : 0, x: checked ? "-50%" : "-30%" }}
          transition={fill}
          style={{ ...labelStyle, left: ${r(g.labelOnX)}, color: COLORS.labelOn }}
        >
          {${q(L.onText)}}
        </motion.span>
        <motion.span
          initial={false}
          animate={{ opacity: checked ? 0 : 1, x: checked ? "-70%" : "-50%" }}
          transition={fill}
          style={{ ...labelStyle, left: ${r(g.labelOffX)}, color: COLORS.labelOff }}
        >
          {${q(L.offText)}}
        </motion.span>`,
    insetList && `
        <span style={${layerStyle(`boxShadow: ${q(insetList)}`)}} />`,
    sh.border && `
        <motion.span
          initial={false}
          animate={{ opacity: ${T.borderOffOnly ? "checked ? 0 : 1" : "1"} }}
          transition={fill}
          style={${layerStyle(`boxShadow: ${q(sh.border)}`)}}
        />`,
  );

  const thumbLayers = join(
    `
        <motion.span
          initial={false}
          animate={{ opacity: checked ? 1 : 0 }}
          transition={fill}
          style={${layerStyle(`background: COLORS.thumbOn${sh.thumbGlow ? `, boxShadow: ${q(sh.thumbGlow)}` : ""}`)}}
        />`,
    H.gloss > 0 && `
        <span style={${layerStyle(`backgroundImage: ${q(GLOSS(H.gloss))}`)}} />`,
    thumbFinish && `
        <motion.span
          ${thumbFinish.shift ? shift(thumbFinish.shift) : ""}
          style={${layerStyle(`backgroundImage: ${q(thumbFinish.image)}${thumbFinish.size ? `, backgroundSize: ${q(thumbFinish.size)}` : ""}, mixBlendMode: ${q(thumbFinish.blend)}, opacity: ${thumbFinish.opacity}`)}}
        />`,
    icon && `
        <motion.svg
          viewBox="0 0 24 24"
          initial={false}
          animate={{ opacity: checked ? 0 : 1, rotate: checked ? 90 : 0, scale: checked ? 0.4 : 1 }}
          transition={thumb}
          style={{ ...iconStyle, color: COLORS.iconOff }}
          dangerouslySetInnerHTML={{ __html: ICON_OFF }}
        />
        <motion.svg
          viewBox="0 0 24 24"
          initial={false}
          animate={{ opacity: checked ? 1 : 0, rotate: checked ? 0 : -90, scale: checked ? 1 : 0.4 }}
          transition={thumb}
          style={{ ...iconStyle, color: COLORS.iconOn }}
          dangerouslySetInnerHTML={{ __html: ICON_ON }}
        />`,
  );

  const colors = [
    ["trackOff", T.offColor], ["trackOn", T.onColor], ["thumbOff", H.offColor], ["thumbOn", H.onColor],
    HV.tint > 0 && ["tintOff", hoverTint(T.offColor, HV.tint)], HV.tint > 0 && ["tintOn", hoverTint(T.onColor, HV.tint)],
    L.show && ["labelOn", L.onColor], L.show && ["labelOff", L.offColor],
    icon && ["iconOn", I.onColor], icon && ["iconOff", I.offColor],
  ].filter(Boolean);

  const consts = join(
    L.show && `
const labelStyle = {
  position: "absolute",
  top: "50%",
  zIndex: 1,
  y: "-50%",
  fontSize: ${L.size},
  fontWeight: 600,
  lineHeight: 1,
  letterSpacing: "0.02em",
  whiteSpace: "nowrap",${L.font === "mono" ? `\n  fontFamily: ${q(MONO)},` : ""}
};
`,
    icon && `
// Thumb icon ("${I.glyph}"), 24×24, drawn in currentColor.
const ICON_OFF = ${q(icon.off)};
const ICON_ON = ${q(icon.on)};
const iconStyle = { position: "absolute", inset: 0, margin: "auto", width: ${iconPx}, height: ${iconPx}, overflow: "visible" };
`,
  );

  const usesXMotion = hasSquash || hoverScale;
  const reactImports = ["useState", usesXMotion && "useEffect"].filter(Boolean).join(", ");
  const motionImports = ["motion", usesXMotion && "useMotionValue", hasSquash && "useVelocity", usesXMotion && "useTransform", usesXMotion && "animate", animated && "useReducedMotion"]
    .filter(Boolean).join(", ");

  // Thumb scale: squash from velocity and/or hover growth, combined into one transform.
  const scaleExpr = (k) => [
    hasSquash && `(1 ${k > 0 ? "+" : "-"} Math.min(Math.abs(velocity.get()) / ${Math.round(dist * 7 + 1)}, 1) * ${r(Math.abs(k))})`,
    hoverScale && "grow.get()",
  ].filter(Boolean).join(" * ");
  const scaleHooks = usesXMotion
    ? `
  // Thumb scale: ${[hasSquash && "squash and stretch from its velocity", hoverScale && "grows a little on hover"].filter(Boolean).join("; ")}
  const x = useMotionValue(center - width / 2);${hasSquash ? `
  const velocity = useVelocity(x);` : ""}${hoverScale ? `
  const grow = useMotionValue(1);` : ""}
  const scaleX = useTransform(() => ${scaleExpr(M.squash)});
  const scaleY = useTransform(() => ${scaleExpr(-M.squash * 0.55)});
  useEffect(() => {
    animate(x, center - width / 2, thumb);
  }, [x, center, width]);${hoverScale ? `
  useEffect(() => {
    animate(grow, hovered && !disabled ? ${r(HV.thumbScale)} : 1, { type: "spring", visualDuration: 0.2, bounce: 0.3 });
  }, [grow, hovered, disabled]);` : ""}
`
    : "";

  const miss = missing(v, "react");

  return `${miss.length ? `// Not in this export: ${miss.join(", ")}.\n` : ""}import { ${reactImports} } from "react";
import { ${motionImports} } from "motion/react";

// Tuned in Toggle Lab
const thumb = ${motionSource(M.thumb)};
const fill = ${motionSource(M.fill)};

const W = ${r(g.W)};
const H = ${r(g.HT)};
const SIZE_ON = ${r(g.S)};
const SIZE_OFF = ${r(g.sOff)};
const CENTER_OFF = ${r(g.offC)};
const CENTER_ON = ${r(g.onC)};
const PRESS_STRETCH = ${r(H.pressStretch)};
const COLORS = {
${colors.map(([k, c]) => `  ${k}: ${q(c)},`).join("\n")}
};
${consts}
export function Switch({ checked: controlled, defaultChecked = false, onCheckedChange, disabled = false, label = "Toggle" }) {
  const [uncontrolled, setUncontrolled] = useState(defaultChecked);
  const checked = controlled ?? uncontrolled;
  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focusRing, setFocusRing] = useState(false);${animated ? `
  const reduce = useReducedMotion();` : ""}

  const size = checked ? SIZE_ON : SIZE_OFF;
  const width = pressed ? size * PRESS_STRETCH : size;
  const center = checked ? CENTER_ON - (width - size) / 2 : CENTER_OFF + (width - size) / 2;
${scaleHooks}
  const toggle = () => {
    const next = !checked;
    setUncontrolled(next);
    onCheckedChange?.(next);
  };

  return (
    <motion.button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={toggle}
      onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(true)}
      onPointerLeave={() => { setHovered(false); setPressed(false); }}
      onPointerDown={() => !disabled && setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onFocus={(e) => setFocusRing(e.currentTarget.matches(":focus-visible"))}
      onBlur={() => setFocusRing(false)}
      whileTap={disabled ? undefined : { scale: ${r(M.pressScale)} }}${tilt ? `
      initial={false}
      animate={{ rotateY: checked ? ${M.tilt} : ${-M.tilt} }}
      transition={{ rotateY: thumb }}` : ""}
      style={{
        position: "relative",
        width: W,
        height: H,
        padding: 0,
        border: 0,
        borderRadius: ${r(g.rTrack)},
        background: COLORS.trackOff,${sh.drop ? `\n        boxShadow: ${q(sh.drop)},` : ""}${T.backdropBlur > 0 ? `\n        backdropFilter: "blur(${T.backdropBlur}px) saturate(1.6)",\n        WebkitBackdropFilter: "blur(${T.backdropBlur}px) saturate(1.6)",` : ""}${tilt ? `\n        transformPerspective: ${Math.max(220, g.W * 4)},` : ""}
        overflow: "visible",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        outline: focusRing ? "2px solid #006bff" : "none",
        outlineOffset: 2,
      }}
    >${sh.glow ? `
      <motion.span
        aria-hidden
        initial={false}
        animate={{ opacity: checked ? 1 : 0 }}
        transition={fill}
        style={${layerStyle(`boxShadow: ${q(sh.glow)}`)}}
      />` : ""}
      {/* Track layers, clipped to the track so the thumb can still overhang */}
      <span aria-hidden style={${layerStyle(`overflow: "hidden"`)}}>${trackLayers}
      </span>
      <motion.span
        aria-hidden
        initial={false}
        animate={{ ${usesXMotion ? "" : "x: center - width / 2, "}width, height: size, borderRadius: ${r(H.roundness)} * size / 2 }}
        transition={thumb}
        style={{
          position: "absolute",
          top: H / 2,
          left: 0,
          y: "-50%",${usesXMotion ? "\n          x,\n          scaleX,\n          scaleY," : ""}
          background: COLORS.thumbOff,
          boxShadow: ${q(sh.thumb)},
        }}
      >${thumbLayers}
      </motion.span>
    </motion.button>
  );
}
`;
}
