import { useEffect, useRef } from "react";
import { registerLayer, unregisterLayer } from "./shaders.js";
import { parseHex } from "./color.js";

const BLACK = { r: 0, g: 0, b: 0, a: 1 };

// A track layer drawn by a WebGL shader (see shaders.js). Renders at the zoomed size so
// it stays crisp on the 2× and 3× canvas.
export function ShaderLayer({ kind, off, on, accent, width, height, zoom = 1, getFill }) {
  const ref = useRef(null);
  const dpr = typeof window === "undefined" ? 1 : Math.min(2, window.devicePixelRatio || 1);
  const px = Math.min(6, dpr * zoom);
  const props = useRef(null);
  props.current = { kind, px, getFill, colors: [parseHex(off) ?? BLACK, parseHex(on) ?? BLACK, parseHex(accent) ?? BLACK] };

  useEffect(() => {
    const canvas = ref.current;
    const layer = { canvas, ctx: canvas.getContext("2d"), props };
    if (!registerLayer(layer)) return undefined; // no WebGL: the plain track colors show through
    return () => unregisterLayer(layer);
  }, []);

  return (
    <canvas
      ref={ref}
      className="tg-layer tg-shader"
      width={Math.max(1, Math.round(width * px))}
      height={Math.max(1, Math.round(height * px))}
      aria-hidden="true"
    />
  );
}
