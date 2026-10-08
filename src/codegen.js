import { toCss, motionSource } from "./transitions.js";

const r = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
const px = (n) => `${r(n)}px`;

function geometry(v) {
  const { Track: T, Thumb: H } = v;
  const W = T.width, HT = T.height, pad = T.padding, S = H.size;
  const sOff = Math.max(4, S * H.offScale);
  const offC = pad + S / 2, onC = W - pad - S / 2;
  return { W, HT, pad, S, sOff, offC, onC, rTrack: (T.roundness * Math.min(W, HT)) / 2 };
}

function shadows(v) {
  const { Track: T, Thumb: H, Depth: D, Effects: E } = v;
  const i = T.inset;
  const track = [];
  if (T.borderWidth > 0) track.push(`inset 0 0 0 ${r(T.borderWidth)}px ${T.borderColor}`);
  if (i > 0)
    track.push(
      `inset ${r(2.5 * i)}px ${r(2.5 * i)}px ${r(6 * i)}px rgba(15, 23, 42, ${r(0.22 * i)})`,
      `inset ${r(-2.5 * i)}px ${r(-2.5 * i)}px ${r(6 * i)}px rgba(255, 255, 255, ${r(0.75 * i)})`
    );
  if (D.opacity > 0 && (D.blur > 0 || D.offsetX || D.offsetY))
    track.push(`${D.offsetX}px ${D.offsetY}px ${D.blur}px color-mix(in srgb, ${D.color} ${Math.round(D.opacity * 100)}%, transparent)`);
  const sh = H.shadow;
  const thumb = sh > 0
    ? `0 ${r(0.5 + 3 * sh)}px ${r(1 + 8 * sh)}px rgba(0, 0, 0, ${r(0.06 + 0.24 * sh)}), 0 0 0 0.5px rgba(0, 0, 0, ${r(0.03 + 0.07 * sh)})`
    : "none";
  const glow = E.glow > 0 ? `0 0 ${E.glow}px ${r(E.glow * 0.2)}px color-mix(in srgb, ${E.color} 70%, transparent)` : null;
  return { track, thumb, glow };
}

// Features the given export can't express, so we say so instead of silently dropping them.
function missing(v, target) {
  const { Track: T, Motion: M, Effects: E, Icon: I, Label: L } = v;
  const out = [];
  if (M.squash > 0) out.push("squash and stretch");
  if (E.trail > 0) out.push("motion trail");
  if (E.burst !== "none") out.push(`${E.burst} burst`);
  if (M.pop > 0) out.push("track pop");
  if (M.steps > 0) out.push("stepped motion");
  if (M.tilt > 0) out.push("3D tilt");
  if (T.fillMode === "grow") out.push("grow-with-thumb fill");
  if (target === "css") {
    if (I.glyph !== "none") out.push("thumb icon");
    if (L.show) out.push("labels");
  }
  if (target === "react") {
    if (E.glow > 0) out.push("glow");
    if (E.finish !== "none") out.push(`${E.finish} finish`);
    if (T.inset > 0 || T.sheen > 0 || T.backdropBlur > 0) out.push("inset, sheen and blur");
    if (v.Thumb.gloss > 0) out.push("thumb gloss");
  }
  return out;
}

const FINISH_CSS = {
  holographic: `background-image: linear-gradient(115deg, #ff9ff3, #feca57, #48dbfb, #a29bfe, #ff9ff3);
  background-size: 300% 100%;
  mix-blend-mode: soft-light;
  opacity: 0.9;
  animation: switch-holo 4s linear infinite;`,
  chrome: `background-image: linear-gradient(180deg, #fff 0%, #9ca3af 45%, #4b5563 50%, #9ca3af 55%, #f3f4f6 100%);
  mix-blend-mode: overlay;
  opacity: 0.6;`,
  scanlines: `background-image: repeating-linear-gradient(0deg, rgba(255,255,255,0.1) 0 1px, rgba(0,0,0,0.18) 1px 2px, transparent 2px 3px);`,
  plasma: `background-image: linear-gradient(90deg, #ff006e, #fb5607, #ffbe0b, #3a86ff, #8338ec, #ff006e);
  background-size: 300% 100%;
  opacity: 0;
  transition: opacity var(--fill-duration) var(--fill-ease);
  animation: switch-holo 3s linear infinite;`,
};

export function cssExport(v) {
  const g = geometry(v);
  const { Track: T, Thumb: H, Motion: M } = v;
  const sh = shadows(v);
  const thumbT = toCss(M.thumb);
  const fillT = toCss(M.fill);
  const stretchOff = g.sOff * H.pressStretch;
  const stretchOn = g.S * H.pressStretch;
  const offLeft = g.offC - g.sOff / 2;
  const onLeft = g.onC - g.S / 2;
  const onLeftPressed = g.onC + g.S / 2 - stretchOn;

  const trackOff = sh.track.length ? sh.track.join(",\n    ") : "none";
  const trackOnList = [...sh.track];
  if (T.borderOffOnly && T.borderWidth > 0) trackOnList.shift();
  if (sh.glow) trackOnList.push(sh.glow);
  const trackOn = trackOnList.length ? trackOnList.join(",\n    ") : "none";

  const sheen = T.sheen > 0
    ? `\n  background-image: linear-gradient(180deg, rgba(255,255,255,${r(0.6 * T.sheen)}) 0%, rgba(255,255,255,${r(0.12 * T.sheen)}) 48%, rgba(255,255,255,0) 52%, rgba(0,0,0,${r(0.06 * T.sheen)}) 100%);`
    : "";
  const blur = T.backdropBlur > 0 ? `\n  backdrop-filter: blur(${T.backdropBlur}px) saturate(1.6);` : "";
  const gloss = H.gloss > 0
    ? `\n  background-image: radial-gradient(120% 90% at 35% 18%, rgba(255,255,255,${r(0.95 * H.gloss)}) 0%, rgba(255,255,255,0) 55%);`
    : "";

  const finish = v.Effects.finish;
  const finishCss = finish && finish !== "none"
    ? `
.switch::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  ${FINISH_CSS[finish]}
}
${finish === "plasma" ? `.switch[aria-checked="true"]::before { opacity: 0.92; }\n` : ""}${finish === "holographic" || finish === "plasma" ? `@keyframes switch-holo { to { background-position: 300% 0; } }\n` : ""}`
    : "";
  const miss = missing(v, "css");
  const missNote = miss.length ? `\n<!-- Not in this export (needs JavaScript): ${miss.join(", ")}. -->\n` : "";

  return `<!-- Markup -->
<button class="switch" role="switch" aria-checked="false" aria-label="Notifications">
  <span class="switch-thumb"></span>
</button>

<script>
  document.querySelectorAll(".switch").forEach((el) =>
    el.addEventListener("click", () =>
      el.setAttribute("aria-checked", String(el.getAttribute("aria-checked") !== "true"))
    )
  );
</script>

<style>
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
  background-color: ${T.offColor};${sheen}${blur}
  box-shadow:
    ${trackOff};
  cursor: pointer;
  transition:
    background-color var(--fill-duration) var(--fill-ease),
    box-shadow var(--fill-duration) var(--fill-ease),
    scale 160ms cubic-bezier(0.23, 1, 0.32, 1);
}

.switch[aria-checked="true"] {
  background-color: ${T.onColor};
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

.switch-thumb {
  position: absolute;
  top: 50%;
  left: ${px(offLeft)};
  width: ${px(g.sOff)};
  height: ${px(g.sOff)};
  translate: 0 -50%;
  border-radius: ${px((H.roundness * g.sOff) / 2)};
  background-color: ${H.offColor};${gloss}
  box-shadow: ${sh.thumb};
  pointer-events: none;
  transition:
    left var(--thumb-duration) var(--thumb-ease),
    width var(--thumb-duration) var(--thumb-ease),
    height var(--thumb-duration) var(--thumb-ease),
    border-radius var(--thumb-duration) var(--thumb-ease),
    background-color var(--fill-duration) var(--fill-ease);
}

.switch:active:not(:disabled) .switch-thumb {
  width: ${px(stretchOff)};
}

.switch[aria-checked="true"] .switch-thumb {
  left: ${px(onLeft)};
  width: ${px(g.S)};
  height: ${px(g.S)};
  border-radius: ${px((H.roundness * g.S) / 2)};
  background-color: ${H.onColor};
}

.switch[aria-checked="true"]:active:not(:disabled) .switch-thumb {
  left: ${px(onLeftPressed)};
  width: ${px(stretchOn)};
}

.switch { overflow: visible; }
${finishCss}
@media (prefers-reduced-motion: reduce) {
  .switch,
  .switch-thumb {
    --thumb-duration: 120ms;
    --thumb-ease: ease-out;
  }
  .switch::before { animation: none; }
}
</style>
${missNote}`;
}

export function reactExport(v) {
  const g = geometry(v);
  const { Track: T, Thumb: H, Icon: I, Label: L, Motion: M } = v;
  const sh = shadows(v);
  const trackShadow = sh.track.length ? sh.track.join(", ") : "none";
  const hasSquash = M.squash > 0;
  const dist = Math.abs(g.onC - g.offC);

  const label = L.show
    ? `
      <motion.span
        aria-hidden
        initial={false}
        animate={{ opacity: checked ? 1 : 0 }}
        transition={fill}
        style={{ ...labelStyle, left: ${r((g.pad + g.onC - g.S / 2) / 2)}, color: "${L.onColor}" }}
      >
        {${JSON.stringify(L.onText)}}
      </motion.span>
      <motion.span
        aria-hidden
        initial={false}
        animate={{ opacity: checked ? 0 : 1 }}
        transition={fill}
        style={{ ...labelStyle, left: ${r((g.offC + g.S / 2 + g.W - g.pad) / 2)}, color: "${L.offColor}" }}
      >
        {${JSON.stringify(L.offText)}}
      </motion.span>`
    : "";

  const labelConst = L.show
    ? `
const labelStyle = {
  position: "absolute",
  top: "50%",
  translate: "-50% -50%",
  fontSize: ${L.size},
  fontWeight: 600,
  letterSpacing: "0.02em",
  pointerEvents: "none",
};
`
    : "";

  const icon = I.glyph !== "none"
    ? `
        {/* Icon: "${I.glyph}". Swap in your own glyphs for each state. */}
        <motion.span
          aria-hidden
          initial={false}
          animate={{ opacity: checked ? 1 : 0, rotate: checked ? 0 : -90, scale: checked ? 1 : 0.4 }}
          transition={thumb}
          style={{ ...iconStyle, color: "${I.onColor}" }}
        >
          {onIcon}
        </motion.span>
        <motion.span
          aria-hidden
          initial={false}
          animate={{ opacity: checked ? 0 : 1, rotate: checked ? 90 : 0, scale: checked ? 0.4 : 1 }}
          transition={thumb}
          style={{ ...iconStyle, color: "${I.offColor}" }}
        >
          {offIcon}
        </motion.span>`
    : "";

  const iconConst = I.glyph !== "none"
    ? `
const iconStyle = {
  position: "absolute",
  inset: 0,
  display: "grid",
  placeItems: "center",
  fontSize: ${r(g.S * I.size)},
};
`
    : "";

  const miss = missing(v, "react");
  const missNote = miss.length ? `// Not in this export: ${miss.join(", ")}.\n` : "";
  return `${missNote}import { useState${hasSquash ? ", useEffect" : ""} } from "react";
import { motion${hasSquash ? ", useMotionValue, useVelocity, useTransform, animate" : ""} } from "motion/react";

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
${labelConst}${iconConst}
export function Switch({ checked: controlled, defaultChecked = false, onCheckedChange, disabled = false, label = "Toggle"${I.glyph !== "none" ? ", onIcon, offIcon" : ""} }) {
  const [uncontrolled, setUncontrolled] = useState(defaultChecked);
  const checked = controlled ?? uncontrolled;
  const [pressed, setPressed] = useState(false);
  const [focusRing, setFocusRing] = useState(false);

  const size = checked ? SIZE_ON : SIZE_OFF;
  const width = pressed ? size * PRESS_STRETCH : size;
  const center = checked ? CENTER_ON - (width - size) / 2 : CENTER_OFF + (width - size) / 2;
${hasSquash ? `
  // Squash and stretch from the thumb's velocity
  const x = useMotionValue(center - width / 2);
  const velocity = useVelocity(x);
  const scaleX = useTransform(velocity, (v) => 1 + Math.min(Math.abs(v) / ${Math.round(dist * 7 + 1)}, 1) * ${r(M.squash)});
  const scaleY = useTransform(velocity, (v) => 1 - Math.min(Math.abs(v) / ${Math.round(dist * 7 + 1)}, 1) * ${r(M.squash * 0.55)});
  useEffect(() => {
    animate(x, center - width / 2, thumb);
  }, [x, center, width]);
` : ""}
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
      onPointerDown={() => !disabled && setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onFocus={(e) => setFocusRing(e.currentTarget.matches(":focus-visible"))}
      onBlur={() => setFocusRing(false)}
      whileTap={disabled ? undefined : { scale: ${r(M.pressScale)} }}
      style={{
        position: "relative",
        width: W,
        height: H,
        padding: 0,
        border: 0,
        borderRadius: ${r(g.rTrack)},
        background: "${T.offColor}",
        boxShadow: "${trackShadow}",
        overflow: "visible",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        outline: focusRing ? "2px solid #006bff" : "none",
        outlineOffset: 2,
      }}
    >
      <motion.span
        aria-hidden
        initial={false}
        animate={{ opacity: checked ? 1 : 0 }}
        transition={fill}
        style={{ position: "absolute", inset: 0, borderRadius: "inherit", background: "${T.onColor}" }}
      />${label}
      <motion.span
        aria-hidden
        initial={false}
        animate={{ ${hasSquash ? "" : "x: center - width / 2, "}width, height: size, borderRadius: ${r(H.roundness)} * size / 2, backgroundColor: checked ? "${H.onColor}" : "${H.offColor}" }}
        transition={{ default: thumb, backgroundColor: fill }}
        style={{
          position: "absolute",
          top: H / 2,
          left: 0,
          y: "-50%",${hasSquash ? "\n          x,\n          scaleX,\n          scaleY," : ""}
          boxShadow: "${sh.thumb}",
        }}
      >${icon}
      </motion.span>
    </motion.button>
  );
}
`;
}
