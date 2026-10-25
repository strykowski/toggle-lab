import { useEffect, useRef, useState } from "react";

const MODES = [
  { id: "lab", name: "Toggle Lab", desc: "Design, tune and export a switch" },
  { id: "preview", name: "Toggle Preview", desc: "A showreel of what's possible" },
];

const ModeIcon = ({ id }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {id === "lab"
      ? <><path d="M6 2h4M6.5 2v4L3 13a1 1 0 0 0 .9 1.5h8.2A1 1 0 0 0 13 13L9.5 6V2" /><path d="M4.6 10h6.8" /></>
      : <><rect x="1.5" y="3" width="13" height="10" rx="2" /><path d="M6.5 6v4l3.5-2z" fill="currentColor" /></>}
  </svg>
);

// The logo: a clickable mini switch, plus a menu on the wordmark to swap Lab and Preview.
export function Brand({ mode, onMode, logoOn, onLogo }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);
  const trigger = useRef(null);
  const items = useRef([]);
  const current = MODES.find((m) => m.id === mode) ?? MODES[0];

  useEffect(() => {
    if (!open) return;
    items.current[MODES.findIndex((m) => m.id === mode)]?.focus();
    const onDown = (e) => { if (!wrap.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open, mode]);

  const close = () => { setOpen(false); trigger.current?.focus(); };
  const onMenuKey = (e) => {
    const i = items.current.indexOf(document.activeElement);
    if (e.key === "ArrowDown") { e.preventDefault(); items.current[(i + 1) % MODES.length]?.focus(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); items.current[(i - 1 + MODES.length) % MODES.length]?.focus(); }
    else if (e.key === "Escape") { e.preventDefault(); close(); }
    else if (e.key === "Tab") setOpen(false);
  };

  return (
    <div className="brand" ref={wrap}>
      <button type="button" className="brand-mark" role="switch" aria-checked={logoOn} aria-label="Toggle Lab logo" onClick={onLogo}>
        <span />
      </button>
      <button
        ref={trigger}
        type="button"
        className="brand-switcher"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => { if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); } }}
      >
        <span className="brand-name">{current.name}</span>
        <svg className="brand-chevron" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M3 4.5L6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="brand-menu" role="menu" aria-label="Switch app" onKeyDown={onMenuKey}>
          {MODES.map((m, i) => (
            <button
              key={m.id}
              ref={(el) => { items.current[i] = el; }}
              type="button"
              role="menuitemradio"
              aria-checked={m.id === mode}
              className="brand-item"
              onClick={() => { setOpen(false); if (m.id !== mode) onMode(m.id); else trigger.current?.focus(); }}
            >
              <span className="brand-item-icon"><ModeIcon id={m.id} /></span>
              <span className="brand-item-text"><strong>{m.name}</strong><span>{m.desc}</span></span>
              {m.id === mode && (
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="brand-item-check">
                  <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
