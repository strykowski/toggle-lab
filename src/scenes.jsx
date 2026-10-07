import { createContext, useContext, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Toggle } from "./Toggle.jsx";

export const SceneCtx = createContext(null);

// A live switch inside a scene. `primary` is wired to the app's main state + motion trace.
export function Live({ primary = false, initial = false, label, children }) {
  const ctx = useContext(SceneCtx);
  const [own, setOwn] = useState(initial);
  const on = primary ? ctx.checked : own;
  const set = primary ? ctx.setChecked : setOwn;
  const el = (
    <Toggle
      v={ctx.v}
      checked={on}
      onToggle={set}
      slow={ctx.slow}
      zoom={ctx.zoom}
      trace={primary ? ctx.trace : undefined}
      label={label}
    />
  );
  return children ? children(el, on) : el;
}

const I = {
  canvas: <path d="M3 3h10v10H3z M3 8h10 M8 3v10" />,
  settings: <><circle cx="8" cy="8" r="2.2" /><path d="M8 1.8v2M8 12.2v2M1.8 8h2M12.2 8h2M3.6 3.6l1.4 1.4M11 11l1.4 1.4M3.6 12.4L5 11M11 5l1.4-1.4" /></>,
  dashboard: <><rect x="2" y="2.5" width="12" height="11" rx="2" /><path d="M2 6h12M6 6v7.5" /></>,
  pricing: <><path d="M8 2v12M11 4.5H6.5a2 2 0 0 0 0 4h3a2 2 0 0 1 0 4H5" /></>,
  form: <><rect x="2.5" y="3" width="11" height="3" rx="1" /><rect x="2.5" y="8" width="11" height="3" rx="1" /><path d="M2.5 14h5" /></>,
  navbar: <><rect x="1.5" y="2.5" width="13" height="11" rx="2" /><path d="M1.5 6h13M4 4.3h.01M6 4.3h.01" /></>,
  home: <><path d="M2.5 7.5L8 3l5.5 4.5V13.5h-11z" /><path d="M6.5 13.5v-3.5h3v3.5" /></>,
  cockpit: <><circle cx="8" cy="8" r="5.5" /><path d="M8 2.5v2M8 11.5v2M2.5 8h2M11.5 8h2" /><circle cx="8" cy="8" r="1" /></>,
  docs: <><path d="M4 1.8h5.2L12 4.6v9.6H4z" /><path d="M9 1.8v3h3M6.2 8h3.6M6.2 10.6h3.6" /></>,
};
export const SceneIcon = ({ id }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {I[id]}
  </svg>
);

export const SCENES = [
  { value: "canvas", label: "Canvas" },
  { value: "settings", label: "Settings", Comp: Settings },
  { value: "dashboard", label: "Dashboard", Comp: Dashboard },
  { value: "pricing", label: "Pricing", Comp: Pricing },
  { value: "form", label: "Sign-in form", Comp: SignIn },
  { value: "navbar", label: "Navbar", Comp: Navbar, dark: false },
  { value: "home", label: "Smart home", Comp: SmartHome, dark: true },
  { value: "cockpit", label: "Cockpit", Comp: Cockpit, dark: true },
  // Rendered by App: a generated spec sheet rather than a live scene.
  { value: "docs", label: "Documentation", divider: true },
];

// ---------- Settings (mobile) ----------
function AppIcon({ color, children }) {
  return (
    <span className="sc-appicon" style={{ background: color }} aria-hidden="true">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
    </span>
  );
}
function Row({ icon, label, right }) {
  return (
    <div className="sc-row">
      {icon}
      <span className="sc-row-label">{label}</span>
      <span className="sc-row-right">{right}</span>
    </div>
  );
}
function Settings() {
  const chev = <svg width="8" height="12" viewBox="0 0 8 12" aria-hidden="true"><path d="M1.5 1.5L6 6l-4.5 4.5" fill="none" stroke="#c4c4c7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  return (
    <div className="sc sc-settings">
      <div className="sc-phone">
        <div className="sc-status"><span>9:41</span><span className="sc-status-icons" aria-hidden="true">▂▄▆ ◔</span></div>
        <h3 className="sc-phone-title">Settings</h3>
        <div className="sc-group">
          <Row icon={<AppIcon color="#ff9500"><path d="M2.5 9.5l11-4-3 7-2-3-3 2z" /></AppIcon>} label="Airplane mode" right={<Live label="Airplane mode" />} />
          <Row icon={<AppIcon color="#007aff"><path d="M2.5 6.5a8 8 0 0 1 11 0M4.5 8.8a5 5 0 0 1 7 0M8 11.5h.01" /></AppIcon>} label="Wi-Fi" right={<span className="sc-value">Home {chev}</span>} />
          <Row icon={<AppIcon color="#34c759"><rect x="2.5" y="5" width="10" height="6" rx="1.5" /><path d="M14 7v2" /></AppIcon>} label="Low power mode" right={<Live primary label="Low power mode" />} />
        </div>
        <div className="sc-group">
          <Row icon={<AppIcon color="#ff3b30"><path d="M4 11V7.5a4 4 0 0 1 8 0V11l1 1.5H3zM6.8 14h2.4" /></AppIcon>} label="Show previews" right={<Live initial label="Show previews" />} />
          <Row icon={<AppIcon color="#5856d6"><path d="M11.5 10A5 5 0 0 1 6 4.5a5 5 0 1 0 5.5 5.5z" /></AppIcon>} label="Focus" right={<span className="sc-value">Off {chev}</span>} />
          <Row icon={<AppIcon color="#8e8e93"><circle cx="8" cy="8" r="2" /><path d="M8 2v2M8 12v2M2 8h2M12 8h2" /></AppIcon>} label="Haptics" right={<Live initial label="Haptics" />} />
        </div>
      </div>
    </div>
  );
}

// ---------- Dashboard settings card ----------
function Opt({ title, desc, children }) {
  return (
    <div className="sc-opt">
      <div className="sc-opt-text"><strong>{title}</strong><span>{desc}</span></div>
      {children}
    </div>
  );
}
function Dashboard() {
  return (
    <div className="sc sc-dashboard">
      <div className="sc-card">
        <div className="sc-card-body">
          <h3>Preview protection</h3>
          <p>Choose who can open preview deployments of this project.</p>
          <Opt title="Require sign-in" desc="Only members of your team can view previews."><Live primary label="Require sign-in" /></Opt>
          <Opt title="Shareable links" desc="Anyone with a link can skip sign-in for 24 hours."><Live label="Shareable links" /></Opt>
          <Opt title="Comments on previews" desc="Reviewers can leave feedback on any page."><Live initial label="Comments on previews" /></Opt>
        </div>
        <div className="sc-card-foot">
          <span>Changes apply to new deployments.</span>
          <button type="button" className="btn btn-primary btn-small" tabIndex={-1}>Save</button>
        </div>
      </div>
    </div>
  );
}

// ---------- Pricing ----------
function Price({ value }) {
  return (
    <span className="sc-price-num">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: 10, opacity: 0, filter: "blur(2px)" }}
          animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
          exit={{ y: -10, opacity: 0, filter: "blur(2px)" }}
          transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
        >
          ${value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
function Pricing() {
  const { checked } = useContext(SceneCtx);
  const plans = [
    { name: "Starter", m: 12, y: 10, f: ["3 projects", "Basic analytics", "Email support"] },
    { name: "Team", m: 29, y: 24, f: ["Unlimited projects", "Advanced analytics", "Priority support"], hot: true },
  ];
  return (
    <div className="sc sc-pricing">
      <div className="sc-pricing-inner">
        <div className="sc-billing">
          <span className={checked ? "" : "is-on"}>Monthly</span>
          <Live primary label="Bill yearly" />
          <span className={checked ? "is-on" : ""}>Yearly</span>
          <span className="sc-badge">Save 20%</span>
        </div>
        <div className="sc-plans">
          {plans.map((p) => (
            <div key={p.name} className={`sc-plan${p.hot ? " is-hot" : ""}`}>
              <div className="sc-plan-name">{p.name}</div>
              <div className="sc-price"><Price value={checked ? p.y : p.m} /><span>/ month</span></div>
              <div className="sc-plan-note">{checked ? `Billed $${p.y * 12} yearly` : "Billed monthly"}</div>
              <ul>{p.f.map((x) => <li key={x}>{x}</li>)}</ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Sign-in form ----------
function SignIn() {
  return (
    <div className="sc sc-form">
      <div className="sc-auth">
        <h3>Sign in</h3>
        <p>Welcome back. Use your work email.</p>
        <label className="sc-field"><span>Email</span><input type="email" defaultValue="ada@lovelace.dev" /></label>
        <label className="sc-field"><span>Password</span><input type="password" defaultValue="analytical-engine" /></label>
        <div className="sc-remember"><Live primary label="Keep me signed in" /><span>Keep me signed in</span></div>
        <button type="button" className="btn btn-primary sc-auth-btn" tabIndex={-1}>Sign in</button>
      </div>
    </div>
  );
}

// ---------- Navbar with theme switch ----------
function Navbar() {
  const { checked } = useContext(SceneCtx);
  return (
    <div className={`sc sc-navbar${checked ? " is-dark" : ""}`}>
      <div className="sc-site">
        <nav className="sc-nav">
          <span className="sc-logo"><span aria-hidden="true" />Northwind</span>
          <span className="sc-links"><span>Docs</span><span>Blog</span><span>Pricing</span></span>
          <span className="sc-nav-right"><Live primary label="Dark theme" /></span>
        </nav>
        <div className="sc-hero">
          <h3>Ship the boring parts faster.</h3>
          <p>Hosting, previews and analytics for teams who would rather be building.</p>
          <div className="sc-hero-cta"><span className="sc-fake-btn">Start building</span><span className="sc-fake-btn is-ghost">Read the docs</span></div>
        </div>
        <div className="sc-site-cards"><span /><span /><span /></div>
      </div>
    </div>
  );
}

// ---------- Smart home ----------
function Bulb({ on }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true" className={`sc-bulb${on ? " is-on" : ""}`}>
      <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z" fill={on ? "#ffd166" : "none"} stroke={on ? "#ffd166" : "#6b7280"} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
function LightTile({ room, device, primary, initial }) {
  return (
    <Live primary={primary} initial={initial} label={`${room} ${device}`}>
      {(el, on) => (
        <div className={`sc-tile${on ? " is-on" : ""}`}>
          <div className="sc-tile-top"><Bulb on={on} />{el}</div>
          <div className="sc-tile-room">{room}</div>
          <div className="sc-tile-meta">{device} · {on ? "On" : "Off"}</div>
        </div>
      )}
    </Live>
  );
}
function SmartHome() {
  return (
    <div className="sc sc-home">
      <div className="sc-home-grid">
        <LightTile room="Living room" device="Ceiling" primary />
        <LightTile room="Bedroom" device="Lamp" />
        <LightTile room="Porch" device="Lights" initial />
        <div className="sc-tile sc-thermo">
          <div className="sc-thermo-num">21.5°</div>
          <div className="sc-tile-room">Thermostat</div>
          <div className="sc-tile-meta">Heating to 22°</div>
        </div>
      </div>
    </div>
  );
}

// ---------- Cockpit (FUI) ----------
function System({ name, primary, initial }) {
  return (
    <Live primary={primary} initial={initial} label={name}>
      {(el, on) => (
        <div className={`sc-sys${on ? " is-on" : ""}`}>
          <span className="sc-sys-name">{name}</span>
          <span className="sc-sys-status">{on ? "ONLINE" : "OFFLINE"}</span>
          {el}
        </div>
      )}
    </Live>
  );
}
function Cockpit() {
  return (
    <div className="sc sc-cockpit">
      <div className="sc-hud">
        <div className="sc-hud-head"><span>KESTREL-7 / SYSTEMS</span><span>T+00:42:17</span></div>
        <div className="sc-hud-power">
          <span>PWR</span>
          <span className="sc-hud-bar"><span style={{ width: "87%" }} /></span>
          <b>87%</b>
        </div>
        <System name="Shield array" primary />
        <System name="Thrusters" initial />
        <System name="Cloak" />
        <System name="Comms relay" initial />
      </div>
    </div>
  );
}
