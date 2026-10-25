// Shader finishes: one hidden WebGL canvas renders every visible shader layer each frame
// and copies the result into that layer's own 2D canvas. Sharing one context keeps scenes
// with many switches well under the browser's WebGL context limit.

export const SHADER_FINISHES = ["iridescent", "liquid-metal", "aurora", "grain", "dither"];
export const isShaderFinish = (f) => SHADER_FINISHES.includes(f);

const VERT = `attribute vec2 a;
varying vec2 v_uv;
void main() {
  v_uv = vec2(a.x * 0.5 + 0.5, 0.5 - a.y * 0.5); // (0,0) top-left
  gl_Position = vec4(a, 0.0, 1.0);
}`;

const COMMON = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 v_uv;
uniform vec2 u_res;     // device pixels
uniform float u_px;     // device pixels per CSS pixel
uniform float u_time;
uniform vec2 u_mouse;   // cursor relative to the switch, about -1..1
uniform float u_on;     // fill progress 0..1 (or grow-fill opacity)
uniform float u_growX;  // grow-fill edge in uv, or -1 for a crossfade fill
uniform vec4 u_off;
uniform vec4 u_onc;
uniform vec3 u_accent;

float hash(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
float fill() { return u_growX < 0.0 ? u_on : step(v_uv.x, u_growX) * u_on; }
vec4 base() { return mix(u_off, u_onc, fill()); }
`;

const FRAG = {
  // Thin-film foil: rainbow bands that slide as the cursor moves, like tilting a holo card.
  iridescent: `void main() {
  vec4 b = base(); vec2 uv = v_uv; float f = fill();
  float warp = fbm(uv * vec2(3.0, 1.5) + u_time * 0.06) * 0.8;
  float t = uv.x * 2.2 + uv.y * 0.9 + warp + u_mouse.x * 0.5 + u_mouse.y * 0.25 + u_time * 0.05;
  vec3 film = 0.5 + 0.5 * cos(6.2831 * (t + vec3(0.0, 0.33, 0.67)));
  film = mix(film, vec3(1.0), 0.18);
  // Off: a dark foil that only catches light at the edges of the bands. On: full foil.
  vec3 dark = b.rgb + film * 0.22 * smoothstep(0.55, 1.0, film.r * 0.5 + film.b * 0.5);
  vec3 lit = mix(film, b.rgb, 0.25);
  vec3 col = mix(dark, lit, f);
  float band = uv.x - 0.5 - u_mouse.x * 0.45 + (uv.y - 0.5) * 0.6;
  col += smoothstep(0.1, 0.0, abs(band)) * (0.15 + 0.3 * f);
  gl_FragColor = vec4(col, b.a);
}`,
  // Chrome: a "studio" reflection (bright sky, hard horizon, lighter floor) warped by flow.
  "liquid-metal": `void main() {
  vec4 b = base(); vec2 uv = v_uv; float f = fill();
  vec2 p = uv * vec2(u_res.x / u_res.y, 1.0);
  float n = fbm(p * 1.4 + vec2(u_time * 0.18, -u_time * 0.07) + u_mouse * 0.3) - 0.5;
  float y = uv.y + n * 0.55 + u_mouse.y * 0.12 + sin(p.x * 2.0 + u_time * 0.4) * 0.05;
  vec3 col = mix(vec3(0.98), vec3(0.62), smoothstep(0.0, 0.46, y));
  col = mix(col, vec3(0.06, 0.07, 0.09), smoothstep(0.44, 0.5, y));
  col = mix(col, vec3(0.42, 0.45, 0.5), smoothstep(0.52, 0.75, y));
  col = mix(col, vec3(0.86), smoothstep(0.8, 1.05, y));
  col += pow(max(0.0, 1.0 - abs(y - 0.3) * 6.0), 8.0) * 0.4;
  vec3 tint = mix(vec3(1.0), b.rgb * 1.25 + 0.1, 0.25 + 0.3 * f);
  col *= tint * mix(0.62, 1.0, f);
  gl_FragColor = vec4(col, b.a);
}`,
  // Northern lights: drifting curtains with vertical rays, brighter when on.
  aurora: `void main() {
  vec4 b = base(); vec2 uv = v_uv; float f = fill();
  float a = fbm(vec2(uv.x * 1.8 + u_time * 0.09, uv.y * 0.9 - u_time * 0.04) + u_mouse * 0.2);
  float rays = fbm(vec2(uv.x * 9.0 + a * 3.0 + u_time * 0.25, uv.y * 0.6));
  float curtain = smoothstep(0.3, 0.75, a) * (0.55 + 0.45 * rays) * smoothstep(1.1, 0.2, uv.y + (a - 0.5) * 0.6);
  vec3 glow = mix(u_accent, mix(u_onc.rgb, vec3(0.75, 0.6, 1.0), 0.35) * 1.4, smoothstep(0.4, 0.9, rays));
  float k = curtain * (0.45 + 0.75 * f);
  vec3 col = b.rgb + glow * k * 1.1;
  gl_FragColor = vec4(col, b.a);
}`,
  // Animated film grain with a soft vignette.
  grain: `void main() {
  vec4 b = base(); vec2 uv = v_uv;
  vec2 cell = floor(gl_FragCoord.xy / max(1.0, u_px * 0.75));
  float g = hash(cell + floor(u_time * 24.0) * vec2(37.0, 17.0)) - 0.5;
  vec3 col = b.rgb + g * 0.2;
  col *= 0.9 + 0.1 * smoothstep(0.95, 0.2, length((uv - 0.5) * vec2(1.0, 1.6)));
  gl_FragColor = vec4(col, b.a);
}`,
  // 1-bit ordered (Bayer) dither: the fill sweeps across in dots, with dithered shading.
  dither: `float bayer2(vec2 a) { a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
void main() {
  vec2 uv = v_uv; float f = fill();
  float th = bayer4(floor(gl_FragCoord.xy / max(1.0, 1.5 * u_px)));
  float edge = (uv.x - 0.5) * 0.9 * (1.0 - abs(2.0 * f - 1.0));
  float g = clamp(f * 1.5 - 0.25 + edge, 0.0, 1.0);
  vec4 c = mix(u_off, u_onc, step(th, g - 0.0001));
  // Dithered shading toward the bottom, in the opposite color, so it shows on black and white.
  float shade = step(th, (uv.y - 0.5) * 0.9);
  vec3 ink = mix(u_onc.rgb, u_off.rgb, step(th, g - 0.0001));
  gl_FragColor = vec4(mix(c.rgb, ink, shade * 0.35), c.a);
}`,
};

// ---------------------------------------------------------------- renderer
let gl = null, glCanvas = null, quad = null, failed = false, raf = 0;
const programs = {};
const layers = new Set();
const pointer = { x: 0, y: 0, t: -1e9 };
let reduceMQ = null;

function init() {
  if (gl || failed) return !!gl;
  try {
    glCanvas = document.createElement("canvas");
    gl = glCanvas.getContext("webgl", { alpha: true, premultipliedAlpha: false, antialias: false, preserveDrawingBuffer: true });
  } catch { gl = null; }
  if (!gl) { failed = true; return false; }
  quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  window.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.t = performance.now();
  }, { passive: true });
  reduceMQ = window.matchMedia?.("(prefers-reduced-motion: reduce)") ?? null;
  return true;
}

function compile(type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.warn("Toggle Lab shader:", gl.getShaderInfoLog(sh));
    return null;
  }
  return sh;
}

function program(kind) {
  if (kind in programs) return programs[kind];
  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = FRAG[kind] && compile(gl.FRAGMENT_SHADER, COMMON + FRAG[kind]);
  if (!vs || !fs) return (programs[kind] = null);
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return (programs[kind] = null);
  const u = {};
  for (const name of ["u_res", "u_px", "u_time", "u_mouse", "u_on", "u_growX", "u_off", "u_onc", "u_accent"]) u[name] = gl.getUniformLocation(prog, name);
  return (programs[kind] = { prog, u, a: gl.getAttribLocation(prog, "a") });
}

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

function draw(L, time, now) {
  const { canvas, ctx } = L;
  const P = L.props.current;
  const w = canvas.width, h = canvas.height;
  if (!w || !h || !P.colors) return;
  const rect = canvas.getBoundingClientRect();
  if (rect.width === 0 || rect.bottom < 0 || rect.top > innerHeight || rect.right < 0 || rect.left > innerWidth) return;
  const p = program(P.kind);
  if (!p) return;

  // Cursor relative to the switch, eased; with no mouse around, a slow drift instead.
  let tx, ty;
  if (now - pointer.t < 4000) {
    tx = clamp((pointer.x - (rect.left + rect.width / 2)) / Math.max(40, rect.width / 2), -1.5, 1.5);
    ty = clamp((pointer.y - (rect.top + rect.height / 2)) / Math.max(40, rect.height * 2), -1.5, 1.5);
  } else {
    tx = Math.sin(time * 0.5) * 0.6;
    ty = Math.cos(time * 0.37) * 0.4;
  }
  L.mx += (tx - L.mx) * 0.08;
  L.my += (ty - L.my) * 0.08;

  if (glCanvas.width < w) glCanvas.width = w;
  if (glCanvas.height < h) glCanvas.height = h;
  gl.viewport(0, 0, w, h);
  gl.useProgram(p.prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.enableVertexAttribArray(p.a);
  gl.vertexAttribPointer(p.a, 2, gl.FLOAT, false, 0, 0);
  const { on, growX } = P.getFill();
  const [off, onc, acc] = P.colors;
  gl.uniform2f(p.u.u_res, w, h);
  gl.uniform1f(p.u.u_px, P.px);
  gl.uniform1f(p.u.u_time, time + L.seed);
  gl.uniform2f(p.u.u_mouse, L.mx, L.my);
  gl.uniform1f(p.u.u_on, on);
  gl.uniform1f(p.u.u_growX, growX);
  gl.uniform4f(p.u.u_off, off.r, off.g, off.b, off.a);
  gl.uniform4f(p.u.u_onc, onc.r, onc.g, onc.b, onc.a);
  gl.uniform3f(p.u.u_accent, acc.r, acc.g, acc.b);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  ctx.clearRect(0, 0, w, h);
  // The viewport is the bottom-left w×h of the GL canvas, which is its last h rows as an image.
  ctx.drawImage(glCanvas, 0, glCanvas.height - h, w, h, 0, 0, w, h);
}

function frame(now) {
  raf = layers.size ? requestAnimationFrame(frame) : 0;
  const time = reduceMQ?.matches ? 3 : now / 1000;
  for (const L of layers) draw(L, time, now);
}

// layer: { canvas, ctx, props: ref({ kind, colors, px, getFill }) }
export function registerLayer(layer) {
  if (!init()) return false;
  Object.assign(layer, { mx: 0, my: 0, seed: Math.random() * 100 });
  layers.add(layer);
  if (!raf) raf = requestAnimationFrame(frame);
  return true;
}

export function unregisterLayer(layer) {
  layers.delete(layer);
}
