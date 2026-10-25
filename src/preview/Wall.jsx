import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { rasterize, isSupported, GLYPH_H } from "./font5x7.js";

const SCENES = [
  { id: "text", label: "Text" },
  { id: "clock", label: "Clock" },
  { id: "wave", label: "Wave" },
  { id: "ripple", label: "Ripple" },
  { id: "life", label: "Life" },
  { id: "rain", label: "Rain" },
];
const AUTO = SCENES.map((s) => s.id);
const SCENE_MS = 7000;
const CELL_RATIO = 1.6; // switch width / height

// Draw text centered; scroll it like an LED sign when it doesn't fit. Doubles in size when there's room.
function drawText(out, cols, rows, text, t) {
  const bm = rasterize(text);
  const s = rows >= GLYPH_H * 2 + 4 && bm.w * 2 <= cols - 2 ? 2 : 1;
  const w = bm.w * s, h = GLYPH_H * s;
  const x0 = w <= cols - 2 ? Math.floor((cols - w) / 2) : cols - (Math.floor(t * 9) % (w + cols));
  const y0 = Math.floor((rows - h) / 2);
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) out[y * cols + x] = bm.at(Math.floor((x - x0) / s), Math.floor((y - y0) / s)) ? 1 : 0;
}

export function Wall({ v, stage }) {
  const reduce = useReducedMotion();
  const box = useRef(null);
  const cells = useRef([]);
  const [dims, setDims] = useState({ cols: 0, rows: 0, pw: 0 });
  const [scene, setScene] = useState("text");
  const [auto, setAuto] = useState(true);
  const [text, setText] = useState("TOGGLE LAB");
  const live = useRef({});
  live.current = { scene, text, reduce };

  // Grid size from the available space.
  useLayoutEffect(() => {
    const el = box.current;
    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      const cols = Math.max(12, Math.min(48, Math.floor(width / 44)));
      const pw = width / cols;
      const rows = Math.max(9, Math.floor(height / (pw / CELL_RATIO)));
      setDims((d) => (d.cols === cols && d.rows === rows && Math.abs(d.pw - pw) < 0.5 ? d : { cols, rows, pw }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = dims.cols * dims.rows;
  const engine = useRef(null);
  useEffect(() => {
    engine.current = {
      shown: new Uint8Array(n), // what the DOM shows
      paint: new Uint8Array(n),
      touch: new Float64Array(n), // cursor ripple: expiry time per cell
      life: null, lifeTick: 0,
      drops: Array.from({ length: dims.cols }, () => ({ y: -Math.random() * dims.rows, v: 0.25 + Math.random() * 0.45 })),
      sceneStart: performance.now(),
    };
  }, [n, dims.cols, dims.rows]);

  // Scene changes restart the clock and sweep the change across, column by column.
  useEffect(() => {
    if (!engine.current) return undefined;
    engine.current.sceneStart = performance.now();
    if (live.current.reduce || !box.current) return undefined;
    box.current.classList.add("is-wiping");
    const t = setTimeout(() => box.current?.classList.remove("is-wiping"), 900);
    return () => clearTimeout(t);
  }, [scene]);

  // Auto-cycle scenes.
  useEffect(() => {
    if (!auto) return undefined;
    const id = setInterval(() => setScene((s) => AUTO[(AUTO.indexOf(s) + 1) % AUTO.length]), SCENE_MS);
    return () => clearInterval(id);
  }, [auto]);

  // The frame loop: compute the scene, flip the cells near the cursor, apply only the changes.
  useEffect(() => {
    if (!n) return undefined;
    const { cols, rows } = dims;
    const next = new Uint8Array(n);
    const tick = () => {
      const E = engine.current;
      if (!E) return;
      const now = performance.now();
      const t = (now - E.sceneStart) / 1000;
      const { scene: sc, text: tx } = live.current;
      if (sc === "text") drawText(next, cols, rows, tx || " ", t);
      else if (sc === "clock") {
        const d = new Date();
        const hh = String(d.getHours()).padStart(2, "0"), mm = String(d.getMinutes()).padStart(2, "0");
        drawText(next, cols, rows, `${hh}${d.getSeconds() % 2 ? ":" : " "}${mm}`, t);
      } else if (sc === "wave") {
        for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
          const h = rows * (0.5 + 0.32 * Math.sin(x * 0.35 + t * 2.2) * Math.cos(t * 0.7 + x * 0.05));
          next[y * cols + x] = y > h ? 1 : 0;
        }
      } else if (sc === "ripple") {
        const cx = (cols - 1) / 2, cy = (rows - 1) / 2;
        for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
          const d = Math.hypot(x - cx, (y - cy) / CELL_RATIO); // cells are wider than tall
          next[y * cols + x] = ((((d - t * 6) / 7) % 1) + 1) % 1 < 0.4 ? 1 : 0;
        }
      } else if (sc === "life") {
        if (!E.life || E.life.length !== n) { E.life = Uint8Array.from({ length: n }, () => (Math.random() < 0.33 ? 1 : 0)); E.lifeTick = 0; }
        if (++E.lifeTick % 2 === 0) {
          const L = E.life, N = new Uint8Array(n);
          let alive = 0, changed = 0;
          for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
            let c = 0;
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
              if (dx || dy) c += L[((y + dy + rows) % rows) * cols + ((x + dx + cols) % cols)];
            }
            const i = y * cols + x;
            N[i] = c === 3 || (c === 2 && L[i]) ? 1 : 0;
            alive += N[i];
            changed += N[i] !== L[i];
          }
          E.life = changed < 3 || alive < n * 0.04 ? Uint8Array.from({ length: n }, () => (Math.random() < 0.33 ? 1 : 0)) : N;
        }
        next.set(E.life);
      } else if (sc === "rain") {
        next.fill(0);
        E.drops.forEach((dr, x) => {
          dr.y += dr.v;
          if (dr.y - 5 > rows) { dr.y = -Math.random() * rows * 0.5; dr.v = 0.25 + Math.random() * 0.45; }
          for (let k = 0; k < 5; k++) { const y = Math.floor(dr.y) - k; if (y >= 0 && y < rows) next[y * cols + x] = 1; }
        });
      } else if (sc === "paint") next.set(E.paint);

      for (let i = 0; i < n; i++) {
        const want = next[i] ^ (E.touch[i] > now ? 1 : 0);
        if (want !== E.shown[i]) { E.shown[i] = want; cells.current[i]?.classList.toggle("on", !!want); }
      }
    };
    const id = setInterval(tick, reduce ? 250 : 90);
    tick();
    return () => clearInterval(id);
  }, [n, dims, reduce]);

  // Cursor: hovering flips the cells around it for a moment; pressing and dragging paints.
  const brush = useRef(null);
  const cellAt = (e) => {
    // The grid is centered in its box, so measure from the grid's own top-left corner.
    const r = box.current.getBoundingClientRect();
    const gw = dims.cols * dims.pw, gh = dims.rows * (dims.pw / CELL_RATIO);
    const x = Math.floor((e.clientX - r.left - (r.width - gw) / 2) / dims.pw);
    const y = Math.floor((e.clientY - r.top - (r.height - gh) / 2) / (dims.pw / CELL_RATIO));
    return x >= 0 && y >= 0 && x < dims.cols && y < dims.rows ? { x, y, i: y * dims.cols + x } : null;
  };
  const onMove = (e) => {
    const E = engine.current, c = cellAt(e);
    if (!E || !c) return;
    if (brush.current != null) { E.paint[c.i] = brush.current; return; }
    if (e.pointerType !== "mouse") return;
    const until = performance.now() + 320;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -2; dx <= 2; dx++) {
      const x = c.x + dx, y = c.y + dy;
      if (x >= 0 && y >= 0 && x < dims.cols && y < dims.rows && Math.hypot(dx, dy * CELL_RATIO * 0.8) <= 2) E.touch[y * dims.cols + x] = until;
    }
  };
  const onDown = (e) => {
    const E = engine.current, c = cellAt(e);
    if (!E || !c || e.button !== 0) return;
    if (live.current.scene !== "paint") { E.paint.set(E.shown); E.touch.fill(0); setScene("paint"); setAuto(false); }
    brush.current = E.paint[c.i] ? 0 : 1;
    E.paint[c.i] = brush.current;
    box.current.setPointerCapture?.(e.pointerId);
  };
  const onUp = () => { brush.current = null; };

  const pick = (id) => { setScene(id); setAuto(false); };
  const onType = (e) => {
    const clean = [...e.target.value].filter(isSupported).join("").slice(0, 24);
    setText(clean);
    setScene("text");
    setAuto(false);
  };

  // The wall is built from the switch currently in the Lab.
  const { Track: T, Thumb: H } = v;
  const cw = dims.pw * 0.78, ch = cw / CELL_RATIO, pad = Math.max(1, ch * 0.12), s = ch - pad * 2;
  const style = useMemo(() => ({
    "--cols": dims.cols, "--pw": `${dims.pw}px`, "--ph": `${dims.pw / CELL_RATIO}px`,
    "--cw": `${cw}px`, "--ch": `${ch}px`, "--pad": `${pad}px`, "--s": `${s}px`, "--travel": `${cw - s - pad * 2}px`,
    "--r": `${T.roundness * ch / 2}px`, "--tr": `${H.roundness * s / 2}px`,
    "--off": T.offColor, "--on": T.onColor, "--thumb-off": H.offColor, "--thumb-on": H.onColor,
  }), [dims.cols, dims.pw, cw, ch, pad, s, T.roundness, H.roundness, T.offColor, T.onColor, H.offColor, H.onColor]);

  return (
    <div className={`wall stage-${stage}${stage === "ink" ? " is-dark" : ""}`}>
      <div
        className="wall-grid"
        ref={box}
        style={style}
        role="img"
        aria-label={`A wall of ${n} switches showing ${scene === "text" ? `the text "${text}"` : scene === "paint" ? "your drawing" : `the ${scene} scene`}`}
        onPointerMove={onMove}
        onPointerDown={onDown}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        {Array.from({ length: n }, (_, i) => (
          <span key={i} className="wall-cell" style={{ "--x": i % dims.cols }} ref={(el) => { cells.current[i] = el; }} />
        ))}
      </div>
      <div className="wall-bar">
        <div className="seg" role="radiogroup" aria-label="Scene">
          <button type="button" role="radio" aria-checked={auto} className="seg-item" onClick={() => setAuto(true)}>Auto</button>
          {SCENES.map((sc) => (
            <button key={sc.id} type="button" role="radio" aria-checked={!auto && scene === sc.id} className="seg-item" onClick={() => pick(sc.id)}>{sc.label}</button>
          ))}
        </div>
        <input
          className="wall-input"
          value={text}
          onChange={onType}
          onFocus={() => { setScene("text"); setAuto(false); }}
          placeholder="Type a word"
          aria-label="Text to show on the wall"
          spellCheck="false"
        />
        <span className="wall-hint">{scene === "paint" ? "Drawing: drag to paint, pick a scene to stop" : "Move to ripple · drag to paint"}</span>
      </div>
    </div>
  );
}
