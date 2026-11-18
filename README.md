# Animations playground

Text and SVG animation clips for feature promos, and the films built from them (Connectors, the IQ Patterns film).
Vite + React 19 + Tailwind v4, animated with plain Web Animations (`element.animate()`).

## Run it

```sh
npm install
npm run dev      # http://localhost:3002
```

- `#/` is the Playground: one card per reusable clip in `src/clips` (glitch transition, scribble, stretch into shapes,
  roll, zoom through, bounce, pop and the rest).
- `#/animations/<id>` plays a named sequence from `src/animations` (`connectors`, `patterns`, `patterns-title`, ...).
- The toolbar sets aspect (16:9, 1:1, 9:16), speed, dark/light, reduced motion and sound.

## Render to MP4

With the dev server running:

```sh
node scripts/render.mjs <id> [dark|light|both] [fps]   # writes out/<id>-<theme>.mp4
```

It steps every Web Animation to an exact time per frame, so renders are repeatable. Timer-driven pieces (typing, and the
portfolio ports) aren't frame-exact.

## Layout

- `src/clips`: the shared clip library. Each file documents its props.
- `src/animations`: named sequences. Add one by creating a component here and adding it to `src/animations/index.ts`.
- `src/play.ts`: the `play()` helper, easings, springs and `cq()` (px in a 1920-wide frame to container units).
- `public/`: fonts, icons and the Patterns film's drawings.
- `scripts/`: render, glyph generation (`gen-glyphs.cjs`) and dino fill tools.
- `ref-frames/*.mjs`: review scripts that grab frames and contact sheets with Playwright (screenshots are not committed).

Playwright uses a local Chromium at `%LOCALAPPDATA%/ms-playwright/chromium-1248`.
