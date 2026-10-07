# Contributing

Thanks for helping out. Small, focused pull requests are easiest to review: one preset, one scene or one fix at a time.

## Setup

```bash
npm install
npm run dev
```

Before opening a pull request, make sure `npm run build` passes. CI runs the same check.

## Adding a style preset

Style presets live in `PRESETS` in `src/presets.js`. Each one merges onto the defaults in `CONFIG`, so you only list what changes:

```js
preset("sunrise", "Sunrise", "paper", {
  Track: { width: 60, height: 32, offColor: "#fde68a", onColor: "#f97316" },
  Thumb: { size: 26, shadow: 0.4 },
  Motion: { thumb: { type: "spring", visualDuration: 0.4, bounce: 0.3 } },
  Effects: { color: "#f97316", burst: "sparks" },
}),
```

- The third argument is the canvas background it looks best on: `paper`, `mist`, `ink` or `aurora`.
- Use `wild(...)` instead of `preset(...)` to list it under **Experimental**.
- Tip: tune it in the app first, then use the copy button in the DialKit panel to grab the values.

## Adding a color or shape preset

Add to `PALETTES` (colors only) or `SHAPES` (geometry only) in the same file. These apply on top of whatever style is active, so keep them to their own fields.

## Adding a scene

Scenes live in `src/scenes.jsx`. Render switches with `<Live />`:

- `<Live primary label="..." />` is wired to the main switch (motion trace, loop, auto-flip).
- `<Live initial label="..." />` is an independent switch that starts on.
- Pass a function as children to react to its state: `{(el, on) => ...}`.

Then add the scene to the `SCENES` list and an icon to `I`.

## Adding a control

1. Add it to `CONFIG` in `src/presets.js`. DialKit builds the panel from this.
2. Use it in `src/Toggle.jsx` (live switch) and, if it's visible in a still frame, in `src/svgExport.js`.
3. If the code exports can't express it, add it to `missing()` in `src/codegen.js`, so the exported code says so.
