# 𝕏 — Interactive 3D Landing Page

A cinematic, scroll-driven landing page for **X Corp** built with React, Three.js, GSAP ScrollTrigger, and Framer Motion. Features a fully interactive space scene — real Earth globe, asteroid belt, orbiting satellites, shooting stars, and a scroll-driven camera zoom transition.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Architecture Overview](#architecture-overview)
- [3D Scene Breakdown](#3d-scene-breakdown)
- [Scroll Animation System](#scroll-animation-system)
- [Texture System](#texture-system)
- [UI Sections](#ui-sections)
- [Public Assets](#public-assets)
- [Performance Notes](#performance-notes)
- [Known Limitations](#known-limitations)
- [Contributing](#contributing)

---

## Tech Stack

| Library | Version | Purpose |
|---|---|---|
| `react` | 19.x | UI framework |
| `three` | 0.183.x | 3D engine |
| `@react-three/fiber` | 9.x | React renderer for Three.js |
| `@react-three/drei` | 10.x | Three.js helpers (Stars, Trail, OrbitControls, useLoader) |
| `gsap` | 3.14.x | Entry animations + ScrollTrigger scroll-driven transitions |
| `framer-motion` | 12.x | UI micro-animations (tilt cards, whileInView reveals) |
| `lucide-react` | 0.577.x | Icon set |
| `vite` | 8.x | Build tool with HMR |

---

## Project Structure

```
x-landing/
├── public/
│   ├── earth-day.jpg        # Real Earth color map (NASA, 244KB)
│   └── earth-water.png      # Earth specular/water map (430KB)
│
├── src/
│   ├── App.jsx              # Entire application — all components live here
│   ├── index.css            # Global resets and root styles
│   └── main.jsx             # React entry point
│
├── package.json
├── vite.config.js
└── README.md
```

> All 3D components, texture generators, and page sections are co-located in `App.jsx` for simplicity. For a larger project, split into `components/3d/`, `components/ui/`, and `hooks/`.

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Install & Run

```bash
# Clone or open the project folder
cd "x-landing"

# Install dependencies
npm install

# Start dev server (http://localhost:5173)
npm run dev

# Production build
npm run build

# Preview production build locally
npm run preview
```

---

## Architecture Overview

```
App.jsx
│
├── Texture Generators (run once on mount, CPU-side canvas)
│   ├── makeAsteroidTexture()   → THREE.CanvasTexture
│   ├── makeMoonTexture()       → THREE.CanvasTexture
│   └── makeCloudTexture()      → THREE.CanvasTexture
│
├── 3D Components (inside <Canvas>)
│   ├── Particles              → floating star dust cloud
│   ├── EarthGlobe             → real textured Earth + clouds + atmosphere
│   ├── AsteroidBelt           → 120 orbiting textured rocks
│   ├── BeltRing               → faint orbital plane torus
│   ├── Moon                   → textured moon orbiting Earth
│   ├── Satellite (×3)         → glowing dots with Trail on 3 orbital planes
│   ├── ShootingStars          → 7 streaking particles
│   ├── SunGlow                → pulsing off-scene light halo
│   ├── CameraRig              → reads scrollProgress ref, moves camera directly
│   └── HeroScene              → composes all above + lights + Stars
│
├── UI Components
│   └── TiltCard               → 3D CSS perspective tilt on mouse move
│
└── App (main export)
    ├── useEffect → GSAP entry timeline + ScrollTrigger setup
    ├── 300vh sticky hero wrapper (scroll driver)
    ├── Stats bar
    ├── Features grid (6 cards)
    ├── CTA banner
    └── Footer
```

---

## 3D Scene Breakdown

### `EarthGlobe`
- Loads `earth-day.jpg` and `earth-water.png` via `useLoader(TextureLoader)` — wrapped in `<Suspense fallback={null}>` so the rest of the scene renders while textures load
- Uses `meshPhongMaterial` with `specularMap` so oceans shimmer and land stays matte
- Cloud layer: separate sphere at radius `2.03` with a procedural `CanvasTexture`, `AdditiveBlending`, slightly faster rotation than Earth
- Two `BackSide` atmosphere spheres create the blue rim glow

### `AsteroidBelt`
- 120 `dodecahedronGeometry` meshes, each with randomised per-axis scale (`sx`, `sy`, `sz`) for unique jagged shapes
- All share a single `asteroidTex` instance (one GPU upload)
- Each asteroid has its own `phase`, `speed`, and `yOff` — positions computed in `useFrame` each tick
- Texture is procedurally generated (see [Texture System](#texture-system))

### `CameraRig`
- Reads `scrollProgress.current` (a `useRef`, not state — no re-renders)
- Sets `camera.position.z` and `camera.position.y` **directly** — no lerp, no lag
- Camera zooms from `z=6` → `z=1.2` over the full scroll range

### `Satellite`
- Three instances on different orbital planes (`rx` angle)
- Uses `@react-three/drei` `<Trail>` for the glowing comet tail effect

### `ShootingStars`
- 7 small spheres that loop across the scene using time-based progress
- Opacity fades in/out at start and end of each streak cycle

---

## Scroll Animation System

The scroll transition is built on **GSAP ScrollTrigger** with a `useRef`-based progress value to avoid React re-renders on every scroll tick.

### How it works

```
┌─────────────────────────────────────────┐
│  <div ref={canvasWrapRef}               │  ← 300vh tall, scroll driver
│    height: 300vh                        │
│                                         │
│  ┌──────────────────────────────────┐   │
│  │ position: sticky, top: 0        │   │  ← Canvas stays fixed on screen
│  │ height: 100vh                   │   │
│  │                                 │   │
│  │   <Canvas> → HeroScene          │   │
│  │     CameraRig reads             │   │
│  │     scrollProgress.current      │   │
│  └──────────────────────────────────┘   │
│                                         │
│  <div ref={textSectionRef}              │  ← Hero text, position: absolute
│    position: absolute, bottom: 0        │     bottom of the 300vh block
│    opacity: 0 initially                 │
│  />                                     │
└─────────────────────────────────────────┘
```

### ScrollTrigger config

```js
ScrollTrigger.create({
  trigger: canvasWrapRef.current,
  start:   "top top",
  end:     "bottom bottom",
  scrub:   true,              // instant scrub — no lag
  onUpdate: (self) => {
    scrollProgress.current = self.progress;  // 0 → 1

    // Canvas fades out in last 25% of scroll
    // Text section slides up in last 30% of scroll
  },
});
```

### Key rules — do not break these

1. **Never add CSS `transition` to scroll-driven elements** — it fights ScrollTrigger's per-frame updates and causes jitter
2. **`scrub: true` not `scrub: 1.x`** — any scrub lag combined with direct camera assignment causes double-movement shaking
3. **`scrollProgress` is a `useRef`, not `useState`** — state updates trigger re-renders which drop frames
4. **`CameraRig` sets camera position directly** — no lerp (`+=`) inside `useFrame` when ScrollTrigger is also updating the same value

---

## Texture System

All textures except Earth are **procedurally generated** using the Canvas 2D API at startup. This means zero external asset dependencies for asteroids, moon, and clouds.

### `makeAsteroidTexture()` — 512×512
- Dark `#2a2520` base
- 6000 layered noise blobs simulating rock grain
- 28 crater pits using two-pass radial gradients (dark pit + bright rim)
- 40 surface streaks for geological detail
- Shared across all 120 asteroid meshes

### `makeMoonTexture()` — 1024×1024
- `#888880` grey base
- 12 large dark maria (volcanic plains) as soft radial blobs
- 12000 individual grain pixels
- 80 craters with shadow + rim highlight passes

### `makeCloudTexture()` — 1024×1024
- Black base with 20000 soft white blobs
- Applied with `AdditiveBlending` so black areas are transparent

### Earth textures (local files in `/public`)
| File | Source | Size |
|---|---|---|
| `earth-day.jpg` | NASA / three-globe CDN | 244 KB |
| `earth-water.png` | NASA / three-globe CDN | 430 KB |

> If you need to re-download these, run:
> ```powershell
> Invoke-WebRequest -Uri "https://unpkg.com/three-globe/example/img/earth-day.jpg" -OutFile "public/earth-day.jpg"
> Invoke-WebRequest -Uri "https://unpkg.com/three-globe/example/img/earth-water.png" -OutFile "public/earth-water.png"
> ```

---

## UI Sections

| Section | Component | Animation |
|---|---|---|
| Navbar | inline in `App` | Glassmorphism on scroll via `scrolled` state |
| Hero 3D | `<Canvas>` sticky | Scroll-driven camera zoom via ScrollTrigger |
| Hero Text | `textSectionRef` div | Slides up + fades in at 70% scroll progress |
| Stats Bar | inline grid | `whileInView` fade-up via Framer Motion |
| Features | `TiltCard` ×6 | 3D CSS tilt on hover + `whileInView` stagger |
| CTA Banner | motion.div | `whileInView` scale-in |
| Footer | inline | Static |

### `TiltCard`
Uses Framer Motion `useMotionValue` + `useTransform` to map mouse position within the card to `rotateX` / `rotateY` CSS transforms. No state, no re-renders — pure motion values.

---

## Performance Notes

- **`scrollProgress` as `useRef`** — avoids re-rendering the entire tree on every scroll event
- **Single shared `asteroidTex`** — one texture upload for 120 meshes
- **`<Suspense fallback={null}>`** around `EarthGlobe` — scene renders immediately, Earth appears when textures finish loading
- **`willChange: "opacity, transform"`** on the text section — hints the browser to composite on GPU
- **No CSS transitions on scroll-driven elements** — all opacity/transform changes are set directly via JS
- **`enableRotate={false}` on OrbitControls** — prevents OrbitControls from conflicting with `CameraRig`

---

## Known Limitations

- **Asteroid textures are procedural** — they look realistic but are not actual NASA asteroid photos. To use real images, replace `makeAsteroidTexture()` with `useLoader(TextureLoader, "/asteroid.jpg")` and add the file to `/public`
- **No mobile touch scroll handling** — ScrollTrigger works on mobile but the 3D scene is GPU-heavy; consider reducing `AsteroidBelt count` to `60` on mobile
- **Bundle size ~1.3MB** — Three.js + R3F is large. Consider dynamic imports for the Canvas section if initial load time is a concern

---

## Contributing

```bash
# 1. Make your changes in src/App.jsx

# 2. Verify build passes with zero errors
npm run build

# 3. Test in dev
npm run dev
```

### Adding a new 3D object
1. Create a new function component (e.g. `function SpaceStation()`)
2. Use `useFrame` for animation — read `clock.getElapsedTime()` for time-based motion
3. Add it inside `HeroScene` JSX
4. If it needs a texture, add a `make___Texture()` generator or load from `/public` via `useLoader`

### Modifying the scroll transition
- The scroll range is controlled by the `height: "300vh"` on `canvasWrapRef`
- Camera start/end positions are in `CameraRig` — `z=6` (start) → `z=1.2` (end)
- Text reveal threshold is at `self.progress > 0.7` in the `onUpdate` callback

---

## License

© 2026 X Corp. All rights reserved.
