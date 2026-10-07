import { createRoot } from "react-dom/client";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "dialkit/styles.css";
import "./styles.css";
import App from "./App.jsx";

// One-time migration from the project's earlier name, so saved tweaks survive the rename.
try {
  const moves = [["dialkit:toggle-studio", "dialkit:toggle-lab"]];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith("toggle-studio:")) moves.push([k, k.replace("toggle-studio:", "toggle-lab:")]);
  }
  for (const [from, to] of moves) {
    const val = localStorage.getItem(from);
    if (val != null && localStorage.getItem(to) == null) localStorage.setItem(to, val);
  }
} catch {
  /* storage unavailable */
}

createRoot(document.getElementById("root")).render(<App />);
