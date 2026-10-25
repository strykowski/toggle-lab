# Toggle Lab

A playground for designing switch components. Shape it, color it, tune its motion and effects live, see it inside real interfaces, then copy production code or export an image.

![Toggle Lab: a lightsaber-style switch extending and retracting in slow motion](docs/demo.gif)

**[Live demo →](https://toggle-lab.vercel.app/)**

![Toggle Lab interface: a glowing neon switch on a dark canvas, with presets and DialKit controls in the sidebar](docs/screenshot.png)

## What it does

- **Tune everything live.** Around 50 controls in a [DialKit](https://github.com/joshpuckett/dialkit) panel: track and thumb geometry, colors, borders, depth, springs and easing curves, squash and stretch, glow, trails, bursts, surface finishes, 3D tilt and stepped motion.
- **Start from presets.** 27 styles, from familiar (Cupertino, Material, Brutal) to experimental (FUI, Holographic, Lightsaber, Pixel, Plasma) and live WebGL shader finishes (Sky, Foil, Mercury, Borealis, Film, 1-bit). Sky turns a sunny day with drifting clouds into a starry night as the sun becomes the moon. Color and shape presets apply on their own, so you can mix them with any style, or hit **Randomize**.
- **Set the mood.** Four macro sliders, Soft ↔ Sharp, Calm ↔ Energetic, Flat ↔ Deep and Serious ↔ Playful, each move a whole set of controls at once.
- **Throw it.** Flick the thumb: release speed decides the side, and the momentum carries into the spring.
- **Explore freely.** Hit **Randomize** (or press **R**) for a new mix, lock style, color or shape to keep them, and click back through recent results. Every change can be undone with **⌘Z** / **Ctrl+Z**.
- **Share it.** **Share** copies a link that opens your exact switch for anyone, no account needed.
- **See it in context.** Swap the plain canvas for real scenes: a phone settings screen, a dashboard, a pricing page where the toggle flips the prices, a sign-in form, a site navbar with a working theme switch, a smart-home panel and a sci-fi cockpit.
- **Check accessibility.** A badge on the canvas checks WCAG 2.2 AA as you design: 3:1 non-text contrast for thumb vs track and track vs background (1.4.11), and 24 px target size (2.5.8). The docs carry the full report.
- **Document it.** The Documentation view generates a spec sheet for the current switch: every state (default, hover, focus, pressed, disabled) on light and dark surfaces, a filmstrip of the off-to-on motion, and its dimensions and colors. It's a snapshot, so it only regenerates when you ask.
- **Study the motion.** Slow it down to ½× or ¼×, loop it, and watch a live graph of the thumb's position to see overshoot and settle time.
- **Watch what's possible.** Open the menu on the **Toggle Lab** wordmark and switch to **Toggle Preview**. It has three modes: a **Showreel** that morphs from preset to preset on autoplay, a **Gallery** of every preset flipping in waves (click empty space to send a ripple), and a **Switch wall** where hundreds of your current switch spell out text, a clock, waves, rain and the Game of Life. Move the cursor over the wall to ripple it, or drag to paint. Any preset in the Showreel or Gallery opens in the Lab with one click.
- **Take it with you.** Get HTML + CSS (springs are sampled into CSS `linear()` curves), a React + Motion component, an SVG / PNG at 1×, 2× or 3×, or copy it to Figma as editable layers: the switch alone or the whole documentation page.

## Getting started

Requires Node.js 20.19+ or 22.12+.

```bash
npm install
npm run dev      # start the dev server
npm run build    # production build into dist/
npm run preview  # serve the production build locally
```

Your tweaks and saved DialKit versions are stored in the browser's `localStorage`, so they survive reloads.

### Keyboard shortcuts

| Key | Action |
| --- | --- |
| R | Randomize |
| E | Export |
| D | Documentation (press again to go back) |
| ⌘Z / Ctrl+Z | Undo |
| ⇧⌘Z / Ctrl+Shift+Z | Redo |
| ← / → | Showreel: previous / next preset |
| Space | Showreel: pause / play |

## Deploying

The build is a static site in `dist/`, with relative asset paths so it works from any host or sub-path.

- **Vercel:** import the repo at [vercel.com/new](https://vercel.com/new). Vite is detected automatically; no settings needed.
- **Netlify:** build command `npm run build`, publish directory `dist`.
- **GitHub Pages:** build with GitHub Actions and publish `dist/`.

## Project structure

```
src/
  App.jsx          App shell: top bar, stage, toolbar, sidebar; switches between Lab and Preview
  Brand.jsx        Logo switch and the Toggle Lab / Toggle Preview menu
  Toggle.jsx       The live switch: all motion, effects and interaction
  presets.js       DialKit control config, style / color / shape presets
  Presets.jsx      Sidebar preset dropdowns, randomizer, generic listbox
  scenes.jsx       Contextual scenes (settings, pricing, cockpit, ...)
  Docs.jsx         Documentation view: states matrix, motion filmstrip, specs
  docs.js          Renders the documentation snapshot in small steps
  CodeDrawer.jsx   Export drawer: code, image and Figma tabs
  figma.js         "Copy to Figma": the switch or the whole docs page as one SVG frame
  a11y.js          WCAG contrast and target-size checks (A11yChecks.jsx renders them)
  color.js         Hex parsing, alpha compositing, contrast ratio, hover tint, saturation
  mood.js          Mood slider mappings (Mood.jsx is the panel)
  morph.js         Blends two designs (numbers and colors) for the showreel's morphs
  shaders.js       WebGL shader finishes on one shared context (ShaderLayer.jsx draws a layer)
  share.js         Share links, and sanitizing any values from outside (links, storage)
  keys.js          ⌘ / Ctrl shortcut labels
  codegen.js       HTML + CSS and React code generators
  svgExport.js     Static SVG renderer (image export and preset thumbnails)
  transitions.js   Spring / easing conversions, CSS linear() sampling
  glyphs.jsx       Thumb icons
  styles.css       All styles
  preview/         Toggle Preview: Showreel, Gallery, Switch wall (Wall.jsx) and its 5×7 pixel font
```

## Adding a preset

See [CONTRIBUTING.md](CONTRIBUTING.md). In short: add an entry to `PRESETS`, `PALETTES` or `SHAPES` in `src/presets.js`. Only list the values that differ from the defaults.

## Credits

- [DialKit](https://github.com/joshpuckett/dialkit) by Josh Puckett powers the control panel.
- [Motion](https://motion.dev) for springs and animation.
- [Geist](https://vercel.com/font) typeface, via [Fontsource](https://fontsource.org).

## License

[MIT](LICENSE)
