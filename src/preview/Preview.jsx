import { Showreel } from "./Showreel.jsx";
import { Gallery } from "./Gallery.jsx";
import { Wall } from "./Wall.jsx";

const MODES = [
  { id: "showreel", label: "Showreel" },
  { id: "gallery", label: "Gallery" },
  { id: "wall", label: "Switch wall" },
];

// Toggle Preview: a showcase of what the Lab can make. "Open in Lab" hands a design back.
export default function Preview({ brand, sub, onSub, onOpen, v, stage }) {
  return (
    <div className="pv">
      <header className="topbar pv-top">
        {brand}
        <div className="seg pv-tabs" role="tablist" aria-label="Preview mode">
          {MODES.map((m) => (
            <button key={m.id} type="button" role="tab" aria-selected={sub === m.id} aria-checked={sub === m.id} className="seg-item" onClick={() => onSub(m.id)}>
              {m.label}
            </button>
          ))}
        </div>
      </header>
      <main className="pv-main">
        {sub === "gallery" ? <Gallery onOpen={onOpen} /> : sub === "wall" ? <Wall v={v} stage={stage} /> : <Showreel onOpen={onOpen} />}
      </main>
    </div>
  );
}
