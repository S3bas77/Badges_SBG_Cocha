# Implementation Plan: AWS Student Community Day Badge Generator

## Overview

Implement a client-side React + TypeScript + Vite single-page application that lets attendees upload a photo, personalize name and role, preview a badge in real time (4:5 or 9:16 format), and download a full-resolution PNG. All compositing runs in the browser — no server or external dependencies beyond the existing `react` / `react-dom` packages. The plan follows the architecture and coordinate data in `design.md` exactly.

---

## Tasks

- [ ] 1. Project setup and font strategy
  - [ ] 1.1 Install Vitest and fast-check for testing
    - Run `npm install --save-dev vitest @vitest/ui jsdom @testing-library/react @testing-library/user-event fast-check`
    - Add a `test` script (`"vitest --run"`) and a `test:watch` script (`"vitest"`) to `package.json`
    - Add a `vitest.config.ts` (or extend `vite.config.ts`) with `environment: 'jsdom'` and globals enabled
    - Add a `setupTests.ts` for any global test configuration
    - _Requirements: Testing Strategy (design.md)_

  - [ ] 1.2 Apply font strategy — Google Fonts fallback path
    - Add the Google Fonts `<link>` tag for Poppins (weights 400/500/600/700/800/900) and JetBrains Mono (weights 400/500/700) to `index.html` if not already present
    - Add the corresponding `@import` or `@font-face` declarations to `src/index.css` so the font-family strings `'Poppins, sans-serif'` and `"'JetBrains Mono', monospace"` resolve correctly
    - **Note:** If the team later switches to self-hosting, place font files in `public/fonts/` and replace the `<link>` with `@font-face` rules in `src/index.css`. The export guard in `exportUtils.ts` (task 8) is strategy-agnostic.
    - _Requirements: 9.5, design.md Font Strategy section_

- [ ] 2. Core type definitions — `src/badge/types.ts`
  - [ ] 2.1 Create `src/badge/types.ts` with all exported types
    - Define `FormatId = '4x5' | '9x16'`
    - Define `RoleId = 'PARTICIPANTE' | 'SPEAKER' | 'ORGANIZADOR' | 'VOLUNTARIO'`
    - Define `PhotoTransform { offsetX: number; offsetY: number; zoom: number }`
    - Define `BadgeState { format, name, role, photo, transform, minZoom }` exactly as specified in design.md Data Models section
    - Define `PhotoAreaDef`, `NameBlockDef`, `RoleBannerDef`, `BackgroundDef`, `FooterDef`, `LayoutDefinition` exactly as specified in design.md Components and Interfaces section
    - _Requirements: 1.1, 2.3, 3.1, 3.2, 6.2, 6.3_

- [ ] 3. Design system constants — `src/badge/designSystem.ts`
  - [ ] 3.1 Create `src/badge/designSystem.ts` with all shared constants
    - Export `colors` object with all 11 tokens from the Color Palette table in design.md
    - Export `fonts` object with `poppins` and `jetbrainsMono` family strings only (no `googleFontsUrl`)
    - Export `awsLogoSrc: string | null` — initialized to `null` as a placeholder. **No approximate SVG path is permitted.** This field must remain `null` until the official AWS asset is obtained (task 15). Once the official asset is in place it will be a string path such as `'/assets/aws-logo.svg'`. The watermark, calendar icon, and map-pin icon remain as `Path2D` constants and are separate from this field.
    - Export calendar icon SVG path string (`calendarIconPath`) derived from the inline SVG in design.md Layer 12 (footer)
    - Export map-pin icon SVG path string (`mapPinIconPath`) derived from the inline SVG in design.md Layer 12 (footer)
    - Export watermark wireframe SVG path string (`watermarkPath`) derived from the inline SVG in design.md Layer 2 (4:5 Watermark)
    - _Requirements: 9.1, 9.2, 9.3, 9.5_

- [ ] 4. Photo utility functions — `src/badge/photoUtils.ts`
  - [ ] 4.1 Implement `computeMinZoom`, `clampOffset`, `scaleTransformToFormat`, `computeInitialFraming`
    - Implement each function with the exact signature and algorithm shown in design.md `photoUtils.ts` section
    - `computeMinZoom(imgW, imgH, areaW, areaH)` → `Math.max(areaW/imgW, areaH/imgH)`
    - **Zoom range — MVP implementation decision:** `maxZoom = minZoom * 3`. This is derived from the "technically reasonable upper bound" stated in Requirement 3.2. A factor of 3× over the minimum cover zoom provides sufficient close-up framing range for typical portrait photos. This value is an implementation choice, not a fixed design constraint — it may be tuned in future iterations without violating the requirement, provided the Photo_Area remains fully covered at all zoom levels within the range.
    - `clampOffset(offsetX, offsetY, imgW, imgH, zoom, areaW, areaH)` → clamped `{offsetX, offsetY}` per drag-clamping formula in design.md
    - `scaleTransformToFormat(t, oldArea, newArea)` → proportionally scaled offsets, zoom unchanged
    - `computeInitialFraming(imgW, imgH, areaW, areaH)` → `{ zoom: computeMinZoom(...), offsetX: 0, offsetY: 0 }`
    - Export all four functions
    - _Requirements: 2.3, 3.1, 3.2, 3.5, 4.2_

  - [ ]* 4.2 Write property tests for photo utilities (Properties 1, 4, 5, 6)
    - Tag: `// Feature: aws-student-community-day-badge-generator, Property 1: Photo coverage invariant`
    - **Property 1:** Generate `(imgW, imgH)` ∈ [1,4000], `(areaW, areaH)` ∈ [100,1080], zoom ∈ [minZoom, minZoom*3], raw offsets ∈ [-10000,10000]. Assert `clampOffset` result keeps rendered rect fully containing area rect. **Validates: Requirements 3.1, 3.2**
    - Tag: `// Feature: aws-student-community-day-badge-generator, Property 4: Format-switch transform round-trip invariant`
    - **Property 4:** Generate arbitrary `(offsetX, offsetY)` ∈ [-500,500] and zoom ∈ [0.1,5.0]. Assert A→B→A round-trip via `scaleTransformToFormat` stays within 1px on both axes; zoom preserved exactly. **Validates: Requirements 1.3, 3.5**
    - Tag: `// Feature: aws-student-community-day-badge-generator, Property 5: File validation rejection invariant`
    - **Property 5:** Generate arbitrary `(mimeType, fileSize)` where mimeType ∉ `{image/jpeg, image/png, image/webp, image/gif}` or `fileSize > 10_485_760`. Assert validation returns an error and photo state unchanged. **Validates: Requirements 2.2**
    - Tag: `// Feature: aws-student-community-day-badge-generator, Property 6: Initial framing coverage invariant`
    - **Property 6:** Generate arbitrary `(imgW, imgH)` and `(areaW, areaH)`. Assert `computeInitialFraming` returns `zoom * imgW ≥ areaW` and `zoom * imgH ≥ areaH`, `offsetX = 0`, `offsetY = 0`. **Validates: Requirements 2.3, 4.2**
    - Use `fc.integer`, `fc.float`, `fc.string`, minimum 100 iterations per property
    - _Requirements: 2.2, 2.3, 3.1, 3.2, 3.5, 4.2_

  - [ ]* 4.3 Write unit tests for photo utilities
    - `computeMinZoom`: portrait/landscape/square images against portrait/square areas
    - `clampOffset`: zero offset, max positive/negative offsets, boundary values
    - `scaleTransformToFormat`: correct scaling ratios for 4:5↔9:16 area pairs; round-trip within 1px
    - `computeInitialFraming`: representative dimension sets — verify zoom ≥ required cover, offsets zero
    - _Requirements: 2.3, 3.1, 3.2, 3.5_

- [ ] 5. 4:5 layout definition — `src/badge/layouts/layout4x5.ts`
  - [ ] 5.1 Create `src/badge/layouts/layout4x5.ts` with the complete `LayoutDefinition`
    - Canvas: `1080 × 1350`
    - `background`: base fill `#04060d`, grid `54px × 54px` at opacity 0.035, two radial gradients as specified in design.md Layer 1 (4:5 Background)
    - `watermark`: position `left: -40, top: 330`, size `320 × 700`, opacity `0.11`, stroke `#35e7ff`
    - `techSpecks`: array of 6 objects `{ top, left, width, height, opacity }` from design.md Layer 3 table
    - `cornerBrackets`: top-left anchor `(40, 40)` and bottom-right anchor `(bottom: 40, right: 40)`, bar size `132 × 6 / 6 × 132`, gradients as specified in design.md Layer 4
    - `photoArea`: `{ x: 240, y: 352, width: 600, height: 600, clipCorner: 50, borderGradient: ['#35e7ff','#0d6e82'], glow: 'drop-shadow(0 0 22px rgba(53,231,255,.5)) drop-shadow(0 0 50px rgba(53,231,255,.22))' }`
    - `awsLogoBlock`: position `top: 60`, centered, width `196`, wordmark Poppins 800 46px `#ffffff`, underline arrow path placeholder until task 11
    - `studentLabel`: `top: 150`, Poppins 600 30px `#ffffff` letter-spacing 10px, full-width centered
    - `communityDayTitle`: `top: 182`, Poppins 900 92px `#35e7ff` letter-spacing -1px line-height 0.95, text shadow as specified
    - `subtitleRow`: `top: 300`, ornament lines 96px opacity 0.55, dots 6px, "COCHABAMBA" Poppins 600 30px letter-spacing 8px `#35e7ff`
    - `roleBanner`: `{ x: 240, y: 978, width: 600, height: 66, clipVariant: 'hexagon', border: 'rgba(53,231,255,.7)', background: 'rgba(53,231,255,.06)', textFont: fonts.poppins, textSize: 28, textColor: '#35e7ff', letterSpacing: 6 }`
    - `nameBlock`: `{ x: 84, y: 1064, maxWidth: 820, fontFamily: fonts.poppins, fontWeight: 800, fontSize: 58, minFontSize: 28, lineHeight: 1.08, color: '#ffffff' }`
    - `footer`: `{ x: 84, y: 1218, font: fonts.poppins, fontWeight: 500, fontSize: 23, color: '#cddaeb', gap: 18 }`
    - `vignette`: `radial-gradient(ellipse at 50% 45%, transparent 45%, rgba(0,0,0,.55) 100%)`
    - _Requirements: 7.1, 7.2, 9.1, 9.2, 9.3_

- [ ] 6. 9:16 layout definition — `src/badge/layouts/layout9x16.ts`
  - [ ] 6.1 Create `src/badge/layouts/layout9x16.ts` with the complete `LayoutDefinition` using absolute canvas-space coordinates
    - Canvas: `1080 × 1920`
    - All y-coordinates are absolute (not flow-based), derived from the CSS flow calculation in design.md Photo Area Dimensions
    - `background`: base fill `#03060b`, grid `48px × 48px` at opacity 0.04, two cyan glow radial gradients as specified in design.md Layer 1 (9:16 Background)
    - `metaLine`: absolute position, JetBrains Mono 400 16px letter-spacing 0.5px `#8b97ac` opacity 0.85, left `"// COCHABAMBA · BOLIVIA"`, right `"SYS // SCD · 2026"`, x `70`, y derived from flow (~89px)
    - `pillBadge`: position derived from flow (~132px), JetBrains Mono 400 16px `#35e7ff`, dot `7×7` `#6ff2c8`, border `rgba(53,231,255,.45)` radius 999px, background `rgba(53,231,255,.05)`
    - `awsLogoBlock`: position derived from flow (~196px), width `206`, Poppins 800 48px `#ffffff` letter-spacing -1px
    - `studentLabel`: derived from flow, Poppins 600 30px `#ffffff` letter-spacing 10px
    - `communityDayTitle`: derived from flow, Poppins 900 96px `#35e7ff` two lines "COMMUNITY" / "DAY", text shadow as specified
    - `subtitleRow`: derived from flow, same structure as 4:5
    - `photoArea`: `{ x: 200, y: 610, width: 680, height: 680, clipCorner: 52, borderGradient: ['#35e7ff','#0d6e82'], glow: '...' }` — **baseline y=610 pending browser verification (task 16)**
    - `roleBanner`: derived y from flow below photo area, `{ width: 680, clipVariant: 'parallelogram', textFont: fonts.jetbrainsMono (brackets) / fonts.poppins (role), textSize: 27, letterSpacing: 5, leftBracket: '[', rightBracket: ']', bracketColor: '#1c9db8' }`
    - `nameBlock`: derived y, `{ maxWidth: 860, fontFamily: fonts.poppins, fontWeight: 800, fontSize: 62, minFontSize: 28, lineHeight: 1.08, color: '#ffffff' }`
    - `footer`: derived y, Poppins 500 24px `#c8d3e3`, gap 18
    - `terminalPanel`: derived y, width 860, all static text content, colors, and font specs from design.md Layer 10 (9:16 Terminal panel)
    - `vignette`: `radial-gradient(ellipse at 50% 40%, transparent 50%, rgba(0,0,0,.5) 100%)`
    - _Requirements: 7.1, 7.2, 9.1, 9.2, 9.3_

- [ ] 7. Checkpoint — types, utilities, and layouts
  - Ensure all TypeScript compiles cleanly (`tsc --noEmit`) with no errors in `types.ts`, `designSystem.ts`, `photoUtils.ts`, `layout4x5.ts`, `layout9x16.ts`
  - Ensure all property and unit tests in task 4 pass (`npm test`)
  - Ask the user if questions arise before proceeding to UI components

- [ ] 8. `BadgePreview` component — `src/badge/BadgePreview.tsx`
  - [ ] 8.1 Implement `BadgePreview` with the scaled-DOM approach (single rendering path for both formats)
    - Accept props: `state: BadgeState`, `layout: LayoutDefinition`, `wrapperWidth: number`
    - Compute `previewScale = wrapperWidth / layout.canvasWidth`; set outer div to `canvasWidth * previewScale × canvasHeight * previewScale`, overflow hidden
    - Render inner div at native `canvasWidth × canvasHeight` with `transform: scale(previewScale)` and `transformOrigin: 'top left'`; use `position: absolute` on all child elements at native canvas coordinates
    - Layer 1 (background): fill color, CSS grid overlay, radial gradient overlays from `layout.background`
    - Layer 2 (watermark, 4:5 only): render `watermarkPath` SVG at position/opacity from layout
    - Layer 3 (tech specks, 4:5 only): render 6 cyan-bordered squares from `layout.techSpecks`
    - Layer 4 (corner brackets, 4:5 only): render gradient bars from `layout.cornerBrackets`
    - Layer 5 (photo frame): render octagonal clip via CSS `clip-path` polygon; render `<img>` inside with `object-fit: none` (no browser-level scaling), explicit `width = img.naturalWidth * zoom` and `height = img.naturalHeight * zoom`. Position the image using the **same mathematical model as the canvas export**:

      ```
      drawX = area.x + area.width  / 2 - (img.naturalWidth  * zoom) / 2 + transform.offsetX
      drawY = area.y + area.height / 2 - (img.naturalHeight * zoom) / 2 + transform.offsetY
      ```

      In the DOM preview, `area.x` and `area.y` are the native canvas-space coordinates from `layout.photoArea`; the element itself is absolutely positioned at those coordinates inside the native-scale inner div. Therefore the `<img>` left/top offsets within the photo frame container are:

      ```
      imgLeft = area.width  / 2 - (img.naturalWidth  * zoom) / 2 + transform.offsetX
      imgTop  = area.height / 2 - (img.naturalHeight * zoom) / 2 + transform.offsetY
      ```

      This formula is algebraically identical to the `drawX`/`drawY` used in `exportUtils.ts` Step 4, ensuring the crop framing is visually identical between preview and export. The previewScale transform on the outer container scales the entire composition uniformly — no separate coordinate conversion is needed for positioning. Render photo area placeholder div when `state.photo === null` (_Requirements: 5.5_)
    - Layer 6 (AWS logo block): if `awsLogoSrc === null`, render a labeled placeholder `<div>"AWS Logo — Pendiente"</div>` at the correct canvas-space position from the layout; otherwise render `<img src={awsLogoSrc} />` sized and positioned per `layout.awsLogoBlock`. Do not use `Path2D` for the official AWS logo asset. (_Requirements: 9.3, 9.5_)
    - Layer 7–9 (STUDENT label, COMMUNITY DAY title, subtitle row): render with exact typography from layout
    - Layer 10 (role banner): render with hexagon clip-path (4:5) or parallelogram clip-path (9:16) from `layout.roleBanner.clipVariant`; render dynamic role text
    - Layer 11 (name block): render `state.name` with font size from `layout.nameBlock.fontSize`; apply responsive font-size reduction via inline style if name is long (mirror the export algorithm in DOM)
    - Layer 12 (footer): render calendar and map-pin icon SVGs from `designSystem` constants + static text
    - Layer 13 (9:16 meta line, pill badge, terminal panel): render only when `layout.id === '9x16'`; terminal line 3 (`role:`) reflects `state.role`
    - Layer 14 (vignette): absolute inset overlay with radial gradient from layout
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 7.3, 8.1, 8.2, 9.1–9.5_

- [ ] 9. `BadgeControls` component — `src/badge/BadgeControls.tsx`
  - [ ] 9.1 Implement `BadgeControls` with all input controls and validation
    - Accept props: `state: BadgeState`, `onFormatChange`, `onPhotoUpload`, `onNameChange`, `onRoleChange`, `onZoomChange`, `onDragOffset`, `onResetPhoto`, `onDownload`, `isExporting: boolean`, `exportError: string | null`
    - **Format selector**: two styled buttons "4:5" and "9:16"; active format has distinct border/background per _Requirements: 1.1, 1.4_
    - **Photo upload**: `<input type="file" accept="image/jpeg,image/png,image/webp,image/gif">`; on change: (a) validate MIME type against `{image/jpeg, image/png, image/webp, image/gif}` and `file.size ≤ 10 * 1024 * 1024`; if invalid, set inline error message showing accepted types and size limit, do not call any callback; (b) if valid, decode the file into an `HTMLImageElement` via `new Image()` + `URL.createObjectURL`; (c) call `onPhotoUpload(img)` passing only the decoded image — `BadgeControls` does NOT call `computeMinZoom`, `computeInitialFraming`, or touch `minZoom` or `transform` in any way; all state calculations remain in `App`. (_Requirements: 2.1, 2.2_)
    - **Name input**: `<input type="text">` bound to `state.name`, calls `onNameChange` on every keystroke (_Requirements: 8.1_)
    - **Role selector**: `<select>` with four `<option>` elements: Participante / Speaker / Organizador / Voluntario, bound to `state.role` (_Requirements: 8.2_)
    - **Zoom slider**: `<input type="range" min={state.minZoom} max={state.minZoom * 3} step={0.01}>` (MVP upper bound — see task 4.1 note); disabled when `state.photo === null` (_Requirements: 3.2_)
    - **Drag support on preview photo**: wire `onMouseDown/Move/Up` and `onTouchStart/Move/End` on the photo area `div` inside `BadgePreview`. On each move event, compute the pointer delta in CSS/screen pixels (`dx_screen`, `dy_screen`). Convert to canvas-space pixels before calling the callback: `dx_canvas = dx_screen / previewScale` and `dy_canvas = dy_screen / previewScale`, where `previewScale = wrapperWidth / layout.canvasWidth` is the same scale factor used to render the preview. Call `onDragOffset(dx_canvas, dy_canvas)` with unclamped canvas-space deltas. Clamping happens exclusively in `App` via `clampOffset`. This conversion is mandatory — without it, drag behavior will be incorrect at any preview size other than 1:1. (_Requirements: 3.1, 3.3_)
    - **Reset Photo button**: disabled when `state.photo === null`; calls `onResetPhoto` (_Requirements: 4.1, 4.2_)
    - **Download button**: disabled when `isExporting === true`; calls `onDownload`; displays `exportError` message when not null (_Requirements: 6.1, 6.7, 6.8_)
    - _Requirements: 1.1, 1.4, 2.1, 2.2, 3.1, 3.2, 3.3, 4.1, 4.2, 6.1, 6.7, 6.8, 8.1, 8.2_

- [ ] 10. `App.tsx` wiring — state management and component integration
  - [ ] 10.1 Implement `App.tsx` as the `BadgeState` owner
    - Initialise `BadgeState` with `format: '4x5'`, `name: ''`, `role: 'PARTICIPANTE'`, `photo: null`, `transform: { zoom: 1, offsetX: 0, offsetY: 0 }`, `minZoom: 1`
    - Select active `LayoutDefinition` from `layout4x5` / `layout9x16` based on `state.format`
    - `onFormatChange`: call `scaleTransformToFormat` with old/new photo areas, recompute `minZoom` for new format, re-clamp offsets via `clampOffset`, update state (_Requirements: 1.2, 1.3, 3.5_)
    - `onPhotoUpload(img: HTMLImageElement)`: this is the sole place where `computeMinZoom` and `computeInitialFraming` are called. Compute `minZoom = computeMinZoom(img.naturalWidth, img.naturalHeight, activeLayout.photoArea.width, activeLayout.photoArea.height)`; compute `transform = computeInitialFraming(img.naturalWidth, img.naturalHeight, activeLayout.photoArea.width, activeLayout.photoArea.height)`; update `BadgeState` with `{ photo: img, minZoom, transform }`. `BadgeControls` is not involved in these calculations. (_Requirements: 2.3_)
    - `onZoomChange(zoom)`: clamp zoom to `[minZoom, minZoom * 3]`, then re-clamp offsets, update state (_Requirements: 3.2_)
    - `onDragOffset(dx_canvas, dy_canvas)`: receives canvas-space pixel deltas already converted from screen space by `BadgePreview`. Compute new `offsetX = transform.offsetX + dx_canvas` and `offsetY = transform.offsetY + dy_canvas`. Apply `clampOffset(offsetX, offsetY, photo.naturalWidth, photo.naturalHeight, transform.zoom, photoArea.width, photoArea.height)`. Update `transform` in `BadgeState`. (_Requirements: 3.1, 3.3_)
    - `onResetPhoto`: call `computeInitialFraming` for current photo + active format's photo area, update `transform` and `minZoom` (_Requirements: 4.2, 4.3_)
    - `onDownload`: set `isExporting = true`, call `downloadBadge(activeLayout, state)` in a try/catch; on error set `exportError` message; finally set `isExporting = false` (_Requirements: 6.5, 6.7, 6.8_)
    - Render `BadgeControls` and `BadgePreview` side-by-side; pass `wrapperWidth` computed from a container `ref` or CSS constraint
    - _Requirements: 1.2, 1.3, 2.3, 3.1, 3.2, 3.3, 3.5, 4.2, 4.3, 6.5, 6.7, 6.8_

- [ ] 11. Checkpoint — UI wiring and basic interactivity
  - Start the dev server (`npm run dev`) and manually verify:
    - Format selector switches preview aspect ratio
    - Name and role fields update preview text
    - Photo upload populates the photo area; invalid file shows error
    - Zoom slider and drag reposition/resize photo
    - Reset button returns to initial framing
    - Download button is disabled during (simulated) export
  - Ask the user if questions arise before proceeding to canvas export

- [ ] 12. Canvas export — `src/badge/exportUtils.ts`
  - [ ] 12.1 Implement `renderToCanvas(layout, state): HTMLCanvasElement`
    - **Font preload guard**: `await document.fonts.ready`; check `document.fonts.check('800 1em Poppins')` and `document.fonts.check('700 1em "JetBrains Mono"')`; throw descriptive error if either returns false (_Requirements: 9.5_)
    - **AWS logo null check**: if `awsLogoSrc === null`, throw `"Required asset (AWS logo) could not be loaded."` — halt immediately before any canvas drawing begins, do not produce a partial badge (_Requirements: 9.3, 9.5_)
    - Create `HTMLCanvasElement` at `layout.canvasWidth × layout.canvasHeight`
    - **Step 1 — Background**: fill base color, draw grid line pattern, draw radial gradient fills from `layout.background`
    - **Step 2 — Decorative layers**: draw watermark path via `Path2D` from `designSystem.watermarkPath` (4:5 only); draw tech speck rectangles (4:5 only); draw corner bracket gradient bars (4:5 only)
    - **Step 3 — Event branding**: draw STUDENT label, COMMUNITY DAY title, subtitle row ornaments and dots, AWS logo: load the official SVG asset as an `HTMLImageElement` (`const logoImg = new Image(); logoImg.src = designSystem.awsLogoSrc`) and await its `onload` event before calling `ctx.drawImage(logoImg, x, y, w, h)` at the position and dimensions specified in `layout.awsLogoBlock`. Do not use `Path2D` for this asset — the official SVG must be rendered as a complete image, matching exactly how it is displayed in `BadgePreview` via `<img src={awsLogoSrc} />`. The null-check safety guard must remain in place.
    - **Step 4 — Photo clip and draw**: `ctx.save()`; build octagonal `Path2D` from `layout.photoArea` coordinates using the exact moveTo/lineTo sequence in design.md Clipping in Export; `ctx.clip()`; `ctx.drawImage(state.photo, drawX, drawY, scaledW, scaledH)` where `drawX = x + w/2 - scaledW/2 + offsetX` and `drawY = y + h/2 - scaledH/2 + offsetY`; `ctx.restore()`
    - **Step 5 — Role banner**: `ctx.save()`; build clip path for hexagon (4:5) or parallelogram (9:16) from `layout.roleBanner`; clip, fill background, restore; draw bracket characters and role text
    - **Step 6 — Name block**: implement name overflow algorithm: start at `layout.nameBlock.fontSize`; measure with `ctx.measureText`; decrement by 1px while `width > maxWidth && fontSize > minFontSize`; if still overflowing at `minFontSize`, split at word boundary and render two lines; ensure text stays within `[nameBlock.y, footer.y]` vertical bounds (_Requirements: 8.3, 8.4_)
    - **Step 7 — Footer**: draw calendar and map-pin icons via `Path2D` from `designSystem` constants; draw "10 October 2026" and "Cochabamba, Bolivia" text
    - **Step 8 — 9:16 extras**: draw meta line, pill badge, terminal panel with all static and dynamic text (role on line 3); render cursor as solid filled rectangle
    - **Step 9 — Vignette**: draw radial gradient overlay as final layer
    - Wrap `canvas.toDataURL('image/png')` in try/catch; on `SecurityError` (tainted canvas), throw `"Export failed. The uploaded image may be from a restricted source."` (_Requirements: 6.7_)
    - Return `canvas`
    - _Requirements: 6.2, 6.3, 6.6, 8.3, 8.4, 9.1–9.5_

  - [ ] 12.2 Implement `downloadBadge(layout, state): void`
    - Call `renderToCanvas`; on success create `<a>` with `download="badge-${layout.id}.png"` and `href = canvas.toDataURL('image/png')`, click, remove — as specified in design.md exportUtils section
    - Propagate any thrown error to the caller
    - _Requirements: 6.4, 6.5_

  - [ ]* 12.3 Write property tests for export (Properties 2, 3, 7)
    - Tag: `// Feature: aws-student-community-day-badge-generator, Property 2: Name text no-overflow invariant`
    - **Property 2:** Generate arbitrary UTF-8 name strings length [0,200] for both formats. Assert the name-fitting algorithm produces text whose measured width ≤ `nameBlock.maxWidth`. **Validates: Requirements 8.3, 8.4**
    - Tag: `// Feature: aws-student-community-day-badge-generator, Property 3: Export dimension invariant`
    - **Property 3:** Generate arbitrary valid `BadgeState` values (with a programmatic placeholder photo). Assert `renderToCanvas(layout4x5, state)` returns `width=1080, height=1350`; `renderToCanvas(layout9x16, state)` returns `width=1080, height=1920`. **Validates: Requirements 6.2, 6.3**
    - Tag: `// Feature: aws-student-community-day-badge-generator, Property 7: Export state-preservation invariant`
    - **Property 7:** Simulate a throw inside `renderToCanvas` (stub). Assert the `BadgeState` object reference and all fields are unchanged after the error is caught in `App`. **Validates: Requirements 6.7**
    - _Requirements: 6.2, 6.3, 6.7, 8.3, 8.4_

  - [ ]* 12.4 Write unit tests for canvas export
    - Verify font preload guard: mock `document.fonts.check` returning false — assert error thrown with font name
    - Verify AWS logo null check: assert error thrown when `awsLogoSrc === null` before any canvas operations are performed
    - Verify `toDataURL` `SecurityError` produces the expected error message
    - Verify name overflow algorithm: for a 200-char name, assert algorithm terminates and `measuredWidth ≤ maxWidth`
    - _Requirements: 6.7, 8.3, 9.5_

- [ ] 13. Integration tests — `src/__tests__/integration.test.tsx`
  - [ ] 13.1 Write React Testing Library integration tests
    - Render `<App>` and verify `BadgePreview` DOM contains "COMMUNITY DAY", "10 October 2026", "Cochabamba, Bolivia" for both formats
    - Verify format selector shows exactly two buttons and the default selected format is 4:5 (_Requirements: 1.1_)
    - Verify `onRoleChange` → preview role text updates (_Requirements: 8.2_)
    - Verify `onNameChange` → preview name text updates (_Requirements: 8.1_)
    - Verify uploading a file with MIME type `application/pdf` displays an error message and does not update the photo area (_Requirements: 2.2_)
    - Verify download button is disabled while `isExporting = true` (mock `renderToCanvas` to be async/delayed) (_Requirements: 6.8_)
    - Verify AWS logo placeholder `"AWS Logo — Pendiente"` is shown in preview when `awsLogoSrc === null`; verify `<img>` element is rendered when `awsLogoSrc` is a non-null string (_Requirements: 9.5_)
    - _Requirements: 1.1, 2.2, 5.5, 6.8, 8.1, 8.2, 9.5_

- [ ] 14. Checkpoint — full test suite
  - Run `npm test` and confirm all property tests, unit tests, and integration tests pass
  - Run `tsc --noEmit` and confirm zero TypeScript errors
  - Ask the user if questions arise before proceeding to pending verification tasks

- [ ] 15. ⚠ BLOCKING — AWS logo integration (export disabled until resolved)
  - **This task must be completed before export is functional.**
  - Obtain the official AWS logo / wordmark SVG from the AWS Brand Guidelines or the event organizer. The approximate CSS/SVG path in the HTML prototypes MUST NOT be used.
  - Once obtained: place the SVG file in `public/assets/aws-logo.svg` (or equivalent)
  - Update `designSystem.ts`: replace `awsLogoSrc: null` with the correct asset path string, e.g. `'/assets/aws-logo.svg'`
  - Update `BadgePreview.tsx` (task 8): replace the "AWS Logo — Pendiente" placeholder with an `<img src={awsLogoSrc}>` element at the correct position and size. Both preview (`<img>`) and export (`ctx.drawImage`) use the same asset file — this guarantees visual consistency between the two renderers.
  - Update `exportUtils.ts` (task 12): remove the null-check halt (or keep it as a safety guard against future regressions) once the asset is confirmed present
  - Verify the logo renders correctly in both preview and export at the dimensions specified in design.md Layers 6 and 3 for 4:5 and 9:16 respectively
  - _Requirements: 9.3, 9.5_

- [ ] 16. ⚠ VERIFICATION REQUIRED — 9:16 photo area y-coordinate
  - The `y: 610` value in `layout9x16.ts` (task 6.1) is a CSS-flow estimate and **must be verified against the prototype's actual canvas-space layout** before the layout file is finalised.
  - **Why `getBoundingClientRect()` alone is not sufficient:** `getBoundingClientRect()` returns coordinates relative to the viewport at the current browser zoom and scroll position. The prototype uses `transform: scale(previewScale)` applied to the canvas div, so the bounding rect reflects scaled visual coordinates, not the 1:1 canvas-space coordinates stored in `layout9x16.ts`. Using the raw `getBoundingClientRect().y` value would introduce a scaling error.
  - **Correct verification procedure:**

    The measurement must be taken relative to the `.canvas` element's top edge and converted from browser/visual coordinates into canvas-space coordinates to account for the prototype's `transform: scale(...)`. Use the following snippet in the DevTools console:

    ```js
    const canvas = document.querySelector('.canvas');
    const photo  = document.querySelector('.photo-frame');

    const canvasRect = canvas.getBoundingClientRect();
    const photoRect  = photo.getBoundingClientRect();

    const scale = canvasRect.height / 1920;           // current visual scale factor
    const y     = (photoRect.top - canvasRect.top) / scale;  // canvas-space y

    console.log(y);  // expected: ~610
    ```

    This snippet measures the photo frame's position **relative to the canvas top edge** (not the viewport top), then divides by the current scale factor to convert from visual pixels into canvas-space pixels. It is robust to browser zoom level, scroll position, and page chrome because it uses the canvas as its own reference frame.

    Open `design-reference/badge-9x16.html` in a browser, open DevTools, paste the snippet into the console, and record the output.
  - If the verified value differs from 610px by more than 2px, update `layout9x16.ts` with the corrected value.
  - Document the verified value as a comment: `// photoArea.y verified via DevTools at 1:1 scale: <measured>px`
  - Re-run all tests after updating the coordinate.
  - _Requirements: 7.1, 7.2, design.md Photo Area Dimensions verification note_

- [ ] 17. Visual regression checklist
  - [ ] 17.1 Manual comparison against HTML prototypes
    - Open `design-reference/badge-4x5.html` and export a 4:5 badge from the running app; compare side-by-side:
      - Background fill `#04060d`, grid overlay at 54px, radial gradients present
      - `#35e7ff` cyan glow on COMMUNITY DAY title and photo frame border
      - Octagonal photo clip with correct 50px cut corners
      - Corner bracket gradients (#ffce54 → #ff9900)
      - Role banner hexagon clip shape
      - Name typography: Poppins 800 58px, overflow reduction down to 28px minimum
      - Footer: calendar and map-pin icons with correct SVG paths, date and location text
      - Vignette overlay present
    - Open `design-reference/badge-9x16.html` and export a 9:16 badge; compare side-by-side:
      - Background fill `#03060b`, grid overlay at 48px, cyan glow radials
      - Meta line (JetBrains Mono, `#8b97ac`) and pill badge (`#35e7ff`) present
      - Octagonal photo clip with 52px cut corners
      - Role banner parallelogram clip shape (not hexagon)
      - `[` / `]` bracket characters in `#1c9db8`
      - Terminal panel static text, `#6ff2c8` for ✓ and live dot
      - Cursor rendered as solid rectangle (no blink in export)
      - Vignette overlay present
    - _Requirements: 7.1, 7.2, 9.1–9.4_

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP.
- Tasks 15 and 16 are **blocking / verification** tasks that must be resolved before the exported badge is considered production-ready.
- Each task references specific requirements for traceability.
- Property tests use [fast-check](https://github.com/dubzzz/fast-check) with a minimum of 100 iterations and are tagged with `// Feature: aws-student-community-day-badge-generator, Property N: <text>`.
- Unit tests and property tests are complementary — both are expected to pass.
- The `awsLogoSrc: null` sentinel in `designSystem.ts` is intentional and must not be replaced with any approximate path. Once the official AWS SVG is available, set it to the asset path (e.g. `'/assets/aws-logo.svg'`). Both `BadgePreview` (`<img src={awsLogoSrc}>`) and `exportUtils` (`ctx.drawImage(HTMLImageElement)`) use this same path — do not render the official AWS logo through `Path2D`.
- The 9:16 photo area y-coordinate (610px) is a calculated baseline; task 16 must confirm it via browser DevTools before shipping.

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["3.1"] },
    { "id": 3, "tasks": ["4.1"] },
    { "id": 4, "tasks": ["4.2", "4.3", "5.1", "6.1"] },
    { "id": 5, "tasks": ["8.1", "9.1"] },
    { "id": 6, "tasks": ["10.1"] },
    { "id": 7, "tasks": ["12.1", "12.2"] },
    { "id": 8, "tasks": ["12.3", "12.4", "13.1"] },
    { "id": 9, "tasks": ["17.1"] }
  ]
}
```
