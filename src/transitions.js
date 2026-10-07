import { spring } from "motion";

const r = (n, d = 3) => Math.round(n * 10 ** d) / 10 ** d;

// DialKit TransitionConfig -> motion transition
export function toMotion(t) {
  if (!t) return { duration: 0.2 };
  if (t.type === "easing") return { duration: t.duration, ease: t.ease };
  if (t.visualDuration != null)
    return { type: "spring", visualDuration: t.visualDuration, bounce: t.bounce ?? 0 };
  return {
    type: "spring",
    stiffness: t.stiffness ?? 100,
    damping: t.damping ?? 10,
    mass: t.mass ?? 1,
  };
}

// Stretch a transition in time by factor f (slow motion).
export function scaleTime(t, f) {
  if (f === 1) return t;
  if (t.type === "spring" && t.visualDuration != null)
    return { ...t, visualDuration: t.visualDuration * f };
  if (t.type === "spring")
    return { ...t, stiffness: t.stiffness / (f * f), damping: t.damping / f };
  return { ...t, duration: (t.duration ?? 0.3) * f };
}

// Returns { ms, easing } for CSS. Springs become linear() curves sampled from motion.
export function toCss(t) {
  if (!t) return { ms: 200, easing: "ease" };
  if (t.type === "easing") {
    const [a, b, c, d] = t.ease;
    return { ms: Math.round(t.duration * 1000), easing: `cubic-bezier(${r(a)}, ${r(b)}, ${r(c)}, ${r(d)})` };
  }
  const m = toMotion(t);
  try {
    const s = String(spring({ keyframes: [0, 1], ...m }));
    const i = s.indexOf("ms ");
    return { ms: Math.round(parseFloat(s.slice(0, i))), easing: s.slice(i + 3) };
  } catch {
    return { ms: 400, easing: "ease-out" };
  }
}

export function settleMs(t, f = 1) {
  if (!t) return 0;
  if (t.type === "easing") return Math.round(t.duration * f * 1000);
  return toCss(scaleTime(toMotion(t), f)).ms;
}

// Pretty-print a motion transition object as JS source.
export function motionSource(t) {
  const m = toMotion(t);
  if (m.type === "spring" && m.visualDuration != null)
    return `{ type: "spring", visualDuration: ${r(m.visualDuration)}, bounce: ${r(m.bounce)} }`;
  if (m.type === "spring")
    return `{ type: "spring", stiffness: ${r(m.stiffness, 1)}, damping: ${r(m.damping, 2)}, mass: ${r(m.mass, 2)} }`;
  return `{ duration: ${r(m.duration)}, ease: [${m.ease.map((x) => r(x)).join(", ")}] }`;
}
