import { useEffect, useId, useMemo, useRef, useState } from "react";
import { PRESETS, PALETTES, SHAPES, COLOR_KEYS, SHAPE_KEYS, paletteValues, pick, overlay, fingerprint } from "./presets.js";
import { switchSvg, svgDataUrl } from "./svgExport.js";

// Static thumbnail rendered from the same SVG the exporter produces.
export function MiniSwitch({ v, checked = true, box }) {
  const { svg, width, height, margin } = useMemo(() => switchSvg(v, checked), [v, checked]);
  // Fit the switch body, not the shadow/glow bleed, so glowing styles don't shrink.
  const k = Math.min(1, box[0] / (width - margin * 2 + 6), box[1] / (height - margin * 2 + 6));
  return (
    <img className="mini" src={svgDataUrl(svg)} alt="" draggable="false"
      style={{ width: width * k, height: height * k, margin: -margin * k + 0 }} />
  );
}

// ---------- Generic listbox ----------
export function Listbox({ label, options, value, onChange, renderValue, renderOption, className = "", compact = false }) {
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const wrap = useRef(null);
  const list = useRef(null);
  const trigger = useRef(null);
  const id = useId();
  const idx = options.findIndex((o) => o.value === value);
  const current = options[idx];

  useEffect(() => {
    if (!open) return;
    setHi(Math.max(0, idx));
    list.current?.focus({ preventScroll: true });
    const onDown = (e) => { if (!wrap.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (open) list.current?.querySelector(`[data-i="${hi}"]`)?.scrollIntoView({ block: "nearest" });
  }, [hi, open]);

  const choose = (o) => {
    onChange(o);
    setOpen(false);
    trigger.current?.focus();
  };
  const onKey = (e) => {
    const n = options.length;
    if (e.key === "ArrowDown") { e.preventDefault(); setHi((i) => Math.min(n - 1, i + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHi((i) => Math.max(0, i - 1)); }
    else if (e.key === "Home") { e.preventDefault(); setHi(0); }
    else if (e.key === "End") { e.preventDefault(); setHi(n - 1); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choose(options[hi]); }
    else if (e.key === "Escape") { e.preventDefault(); setOpen(false); trigger.current?.focus(); }
    else if (e.key === "Tab") setOpen(false);
  };

  let lastGroup = null;
  return (
    <div className={`select${compact ? " select-compact" : ""} ${className}`} ref={wrap}>
      <button
        ref={trigger}
        type="button"
        className="select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-label={`${label}: ${current ? current.label : "Custom"}`}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => { if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); setOpen(true); } }}
      >
        {renderValue(current)}
        <svg className="select-chevron" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <ul
          ref={list}
          id={`${id}-list`}
          role="listbox"
          tabIndex={-1}
          aria-label={label}
          aria-activedescendant={`${id}-opt-${hi}`}
          className="select-list"
          onKeyDown={onKey}
        >
          {options.map((o, i) => {
            const header = o.group && o.group !== lastGroup ? o.group : null;
            lastGroup = o.group;
            return [
              header && (
                <li key={`g-${header}`} role="presentation" className="select-group">{header}</li>
              ),
              <li
                key={o.value}
                id={`${id}-opt-${i}`}
                data-i={i}
                role="option"
                aria-selected={o.value === value}
                className={`select-option${i === hi ? " is-hi" : ""}`}
                onPointerEnter={() => setHi(i)}
                onClick={() => choose(o)}
              >
                {renderOption(o)}
                {o.value === value && (
                  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="select-check">
                    <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </li>,
            ];
          })}
        </ul>
      )}
    </div>
  );
}

const PreviewBox = ({ stage, children, small }) => (
  <span className={`select-preview${small ? " is-small" : ""}${stage ? ` stage-${stage}` : " is-plain"}`}>{children}</span>
);

// Color presets: the palette itself, so it doesn't repeat the style thumbnail.
function ColorChips({ v, small }) {
  const colors = [v.Track.onColor, v.Track.offColor, v.Thumb.onColor];
  const d = small ? 14 : 18;
  return (
    <span className="chips" aria-hidden="true">
      {colors.map((c, i) => (
        <span key={i} className="chips-dot" style={{ width: d, height: d, background: c }} />
      ))}
    </span>
  );
}

// Shape presets: a line drawing of the geometry, drawn to a shared scale so sizes compare.
function ShapeOutline({ v, small }) {
  const { width: W, height: H, padding: pad, roundness } = v.Track;
  const { size: S, roundness: thumbRound } = v.Thumb;
  const [bw, bh] = small ? [36, 22] : [58, 32];
  const overhang = Math.max(0, -pad); // rail-style thumbs stick out past the track end
  const k = Math.min(small ? 0.42 : 0.66, bw / (W + overhang), bh / Math.max(H, S));
  const sw = 1.25;
  const w = W * k, h = H * k, s = S * k;
  const boxH = Math.max(h, s) + sw * 2;
  const ty = (boxH - h) / 2;
  const tx = sw;
  const cx = tx + (W - pad - S / 2) * k;
  const cy = boxH / 2;
  return (
    <svg className="shape-outline" width={w + overhang * k + sw * 2} height={boxH} aria-hidden="true">
      <rect x={tx} y={ty} width={w} height={h} rx={(roundness * Math.min(w, h)) / 2}
        fill="none" stroke="currentColor" strokeWidth={sw} />
      <rect x={cx - s / 2} y={cy - s / 2} width={s} height={s} rx={(thumbRound * s) / 2} fill="currentColor" />
    </svg>
  );
}

function PresetDropdown({ label, options, activeId, onSelect, renderPreview }) {
  return (
    <Listbox
      label={label}
      options={options}
      value={activeId}
      onChange={onSelect}
      renderValue={(o) => (
        <>
          {renderPreview(o, true)}
          <span className="select-label">{o ? o.label : "Custom"}</span>
        </>
      )}
      renderOption={(o) => (
        <>
          {renderPreview(o, false)}
          <span className="select-option-name">{o.label}</span>
        </>
      )}
    />
  );
}

// ---------- Sidebar presets block ----------
export function PresetsPanel({ v, onStyle, onPartial, onRandom }) {
  const fpAll = fingerprint(v);
  const fpColor = fingerprint(pick(v, COLOR_KEYS));
  const fpShape = fingerprint(pick(v, SHAPE_KEYS));

  const styleOpts = PRESETS.map((p) => ({ value: p.id, label: p.name, group: p.group, preview: p.values, preset: p }));
  const styleActive = PRESETS.find((p) => fingerprint(p.values) === fpAll)?.id ?? null;

  const colorOpts = PALETTES.map((p) => {
    const vals = paletteValues(p);
    return { value: p.id, label: p.name, preview: overlay(v, vals), vals };
  });
  const colorActive = colorOpts.find((o) => fingerprint(pick(o.preview, COLOR_KEYS)) === fpColor)?.value ?? null;

  const shapeOpts = SHAPES.map((s) => ({ value: s.id, label: s.name, preview: overlay(v, s.values), vals: s.values }));
  const shapeActive = shapeOpts.find((o) => fingerprint(pick(o.preview, SHAPE_KEYS)) === fpShape)?.value ?? null;

  return (
    <section className="presets-panel" aria-labelledby="presets-title">
      <div className="presets-head">
        <h2 id="presets-title" className="panel-title">Presets</h2>
        <button type="button" className="btn btn-secondary btn-small btn-icon" onClick={onRandom}>
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <rect x="2" y="2" width="12" height="12" rx="3" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <circle cx="5.5" cy="5.5" r="1.1" fill="currentColor" /><circle cx="10.5" cy="10.5" r="1.1" fill="currentColor" />
            <circle cx="10.5" cy="5.5" r="1.1" fill="currentColor" /><circle cx="5.5" cy="10.5" r="1.1" fill="currentColor" />
            <circle cx="8" cy="8" r="1.1" fill="currentColor" />
          </svg>
          Randomize
        </button>
      </div>
      <div className="preset-row">
        <span className="preset-row-label">Style</span>
        <PresetDropdown
          label="Style"
          options={styleOpts}
          activeId={styleActive}
          onSelect={(o) => onStyle(o.preset)}
          renderPreview={(o, small) => (
            <PreviewBox small={small} stage={o ? o.preset.stage : "paper"}>
              {o ? <MiniSwitch v={o.preview} box={small ? [38, 24] : [60, 32]} /> : <span className="select-custom-dot" />}
            </PreviewBox>
          )}
        />
      </div>
      <div className="preset-row">
        <span className="preset-row-label">Color</span>
        <PresetDropdown
          label="Color"
          options={colorOpts}
          activeId={colorActive}
          onSelect={(o) => onPartial(o.vals)}
          renderPreview={(o, small) => (
            <PreviewBox small={small}><ColorChips v={o ? o.preview : v} small={small} /></PreviewBox>
          )}
        />
      </div>
      <div className="preset-row">
        <span className="preset-row-label">Shape</span>
        <PresetDropdown
          label="Shape"
          options={shapeOpts}
          activeId={shapeActive}
          onSelect={(o) => onPartial(o.vals)}
          renderPreview={(o, small) => (
            <PreviewBox small={small}><ShapeOutline v={o ? o.preview : v} small={small} /></PreviewBox>
          )}
        />
      </div>
    </section>
  );
}
