import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cssExport, reactExport } from "./codegen.js";
import { switchSvg, svgDataUrl, svgToPngBlob } from "./svgExport.js";

// Downloads: a normal browser download everywhere, except when the page is hosted
// inside the claude.ai artifact viewer, which only allows saves through its "downloads"
// capability (window.claude). null = unavailable there, "anchor" = plain browser download.
function useDownloads() {
  const [dl, setDl] = useState(undefined);
  useEffect(() => {
    let alive = true;
    if (typeof window !== "undefined" && window.claude?.use) {
      window.claude.use("downloads").then((ns) => alive && setDl(ns), () => alive && setDl(null));
    } else setDl("anchor");
    return () => { alive = false; };
  }, []);
  return dl;
}

async function saveFile(dl, filename, data) {
  if (dl === "anchor") {
    const blob = data instanceof Blob ? data : new Blob([data], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return "saved";
  }
  const res = await dl.save({ filename, data });
  return res.status;
}

function Seg({ label, value, onChange, options }) {
  return (
    <div className="seg seg-flat" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} className="seg-item" onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function CodeDrawer({ open, onClose, v, name }) {
  const [tab, setTab] = useState("css");
  const [status, setStatus] = useState("");
  const [state, setState] = useState(true);
  const [scale, setScale] = useState(2);
  const closeRef = useRef(null);
  const reduce = useReducedMotion();
  const dl = useDownloads();

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => closeRef.current?.focus(), 30);
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => { clearTimeout(t); document.removeEventListener("keydown", onKey); };
  }, [open, onClose]);

  useEffect(() => { setStatus(""); }, [tab]);
  const flash = (msg) => { setStatus(msg); clearTimeout(flash.t); flash.t = setTimeout(() => setStatus(""), 2400); };

  const code = useMemo(() => (tab === "css" ? cssExport(v) : tab === "react" ? reactExport(v) : ""), [tab, v]);
  const image = useMemo(() => switchSvg(v, state), [v, state]);
  const slug = (name || "custom").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const base = `switch-${slug}-${state ? "on" : "off"}`;

  const copyText = async (text, what) => {
    try {
      await navigator.clipboard.writeText(text);
      flash(`Copied ${what}`);
    } catch {
      flash("Copying isn't allowed here. Select the code and copy it manually.");
    }
  };
  const copyPng = async () => {
    try {
      const blob = svgToPngBlob(image.svg, image.width, image.height, scale);
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      flash(`Copied PNG at ${scale}×`);
    } catch {
      flash("This browser can't copy images here. Use Download PNG instead.");
    }
  };
  const download = async (kind) => {
    try {
      const data = kind === "svg" ? image.svg : await svgToPngBlob(image.svg, image.width, image.height, scale);
      const filename = kind === "svg" ? `${base}.svg` : `${base}@${scale}x.png`;
      const res = await saveFile(dl, filename, data);
      flash(res === "delivered" ? "Sent" : `Downloaded ${filename}`);
    } catch (e) {
      flash(e?.code === "declined" ? "Download canceled." : "Download isn't available here.");
    }
  };

  const canDownload = dl === "anchor" || (dl && typeof dl.save === "function");

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="scrim"
            className="drawer-scrim"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            transition={{ duration: 0.2 }}
          />
          <motion.aside
            key="drawer"
            className="drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="drawer-title"
            initial={reduce ? { opacity: 0 } : { x: "100%" }}
            animate={reduce ? { opacity: 1 } : { x: 0 }}
            exit={reduce ? { opacity: 0 } : { x: "100%", transition: { duration: 0.2, ease: [0.32, 0.72, 0, 1] } }}
            transition={{ duration: 0.36, ease: [0.32, 0.72, 0, 1] }}
          >
            <header className="drawer-head">
              <h2 id="drawer-title">Get code</h2>
              <button ref={closeRef} type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </button>
            </header>
            <div className="drawer-tabs" role="tablist" aria-label="Export format">
              {[
                { id: "css", label: "HTML + CSS" },
                { id: "react", label: "React + Motion" },
                { id: "image", label: "Image" },
              ].map((t) => (
                <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className="tab" onClick={() => setTab(t.id)}>
                  {t.label}
                </button>
              ))}
            </div>

            {tab !== "image" ? (
              <div className="drawer-body">
                <div className="drawer-actions">
                  <span className="muted drawer-note">
                    {tab === "css" ? "Plain HTML and CSS. Springs are converted to CSS linear() curves." : "A drop-in component for React with Motion."}
                  </span>
                  <button type="button" className="btn btn-primary btn-small" onClick={() => copyText(code, "code")}>Copy code</button>
                </div>
                <pre className="code-body" tabIndex={0}><code>{code}</code></pre>
              </div>
            ) : (
              <div className="drawer-body">
                <div className="img-controls">
                  <Seg label="State" value={state} onChange={setState} options={[{ value: false, label: "Off" }, { value: true, label: "On" }]} />
                  <Seg label="PNG scale" value={scale} onChange={setScale} options={[1, 2, 3].map((n) => ({ value: n, label: `${n}×` }))} />
                  <span className="muted img-dims">PNG {Math.round(image.width * scale)} × {Math.round(image.height * scale)} px</span>
                </div>
                <div className="img-preview">
                  <img src={svgDataUrl(image.svg)} alt={`Switch, ${state ? "on" : "off"}`} style={{ width: Math.min(image.width * 3, 520) }} />
                </div>
                <div className="img-buttons">
                  <div className="img-group">
                    <span className="img-group-label">SVG</span>
                    <button type="button" className="btn btn-secondary btn-small" onClick={() => copyText(image.svg, "SVG")}>Copy SVG</button>
                    {canDownload && <button type="button" className="btn btn-secondary btn-small" onClick={() => download("svg")}>Download SVG</button>}
                  </div>
                  <div className="img-group">
                    <span className="img-group-label">PNG {scale}×</span>
                    <button type="button" className="btn btn-secondary btn-small" onClick={copyPng}>Copy PNG</button>
                    {canDownload && <button type="button" className="btn btn-primary btn-small" onClick={() => download("png")}>Download PNG</button>}
                  </div>
                </div>
                <p className="muted drawer-note">Static frame with a transparent background. Animated finishes are captured as a still.</p>
              </div>
            )}
            <div className="drawer-status" role="status" aria-live="polite">{status}</div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
