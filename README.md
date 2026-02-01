# MotionMaker

A browser-based 2D animation tool for creating layered, keyframe-driven animations with real-time preview and export to GIF or MP4.

![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg)

## Features

### Layer System
- Add images via URL or choose from a built-in emoji library (300+ emojis across 10 categories)
- Rename, duplicate, delete, and reorder layers via drag & drop
- Per-layer visibility toggle and opacity control
- Interactive canvas handles for move, scale (with Shift for proportional), and rotate

### Keyframe Animation
- Add keyframes at any point on the timeline to animate position, scale, rotation, and visibility
- 17 easing functions: linear, quadratic, cubic, quartic, back, elastic, and bounce variants
- Copy and paste keyframes between layers
- Drag keyframes along the timeline to retime
- Background color keyframes with smooth color interpolation

### Timeline
- Visual timeline with ruler, grid, and draggable playhead
- Per-layer or all-layers keyframe view
- Auto-scaling duration (5–60 seconds based on content)
- Drag keyframes directly on the timeline track

### Playback
- Play, pause, and stop controls
- Loop mode
- Smooth playback mode (eliminates keyframe-boundary hesitation)
- Speed control: 0.25x, 0.5x, 1x, 1.5x, 2x
- 30 FPS rendering

### Visualization Aids
- **Onion skinning** — semi-transparent overlay of previous (red) and next (blue) keyframes with adjustable opacity
- **Motion trail** — curved path showing layer movement between keyframes with direction arrows

### Export
- **MP4** (WebM/VP9 via MediaRecorder API) — smooth playback, smaller files
- **GIF** (via gif.js with web workers) — universal compatibility
- Configurable frame rate (15, 20, 24, 30 FPS) and loop option
- Progress indicator during export

### Editing
- Undo/redo with 50-level history
- Auto-save every 15 seconds
- Save/load projects as JSON files
- Resizable properties and timeline panels (sizes persist across sessions)

### Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Space` | Play / Pause |
| `Ctrl+S` | Save project |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` / `Ctrl+Y` | Redo |
| `Ctrl+C` | Copy keyframe |
| `Ctrl+V` | Paste keyframe |
| `Delete` / `Backspace` | Delete selected keyframe or layer |

## Getting Started

1. Open `index.html` in a modern browser.
2. Click **Add Image** to create a layer from a URL or emoji.
3. Position the layer on the canvas, then click **Add Keyframe**.
4. Move the playhead forward, reposition the layer, and add another keyframe.
5. Press **Space** to preview. Adjust easing in the properties panel.
6. Export via the **Export** button when ready.

## Dependencies

- [p5.js 1.7.0](https://p5js.org/) — canvas rendering (loaded from CDN)
- [gif.js](https://jnordberg.github.io/gif.js/) — GIF encoding (included in `libs/`)

## Browser Requirements

- Modern browser with ES6, Canvas API, Web Workers, and localStorage support
- MediaRecorder API required for MP4 export (Chrome, Firefox, Edge)

## Project Structure

```
├── index.html          # Application entry point (HTML, CSS, and app globals)
├── js/
│   ├── app-init.js           # Initialization and p5.js setup
│   ├── core-animation.js     # Canvas rendering, onion skin, motion trail
│   ├── interpolation.js      # Easing functions and property interpolation
│   ├── layer-manager.js      # Layer CRUD, drag & drop, duplication
│   ├── keyframe-manager.js   # Keyframe CRUD, copy/paste, drag
│   ├── timeline-manager.js   # Timeline rendering and interaction
│   ├── playback-controls.js  # Play/pause/stop, speed, scrubbing
│   ├── animation-controls.js # Animation loop start/stop
│   ├── properties-panel.js   # Property inputs and updates
│   ├── image-selector.js     # Image/emoji selection modal
│   ├── project-manager.js    # Save/load projects
│   ├── auto-save.js          # Auto-save timer
│   ├── export-manager.js     # GIF and MP4 export
│   ├── undo-redo.js          # History management
│   ├── panel-resizer.js      # Resizable UI panels
│   ├── keyboard-shortcuts.js # Global hotkeys
│   └── ui-utils.js           # Toast notifications and helpers
├── libs/
│   └── gif.js/               # GIF encoding library and worker
└── LICENSE                   # GPL-3.0
```

## License

This project is licensed under the [GNU General Public License v3.0](LICENSE).
