# Design Document

## AWS Student Community Day Badge Generator

---

## Overview

The Badge Generator is a single-page React + TypeScript + Vite application that lets event attendees compose and download a personalized badge in one of two portrait formats (4:5 and 9:16). Users upload a photograph, reposition and zoom it within a dedicated photo area, enter their name, choose a role, and preview the result in real time before exporting a full-resolution PNG.

The application has no backend. All compositing happens in the browser using the DOM for live preview and the Canvas 2D API for export. No additional npm packages beyond `react` and `react-dom` are required.

### Key Design Goals

- **Pixel-perfect fidelity** — the exported PNG must match the preview exactly, driven by the same `LayoutDefinition` objects.
- **No-distortion guarantee** — the uploaded photo is never stretched, squashed, background-removed, or otherwise processed; it is only scaled and translated.
- **Self-contained** — no server round-trips, no external image APIs, no build-time dependencies beyond what already exists in the project.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  App.tsx   (BadgeState owner)                           │
│  ┌──────────────────┐   ┌───────────────────────────┐   │
│  │  BadgeControls   │   │      BadgePreview          │   │
│  │  (format select, │   │  (scaled DOM, CSS          │   │
│  │   name, role,    │   │   transform, native        │   │
│  │   upload, zoom,  │   │   canvas coords)           │   │
│  │   reset, export) │   └───────────────────────────┘   │
│  └──────────────────┘                                   │
│                                                         │
│  badge/                                                 │
│    types.ts          BadgeState, PhotoTransform,        │
│                      LayoutDefinition, FormatId         │
│    designSystem.ts   colors, font strings, SVG paths    │
│    layouts/                                             │
│      layout4x5.ts    LayoutDefinition (1080×1350)       │
│      layout9x16.ts   LayoutDefinition (1080×1920)       │
│    photoUtils.ts     computeMinZoom, clampOffset,       │
│                      scaleTransformToFormat,            │
│                      computeInitialFraming              │
│    exportUtils.ts    renderToCanvas → PNG download      │
└─────────────────────────────────────────────────────────┘
```

### Data flow

1. User interactions in `BadgeControls` call state-setter callbacks owned by `App`.
2. `App` holds the single `BadgeState` and passes it down to both `BadgePreview` and to the export handler.
3. `BadgePreview` reads `BadgeState` and the active `LayoutDefinition` to render the live preview via CSS transforms.
4. The export handler calls `renderToCanvas(layout, state)` which draws the same layout to an offscreen `<canvas>` and triggers a PNG download.

---

## Components and Interfaces

### `src/badge/types.ts`

```ts
export type FormatId = '4x5' | '9x16';

export interface PhotoTransform {
  /** Horizontal offset in canvas-space pixels. 0 = centered. */
  offsetX: number;
  /** Vertical offset in canvas-space pixels. 0 = centered. */
  offsetY: number;
  /** Scale factor applied to the image's natural dimensions. zoom = 2.0 means the image is rendered at twice its natural width and height. This value is always ≥ minZoom (the minimum scale at which the image fully covers the Photo_Area with no empty space). A zoom of 1.0 does NOT imply the image fits the area — it means the image is rendered at its natural pixel size. */
  zoom: number;
}

export interface BadgeState {
  format: FormatId;
  name: string;
  role: RoleId;
  /** null = no photo uploaded yet */
  photo: HTMLImageElement | null;
  transform: PhotoTransform;
  /** Minimum allowed zoom for the current photo + active format */
  minZoom: number;
}

export type RoleId =
  | 'PARTICIPANTE'
  | 'SPEAKER'
  | 'ORGANIZADOR'
  | 'VOLUNTARIO';

/** All layout values are in native canvas-space pixels. */
export interface PhotoAreaDef {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Corner clip size (the "octagon" cut). */
  clipCorner: number;
  /** Border gradient: [startColor, endColor] */
  borderGradient: [string, string];
  /** Glow filter string (CSS filter / canvas shadow). */
  glow: string;
}

export interface NameBlockDef {
  x: number;
  y: number;
  maxWidth: number;
  fontFamily: string;
  fontWeight: number;
  fontSize: number;       // default (maximum) font size
  minFontSize: number;    // floor for auto-shrink
  lineHeight: number;
  color: string;
}

export interface RoleBannerDef {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Clip variant: 'hexagon' (4:5) | 'parallelogram' (9:16) */
  clipVariant: 'hexagon' | 'parallelogram';
  border: string;
  background: string;
  textFont: string;
  textSize: number;
  textColor: string;
  letterSpacing: number;
}

export interface LayoutDefinition {
  id: FormatId;
  canvasWidth: number;
  canvasHeight: number;
  background: BackgroundDef;
  photoArea: PhotoAreaDef;
  roleBanner: RoleBannerDef;
  nameBlock: NameBlockDef;
  footer: FooterDef;
}
```

> `BackgroundDef` and `FooterDef` are defined inline in `designSystem.ts` and imported by the layout files. Full TypeScript definitions are part of the implementation task; the above captures the shape used throughout this document.

---

### `src/badge/designSystem.ts`

Exports shared constants derived from both HTML prototypes.

**Colors:**

```ts
export const colors = {
  navy950:   '#04060d',   // 4:5 base / also used as '#03060b' in 9:16 (near-identical)
  navy900:   '#060a16',
  navy800:   '#0a1224',
  cyan:      '#35e7ff',
  cyanDim:   '#1c9db8',
  cyanGlow:  'rgba(53,231,255,0.5)',
  orange:    '#ff9900',
  yellow:    '#ffce54',   // 4:5 corner brackets only
  white:     '#ffffff',
  grey200_45: '#cddaeb',  // 4:5 footer text
  grey200_916:'#c8d3e3',  // 9:16 footer text
  grey400:   '#8b97ac',   // 9:16 meta / terminal text
  mint:      '#6ff2c8',   // 9:16 pill dot / terminal ok / live dot
} as const;
```

**Typography:**

```ts
export const fonts = {
  poppins: 'Poppins, sans-serif',
  jetbrainsMono: "'JetBrains Mono', monospace",
  googleFontsUrl:
    'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900' +
    '&family=JetBrains+Mono:wght@400;500;700&display=swap',
} as const;
```

**Inline SVG paths** (calendar icon, map-pin icon, watermark wireframe) are exported as string constants so they can be used in both the DOM preview and the canvas export renderer.

---

### `src/badge/layouts/layout4x5.ts`

```ts
export const layout4x5: LayoutDefinition = {
  id: '4x5',
  canvasWidth:  1080,
  canvasHeight: 1350,
  // ... (full definition — see §4:5 Layout below)
};
```

### `src/badge/layouts/layout9x16.ts`

```ts
export const layout9x16: LayoutDefinition = {
  id: '9x16',
  canvasWidth:  1080,
  canvasHeight: 1920,
  // ... (full definition — see §9:16 Layout below)
};
```

---

### `src/badge/photoUtils.ts`

```ts
/**
 * Minimum zoom so the image exactly covers the photo area (crop-to-fill).
 */
export function computeMinZoom(
  imgW: number, imgH: number,
  areaW: number, areaH: number
): number {
  return Math.max(areaW / imgW, areaH / imgH);
}

/**
 * Clamp offsets so the photo fully covers the area at the given zoom.
 * Offset (0, 0) = image centered over the area.
 */
export function clampOffset(
  offsetX: number, offsetY: number,
  imgW: number, imgH: number,
  zoom: number,
  areaW: number, areaH: number
): { offsetX: number; offsetY: number } {
  const scaledW = imgW * zoom;
  const scaledH = imgH * zoom;
  const maxX = (scaledW - areaW) / 2;
  const maxY = (scaledH - areaH) / 2;
  return {
    offsetX: Math.max(-maxX, Math.min(maxX, offsetX)),
    offsetY: Math.max(-maxY, Math.min(maxY, offsetY)),
  };
}

/**
 * Scale a PhotoTransform from one format's photo area to another.
 */
export function scaleTransformToFormat(
  t: PhotoTransform,
  oldArea: { width: number; height: number },
  newArea: { width: number; height: number }
): PhotoTransform {
  const sx = newArea.width  / oldArea.width;
  const sy = newArea.height / oldArea.height;
  return {
    zoom:    t.zoom,   // zoom is relative; re-clamping handles correctness
    offsetX: t.offsetX * sx,
    offsetY: t.offsetY * sy,
  };
}

/**
 * Initial Framing: minZoom + centered offsets.
 */
export function computeInitialFraming(
  imgW: number, imgH: number,
  areaW: number, areaH: number
): PhotoTransform {
  return {
    zoom: computeMinZoom(imgW, imgH, areaW, areaH),
    offsetX: 0,
    offsetY: 0,
  };
}
```

---

### `src/badge/exportUtils.ts`

`renderToCanvas(layout, state)` returns an `HTMLCanvasElement` at the layout's native dimensions.

Key steps:

1. **Font preload guard** — await `document.fonts.ready` before drawing any text. If a required font family is not in `document.fonts`, throw with a descriptive message (satisfying requirement 9.5).
2. **Background** — fill background color, draw grid overlay using canvas line patterns, draw radial gradient fills.
3. **Decorative layers** — watermark SVG (via `Path2D`), tech specks, corner brackets (for 4:5).
4. **Event branding** — draw "STUDENT", "COMMUNITY DAY", "COCHABAMBA" subtitle row, AWS logo (via `Path2D`).
5. **Photo** — save context, construct the octagonal clip path using `Path2D`, call `ctx.clip()`, draw the image at the computed position/zoom, restore context.
6. **Role banner** — save context, construct clip path for the active banner variant, clip, fill background, restore, draw text.
7. **Name block** — use `ctx.measureText` in a loop to find the largest font size where the name fits within `nameBlock.maxWidth`. If it still doesn't fit at `minFontSize`, allow line-wrapping.
8. **Footer** — draw icons (via `Path2D` from `designSystem.ts` icon path constants) and text.
9. **9:16 extras** — meta line, pill badge, terminal panel (static decorative text).
10. **Vignette** — draw radial gradient overlay last.

Export trigger:

```ts
export function downloadBadge(layout: LayoutDefinition, state: BadgeState): void {
  const canvas = renderToCanvas(layout, state);
  const link = document.createElement('a');
  link.download = `badge-${layout.id}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
```

If `renderToCanvas` throws, the error propagates to the caller (`App`), which displays the error message and leaves `BadgeState` unchanged.

---

### `src/badge/BadgePreview.tsx`

Renders the live preview using the **scaled-DOM approach**: a wrapper `div` is sized to the scaled preview dimensions; inside it, an inner `div` is sized to the native canvas dimensions (`canvasWidth × canvasHeight`) and transformed with `scale(previewScale)`. All child elements are positioned at native canvas coordinates.

```tsx
const previewScale = wrapperWidth / layout.canvasWidth;

<div style={{ width: layout.canvasWidth * previewScale,
              height: layout.canvasHeight * previewScale,
              overflow: 'hidden', position: 'relative' }}>
  <div style={{
    width: layout.canvasWidth,
    height: layout.canvasHeight,
    transform: `scale(${previewScale})`,
    transformOrigin: 'top left',
    position: 'relative',
  }}>
    {/* layers rendered at native coordinates */}
  </div>
</div>
```

The photo area uses a `div` with `clip-path` matching the octagonal polygon defined in the active `PhotoAreaDef`. The `<img>` inside is positioned using `object-fit: none` with `width`/`height` set to `imgW * zoom` and `left`/`top` computed from the centered offset + `offsetX/offsetY`.

The 9:16 preview renders the flow-column layout inside the same scaled container, replacing absolute positioning with a flex column at native coordinates.

---

### `src/badge/BadgeControls.tsx`

Renders the control panel:

- **Format selector** — two styled buttons (4:5 / 9:16). Active format has a distinct visual treatment (highlighted border/background).
- **Photo upload** — `<input type="file" accept="image/jpeg,image/png,image/webp,image/gif">`. On change: validate type and size (≤10 MB), create `HTMLImageElement`, call `computeInitialFraming`, update `BadgeState`.
- **Name input** — `<input type="text">` bound to `state.name`.
- **Role selector** — `<select>` with four options: Participante, Speaker, Organizador, Voluntario.
- **Zoom slider** — `<input type="range" min={minZoom} max={minZoom * 3} step={0.01}>` bound to `state.transform.zoom`. Disabled when no photo is loaded.
- **Reset Photo button** — calls `computeInitialFraming` for current photo and active format's photo area. Disabled when no photo is loaded.
- **Download button** — calls `downloadBadge(activeLayout, state)`. Disabled during export (loading state); shows an error message if export fails.

---

### `src/App.tsx`

Owns `BadgeState` via `useState`. Provides callbacks to `BadgeControls`. Passes state and the active `LayoutDefinition` (selected from `layout4x5` / `layout9x16` based on `state.format`) to both `BadgePreview` and `BadgeControls`. Handles format switching by calling `scaleTransformToFormat` and re-clamping offsets.

---

## Data Models

### `BadgeState` (runtime)

| Field | Type | Description |
|---|---|---|
| `format` | `FormatId` | Currently active format (`'4x5'` or `'9x16'`) |
| `name` | `string` | Attendee name as entered |
| `role` | `RoleId` | One of the four valid roles |
| `photo` | `HTMLImageElement \| null` | Decoded image element, or null |
| `transform` | `PhotoTransform` | `{ offsetX, offsetY, zoom }` in canvas-space pixels |
| `minZoom` | `number` | Computed from current photo + active format's photo area |

### `PhotoTransform`

| Field | Type | Description |
|---|---|---|
| `offsetX` | `number` | Horizontal displacement from center, clamped |
| `offsetY` | `number` | Vertical displacement from center, clamped |
| `zoom` | `number` | Scale factor; `1.0` = natural image size |

### `LayoutDefinition` (static, per format)

Contains all rendering parameters in native canvas-space pixels. Consumed identically by `BadgePreview` (DOM) and `exportUtils` (Canvas 2D).

---

## Design System — Shared Visual Identity

### Color Palette

| Token | Hex / Value | Usage |
|---|---|---|
| `--navy-950` | `#04060d` (4:5) / `#03060b` (9:16) | Canvas background base |
| `--navy-900` | `#060a16` | Gradient layer |
| `--navy-800` | `#0a1224` | Gradient layer |
| `--cyan` | `#35e7ff` | Primary accent — titles, borders, icons |
| `--cyan-dim` | `#1c9db8` | Secondary accent — role banner brackets (9:16) |
| `--cyan-glow` | `rgba(53,231,255,0.5)` | Text shadow / drop-shadow for cyan elements |
| `--orange` | `#ff9900` | AWS logo arrow / corner gradient endpoint |
| `--yellow` | `#ffce54` | Corner bracket gradient start (4:5 only) |
| `--white` | `#ffffff` | AWS wordmark, "STUDENT" label, name text |
| `--grey-200` (4:5) | `#cddaeb` | Footer text |
| `--grey-200` (9:16) | `#c8d3e3` | Footer text |
| `--grey-400` | `#8b97ac` | Meta line / terminal text (9:16 only) |
| `--mint` | `#6ff2c8` | Pill dot, terminal ok/live (9:16 only) |

### Typography

| Role | Family | Weight | Size | Letter-spacing |
|---|---|---|---|---|
| AWS wordmark | Poppins | 800 | 46px (4:5) / 48px (9:16) | −1px |
| "STUDENT" label | Poppins | 600 | 30px | 10px |
| "COMMUNITY DAY" title | Poppins | 900 | 92px (4:5) / 96px (9:16) | −1px |
| "COCHABAMBA" subtitle | Poppins | 600 | 30px | 8px |
| Role text | Poppins | 700 | 28px (4:5) / 27px (9:16) | 6px (4:5) / 5px (9:16) |
| Attendee name | Poppins | 800 | 58px (4:5) / 62px (9:16) | −0.5px |
| Footer text | Poppins | 500 | 23px (4:5) / 24px (9:16) | — |
| Meta line | JetBrains Mono | 400 | 16px | 0.5px |
| Pill badge | JetBrains Mono | 400 | 16px | 0.5px |
| Terminal | JetBrains Mono | 400 | 16px (body) / 13px (bar) | — |

**Font strategy: self-hosted (preferred for export reliability)**

The prototypes load Poppins and JetBrains Mono from Google Fonts via a `<link>` tag. For a badge generator that must export reliably (including offline or in restricted network environments), the preferred strategy is to **self-host both font families** by downloading the font files and placing them in `public/fonts/`. Declare `@font-face` rules in `src/index.css` pointing to the local files.

If self-hosting is not legally available (e.g., the team does not have the font files), Google Fonts remains acceptable as a fallback — in that case the Google Fonts `<link>` stays in `index.html` and the export renderer must await `document.fonts.ready` before drawing any text, failing with an error if the fonts are not loaded.

Regardless of strategy, the implementation must ensure that Poppins and JetBrains Mono are fully loaded before any canvas export is attempted. The `exportUtils.ts` font preload guard must check `document.fonts.check('800 1em Poppins')` and `document.fonts.check('700 1em "JetBrains Mono"')` before rendering.

**Decision required:** The team must choose one of these strategies before implementation begins:
1. **Self-hosted** — download Poppins (weights 400/500/600/700/800/900) and JetBrains Mono (weights 400/500/700) and add to `public/fonts/`. Update `src/index.css` with `@font-face` declarations. Remove the Google Fonts `<link>` from `index.html`.
2. **Google Fonts** — keep the `<link>` in `index.html`, add `document.fonts.ready` guard in export.

The `fonts` export in `designSystem.ts` removes `googleFontsUrl` and instead exports only the font-family strings (`poppins` and `jetbrainsMono`). The font loading mechanism is configured outside `designSystem.ts`.

---

## 4:5 Layout — Canvas 1080 × 1350 px

### Layer Stack (z-index order, bottom to top)

#### Layer 1 — Background (z-index 0)

- **Base fill:** `#04060d`
- **Grid overlay (`::before`):** `background-image: linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px); background-size: 54px 54px`
- **Radial gradients:**
  - `radial-gradient(ellipse 900px 600px at 28% 8%, #0d1c34 0%, transparent 60%)`
  - `radial-gradient(ellipse 700px 500px at 85% 92%, #0a1a2a 0%, transparent 55%)`

#### Layer 2 — Watermark (z-index 1)

- Position: `left: -40px, top: 330px`
- Size: `width: 320px, height: 700px`
- Opacity: `0.11`
- Stroke color: `#35e7ff`, stroke-width: 1
- SVG viewBox: `0 0 200 420`
- Path: wireframe human figure — circle (cx=100, cy=46, r=30), torso line (100,76 → 100,240), arms (100,110 → 20,180 and 100,110 → 180,180), legs (100,240 → 40,400 and 100,240 → 160,400), shoulder bar (60,130 → 140,130), hip bar (55,170 → 145,170)

#### Layer 3 — Tech Specks (z-index 1)

Six small cyan-bordered squares scattered along the right edge:

| top | left | width | height | opacity |
|---|---|---|---|---|
| 96px | 960px | 14px | 14px | 0.35 (default) |
| 210px | 1006px | 9px | 9px | 0.50 |
| 470px | 985px | 11px | 11px | 0.35 |
| 640px | 1015px | 16px | 16px | 0.25 |
| 900px | 970px | 10px | 10px | 0.35 |
| 1060px | 1008px | 13px | 13px | 0.30 |

Style: `border: 1.5px solid #35e7ff; background: transparent`

#### Layer 4 — Corner Brackets (z-index 3)

Each bracket is a 132×132 px region made of two 6 px thick bars.

**Top-left corner** — anchor `top: 40px, left: 40px`:
- H bar: `top:0, left:0, width:132px, height:6px, background: linear-gradient(90deg, #ffce54, #ff9900)`
- V bar: `top:0, left:0, width:6px, height:132px, background: linear-gradient(180deg, #ffce54, #ff9900)`

**Bottom-right corner** — anchor `bottom: 40px, right: 40px`:
- H bar: `bottom:0, right:0, width:132px, height:6px, background: linear-gradient(270deg, #ffce54, #ff9900)`
- V bar: `bottom:0, right:0, width:6px, height:132px, background: linear-gradient(0deg, #ffce54, #ff9900)`

Bar border-radius: `3px`.

#### Layer 5 — Photo Frame (z-index 3)

- Position: `top: 352px, left: 240px`
- Size: `width: 600px, height: 600px`
- **Outer clip (octagon):**  
  `polygon(50px 0, calc(100% - 50px) 0, 100% 50px, 100% calc(100% - 50px), calc(100% - 50px) 100%, 50px 100%, 0 calc(100% - 50px), 0 50px)`
- Border simulation: `padding: 3px; background: linear-gradient(135deg, #35e7ff, #0d6e82)`
- Glow: `filter: drop-shadow(0 0 22px rgba(53,231,255,.5)) drop-shadow(0 0 50px rgba(53,231,255,.22))`
- **Inner clip (octagon, inset by 3px):**  
  `polygon(47px 0, calc(100% - 47px) 0, 100% 47px, 100% calc(100% - 47px), calc(100% - 47px) 100%, 47px 100%, 0 calc(100% - 47px), 0 47px)`
- Inner background: `#0a1420`
- Photo rendering: `object-fit: cover`, initial `object-position: 50% 22%`

#### Layer 6 — AWS Logo Block (z-index 4)

- Position: `top: 60px, left: 50%, transform: translateX(-50%)`
- Container width: `196px`
- **"aws" wordmark:** Poppins 800, 46px, `#ffffff`, letter-spacing −1px, line-height 1
- **Underline arrow SVG:** `width: 180px, height: 34px`, viewBox `0 0 210 50`

> **⚠ Production asset required.** The prototype uses a CSS/SVG approximation of the AWS wordmark. The production implementation MUST use the official AWS logo/wordmark SVG asset obtained from AWS Brand Guidelines or the event organizer. The approximate path MUST NOT be used as the final implementation. The `designSystem.ts` file must export an `awsLogoSvgPath` constant that is a placeholder (`null` or an empty string) until the official asset is provided. The export renderer must check for this asset and halt with an error if it is absent (per error handling table row: "Export: required asset (AWS logo) not loadable"). The preview component must show a clearly labeled placeholder ("AWS Logo — Pendiente") when the official asset is not yet loaded.

#### Layer 7 — "STUDENT" Label (z-index 4)

- Position: `top: 150px`, full width, `text-align: center`
- Poppins 600, 30px, `#ffffff`, letter-spacing 10px

#### Layer 8 — "COMMUNITY DAY" Title (z-index 4)

- Position: `top: 182px`, full width, `text-align: center`
- Poppins 900, 92px, line-height 0.95, letter-spacing −1px, color `#35e7ff`
- Text shadow: `0 0 18px rgba(53,231,255,.5), 0 0 46px rgba(53,231,255,.3)`

#### Layer 9 — Subtitle Row (z-index 4)

- Position: `top: 300px`, full width, centered flex row, gap 16px
- Left ornament line: `width: 96px, height: 1px`, background `#35e7ff`, opacity 0.55
- Left dot: `width: 6px, height: 6px`, border-radius 50%, background `#35e7ff`, opacity 0.8
- **"COCHABAMBA" text:** Poppins 600, 30px, letter-spacing 8px, `#35e7ff`
- Right dot: same as left dot
- Right ornament line: same as left ornament line

#### Layer 10 — Role Banner (z-index 4)

- Position: `top: 978px, left: 240px`
- Size: `width: 600px, height: 66px`
- **Clip (hexagonal / pointed sides):**  
  `polygon(14px 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 14px 100%, 0 50%)`
- Border: `1px solid rgba(53,231,255,.7)`
- Background: `rgba(53,231,255,.06)`
- Contents (flex row, centered, gap 22px):
  - Left chevron `«`: Poppins 700, 20px, letter-spacing −2px, `#35e7ff`
  - **Role text:** Poppins 700, 28px, letter-spacing 6px, `#35e7ff` — dynamic (reflects selected role)
  - Right chevron `»`: same as left

#### Layer 11 — Name Block (z-index 4)

- Position: `top: 1064px, left: 84px`
- Max width: `820px`
- **Default typography:** Poppins 800, 58px, line-height 1.08, `#ffffff`, letter-spacing −0.5px
- **Overflow handling:** if name exceeds `maxWidth` at 58px, reduce font size in steps of 1px down to a minimum of 28px. If still overflowing at minimum size, allow text to wrap to a second line. The name must not overlap the role banner above (top: 978px + 66px = 1044px, name starts at 1064px → 20px clearance) or the footer below (top: 1218px).

#### Layer 12 — Footer Row (z-index 4)

- Position: `top: 1218px, left: 84px`
- Flex row, gap 18px, align-items center
- Font: Poppins 500, 23px, `#cddaeb`
- **Calendar icon:** inline SVG `20×20`, stroke `#35e7ff`, stroke-width 2 — `<rect x="3" y="5" width="18" height="16" rx="2"/>` + `<line x1="3" y1="10" x2="21" y2="10"/>` + `<line x1="8" y1="3" x2="8" y2="7"/>` + `<line x1="16" y1="3" x2="16" y2="7"/>`
- Text: `"10 October 2026"`
- Divider: `|`, color `rgba(255,255,255,.3)`, font-weight 300
- **Map-pin icon:** inline SVG `20×20`, stroke `#35e7ff`, stroke-width 2 — `<path d="M12 22s7-7.2 7-12a7 7 0 1 0-14 0c0 4.8 7 12 7 12z"/>` + `<circle cx="12" cy="10" r="2.5"/>`
- Text: `"Cochabamba, Bolivia"`

#### Layer 13 — Vignette (z-index 6)

- `position: absolute, inset: 0`, pointer-events none
- `radial-gradient(ellipse at 50% 45%, transparent 45%, rgba(0,0,0,.55) 100%)`

---

## 9:16 Layout — Canvas 1080 × 1920 px

### Layer Stack

#### Layer 1 — Background (z-index 0)

- **Base fill:** `#03060b`
- **Grid overlay (`::before`):** `background-image: linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px); background-size: 48px 48px`
- **Cyan glow overlays (`::after`):**
  - `radial-gradient(560px 520px at 88% 70%, rgba(53,231,255,.14) 0%, transparent 60%)`
  - `radial-gradient(700px 500px at 10% 4%, rgba(53,231,255,.08) 0%, transparent 55%)`

#### Layer 2 — Vignette (z-index 7)

- `position: absolute, inset: 0`, pointer-events none
- `radial-gradient(ellipse at 50% 40%, transparent 50%, rgba(0,0,0,.5) 100%)`

#### Layer 3 — Content Column (z-index 2)

Centered flex column, `padding-top: 70px`, `gap: 24px`, `align-items: center`.

**Elements in flow order:**

---

**1. Meta line** — full width with `padding: 0 70px`

- Layout: flex row, `justify-content: space-between`
- Font: JetBrains Mono 400, 16px, letter-spacing 0.5px, `#8b97ac`, opacity 0.85
- Left: `// COCHABAMBA · BOLIVIA`
- Right: `SYS // SCD · 2026`

---

**2. Pill badge**

- Display: inline-flex, align-items center, gap 10px
- Border: `1px solid rgba(53,231,255,.45)`, border-radius 999px
- Padding: `10px 22px`
- Background: `rgba(53,231,255,.05)`
- Font: JetBrains Mono 400, 16px, letter-spacing 0.5px, `#35e7ff`
- Dot: `7×7px`, border-radius 50%, background `#6ff2c8` — pulsing animation (opacity 1→0.35→1, 1.8s ease-in-out infinite)
- Text: `"AWS STUDENT COMMUNITY DAY · BOLIVIA · 2026"`

---

**3. AWS Logo** — width 206px, centered

- **"aws" wordmark:** Poppins 800, 48px, `#ffffff`, letter-spacing −1px, line-height 1
- **Underline arrow SVG:** `width: 190px, height: 36px`, same path as 4:5 version with `#ff9900`

> **⚠ Production asset required.** The prototype uses a CSS/SVG approximation of the AWS wordmark. The production implementation MUST use the official AWS logo/wordmark SVG asset obtained from AWS Brand Guidelines or the event organizer. The approximate path MUST NOT be used as the final implementation. The `designSystem.ts` file must export an `awsLogoSvgPath` constant that is a placeholder (`null` or an empty string) until the official asset is provided. The export renderer must check for this asset and halt with an error if it is absent (per error handling table row: "Export: required asset (AWS logo) not loadable"). The preview component must show a clearly labeled placeholder ("AWS Logo — Pendiente") when the official asset is not yet loaded.

---

**4. "STUDENT" label**

- Poppins 600, 30px, letter-spacing 10px, `#ffffff`

---

**5. "COMMUNITY DAY" title (h1)**

- Poppins 900, 96px, line-height 0.95, letter-spacing −1px, `#35e7ff`, text-align center
- Text shadow: `0 0 18px rgba(53,231,255,.5), 0 0 46px rgba(53,231,255,.3)`
- Two lines: `"COMMUNITY"` / `"DAY"`

---

**6. Subtitle row**

- Same structure as 4:5: 96px ornament lines + 6px dots + "COCHABAMBA" (Poppins 600, 30px, letter-spacing 8px, `#35e7ff`)

---

**7. Photo frame** — width 680px, height 680px

- Canvas-space position: x = 200px, y = 610px (see Photo Area Dimensions for derivation and verification note).
- **Outer clip (octagon):**  
  `polygon(52px 0, calc(100% - 52px) 0, 100% 52px, 100% calc(100% - 52px), calc(100% - 52px) 100%, 52px 100%, 0 calc(100% - 52px), 0 52px)`
- Border simulation: `padding: 3px; background: linear-gradient(135deg, #35e7ff, #0d6e82)`
- Glow: `filter: drop-shadow(0 0 22px rgba(53,231,255,.5)) drop-shadow(0 0 50px rgba(53,231,255,.22))`
- **Inner clip (octagon, inset by 3px):**  
  `polygon(49px 0, calc(100% - 49px) 0, 100% 49px, 100% calc(100% - 49px), calc(100% - 49px) 100%, 49px 100%, 0 calc(100% - 49px), 0 49px)`
- Inner background: `#0a1420`
- Photo rendering: `object-fit: cover`, initial `object-position: 50% 20%`

---

**8. Role banner** — width 680px, height 66px

- **Clip (parallelogram — different from 4:5 hexagon):**  
  `polygon(10px 0, calc(100% - 10px) 0, 100% 100%, 0 100%)`
- Border: `1px solid rgba(53,231,255,.7)`
- Background: `rgba(53,231,255,.06)`
- Font family: JetBrains Mono (container), Poppins for role text
- Left bracket `[`: `#1c9db8`, 26px
- **Role text:** Poppins 700, 27px, letter-spacing 5px, `#35e7ff` — dynamic
- Right bracket `]`: `#1c9db8`, 26px

---

**9. Left block** — width 860px

**Name:**
- Poppins 800, 62px, line-height 1.08, `#ffffff`, letter-spacing −0.5px
- Same overflow rule as 4:5: shrink by 1px steps to minimum 28px, then wrap if still overflowing. Must not overlap role banner above or footer below.

**Footer row** (margin-top 22px):
- Flex row, gap 18px, align-items center
- Font: Poppins 500, 24px, `#c8d3e3`
- Same icon + text pattern as 4:5 footer: calendar icon + "10 October 2026" | map-pin icon + "Cochabamba, Bolivia"

---

**10. Terminal panel** — width 860px (decorative, static in export)

- Border-radius 10px, background `rgba(6,14,20,.75)`, border `1px solid rgba(53,231,255,.25)`, backdrop-filter `blur(2px)`
- **Terminal bar** (border-bottom `1px solid rgba(53,231,255,.15)`, padding `10px 16px`):
  - Three traffic-light dots: `9×9px`, border-radius 50%, background `#3a4658`
  - Center label: `"SCD-CLI // BADGE.ZSH"` — JetBrains Mono 13px, `#8b97ac`
  - Right: live dot (`6×6px`, `#6ff2c8`) + `"LIVE"` — `#6ff2c8`
- **Terminal body** (padding `16px 18px 20px`):
  - JetBrains Mono 16px, line-height 1.7
  - Line 1: `badge@scd` in `#35e7ff` + ` ~ $ issue --participant` in default
  - Line 2: `> verifying registration...` in `#8b97ac`
  - Line 3: `> role: ` in `#8b97ac` + `[ROLE]` — dynamically reflects current role in both preview and export
  - Line 4: `✓ badge generated` in `#6ff2c8`
  - Line 5: `badge@scd` in `#35e7ff` + ` ~ $ ` + blinking cursor block (`9×16px`, `#35e7ff`)
  - Cursor animation: `blink 1s steps(1) infinite` (opacity 0↔1 at 50%). Rendered as a static filled rectangle in export.

---

## Photo Behavior (Both Formats)

### Photo Area Dimensions

| Format | x | y | width | height | clipCorner |
|---|---|---|---|---|---|
| 4:5 | 240px | 352px | 600px | 600px | 50px (outer) / 47px (inner) |
| 9:16 | 200px | 610px* | 680px | 680px | 52px (outer) / 49px (inner) |

**9:16 photo area canvas coordinates:** x = (1080 − 680) / 2 = **200px** (centered). y = **610px** (computed from the flex-column layout: padding-top 70 + meta line ~19 + gap 24 + pill ~40 + gap 24 + AWS logo 82 + gap 24 + "STUDENT" ~36 + gap 24 + "COMMUNITY DAY" ~183 + gap 24 + subtitle row ~36 + gap 24 = ~610px).

⚠ This value is computed from CSS first principles. It must be verified against a browser rendering of `design-reference/badge-9x16.html` (e.g., using browser DevTools to inspect the `.photo-frame` element's `getBoundingClientRect()` at 1:1 scale) before the layout file is finalized. Until verified, treat 610px as the design baseline.

### Initial Framing

On upload:

```
minZoom = max(photoAreaWidth / imgNaturalWidth, photoAreaHeight / imgNaturalHeight)
transform = { zoom: minZoom, offsetX: 0, offsetY: 0 }
```

This guarantees the photo fully covers the photo area with no empty space at the smallest zoom level, centered.

### Zoom Range

- **Minimum:** `minZoom` (computed above)
- **Maximum:** `minZoom * 3` (implementation may tune; must ensure area remains fully covered at all values in range)

### Drag Clamping

At a given zoom level:

```
scaledW = imgNaturalWidth  * zoom
scaledH = imgNaturalHeight * zoom
maxOffsetX = (scaledW - photoAreaWidth)  / 2
maxOffsetY = (scaledH - photoAreaHeight) / 2
offsetX = clamp(rawOffsetX, -maxOffsetX, maxOffsetX)
offsetY = clamp(rawOffsetY, -maxOffsetY, maxOffsetY)
```

### Format Switch Transform Preservation

When the user switches format, apply `scaleTransformToFormat` before updating `BadgeState`:

```
newOffsetX = oldOffsetX * (newArea.width  / oldArea.width)
newOffsetY = oldOffsetY * (newArea.height / oldArea.height)
zoom = unchanged (re-clamped to new minZoom if needed)
```

Then recompute `minZoom` for the new format's photo area, re-clamp offsets.

### Clipping in Preview

Apply CSS `clip-path` with the octagonal polygon on the photo area container div. The `overflow: hidden` on the inner div also clips the photo to the rectangular bounds; the clip-path refines it to the octagonal shape.

### Clipping in Export

```ts
ctx.save();
const path = new Path2D();
const { x, y, width: w, height: h, clipCorner: c } = area;
path.moveTo(x + c, y);
path.lineTo(x + w - c, y);
path.lineTo(x + w, y + c);
path.lineTo(x + w, y + h - c);
path.lineTo(x + w - c, y + h);
path.lineTo(x + c, y + h);
path.lineTo(x, y + h - c);
path.lineTo(x, y + c);
path.closePath();
ctx.clip(path);
// draw image at computed position/zoom
ctx.drawImage(img, drawX, drawY, scaledW, scaledH);
ctx.restore();
```

Where `drawX = x + w/2 - scaledW/2 + offsetX` and `drawY = y + h/2 - scaledH/2 + offsetY`.

---

## Preview and Export — Unified Coordinate System

### Preview (DOM, CSS transform)

The `BadgePreview` component wraps the canvas-sized div in a container that is sized to the available viewport width. A single `scale(previewScale)` transform (applied with `transform-origin: top left`) makes all native-coordinate elements appear at the correct proportional size without recomputing any positions:

```
previewScale = containerWidth / layout.canvasWidth
containerHeight = layout.canvasHeight * previewScale
```

All child elements use native canvas coordinates. No coordinate translation is needed.

### Export (Canvas 2D)

An offscreen `HTMLCanvasElement` is created at `layout.canvasWidth × layout.canvasHeight`. The same `LayoutDefinition` values drive all `ctx.fillText`, `ctx.drawImage`, and `ctx.fillRect` calls. Pixel-perfect match with the preview is guaranteed because both use identical coordinate values.

### 9:16 Layout: Absolute Coordinates for Export Fidelity

The 9:16 prototype uses a CSS flexbox column for its layout. However, to guarantee preview/export parity, the `layout9x16.ts` `LayoutDefinition` must define **absolute canvas-space coordinates** for every element — not flow-based values.

The implementation approach is:
1. The absolute y-coordinates for all 9:16 elements are derived from the CSS flow (padding-top + cumulative element heights + gaps), as calculated in the Photo Area Dimensions section.
2. These absolute values are baked into `layout9x16.ts` as static numbers, just like `layout4x5.ts`.
3. The `BadgePreview` component for 9:16 uses these same absolute coordinates (via `position: absolute` on each element inside the scaled container), not a CSS flex column. This eliminates any font-metric-driven drift between preview and export.
4. The absolute y-coordinates must be verified against the prototype's browser rendering before the layout file is finalized (see verification note in Photo Area Dimensions).

This means both `layout4x5.ts` and `layout9x16.ts` have the same structure: fully absolute coordinates in canvas-space. The `BadgePreview` component has a single rendering path for both formats.

### Name Overflow Algorithm (Canvas 2D)

```ts
let fontSize = nameBlock.fontSize; // 58 (4:5) or 62 (9:16)
ctx.font = `800 ${fontSize}px Poppins, sans-serif`;
while (ctx.measureText(name).width > nameBlock.maxWidth && fontSize > nameBlock.minFontSize) {
  fontSize -= 1;
  ctx.font = `800 ${fontSize}px Poppins, sans-serif`;
}
if (ctx.measureText(name).width > nameBlock.maxWidth) {
  // word-wrap: split at word boundaries, render two lines
}
```

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Upload: invalid type or size > 10 MB | Display inline error message with accepted types and size limit. `BadgeState.photo` unchanged. |
| Upload: valid file, image decode error | Display error "Could not load image." `BadgeState.photo` unchanged. |
| Export: required font not loaded | Halt export. Display error: "Required font [name] is not available. Please check your internet connection." No download initiated. `BadgeState` unchanged. |
| Export: required asset (AWS logo) not loadable | Halt export. Display error: "Required asset [name] could not be loaded." No partial badge produced. `BadgeState` unchanged. |
| Export: canvas `toDataURL` throws (e.g., tainted canvas from cross-origin photo) | Halt export. Display error: "Export failed. The uploaded image may be from a restricted source." `BadgeState` unchanged. |
| Export: any other runtime error | Halt export. Display generic error message. `BadgeState` unchanged. Download button re-enabled. |

---

## Required Assets

| Asset | Source | Status |
|---|---|---|
| AWS logo / wordmark SVG | Official AWS Brand Guidelines or event organizer | **BLOCKED — The approximate SVG in the prototype MUST NOT be used in production. The official asset must be obtained before any export functionality is enabled. `designSystem.ts` exports `awsLogoSvgPath: null` as placeholder. Preview shows a labeled placeholder. Export halts if asset is null.** |
| Poppins font | Self-hosted (preferred) or Google Fonts (fallback) | **Font strategy decision required before implementation. If self-hosted: add files to `public/fonts/`, declare `@font-face` in `index.css`. Either way: must be verified loaded before export via `document.fonts.check()`.** |
| JetBrains Mono font | Self-hosted (preferred) or Google Fonts (fallback) | **Same as Poppins. Used only in 9:16 format (meta line, pill, role banner brackets, terminal panel).** |
| Calendar icon SVG | Derived from prototype inline SVG | Reproducible as a constant in `designSystem.ts`. |
| Map-pin icon SVG | Derived from prototype inline SVG | Reproducible as a constant in `designSystem.ts`. |
| Watermark wireframe SVG | Derived from prototype inline SVG | Reproducible as a constant in `designSystem.ts`. |

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Photo coverage invariant

*For any* image with natural dimensions `(imgW, imgH)`, any photo area dimensions `(areaW, areaH)`, any zoom value `z` in `[computeMinZoom(imgW, imgH, areaW, areaH), maxZoom]`, and any offset `(ox, oy)` returned by `clampOffset`, the rendered photo rectangle `[cx + ox - (imgW*z)/2, cy + oy - (imgH*z)/2, imgW*z, imgH*z]` fully contains the photo area rectangle `[0, 0, areaW, areaH]` — i.e., no pixel of the photo area is uncovered.

**Validates: Requirements 3.1, 3.2**

### Property 2: Name text no-overflow invariant

*For any* attendee name string and any active format, the result of the name-fitting algorithm (font-size reduction + optional line-wrap) produces rendered text whose bounding box fits within `[nameBlock.x, nameBlock.y, nameBlock.maxWidth, nameBlock.y + availableHeight]`, where `availableHeight` is the distance to the footer row top.

**Validates: Requirements 8.3, 8.4**

### Property 3: Export dimension invariant

*For any* valid `BadgeState` with `format = '4x5'`, `renderToCanvas(layout4x5, state)` returns a canvas with `width = 1080` and `height = 1350`. *For any* valid `BadgeState` with `format = '9x16'`, `renderToCanvas(layout9x16, state)` returns a canvas with `width = 1080` and `height = 1920`.

**Validates: Requirements 6.2, 6.3**

### Property 4: Format-switch transform round-trip invariant

*For any* `PhotoTransform` `t` and any pair of formats A and B, applying `scaleTransformToFormat` from A→B then B→A produces a transform `t'` where `|t'.offsetX - t.offsetX| ≤ 1` and `|t'.offsetY - t.offsetY| ≤ 1` (rounding tolerance). The zoom value is preserved exactly.

**Validates: Requirements 1.3, 3.5**

### Property 5: File validation rejection invariant

*For any* file with a MIME type not in `{image/jpeg, image/png, image/webp, image/gif}`, or with `size > 10 * 1024 * 1024` bytes, the upload validation function returns an error result and the `BadgeState.photo` field remains unchanged.

**Validates: Requirements 2.2**

### Property 6: Initial framing coverage invariant

*For any* image dimensions `(imgW, imgH)` and photo area dimensions `(areaW, areaH)`, `computeInitialFraming` returns a transform where `zoom * imgW ≥ areaW` and `zoom * imgH ≥ areaH` (the image covers the area in both dimensions), and `offsetX = 0`, `offsetY = 0`.

**Validates: Requirements 2.3, 4.2**

### Property 7: Export state-preservation invariant

*For any* `BadgeState` s, if `renderToCanvas` throws an error, the `BadgeState` observed by the caller after the error equals s (no mutation of state has occurred as a side-effect of the failed export).

**Validates: Requirements 6.7**

---

## Testing Strategy

### Unit Tests (Vitest)

Target the pure utility functions in `photoUtils.ts` and the validation logic in `BadgeControls`.

- `computeMinZoom`: verify that `zoom * imgW ≥ areaW` and `zoom * imgH ≥ areaH` for representative dimension combinations, including portrait/landscape/square images against portrait/square areas.
- `clampOffset`: verify that clamped offsets always keep the image within the area — specific examples covering zero offset, maximum positive/negative offsets, and boundary values.
- `scaleTransformToFormat`: verify correct scaling ratios with concrete format pairs; verify round-trip within 1px.
- `computeInitialFraming`: verify zoom ≥ required cover and offsets are zero for a representative set of image/area dimensions.
- File validation: verify rejection for wrong MIME types (PDF, SVG, BMP, text/plain), files over 10 MB, and acceptance for each valid type at 10 MB boundary.
- Name overflow algorithm: verify that for a very long name string, the algorithm terminates and the measured width fits within `maxWidth`.

### Property-Based Tests (fast-check)

Use [fast-check](https://github.com/dubzzz/fast-check) with a minimum of 100 iterations per property.

Tag format: `// Feature: aws-student-community-day-badge-generator, Property N: <property text>`

- **Property 1**: generate arbitrary `(imgW, imgH)` in [1, 4000], `(areaW, areaH)` in [100, 1080], zoom from `[minZoom, minZoom * 3]`, raw offsets from `[-10000, 10000]`. Assert `clampOffset` result satisfies coverage condition.
- **Property 2**: generate arbitrary UTF-8 name strings of length [0, 200]. Assert the name-fitting algorithm output width ≤ `maxWidth` for both formats.
- **Property 3**: generate arbitrary valid `BadgeState` values. Assert `renderToCanvas` output canvas dimensions match the expected format dimensions.
- **Property 4**: generate arbitrary `(offsetX, offsetY)` in `[-500, 500]` and zoom in `[0.1, 5.0]`. Assert round-trip `scaleTransformToFormat` stays within 1px.
- **Property 5**: generate arbitrary `(mimeType, fileSize)` pairs where `mimeType` is not in the accepted set or `fileSize > 10_485_760`. Assert validation returns an error.
- **Property 6**: generate arbitrary `(imgW, imgH)` and `(areaW, areaH)`. Assert `computeInitialFraming` satisfies coverage and zero-offset conditions.
- **Property 7**: test that calling the export error-handling path with a simulated throw leaves the input `BadgeState` object identity unchanged.

### Integration / Visual Tests

- Render `BadgePreview` at preview scale for both formats with a placeholder photo and verify the DOM contains the expected text content (event name, date, location, role, name).
- Verify the format selector shows exactly two options and the default-selected format is 4:5.
- Verify that the download button is disabled while export is in progress (mock `renderToCanvas` to be async/slow).
- Verify that uploading a file with an invalid type displays the error message and does not update the photo area.

### Manual / Visual Regression

The final visual output should be compared against the HTML prototype reference files (`design-reference/badge-4x5.html` and `design-reference/badge-9x16.html`) for:

- Color accuracy (especially the cyan glow effects and background gradients)
- Typography rendering (font weights, letter-spacing, line-height)
- Photo clipping to the octagonal shape with glow
- Corner bracket gradients (4:5)
- Role banner shape difference (hexagon in 4:5, parallelogram in 9:16)
- Terminal panel rendering (9:16)

> **Note**: CSS animations (pill dot pulse, terminal cursor blink) are present in the HTML prototype previews but are not reproducible in the static PNG export. The export renders the cursor as a solid filled rectangle and the pill dot at full opacity.
