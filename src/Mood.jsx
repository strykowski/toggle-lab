import { MOODS } from "./mood.js";

const SNAP = 0.06; // a small dead zone so the center is easy to hit

export function MoodPanel({ moods, onChange, onRelease, onCenter }) {
  const active = MOODS.some((m) => moods[m.id]);
  return (
    <section className="mood-panel" aria-labelledby="mood-title">
      <div className="presets-head">
        <h2 id="mood-title" className="panel-title">Mood</h2>
        {active && (
          <button type="button" className="text-btn" onClick={onCenter}>Center</button>
        )}
      </div>
      {MOODS.map((m) => {
        const x = moods[m.id];
        const pos = 50 + x * 50; // percent along the track
        return (
          <div className="mood-row" key={m.id}>
            <span className={`mood-end${x < 0 ? " is-on" : ""}`}>{m.left}</span>
            <input
              type="range"
              className="mood-range"
              min={-100}
              max={100}
              step={1}
              value={Math.round(x * 100)}
              aria-label={`${m.left} to ${m.right}`}
              aria-valuetext={x === 0 ? "Centered" : `${Math.round(Math.abs(x) * 100)}% ${x < 0 ? m.left : m.right}`}
              style={{ "--from": `${Math.min(50, pos)}%`, "--to": `${Math.max(50, pos)}%` }}
              onChange={(e) => {
                const v = Number(e.target.value) / 100;
                onChange(m.id, Math.abs(v) < SNAP ? 0 : v);
              }}
              onPointerUp={onRelease}
              onKeyUp={(e) => e.key.startsWith("Arrow") && onRelease()}
              onDoubleClick={() => { onChange(m.id, 0); onRelease(); }}
            />
            <span className={`mood-end${x > 0 ? " is-on" : ""}`}>{m.right}</span>
          </div>
        );
      })}
    </section>
  );
}
