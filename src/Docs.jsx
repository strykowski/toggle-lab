import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { generateDocs, FRAMES } from "./docs.js";
import { fingerprint } from "./presets.js";

const r = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

const SURFACES = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
];
const STATES = [
  { id: "rest", label: "Default" },
  { id: "focus", label: "Focus" },
  { id: "pressed", label: "Pressed" },
  { id: "disabled", label: "Disabled" },
];

function motionSummary(t) {
  if (!t) return "—";
  if (t.type === "easing") return `${r(t.duration * 1000, 0)} ms · cubic-bezier(${t.ease.map((x) => r(x)).join(", ")})`;
  if (t.visualDuration != null) return `spring · ${r(t.visualDuration * 1000, 0)} ms · bounce ${r(t.bounce ?? 0)}`;
  return `spring · stiffness ${r(t.stiffness ?? 100, 1)} · damping ${r(t.damping ?? 10, 1)}`;
}

// A pre-rendered switch image, positioned so its box is exactly the track.
function Shot({ shot, docs, state, k = docs.k }) {
  const { Track: T, Motion: M } = docs.v;
  return (
    <span
      className={`docs-sw${state ? ` is-${state}` : ""}`}
      style={{
        width: T.width * k,
        height: T.height * k,
        borderRadius: ((T.roundness * Math.min(T.width, T.height)) / 2) * k,
        "--k": k,
        "--press": M.pressScale,
      }}
    >
      <img
        src={shot.url}
        alt=""
        draggable="false"
        style={{ width: shot.width * k, height: shot.height * k, left: -shot.margin * k, top: -shot.margin * k }}
      />
    </span>
  );
}

function Loading({ gen }) {
  const pct = gen ? Math.round((gen.done / Math.max(1, gen.total)) * 100) : 0;
  return (
    <div className="docs-loading" role="status" aria-live="polite">
      <span className="docs-loader" aria-hidden="true"><span /></span>
      <p className="docs-loading-title">Generating docs…</p>
      <p className="docs-loading-step">{gen?.step ?? "Preparing"}</p>
      <span className="docs-progress" aria-hidden="true"><span style={{ width: `${pct}%` }} /></span>
    </div>
  );
}

function States({ docs }) {
  const { shots, v } = docs;
  return (
    <section className="docs-card" aria-labelledby="docs-states">
      <div className="docs-card-head">
        <h3 id="docs-states">States</h3>
        <p>Every state the exported code supports, on light and dark surfaces.</p>
      </div>
      <div className="docs-scroll">
        <table className="docs-table" style={{ "--cell": `${Math.max(96, v.Track.width * docs.k + 48)}px` }}>
          <thead>
            <tr>
              <th colSpan={2} className="docs-corner" />
              {STATES.map((st) => <th key={st.id} scope="col">{st.label}</th>)}
            </tr>
          </thead>
          {SURFACES.map((s) => (
            <tbody key={s.id}>
              {[false, true].map((on) => (
                <tr key={String(on)}>
                  {!on && <th rowSpan={2} scope="rowgroup" className="docs-surface">{s.label}</th>}
                  <th scope="row">
                    <span>{on ? "On" : "Off"}</span>
                    <code>aria-checked="{String(on)}"</code>
                  </th>
                  {STATES.map((st) => (
                    <td key={st.id} className={`docs-cell is-${s.id}`}>
                      <Shot shot={shots[`${on ? "on" : "off"}${st.id === "pressed" ? "Pressed" : "Rest"}`]} docs={docs} state={st.id} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
    </section>
  );
}

function Motion({ docs }) {
  const { frames, curve, settle, v } = docs;
  const M = v.Motion, E = v.Effects;
  const span = settle / (FRAMES - 1);
  const t0 = -span / 2, t1 = settle + span / 2;
  const lo = Math.min(-0.05, ...curve.map((c) => c.p)), hi = Math.max(1.05, ...curve.map((c) => c.p));
  const x = (t) => ((t - t0) / (t1 - t0)) * 1000;
  const y = (p) => 8 + (1 - (p - lo) / (hi - lo)) * 64;
  const path = curve.map((c, i) => `${i ? "L" : "M"}${r(x(c.t), 1)} ${r(y(c.p), 1)}`).join(" ");
  const live = [
    M.squash > 0 && `squash ${r(M.squash)}`,
    M.pop > 0 && `pop ${r(M.pop)}`,
    M.tilt > 0 && `${M.tilt}° tilt`,
    E.trail > 0 && `trail ×${E.trail}`,
    E.burst !== "none" && `${E.burst} burst`,
  ].filter(Boolean);
  // Frames share one row, so wide switches are drawn smaller than in the states table.
  const kf = Math.min(docs.k, 112 / v.Track.width);
  const minW = FRAMES * Math.max(72, v.Track.width * kf + 32);

  return (
    <section className="docs-card" aria-labelledby="docs-motion">
      <div className="docs-card-head">
        <h3 id="docs-motion">Motion</h3>
        <p>Off to on, sampled every {Math.round(span)} ms. Settles in {settle} ms.</p>
      </div>
      <div className="docs-scroll">
        <div className="docs-film" style={{ minWidth: minW }}>
          <svg className="docs-curve" viewBox="0 0 1000 80" preserveAspectRatio="none" role="img" aria-label="Thumb position over time">
            {[0, 1].map((p) => (
              <line key={p} x1="0" x2="1000" y1={y(p)} y2={y(p)} className="docs-curve-guide" vectorEffect="non-scaling-stroke" />
            ))}
            {frames.map((f) => (
              <line key={f.t} x1={x(f.t)} x2={x(f.t)} y1="0" y2="80" className="docs-curve-tick" vectorEffect="non-scaling-stroke" />
            ))}
            <path d={path} className="docs-curve-line" vectorEffect="non-scaling-stroke" />
          </svg>
          <div className="docs-frames" style={{ gridTemplateColumns: `repeat(${FRAMES}, minmax(0, 1fr))` }}>
            {frames.map((f) => (
              <figure key={f.t} className="docs-frame">
                <Shot shot={f.shot} docs={docs} k={kf} />
                <figcaption>{f.t} ms</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </div>
      {live.length > 0 && (
        <p className="docs-note">Live only, not shown in still frames: {live.join(", ")}.</p>
      )}
    </section>
  );
}

function Specs({ docs }) {
  const { Track: T, Thumb: H, Icon: I, Label: L, Motion: M, Effects: E } = docs.v;
  const sOff = Math.max(4, H.size * H.offScale);
  const anatomy = [
    ["Track", `${T.width} × ${T.height} px`],
    ["Corner radius", `${r((T.roundness * Math.min(T.width, T.height)) / 2)} px`],
    ["Padding", `${T.padding} px`],
    ["Thumb", sOff !== H.size ? `${H.size} px · ${r(sOff)} px when off` : `${H.size} px`],
    T.borderWidth > 0 && ["Border", `${T.borderWidth} px${T.borderOffOnly ? " · off only" : ""}`],
    ["Press", `scale ${r(M.pressScale)} · stretch ${r(H.pressStretch)}×`],
    ["Thumb motion", motionSummary(M.thumb)],
    ["Fill motion", motionSummary(M.fill)],
  ].filter(Boolean);
  const tokens = [
    ["Track off", T.offColor],
    ["Track on", T.onColor],
    ["Thumb off", H.offColor],
    ["Thumb on", H.onColor],
    T.borderWidth > 0 && ["Border", T.borderColor],
    I.glyph !== "none" && ["Icon off", I.offColor],
    I.glyph !== "none" && ["Icon on", I.onColor],
    L.show && ["Label off", L.offColor],
    L.show && ["Label on", L.onColor],
    (E.glow > 0 || E.burst !== "none" || E.trail > 0) && ["Accent", E.color],
  ].filter(Boolean);

  return (
    <div className="docs-specs">
      <section className="docs-card" aria-labelledby="docs-anatomy">
        <div className="docs-card-head"><h3 id="docs-anatomy">Anatomy</h3></div>
        <dl className="docs-list">
          {anatomy.map(([k, val]) => (
            <div key={k}><dt>{k}</dt><dd>{val}</dd></div>
          ))}
        </dl>
      </section>
      <section className="docs-card" aria-labelledby="docs-tokens">
        <div className="docs-card-head"><h3 id="docs-tokens">Color</h3></div>
        <dl className="docs-list">
          {tokens.map(([k, c]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd><span className="docs-swatch" style={{ background: c }} aria-hidden="true" />{c}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="docs-card" aria-labelledby="docs-a11y">
        <div className="docs-card-head"><h3 id="docs-a11y">Accessibility</h3></div>
        <ul className="docs-a11y">
          <li>A native <code>button</code> with <code>role="switch"</code>; <code>aria-checked</code> carries the state.</li>
          <li><kbd>Space</kbd> and <kbd>Enter</kbd> toggle it. Give every switch a visible label or an <code>aria-label</code>.</li>
          <li>Focus ring: 2 px, 2 px offset, shown only for keyboard focus.</li>
          <li>Disabled uses the native attribute: 50% opacity, no press feedback.</li>
          <li>With reduced motion, the thumb uses a short ease-out and effects are skipped.</li>
        </ul>
      </section>
    </div>
  );
}

// Docs are a snapshot: generated once, then only regenerated when the user asks.
export function Docs({ v, docs, onDocs, styleName }) {
  const [gen, setGen] = useState(null);
  const run = useRef(0);
  const fp = useMemo(() => fingerprint(v), [v]);
  const latest = useRef({ v, styleName });
  latest.current = { v, styleName };

  const generate = useCallback(async () => {
    const id = ++run.current;
    const { v: values, styleName: name } = latest.current;
    setGen({ step: "Preparing", done: 0, total: 1 });
    const data = await generateDocs(values, (p) => run.current === id && setGen(p), () => run.current !== id);
    if (!data || run.current !== id) return;
    onDocs({ ...data, name });
    setGen(null);
  }, [onDocs]);

  useEffect(() => {
    if (!docs) generate();
    return () => { run.current++; }; // leaving the view cancels a run in progress
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!docs || gen) return <div className="docs is-loading"><Loading gen={gen} /></div>;

  const stale = docs.fp !== fp;
  const time = new Date(docs.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return (
    <div className="docs">
      <div className="docs-page">
        <header className="docs-head">
          <div>
            <h2>Switch</h2>
            <code>role="switch"</code>
          </div>
          <p className="docs-meta">
            {docs.name ?? "Custom"} · Generated at {time}
          </p>
        </header>
        {stale && (
          <div className="docs-stale" role="status">
            <span className="docs-stale-dot" aria-hidden="true" />
            <span>Your switch changed since these docs were generated.</span>
            <button type="button" className="btn btn-primary btn-small" onClick={generate}>Regenerate docs</button>
          </div>
        )}
        <div className={`docs-body${stale ? " is-stale" : ""}`}>
          <States docs={docs} />
          <Motion docs={docs} />
          <Specs docs={docs} />
        </div>
      </div>
    </div>
  );
}
