import { useEffect, useRef, useState } from "react";
import {
  motion,
  animate,
  useMotionValue,
  useTransform,
  useVelocity,
  useAnimationFrame,
  useReducedMotion,
} from "motion/react";
import { toMotion, scaleTime } from "./transitions.js";
import { Glyph } from "./glyphs.jsx";

const mix = (c, a) => `color-mix(in srgb, ${c} ${Math.round(Math.max(0, Math.min(1, a)) * 100)}%, transparent)`;
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const MAX_TRAIL = 5;
const CONFETTI = ["#ff0080", "#7928ca", "#0070f3", "#50e3c2", "#f5a623", "#ff4d4d"];

export function Toggle({ v, checked, onToggle, preview = false, slow = 1, zoom = 1, trace, label }) {
  const reduceMotion = useReducedMotion();
  const quiet = preview || reduceMotion;
  const { Track: T, Thumb: H, Icon: I, Label: L, Depth: D, Motion: M, Effects: E } = v;

  // ---- geometry ----
  const W = T.width;
  const HT = T.height;
  const pad = T.padding;
  const S = H.size;
  const sOff = Math.max(4, S * H.offScale);
  const offC = pad + S / 2;
  const onC = W - pad - S / 2;
  const rTrack = (T.roundness * Math.min(W, HT)) / 2;

  const [pressed, setPressed] = useState(false);
  const [settle, setSettle] = useState(0);
  const drag = useRef(null);
  const suppressClick = useRef(false);

  const size = checked ? S : sOff;
  const tw = pressed ? size * H.pressStretch : size;
  const restC = checked ? onC - (tw - size) / 2 : offC + (tw - size) / 2;
  const rThumb = (H.roundness * size) / 2;

  const thumbT = reduceMotion ? { duration: 0.15, ease: "easeOut" } : scaleTime(toMotion(M.thumb), slow);
  const fillT = scaleTime(toMotion(M.fill), slow);

  // ---- motion values ----
  const cx = useMotionValue(restC);
  const w = useMotionValue(tw);
  const h = useMotionValue(size);
  const rad = useMotionValue(rThumb);
  const popX = useMotionValue(1);
  const popY = useMotionValue(1);
  const y = useTransform(() => -h.get() / 2);

  const params = useRef({});
  params.current = {
    squash: quiet ? 0 : M.squash, dist: Math.abs(onC - offC), slow,
    offC, onC, steps: M.steps ?? 0, tilt: preview ? 0 : M.tilt ?? 0,
  };
  // Progress 0..1 along the track; steps quantize the visible position (8-bit motion).
  const prog = useTransform(() => {
    const p = params.current;
    return p.onC === p.offC ? 0 : (cx.get() - p.offC) / (p.onC - p.offC);
  });
  const x = useTransform(() => {
    const p = params.current;
    let c = cx.get();
    if (p.steps > 0) {
      const q = Math.round(prog.get() * p.steps) / p.steps;
      c = p.offC + q * (p.onC - p.offC);
    }
    return c - w.get() / 2;
  });
  // Grow-with-thumb fill
  const growW = useTransform(() => Math.max(0, x.get() + w.get() / 2));
  const growO = useTransform(() => Math.min(1, Math.max(0, prog.get() / 0.12)));
  // 3D rocker tilt
  const tiltY = useTransform(() => (prog.get() - 0.5) * 2 * params.current.tilt);
  const fx = useRef(null);
  const vel = useVelocity(cx);
  const sx = useTransform(() => {
    const p = params.current;
    const n = Math.min((Math.abs(vel.get()) * p.slow) / (p.dist * 7 + 1), 1);
    return 1 + n * p.squash;
  });
  const sy = useTransform(() => {
    const p = params.current;
    const n = Math.min((Math.abs(vel.get()) * p.slow) / (p.dist * 7 + 1), 1);
    return 1 - n * p.squash * 0.55;
  });

  const mounted = useRef(false);
  useEffect(() => {
    if (preview || !mounted.current) {
      cx.set(restC); w.set(tw); h.set(size); rad.set(rThumb);
      mounted.current = true;
      return;
    }
    if (drag.current?.dragging) return;
    animate(cx, restC, thumbT);
    animate(w, tw, thumbT);
    animate(h, size, thumbT);
    animate(rad, rThumb, thumbT);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restC, tw, size, rThumb, settle, preview]);

  // ---- trail + motion trace (sampled every frame) ----
  const ghosts = [useMotionValue(restC), useMotionValue(restC), useMotionValue(restC), useMotionValue(restC), useMotionValue(restC)];
  const ghostX = ghosts.map((g) => useTransform(() => g.get() - w.get() / 2)); // eslint-disable-line react-hooks/rules-of-hooks
  const history = useRef([]);
  const geo = useRef({});
  geo.current = { offC, onC, slow, trail: quiet ? 0 : E.trail };
  useAnimationFrame(() => {
    if (preview) return;
    const t = performance.now(); // page clock, shared with the trace graph
    const c = cx.get();
    const hist = history.current;
    hist.push({ t, c });
    while (hist.length > 2 && t - hist[0].t > 2000) hist.shift();
    const n = geo.current.trail;
    for (let i = 0; i < n; i++) {
      const target = t - (i + 1) * 26 * geo.current.slow;
      let val = hist[0].c;
      for (let j = hist.length - 1; j >= 0; j--) {
        if (hist[j].t <= target) { val = hist[j].c; break; }
      }
      ghosts[i].set(val);
    }
    if (trace) {
      const { offC: a, onC: b } = geo.current;
      const tr = trace.current;
      tr.push({ t, p: b === a ? 0 : (c - a) / (b - a) });
      while (tr.length > 2 && t - tr[0].t > 12000) tr.shift();
    }
  });

  // ---- pop + bursts on change ----
  const [bursts, setBursts] = useState([]);
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const prevChecked = useRef(checked);
  useEffect(() => {
    if (prevChecked.current === checked) return;
    prevChecked.current = checked;
    if (quiet) return;
    if (E.burst === "glitch" && fx.current?.animate) {
      const j = Math.max(2, HT * 0.12);
      fx.current.animate(
        [
          { translate: "0 0", filter: "none" },
          { translate: `${-j}px ${j * 0.4}px`, filter: `drop-shadow(${-j}px 0 0 #ff006e) drop-shadow(${j}px 0 0 #00f0ff)` },
          { translate: `${j}px ${-j * 0.3}px`, filter: `drop-shadow(${j}px 0 0 #ff006e) drop-shadow(${-j}px 0 0 #00f0ff)` },
          { translate: `${-j * 0.5}px 0`, filter: `drop-shadow(${-j * 0.6}px 0 0 #ff006e) drop-shadow(${j * 0.6}px 0 0 #00f0ff)`, opacity: 0.85 },
          { translate: `${j * 0.4}px ${j * 0.2}px`, filter: "none", opacity: 1 },
          { translate: "0 0", filter: "none" },
        ],
        { duration: 300 * slow, easing: "steps(6, end)" }
      );
    }
    if (M.pop > 0) {
      const opts = { duration: 0.42 * slow, times: [0, 0.28, 1], ease: [[0.23, 1, 0.32, 1], [0.34, 1.56, 0.64, 1]] };
      animate(popX, [1, 1 + M.pop, 1], opts);
      animate(popY, [1, 1 - M.pop * 0.6, 1], opts);
    }
    if (checked && E.burst !== "none" && E.burst !== "glitch") {
      // Fire when the thumb lands, not when the click happens.
      const t = M.thumb;
      const land = (t?.type === "easing" ? t.duration * 0.85 : (t?.visualDuration ?? 0.3) * 0.7) * 1000 * slow;
      const id = Math.random().toString(36).slice(2);
      const kind = E.burst;
      const fire = setTimeout(() => setBursts((b) => [...b, { id, kind, seed: Math.random() }]), land);
      const clear = setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), land + 1400 * slow);
      timers.current.push(fire, clear);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checked]);

  // ---- pointer: press-stretch, drag to toggle ----
  const onPointerDown = (e) => {
    if (preview || e.button !== 0) return;
    setPressed(true);
    drag.current = { x0: e.clientX, c0: cx.get(), dragging: false };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.x0) / zoom;
    if (!d.dragging && Math.abs(dx) > 3) d.dragging = true;
    if (d.dragging) {
      cx.stop();
      const lo = offC + (tw - size) / 2;
      const hi = onC - (tw - size) / 2;
      let next = d.c0 + dx;
      if (next < lo) next = lo - (lo - next) * 0.2;
      if (next > hi) next = hi + (next - hi) * 0.2;
      cx.set(next);
    }
  };
  const endPointer = (commit) => () => {
    const d = drag.current;
    drag.current = null;
    setPressed(false);
    if (d?.dragging) {
      suppressClick.current = true;
      const next = cx.get() > (offC + onC) / 2;
      if (commit && next !== checked) onToggle?.(next);
      else setSettle((s) => s + 1);
    }
  };
  const onClick = () => {
    if (suppressClick.current) { suppressClick.current = false; return; }
    if (!preview) onToggle?.(!checked);
  };

  // ---- styles ----
  const glow = quiet && !preview ? 0 : E.glow;
  const drop = D.opacity > 0 && (D.blur > 0 || D.offsetX || D.offsetY)
    ? `${D.offsetX}px ${D.offsetY}px ${D.blur}px ${mix(D.color, D.opacity)}`
    : "none";
  const i = T.inset;
  const insetShadow = i > 0
    ? `inset ${2.5 * i}px ${2.5 * i}px ${6 * i}px rgba(15, 23, 42, ${0.22 * i}), inset ${-2.5 * i}px ${-2.5 * i}px ${6 * i}px rgba(255, 255, 255, ${0.75 * i})`
    : null;
  const borderShadow = T.borderWidth > 0 ? `inset 0 0 0 ${T.borderWidth}px ${T.borderColor}` : null;
  const sh = H.shadow;
  const thumbShadow = sh > 0
    ? `0 ${0.5 + 3 * sh}px ${1 + 8 * sh}px rgba(0, 0, 0, ${0.06 + 0.24 * sh}), 0 0 0 0.5px rgba(0, 0, 0, ${0.03 + 0.07 * sh})`
    : "none";
  const iconPx = Math.max(6, S * I.size);
  const labelOnX = (pad + onC - S / 2) / 2;
  const labelOffX = (offC + S / 2 + W - pad) / 2;
  const iconMotion = (state) => {
    const visible = (state === "on") === checked;
    return visible
      ? { opacity: 1, scale: 1, rotate: 0 }
      : { opacity: 0, scale: 0.4, rotate: state === "on" ? -90 : 90 };
  };

  const Root = preview ? motion.span : motion.button;
  const rootProps = preview
    ? { "aria-hidden": true }
    : { type: "button", role: "switch", "aria-checked": checked, "aria-label": label || "Preview switch" };

  return (
    <Root
      {...rootProps}
      className={`tg${preview ? " tg-preview" : ""}`}
      style={{ width: W, height: HT, borderRadius: rTrack }}
      whileTap={quiet ? undefined : { scale: M.pressScale }}
      transition={{ type: "spring", visualDuration: 0.18 * slow, bounce: 0.35 }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer(true)}
      onPointerCancel={endPointer(false)}
      onClick={onClick}
    >
      <span className="tg-fx" ref={fx}>
      <motion.span className="tg-body" style={{ scaleX: popX, scaleY: popY, rotateY: tiltY, transformPerspective: Math.max(220, W * 4) }}>
        {glow > 0 && (
          <motion.span
            className="tg-layer"
            style={{ borderRadius: rTrack, boxShadow: `0 0 ${glow}px ${glow * 0.2}px ${mix(E.color, 0.7)}` }}
            initial={false}
            animate={{ opacity: checked ? 1 : 0 }}
            transition={fillT}
          />
        )}
        <span
          className="tg-clip"
          style={{
            borderRadius: rTrack,
            boxShadow: drop,
            backdropFilter: T.backdropBlur > 0 ? `blur(${T.backdropBlur}px) saturate(1.6)` : undefined,
            WebkitBackdropFilter: T.backdropBlur > 0 ? `blur(${T.backdropBlur}px) saturate(1.6)` : undefined,
          }}
        >
          <span className="tg-layer" style={{ background: T.offColor }} />
          {T.fillMode === "grow" ? (
            <motion.span
              key="fill-grow"
              className="tg-layer"
              style={{ background: T.onColor, right: "auto", width: growW, opacity: growO }}
            />
          ) : (
            <motion.span
              key="fill-fade"
              className="tg-layer"
              style={{ background: T.onColor }}
              initial={false}
              animate={{ opacity: checked ? 1 : 0 }}
              transition={fillT}
            />
          )}
          {E.finish === "plasma" && (
            <motion.span
              className="tg-layer fin-plasma"
              initial={false}
              animate={{ opacity: checked ? 0.92 : 0 }}
              transition={fillT}
            />
          )}
          {(E.finish === "holographic" || E.finish === "chrome" || E.finish === "scanlines") && (
            <span className={`tg-layer fin-${E.finish}`} />
          )}
          {T.sheen > 0 && (
            <span
              className="tg-layer"
              style={{
                background: `linear-gradient(180deg, rgba(255,255,255,${0.6 * T.sheen}) 0%, rgba(255,255,255,${0.12 * T.sheen}) 48%, rgba(255,255,255,0) 52%, rgba(0,0,0,${0.06 * T.sheen}) 100%)`,
              }}
            />
          )}
          {L.show && (
            <>
              <motion.span
                className="tg-label"
                style={{ left: labelOnX, fontSize: L.size, color: L.onColor, fontFamily: L.font === "mono" ? "var(--mono)" : undefined }}
                initial={false}
                animate={{ opacity: checked ? 1 : 0, x: checked ? "-50%" : "-30%" }}
                transition={fillT}
              >
                {L.onText}
              </motion.span>
              <motion.span
                className="tg-label"
                style={{ left: labelOffX, fontSize: L.size, color: L.offColor, fontFamily: L.font === "mono" ? "var(--mono)" : undefined }}
                initial={false}
                animate={{ opacity: checked ? 0 : 1, x: checked ? "-70%" : "-50%" }}
                transition={fillT}
              >
                {L.offText}
              </motion.span>
            </>
          )}
          {insetShadow && <span className="tg-layer" style={{ boxShadow: insetShadow }} />}
          {borderShadow && (
            <motion.span
              className="tg-layer"
              style={{ boxShadow: borderShadow }}
              initial={false}
              animate={{ opacity: T.borderOffOnly && checked ? 0 : 1 }}
              transition={fillT}
            />
          )}
        </span>

        {!quiet && Array.from({ length: Math.min(MAX_TRAIL, E.trail) }, (_, k) => (
          <motion.span
            key={k}
            className="tg-thumb tg-ghost"
            style={{
              x: ghostX[k], y, top: HT / 2, width: w, height: h, borderRadius: rad,
              background: checked ? H.onColor : H.offColor,
              opacity: 0.38 * (1 - k / (E.trail + 0.5)),
              boxShadow: glow > 0 ? `0 0 ${glow * 0.4}px ${mix(E.color, 0.6)}` : "none",
            }}
          />
        ))}

        <motion.span
          className="tg-thumb"
          style={{ x, y, top: HT / 2, width: w, height: h, borderRadius: rad, scaleX: sx, scaleY: sy, boxShadow: thumbShadow }}
        >
          <span className="tg-layer" style={{ background: H.offColor }} />
          <motion.span
            className="tg-layer"
            style={{
              background: H.onColor,
              boxShadow: glow > 0 ? `0 0 ${glow * 0.5}px ${glow * 0.1}px ${mix(E.color, 0.8)}` : undefined,
            }}
            initial={false}
            animate={{ opacity: checked ? 1 : 0 }}
            transition={fillT}
          />
          {H.gloss > 0 && (
            <span
              className="tg-layer"
              style={{
                background: `radial-gradient(120% 90% at 35% 18%, rgba(255,255,255,${0.95 * H.gloss}) 0%, rgba(255,255,255,0) 55%), linear-gradient(180deg, rgba(255,255,255,0) 55%, rgba(0,0,0,${0.12 * H.gloss}) 100%)`,
              }}
            />
          )}
          {(E.finish === "holographic" || E.finish === "chrome") && (
            <span className={`tg-layer fin-${E.finish} fin-thumb`} />
          )}
          {I.glyph !== "none" && ["off", "on"].map((state) => (
            <motion.span
              key={state}
              className="tg-icon"
              style={{ color: state === "on" ? I.onColor : I.offColor }}
              initial={false}
              animate={iconMotion(state)}
              transition={thumbT}
            >
              <Glyph name={I.glyph} state={state} size={iconPx} />
            </motion.span>
          ))}
        </motion.span>

        {bursts.length > 0 && (
          <span className="tg-burst" style={{ left: onC, top: HT / 2 }}>
            {bursts.map((b) => (
              <Burst key={b.id} kind={b.kind} seed={b.seed} color={E.color} size={S} slow={slow} />
            ))}
          </span>
        )}
      </motion.span>
      </span>
    </Root>
  );
}

function rand(seed, i) {
  const x = Math.sin(seed * 9999 + i * 77.7) * 10000;
  return x - Math.floor(x);
}

function Burst({ kind, seed, color, size, slow }) {
  if (kind === "ripple") {
    return (
      <>
        {[0, 1].map((k) => (
          <motion.span
            key={k}
            className="tg-ring"
            style={{ width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2, borderColor: color }}
            initial={{ scale: 1, opacity: 0.55 }}
            animate={{ scale: 2.6 + k * 0.6, opacity: 0 }}
            transition={{ duration: (0.6 + k * 0.15) * slow, delay: k * 0.08 * slow, ease: [0.23, 1, 0.32, 1] }}
          />
        ))}
      </>
    );
  }
  if (kind === "sparks") {
    const n = 10;
    return (
      <>
        {Array.from({ length: n }, (_, i) => {
          const angle = (360 / n) * i + rand(seed, i) * 14;
          const len = Math.max(4, size * 0.28);
          return (
            <span key={i} className="tg-spoke" style={{ transform: `rotate(${angle}deg)` }}>
              <motion.span
                className="tg-spark"
                style={{ height: len, marginTop: -len / 2, background: color, boxShadow: `0 0 6px ${color}` }}
                initial={{ y: -size * 0.55, opacity: 1, scaleY: 1 }}
                animate={{ y: -size * (1.05 + rand(seed, i + 20) * 0.35), opacity: 0, scaleY: 0.3 }}
                transition={{ duration: 0.5 * slow, ease: [0.23, 1, 0.32, 1] }}
              />
            </span>
          );
        })}
      </>
    );
  }
  if (kind === "confetti") {
    const n = 18;
    return (
      <>
        {Array.from({ length: n }, (_, i) => {
          const a = rand(seed, i) * Math.PI * 2;
          const dist = size * (0.9 + rand(seed, i + 3) * 1.4);
          const dx = Math.cos(a) * dist;
          const dy = Math.sin(a) * dist * 0.8 - size * 0.6;
          const c = i % 3 === 0 ? color : CONFETTI[i % CONFETTI.length];
          const pw = 3 + rand(seed, i + 9) * 3;
          return (
            <motion.span
              key={i}
              className="tg-confetti"
              style={{ width: pw, height: pw * 1.6, marginLeft: -pw / 2, marginTop: -pw * 0.8, background: c }}
              initial={{ x: 0, y: 0, rotate: 0, opacity: 1, scale: 0.6 }}
              animate={{
                x: [0, dx, dx * 1.1],
                y: [0, dy, dy + size * 1.4],
                rotate: [0, 180 + rand(seed, i + 5) * 360, 420],
                opacity: [1, 1, 0],
                scale: [0.6, 1, 0.9],
              }}
              transition={{ duration: 1.05 * slow, times: [0, 0.4, 1], ease: ["easeOut", "easeIn"] }}
            />
          );
        })}
      </>
    );
  }
  return null;
}
