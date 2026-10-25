import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { Toggle } from "../Toggle.jsx";
import { PLAYLIST } from "./Showreel.jsx";

// Waves of flips across the grid. Each maps a tile's center (and the origin) to a delay in ms.
const WAVES = [
  { id: "sweep", delay: (t) => t.x * 1.1 },
  { id: "diagonal", delay: (t) => (t.x + t.y) * 0.8 },
  { id: "ripple", delay: (t, o) => Math.hypot(t.x - o.x, t.y - o.y) * 1.2 },
  { id: "sparkle", delay: () => Math.random() * 900 },
];
const EVERY_MS = 3600;

export function Gallery({ onOpen }) {
  const reduce = useReducedMotion();
  const [on, setOn] = useState(() => PLAYLIST.map(() => false));
  const grid = useRef(null);
  const tiles = useRef([]);
  const timers = useRef([]);
  const phase = useRef({ n: 0, target: true });

  // Run a wave: every tile flips to the same state, delayed by its position.
  const wave = (kind, origin) => {
    const box = grid.current?.getBoundingClientRect();
    if (!box) return;
    const target = phase.current.target;
    phase.current.target = !target;
    timers.current.forEach(clearTimeout); // a new wave takes over from one still in flight
    timers.current = [];
    const o = origin ?? { x: box.width / 2, y: box.height / 2 };
    tiles.current.forEach((el, i) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      const t = { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2 };
      const d = reduce ? 0 : kind.delay(t, o);
      timers.current.push(setTimeout(() => setOn((s) => (s[i] === target ? s : s.map((x, j) => (j === i ? target : x)))), d));
    });
  };

  const auto = useRef(0);
  const restart = () => {
    clearInterval(auto.current);
    auto.current = setInterval(() => wave(WAVES[++phase.current.n % WAVES.length]), EVERY_MS);
  };
  useEffect(() => {
    const first = setTimeout(() => wave(WAVES[0]), 500);
    restart();
    return () => { clearTimeout(first); clearInterval(auto.current); timers.current.forEach(clearTimeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Click empty space: a ripple from that point. The next automatic wave waits its full turn.
  const onGridClick = (e) => {
    if (e.target.closest("button")) return;
    const box = grid.current.getBoundingClientRect();
    wave(WAVES[2], { x: e.clientX - box.left, y: e.clientY - box.top });
    restart();
  };

  return (
    <div className="gal" onClick={onGridClick}>
      <div className="gal-grid" ref={grid}>
        {PLAYLIST.map((p, i) => {
          const k = Math.min(2.2, 132 / p.values.Track.width);
          return (
            <div key={p.id} className={`gal-tile stage-${p.stage}${p.stage === "ink" ? " is-dark" : ""}`} ref={(el) => { tiles.current[i] = el; }}>
              <div className="gal-sw">
                <div style={{ transform: `scale(${k})` }}>
                  <Toggle v={p.values} checked={on[i]} zoom={k} label={p.name} onToggle={(c) => setOn((s) => s.map((x, j) => (j === i ? c : x)))} />
                </div>
              </div>
              <div className="gal-meta">
                <span>{p.name}</span>
                <button type="button" className="gal-open" onClick={() => onOpen(p.values, p.stage)}>Open in Lab</button>
              </div>
            </div>
          );
        })}
      </div>
      <p className="gal-hint">Click any switch to play with it, or empty space to send a ripple.</p>
    </div>
  );
}
