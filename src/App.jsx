import { Component, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DialRoot, DialStore, useDialKitController } from "dialkit";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Toggle } from "./Toggle.jsx";
import { CONFIG, PANEL_ID, PRESETS, PALETTES, SHAPES, TRANSITION_PATHS, COLOR_KEYS, SHAPE_KEYS, transitionMode, fingerprint, paletteValues, overlay, pick, fitLabel } from "./presets.js";
import { settleMs } from "./transitions.js";
import { PresetsPanel, Listbox } from "./Presets.jsx";
import { SCENES, SceneCtx, SceneIcon } from "./scenes.jsx";
import { CodeDrawer } from "./CodeDrawer.jsx";
import { MOD } from "./keys.js";
import { a11yChecks, summarize, SURFACES } from "./a11y.js";
import { ChecksTable, summaryText } from "./A11yChecks.jsx";
import { sanitize, STAGES, encodeShare, decodeShare, shareUrl, readShareHash } from "./share.js";

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

const HISTORY_LIMIT = 100;
const RECENT_LIMIT = 8;
const COMMIT_MS = 400; // a slider drag becomes one undo step once it settles

const VALUES_KEY = "toggle-lab:values";
function readSavedValues() {
  try {
    const raw = localStorage.getItem(VALUES_KEY);
    return raw ? sanitize(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}
function saveValues(values) {
  try { localStorage.setItem(VALUES_KEY, JSON.stringify(values)); } catch { /* storage unavailable */ }
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
  const [locks, setLocks] = useStored("locks", { style: false, color: false, shape: false });
  const [recentRaw, setRecent] = useStored("recent", []);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(0);
  const prevScene = useRef("canvas");

  const showToast = useCallback((msg) => {
    clearTimeout(toastTimer.current);
    setToast({ msg, id: Date.now() });
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);

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

  // Stored history is untrusted (it outlives schema changes), so it's sanitized like a shared link.
  const recent = useMemo(() => (Array.isArray(recentRaw) ? recentRaw : [])
    .filter((e) => e && typeof e === "object" && e.values)
    .slice(0, RECENT_LIMIT)
    .map((e) => {
      const values = sanitize(e.values);
      return { values, fp: fingerprint(values), stage: STAGES.includes(e.stage) ? e.stage : "paper", label: String(e.label ?? "").slice(0, 80) };
    }), [recentRaw]);

  const replay = () => {
    setChecked(false);
    setTimeout(() => setChecked(true), 260);
  };

  const applyValues = (values, stageHint, { animate = true } = {}) => {
    dial.setValues(values);
    for (const path of TRANSITION_PATHS) {
      const [g, k] = path.split(".");
      DialStore.updateTransitionMode(PANEL_ID, path, transitionMode(values[g][k]));
    }
    if (stageHint) setBg(stageHint);
    if (animate) replay();
  };

  // ---- Undo / redo ----
  // Every settled change to the values is a step: presets, Randomize, shared links and
  // DialKit edits alike. Changes made by undo/redo themselves are skipped.
  const hist = useRef({ past: [], future: [], current: null, skip: null, timer: 0 });
  const latest = useRef(null);
  latest.current = { values: v, fp, stage: bg };
  const [, setHistVersion] = useState(0);
  const commit = useCallback(() => {
    const h = hist.current;
    clearTimeout(h.timer);
    h.timer = 0;
    const next = latest.current;
    if (!h.current || next.fp === h.current.fp) return;
    h.past.push(h.current);
    if (h.past.length > HISTORY_LIMIT) h.past.shift();
    h.future = [];
    h.current = next;
    setHistVersion((n) => n + 1);
  }, []);
  useEffect(() => {
    const h = hist.current;
    if (!h.current) {
      h.current = latest.current;
      // DialKit restores saved values approximately: it rounds to slider steps and drops an
      // easing thumb curve (its config default is a spring). Put back our exact copy.
      const saved = readSavedValues();
      if (saved && fingerprint(saved) !== fp) {
        h.current = { values: saved, fp: fingerprint(saved), stage: bg };
        h.skip = h.current.fp;
        applyValues(saved, null, { animate: false });
      }
      return;
    }
    if (h.skip === fp) { h.skip = null; h.current = latest.current; return; }
    clearTimeout(h.timer);
    h.timer = setTimeout(commit, COMMIT_MS);
  }, [fp, commit]);
  useEffect(() => () => clearTimeout(hist.current.timer), []);

  // Exact copy of the values, saved shortly after each change and when the page is hidden.
  useEffect(() => {
    const t = setTimeout(() => saveValues(latest.current.values), 300);
    return () => clearTimeout(t);
  }, [fp]);
  useEffect(() => {
    const flush = () => saveValues(latest.current.values);
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, []);

  const step = (from, to, label) => {
    const h = hist.current;
    if (h.timer) commit(); // an edit still settling counts as the latest step
    if (!h[from].length) { showToast(`Nothing to ${label.toLowerCase()}`); return; }
    const target = h[from].pop();
    h[to].push(h.current);
    h.current = target;
    h.skip = target.fp;
    applyValues(target.values, target.stage, { animate: false });
    setHistVersion((n) => n + 1);
    showToast(label);
  };
  const undo = () => step("past", "future", "Undo");
  const redo = () => step("future", "past", "Redo");

  const applyStyle = (p) => applyValues(p.values, p.stage);

  const allLocked = locks.style && locks.color && locks.shape;
  const randomize = () => {
    if (allLocked) { showToast("Everything is locked. Unlock something to randomize."); return; }
    const last = lastRandom.current;
    const others = (arr, not) => shuffle(arr.length > 1 ? arr.filter((x) => x !== not) : arr);
    // A locked part keeps what's on screen now; null below means "keep current".
    const styles = locks.style ? [null] : others(PRESETS, last.style);
    const pal = locks.color ? null : pickRandom(PALETTES, last.pal);
    const shapes = locks.shape ? [null] : others(SHAPES, last.shape);
    const colors = pal ? paletteValues(pal) : pick(v, COLOR_KEYS);
    const geometry = pick(v, SHAPE_KEYS);

    // Only use a combination the inside label (if any) still fits in.
    let pickd = null;
    for (const style of styles) {
      const colored = overlay(style ? style.values : v, colors);
      for (const shape of shapes) {
        const mixed = fitLabel(overlay(colored, shape ? shape.values : geometry));
        if (mixed) { pickd = { style, shape, mixed }; break; }
      }
      if (pickd) break;
    }
    if (!pickd) {
      // Nothing fits: keep the style's own geometry (designed around its label) unless shape is locked.
      const style = styles[0];
      const colored = overlay(style ? style.values : v, colors);
      const mixed = locks.shape ? overlay(colored, geometry) : colored;
      pickd = { style, shape: null, mixed: fitLabel(mixed) ?? mixed };
    }
    const { style, shape, mixed } = pickd;
    lastRandom.current = { style: style ?? last.style, pal: pal ?? last.pal, shape: shape ?? last.shape };
    const stage = pal && ["midnight", "cyber"].includes(pal.id) ? "ink" : style ? style.stage : null;
    const label = [style?.name, pal?.name, shape?.name].filter(Boolean).join(" · ");
    setRecent((list) => [{ values: mixed, stage: stage ?? bg, label }, ...(Array.isArray(list) ? list : [])].slice(0, RECENT_LIMIT));
    applyValues(mixed, stage);
  };

  // ---- Share links ----
  const share = () => {
    const url = encodeShare(v, bg).then(shareUrl);
    const done = () => showToast("Link copied");
    const fail = () => url.then((u) => {
      showToast("Couldn't copy the link automatically");
      window.prompt("Copy this link", u);
    });
    // ClipboardItem with a promise keeps Safari's user-gesture check happy while the link is encoded.
    if (typeof ClipboardItem === "function" && navigator.clipboard?.write) {
      const blob = url.then((u) => new Blob([u], { type: "text/plain" }));
      navigator.clipboard.write([new ClipboardItem({ "text/plain": blob })]).then(done, () =>
        url.then((u) => navigator.clipboard.writeText(u)).then(done, fail));
    } else {
      url.then((u) => navigator.clipboard.writeText(u)).then(done, fail);
    }
  };

  // ---- Shape picks keep the inside label legible ----
  // Shrink the label to fit a narrow shape, and grow it back to the size you chose on a wider one.
  const labelPref = useRef(v.Label.size);
  const autoLabel = useRef(null);
  useEffect(() => {
    if (v.Label.size !== autoLabel.current) labelPref.current = v.Label.size;
  }, [v.Label.size]);
  const applyShape = (vals) => {
    const next = overlay(v, vals);
    if (!next.Label.show) { dial.setValues(vals); return; }
    const want = Math.max(labelPref.current, next.Label.size);
    const fitted = fitLabel(overlay(next, { Label: { size: want } }));
    if (fitted) {
      autoLabel.current = fitted.Label.size;
      dial.setValues({ ...vals, Label: { size: fitted.Label.size } });
      if (fitted.Label.size < want) showToast(`Label shrunk to ${fitted.Label.size} px to fit this shape`);
    } else {
      dial.setValues(vals);
      showToast("The label doesn't fit this shape. Try a wider one or shorter text.");
    }
  };

  const toggleDocs = () => {
    if (scene === "docs") setScene(prevScene.current === "docs" ? "canvas" : prevScene.current);
    else { prevScene.current = scene; setScene("docs"); }
  };

  // Latest handlers for listeners registered once.
  const actions = useRef({});
  actions.current = { applyValues, showToast, undo, redo, randomize, toggleDocs, codeOpen };

  // Open a shared link: on load, and when a link is pasted into this tab's address bar.
  useEffect(() => {
    const load = async () => {
      const code = readShareHash();
      if (!code) return;
      history.replaceState(null, "", location.pathname + location.search); // reloads shouldn't re-apply it
      const data = await decodeShare(code);
      if (!data) { actions.current.showToast("That share link is broken or incomplete."); return; }
      actions.current.applyValues(data.values, data.stage);
      actions.current.showToast(`Opened a shared switch. ${MOD}Z brings yours back.`);
    };
    load();
    window.addEventListener("hashchange", load);
    return () => window.removeEventListener("hashchange", load);
  }, []);

  // ---- Keyboard shortcuts: R randomize, E export, D docs, ⌘Z / ⇧⌘Z undo and redo ----
  useEffect(() => {
    const onKey = (e) => {
      if (e.defaultPrevented || e.isComposing || (e.repeat && e.key.toLowerCase() !== "z")) return;
      const a = actions.current;
      if (a.codeOpen) return;
      if (e.target.closest?.('input, textarea, select, [contenteditable="true"], [role="listbox"], [role="dialog"]')) return;
      const k = e.key.toLowerCase();
      const mod = e.metaKey || e.ctrlKey;
      if (mod && !e.altKey && (k === "z" || k === "y")) {
        e.preventDefault();
        if (k === "y" || e.shiftKey) a.redo(); else a.undo();
        return;
      }
      if (mod || e.altKey) return;
      if (k === "r") { e.preventDefault(); a.randomize(); }
      else if (k === "e") { e.preventDefault(); setCodeOpen(true); }
      else if (k === "d") { e.preventDefault(); a.toggleDocs(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

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
          <a className="link" href="https://github.com/strykowski/toggle-lab#readme" target="_blank" rel="noreferrer" aria-label="GitHub: docs and source">
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.06-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            <span className="link-text">GitHub</span>
            <svg className="link-ext" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
              <path d="M4.5 2.5h5v5M9.5 2.5L3 9" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
          <button type="button" className="btn btn-secondary" onClick={() => applyStyle(PRESETS[0])}>
            Reset
          </button>
          <button type="button" className="btn btn-secondary btn-icon btn-share" onClick={share} aria-label="Copy a share link">
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M6.8 9.2a3 3 0 0 0 4.3.2l2-2a3 3 0 0 0-4.3-4.3l-.9.9M9.2 6.8a3 3 0 0 0-4.3-.2l-2 2a3 3 0 0 0 4.3 4.3l.9-.9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="btn-share-text">Share</span>
          </button>
          <button
            ref={codeBtn}
            type="button"
            className="btn btn-primary btn-icon"
            aria-haspopup="dialog"
            aria-expanded={codeOpen}
            aria-keyshortcuts="E"
            title="Export (E)"
            onClick={() => setCodeOpen(true)}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M5.5 4.5L2 8l3.5 3.5M10.5 4.5L14 8l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Export
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
            <div className="stage-footer-left">
              {isCanvas && <A11yBadge v={v} stage={bg} onDocs={toggleDocs} />}
              {graph && <Trace trace={trace} slow={slow} settle={settle} />}
            </div>
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
          onShape={applyShape}
          onRandom={randomize}
          locks={locks}
          onLock={(key) => setLocks((l) => ({ ...l, [key]: !l[key] }))}
          allLocked={allLocked}
          canUndo={hist.current.past.length > 0 || !!hist.current.timer}
          canRedo={hist.current.future.length > 0}
          onUndo={undo}
          onRedo={redo}
          recent={recent}
          currentFp={fp}
          onRecent={(e) => applyValues(e.values, e.stage)}
        />
        <DialRoot mode="inline" theme="light" productionEnabled />
      </aside>

      <CodeDrawer open={codeOpen} onClose={closeCode} v={v} name={activeStyle?.name} />

      <div className="toast-region" role="status" aria-live="polite">
        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.id}
              className="toast"
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, transition: { duration: 0.15 } }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            >
              {toast.msg}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// WCAG checks for the switch on the current canvas background.
function A11yBadge({ v, stage, onDocs }) {
  const checks = useMemo(() => a11yChecks(v, [stage]), [v, stage]);
  const sum = summarize(checks);
  const status = sum.fail ? "fail" : sum.warn ? "warn" : "pass";
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);
  return (
    <div className="a11y-badge-wrap" ref={ref}>
      {open && (
        <div className="a11y-pop" role="dialog" aria-label="Accessibility checks">
          <p className="a11y-pop-head">WCAG 2.2 AA on {SURFACES[stage].label}</p>
          <ChecksTable checks={checks} />
          <button type="button" className="a11y-pop-link" onClick={() => { setOpen(false); onDocs(); }}>
            Full report in Documentation (D)
          </button>
        </div>
      )}
      <button type="button" className={`a11y-badge is-${status}`} aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen((o) => !o)}>
        <span className="a11y-dot" aria-hidden="true" />
        A11y · {summaryText(sum)}
      </button>
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
