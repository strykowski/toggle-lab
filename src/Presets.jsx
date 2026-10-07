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
  <span className={`select-preview${small ? " is-small" : ""} stage-${stage}`}>{children}</span>
);

function PresetDropdown({ label, options, activeId, onSelect, stageFor }) {
  return (
    <Listbox
      label={label}
      options={options}
      value={activeId}
      onChange={onSelect}
      renderValue={(o) => (
        <>
          <PreviewBox small stage={o ? stageFor(o) : "paper"}>
            {o ? <MiniSwitch v={o.preview} box={[38, 24]} /> : <span className="select-custom-dot" />}
          </PreviewBox>
          <span className="select-label">{o ? o.label : "Custom"}</span>
        </>
      )}
      renderOption={(o) => (
        <>
          <PreviewBox stage={stageFor(o)}>
            <MiniSwitch v={o.preview} box={[60, 32]} />
          </PreviewBox>
          <span className="select-option-name">{o.label}</span>
        </>
      )}
    />
  );
}

// ---------- Sidebar presets block ----------
export function PresetsPanel({ v, stage, onStyle, onPartial, onRandom }) {
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
        <PresetDropdown label="Style" options={styleOpts} activeId={styleActive} onSelect={(o) => onStyle(o.preset)} stageFor={(o) => o.preset.stage} />
      </div>
      <div className="preset-row">
        <span className="preset-row-label">Color</span>
        <PresetDropdown label="Color" options={colorOpts} activeId={colorActive} onSelect={(o) => onPartial(o.vals)} stageFor={() => stage} />
      </div>
      <div className="preset-row">
        <span className="preset-row-label">Shape</span>
        <PresetDropdown label="Shape" options={shapeOpts} activeId={shapeActive} onSelect={(o) => onPartial(o.vals)} stageFor={() => stage} />
      </div>
    </section>
  );
}
