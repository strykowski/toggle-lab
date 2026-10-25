import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Toggle } from "../Toggle.jsx";
import { PRESETS } from "../presets.js";
import { mixValues, easeInOut } from "../morph.js";
import { settleMs } from "../transitions.js";
import { motionSummary, liveOnly } from "../docs.js";

// Strongest first; anything not listed plays after these.
const FEATURED = ["sky", "foil", "neon", "jelly", "glass", "mercury", "saber", "borealis", "material", "plasma", "ios", "brutal", "holo", "fui", "daynight", "film", "pixel", "rocker", "chrome", "onebit", "glitch", "glossy", "soft", "label", "overhang", "compact", "default"];
export const PLAYLIST = [
  ...FEATURED.map((id) => PRESETS.find((p) => p.id === id)).filter(Boolean),
  ...PRESETS.filter((p) => !FEATURED.includes(p.id)),
];
const STAGES = ["paper", "mist", "ink", "aurora"];
const MORPH_MS = 900;
const FLIPS = 4; // an even number, so each preset ends where it started

const pad2 = (n) => String(n).padStart(2, "0");

export function Showreel({ onOpen }) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [values, setValues] = useState(PLAYLIST[0].values);
  const [checked, setChecked] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [vw, setVw] = useState(() => window.innerWidth);
  const valuesRef = useRef(values);
  valuesRef.current = values;
  const morph = useRef(0);
  const preset = PLAYLIST[index];

  useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => { window.removeEventListener("resize", onResize); cancelAnimationFrame(morph.current); };
  }, []);

  // Morph from whatever is on screen (even mid-morph) to the next preset.
  const goTo = (i) => {
    const next = (i + PLAYLIST.length) % PLAYLIST.length;
    cancelAnimationFrame(morph.current);
    const from = valuesRef.current, to = PLAYLIST[next].values;
    setIndex(next);
    if (reduce) { setValues(to); return; }
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / MORPH_MS);
      setValues(k >= 1 ? to : mixValues(from, to, easeInOut(k)));
      if (k < 1) morph.current = requestAnimationFrame(step);
    };
    morph.current = requestAnimationFrame(step);
  };
  const goRef = useRef(goTo);
  goRef.current = goTo;

  // Autoplay: a few flips, paced to the preset's own motion, then on to the next.
  useEffect(() => {
    if (!playing) return undefined;
    const gap = Math.max(1000, settleMs(PLAYLIST[index].values.Motion.thumb) + 650);
    const timers = [];
    let t = MORPH_MS + 300;
    for (let n = 0; n < FLIPS; n++, t += gap) timers.push(setTimeout(() => setChecked((c) => !c), t));
    timers.push(setTimeout(() => goRef.current(index + 1), t + 200));
    return () => timers.forEach(clearTimeout);
  }, [index, playing]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || e.target.closest?.("input, textarea, [role=menu]")) return;
      if (e.key === "ArrowRight") { e.preventDefault(); goRef.current(index + 1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); goRef.current(index - 1); }
      else if (e.key === " " && !e.target.closest?.("button")) { e.preventDefault(); setPlaying((p) => !p); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index]);

  const W = values.Track.width;
  const zoom = Math.max(2, Math.min(7, Math.min(vw * 0.42, 420) / W));
  const dark = preset.stage === "ink";
  const E = preset.values.Effects;
  const tags = [motionSummary(preset.values.Motion.thumb), E.finish !== "none" && `${E.finish.replace("-", " ")} finish`, E.glow > 0 && "glow", ...liveOnly(preset.values).filter((x) => !x.includes("shader"))].filter(Boolean);
  const swatches = [preset.values.Track.offColor, preset.values.Track.onColor, preset.values.Thumb.onColor, E.color];

  return (
    <div className={`reel${dark ? " is-dark" : ""}`}>
      {STAGES.map((s) => (
        <div key={s} className={`reel-bg stage-${s}`} style={{ opacity: s === preset.stage ? 1 : 0 }} aria-hidden="true" />
      ))}
      <div className="reel-stage">
        <div className="reel-zoom" style={{ transform: `scale(${zoom})` }}>
          <Toggle v={values} checked={checked} onToggle={setChecked} zoom={zoom} label={preset.name} />
        </div>
      </div>
      <div className="reel-caption" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={preset.id}
            initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -6, filter: "blur(4px)", transition: { duration: 0.18 } }}
            transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
          >
            <p className="reel-group">{preset.group}</p>
            <h2 className="reel-name">{preset.name}</h2>
            <p className="reel-tags">{tags.join(" · ")}</p>
            <div className="reel-swatches" aria-hidden="true">
              {swatches.map((c, i) => <span key={i} style={{ background: c }} />)}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="reel-bar">
        <div className="reel-controls">
          <button type="button" className="reel-btn" aria-label="Previous (←)" title="Previous (←)" onClick={() => goTo(index - 1)}>
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3.5L5.5 8l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button type="button" className="reel-btn" aria-label={playing ? "Pause (Space)" : "Play (Space)"} title={playing ? "Pause (Space)" : "Play (Space)"} onClick={() => setPlaying((p) => !p)}>
            {playing
              ? <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M5.5 3.5v9M10.5 3.5v9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
              : <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.2v9.6L12.5 8z" fill="currentColor" /></svg>}
          </button>
          <button type="button" className="reel-btn" aria-label="Next (→)" title="Next (→)" onClick={() => goTo(index + 1)}>
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3.5L10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <span className="reel-count">{pad2(index + 1)} / {pad2(PLAYLIST.length)}</span>
        </div>
        <div className="reel-dots" aria-hidden="true">
          {PLAYLIST.map((p, i) => <span key={p.id} className={i === index ? "is-on" : ""} />)}
        </div>
        <button type="button" className="btn btn-primary btn-small reel-open" onClick={() => onOpen(preset.values, preset.stage)}>
          Open in Lab
        </button>
      </div>
    </div>
  );
}
