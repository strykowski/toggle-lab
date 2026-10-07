const st = (w = 2.6) => `fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
const POWER = `<path d="M12 3.5v8M6.6 7.4a7.6 7.6 0 1 0 10.8 0" ${st()}/>`;
const BOLT = "M13.5 2.5L5 13.5h6.2L10 21.5l9-11.2h-6.4l.9-7.8z";

// Inner markup for a 24x24 viewBox, per state. Shared by the live switch and the exporter.
export const GLYPHS = {
  check: {
    on: `<path d="M5 12.5l4.5 4.5L19 7.5" ${st()}/>`,
    off: `<path d="M7 7l10 10M17 7L7 17" ${st()}/>`,
  },
  "sun-moon": {
    on: `<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.6 6.6 0 0 0 10.5 10.5z" fill="currentColor"/>`,
    off: `<g ${st(2.2)}><circle cx="12" cy="12" r="4" fill="currentColor"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/></g>`,
  },
  lock: {
    on: `<g ${st(2.2)}><rect x="5" y="11" width="14" height="9.5" rx="2.2" fill="currentColor"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></g>`,
    off: `<g ${st(2.2)}><rect x="5" y="11" width="14" height="9.5" rx="2.2"/><path d="M8 11V8a4 4 0 0 1 7.6-1.8"/></g>`,
  },
  io: {
    on: `<path d="M12 5.5v13" ${st(3)}/>`,
    off: `<circle cx="12" cy="12" r="6" ${st(2.6)}/>`,
  },
  power: { on: POWER, off: POWER },
  bolt: {
    on: `<path d="${BOLT}" fill="currentColor"/>`,
    off: `<path d="${BOLT}" ${st(1.8)}/>`,
  },
};

export function Glyph({ name, state, size }) {
  const g = GLYPHS[name];
  if (!g) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block" }}
      dangerouslySetInnerHTML={{ __html: g[state] }} />
  );
}

// Figma's logo shape, as a line icon for "Copy to Figma" buttons.
export const FigmaIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" aria-hidden="true">
    <path d="M8 1H5.75a2.25 2.25 0 0 0 0 4.5H8zM8 1h2.25a2.25 2.25 0 0 1 0 4.5H8zM8 5.5H5.75a2.25 2.25 0 0 0 0 4.5H8zM8 10H5.75a2.25 2.25 0 1 0 2.25 2.25z" />
    <circle cx="10.25" cy="7.75" r="2.25" />
  </svg>
);
