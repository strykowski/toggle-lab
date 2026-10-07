import { Component, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DialRoot, DialStore, useDialKitController } from "dialkit";
import { useReducedMotion } from "motion/react";
import { Toggle } from "./Toggle.jsx";
import { CONFIG, PANEL_ID, PRESETS, PALETTES, SHAPES, TRANSITION_PATHS, transitionMode, fingerprint, paletteValues, overlay, fitLabel } from "./presets.js";
import { settleMs } from "./transitions.js";
import { PresetsPanel, Listbox } from "./Presets.jsx";
import { SCENES, SceneCtx, SceneIcon } from "./scenes.jsx";
import { CodeDrawer } from "./CodeDrawer.jsx";

// Loaded on first visit to the Documentation view.
const Docs = lazy(() => import("./Docs.jsx").then((m) => ({ default: m.Docs })));
const docsFallback = (
  <div className="docs is-loading">
    <div className="docs-loading" role="status">
      <span className="docs-loader" aria-hidden="true"><span /></span>
      <p className="docs-loading-title">Generating docs…</p>
      <p className="docs-loading-step">Preparing</p>
      <span className="docs-progress" aria-hidden="true"><span style={{ width: 0 }} /></span>
    </div>
  </div>
);

// After a redeploy, an open tab may ask for a Docs chunk that no longer exists.
// Offer a reload instead of letting the whole app go blank.
class DocsBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="docs is-loading">
        <div className="docs-loading" role="alert">
          <p className="docs-loading-title">Couldn’t load the docs</p>
          <p className="docs-loading-step">A new version of Toggle Lab is probably available.</p>
          <button type="button" className="btn btn-primary btn-small" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      </div>
    );
  }
}

const BACKGROUNDS = [
  { id: "paper", label: "Paper" },
  { id: "mist", label: "Mist" },
  { id: "ink", label: "Ink" },
  { id: "aurora", label: "Aurora" },
];
const ZOOMS = [1, 2, 3];
const SPEEDS = [
  { id: 1, label: "1×" },
  { id: 2, label: "½×" },
  { id: 4, label: "¼×" },
];

function useStored(key, initial) {
  const [v, setV] = useState(() => {
    try {
      const raw = localStorage.getItem(`toggle-lab:${key}`);
      return raw == null ? initial : JSON.parse(raw);
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try { localStorage.setItem(`toggle-lab:${key}`, JSON.stringify(v)); } catch { /* storage unavailable */ }
  }, [key, v]);
  return [v, setV];
}

const pickRandom = (arr, not) => {
  const pool = arr.length > 1 ? arr.filter((x) => x !== not) : arr;
  return pool[Math.floor(Math.random() * pool.length)];
};

const shuffle = (arr) => {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

export default function App() {
  const dial = useDialKitController("Toggle", CONFIG, { id: PANEL_ID, persist: true });
  const v = dial.values;

  const [checked, setChecked] = useState(false);
  const [bg, setBg] = useStored("stage", "paper");
  const [scene, setScene] = useStored("scene", "canvas");
  const [zoom, setZoom] = useStored("zoom", 2);
  const [slow, setSlow] = useState(1);
  const [loop, setLoop] = useState(false);
  const [graph, setGraph] = useStored("graph", false);
  const [logoOn, setLogoOn] = useState(true);
  const [docs, setDocs] = useState(null);
  const [codeOpen, setCodeOpen] = useState(false);
  const codeBtn = useRef(null);
  const reduceMotion = useReducedMotion();
  const trace = useRef([]);
  const lastRandom = useRef({});

  useEffect(() => {
    const t = setTimeout(() => setChecked(true), 650);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!loop) return;
    const id = setInterval(() => setChecked((c) => !c), Math.max(900, settleMs(v.Motion.thumb, slow) + 700));
    return () => clearInterval(id);
  }, [loop, slow, v.Motion.thumb]);

  const fp = useMemo(() => fingerprint(v), [v]);
  const activeStyle = useMemo(() => PRESETS.find((p) => fingerprint(p.values) === fp) ?? null, [fp]);

  const replay = () => {
    setChecked(false);
    setTimeout(() => setChecked(true), 260);
  };

  const applyValues = (values, stageHint) => {
    dial.setValues(values);
    for (const path of TRANSITION_PATHS) {
      const [g, k] = path.split(".");
      DialStore.updateTransitionMode(PANEL_ID, path, transitionMode(values[g][k]));
    }
    if (stageHint) setBg(stageHint);
    replay();
  };

  const applyStyle = (p) => applyValues(p.values, p.stage);

  const randomize = () => {
    const style = pickRandom(PRESETS, lastRandom.current.style);
    const pal = pickRandom(PALETTES, lastRandom.current.pal);
    const colored = overlay(style.values, paletteValues(pal));
    // Only use a shape the style's inside label (if any) still fits in; otherwise keep
    // the style's own geometry, which was designed around its label.
    let shape = null;
    let mixed = null;
    const shapes = shuffle(SHAPES.length > 1 ? SHAPES.filter((s) => s !== lastRandom.current.shape) : SHAPES);
    for (const s of shapes) {
      mixed = fitLabel(overlay(colored, s.values));
      if (mixed) { shape = s; break; }
    }
    mixed ??= fitLabel(colored) ?? colored;
    lastRandom.current = { style, pal, shape };
    const darkPal = ["midnight", "cyber"].includes(pal.id);
    applyValues(mixed, darkPal ? "ink" : style.stage);
  };

  const closeCode = useCallback(() => {
    setCodeOpen(false);
    setTimeout(() => codeBtn.current?.focus(), 0);
  }, []);

  const settle = settleMs(v.Motion.thumb, slow);
  const sceneDef = SCENES.find((s) => s.value === scene) ?? SCENES[0];
  const isCanvas = sceneDef.value === "canvas";
  const isDocs = sceneDef.value === "docs";
  const darkSurface = isCanvas ? bg === "ink" : !!sceneDef.dark;
  const SceneComp = sceneDef.Comp;
  const ctx = { v, slow, zoom: isCanvas ? zoom : 1, checked, setChecked, trace };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <button
            type="button"
            className="brand-mark"
            role="switch"
            aria-checked={logoOn}
            aria-label="Toggle Lab logo"
            onClick={() => setLogoOn((o) => !o)}
          >
            <span />
          </button>
          <span className="brand-name">Toggle Lab</span>
        </div>
        <div className="topbar-actions">
          <a className="link" href="https://github.com/joshpuckett/dialkit" target="_blank" rel="noreferrer">
            Built with DialKit
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
              <path d="M4.5 2.5h5v5M9.5 2.5L3 9" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
          <button type="button" className="btn btn-secondary" onClick={() => applyStyle(PRESETS[0])}>
            Reset
          </button>
          <button
            ref={codeBtn}
            type="button"
            className="btn btn-primary btn-icon"
            aria-haspopup="dialog"
            aria-expanded={codeOpen}
            onClick={() => setCodeOpen(true)}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M5.5 4.5L2 8l3.5 3.5M10.5 4.5L14 8l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Get code
          </button>
        </div>
      </header>

      <main className="main">
        <section className={`stage${darkSurface ? " is-dark" : ""}`} aria-label="Preview">
          <div className={`stage-scene${isCanvas ? ` stage-${bg}` : ""}`}>
            <SceneCtx.Provider value={ctx}>
              {isDocs ? (
                <DocsBoundary>
                  <Suspense fallback={docsFallback}>
                    <Docs v={v} docs={docs} onDocs={setDocs} styleName={activeStyle?.name} />
                  </Suspense>
                </DocsBoundary>
              ) : isCanvas ? (
                <div className="stage-canvas">
                  <div className="stage-zoom" style={{ transform: `scale(${zoom})` }}>
                    <Toggle v={v} checked={checked} onToggle={setChecked} slow={slow} zoom={zoom} trace={trace} />
                  </div>
                </div>
              ) : (
                <SceneComp />
              )}
            </SceneCtx.Provider>
          </div>

          <div className="stage-toolbar">
            <div className="toolbar-group">
              <Listbox
                label="Scene"
                compact
                options={SCENES}
                value={scene}
                onChange={(o) => setScene(o.value)}
                renderValue={(o) => (
                  <>
                    <SceneIcon id={o?.value ?? "canvas"} />
                    <span className="select-label">{o?.label ?? "Canvas"}</span>
                  </>
                )}
                renderOption={(o) => (
                  <>
                    <span className="scene-opt-icon"><SceneIcon id={o.value} /></span>
                    <span className="select-option-name">{o.label}</span>
                  </>
                )}
              />
              {isCanvas && (
                <>
                  <Segmented
                    label="Background"
                    value={bg}
                    onChange={setBg}
                    options={BACKGROUNDS.map((s) => ({
                      value: s.id,
                      label: <span className={`swatch swatch-${s.id}`} aria-hidden="true" />,
                      title: s.label,
                    }))}
                  />
                  <Segmented label="Zoom" value={zoom} onChange={setZoom} options={ZOOMS.map((z) => ({ value: z, label: `${z}×` }))} />
                </>
              )}
              {!isDocs && (
                <Segmented
                  label="Speed"
                  value={slow}
                  onChange={setSlow}
                  options={SPEEDS.map((s) => ({ value: s.id, label: s.label, title: s.id === 1 ? "Real time" : `Slow motion ${s.label}` }))}
                />
              )}
            </div>
            {!isDocs && <div className="toolbar-group">
              <button type="button" className="chip" aria-pressed={graph} onClick={() => setGraph((g) => !g)}>
                <span className="chip-dot" aria-hidden="true" />
                Graph
              </button>
              <button type="button" className="chip" aria-pressed={loop} onClick={() => setLoop((l) => !l)}>
                <span className="chip-dot" aria-hidden="true" />
                Loop
              </button>
            </div>}
          </div>

          {!isDocs && <div className="stage-footer">
            {graph && <Trace trace={trace} slow={slow} settle={settle} />}
            <p className="stage-hint">
              {reduceMotion
                ? "Reduced motion is on, so trail, bursts, and squash are paused."
                : "Click, drag, or press Space on the switch."}
            </p>
          </div>}
        </section>
      </main>

      <aside className="panel" aria-label="Controls">
        <PresetsPanel
          v={v}
          onStyle={applyStyle}
          onPartial={(partial) => dial.setValues(partial)}
          onRandom={randomize}
        />
        <DialRoot mode="inline" theme="light" productionEnabled />
      </aside>

      <CodeDrawer open={codeOpen} onClose={closeCode} v={v} name={activeStyle?.name} />
    </div>
  );
}

function Segmented({ label, value, onChange, options }) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          aria-label={o.title}
          title={o.title}
          className="seg-item"
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// Live plot of thumb position over time — shows overshoot and settle.
function Trace({ trace, slow, settle }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf;
    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const cw = canvas.clientWidth, ch = canvas.clientHeight;
      if (canvas.width !== cw * dpr) { canvas.width = cw * dpr; canvas.height = ch * dpr; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cw, ch);
      const now = performance.now();
      const span = 1600 * slow;
      const yOf = (p) => ch - 8 - ((p + 0.25) / 1.5) * (ch - 16);
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = "#e5e5e5";
      ctx.lineWidth = 1;
      for (const p of [0, 1]) {
        ctx.beginPath(); ctx.moveTo(0, yOf(p) + 0.5); ctx.lineTo(cw, yOf(p) + 0.5); ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.beginPath();
      let started = false;
      for (const pt of trace.current) {
        const age = now - pt.t;
        if (age > span) continue;
        const x = cw - (age / span) * cw;
        const y = yOf(pt.p);
        if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "#171717";
      ctx.lineWidth = 1.5;
      ctx.lineJoin = "round";
      ctx.stroke();
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [trace, slow]);

  return (
    <figure className="trace">
      <figcaption>
        <span>Thumb position</span>
        <span className="muted">Settles in {settle} ms</span>
      </figcaption>
      <canvas ref={ref} aria-label="Graph of thumb position over time" role="img" />
    </figure>
  );
}
