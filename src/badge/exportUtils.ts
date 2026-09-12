import { awsLogoSrc, colors, fonts, watermarkPath } from './designSystem'
import { computePhotoDrawPosition } from './photoUtils'
import type { BadgeState, LayoutDefinition, NameBlockDef, PhotoAreaDef, TextElementDef } from './types'

const exportError = 'Export failed. The uploaded image may be from a restricted source.'

function requireCanvasContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Canvas 2D context is not available.')
  }
  return context
}

async function ensureFontsReady(): Promise<void> {
  if (!document.fonts) {
    throw new Error('Required font Poppins is not available. Please check your internet connection.')
  }

  await document.fonts.ready
  if (!document.fonts.check('800 1em Poppins')) {
    throw new Error('Required font Poppins is not available. Please check your internet connection.')
  }
  if (!document.fonts.check('700 1em "JetBrains Mono"')) {
    throw new Error('Required font JetBrains Mono is not available. Please check your internet connection.')
  }
}

function ensureAwsLogo(): string {
  if (awsLogoSrc === null) {
    throw new Error('Required asset (AWS logo) could not be loaded.')
  }
  return awsLogoSrc
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Required asset (AWS logo) could not be loaded.'))
    image.src = source
  })
}

function polygonPath(area: PhotoAreaDef, inset = 0): Path2D {
  const path = new Path2D()
  const x = area.x + inset
  const y = area.y + inset
  const width = area.width - inset * 2
  const height = area.height - inset * 2
  const corner = area.clipCorner - inset

  path.moveTo(x + corner, y)
  path.lineTo(x + width - corner, y)
  path.lineTo(x + width, y + corner)
  path.lineTo(x + width, y + height - corner)
  path.lineTo(x + width - corner, y + height)
  path.lineTo(x + corner, y + height)
  path.lineTo(x, y + height - corner)
  path.lineTo(x, y + corner)
  path.closePath()
  return path
}

function drawBackground(context: CanvasRenderingContext2D, layout: LayoutDefinition): void {
  context.fillStyle = layout.background.base
  context.fillRect(0, 0, layout.canvasWidth, layout.canvasHeight)

  context.strokeStyle = layout.background.gridColor
  context.lineWidth = 1
  for (let x = 0; x <= layout.canvasWidth; x += layout.background.gridSize) {
    context.beginPath()
    context.moveTo(x, 0)
    context.lineTo(x, layout.canvasHeight)
    context.stroke()
  }
  for (let y = 0; y <= layout.canvasHeight; y += layout.background.gridSize) {
    context.beginPath()
    context.moveTo(0, y)
    context.lineTo(layout.canvasWidth, y)
    context.stroke()
  }

  drawEllipticalGradient(context, layout.canvasWidth * 0.88, layout.canvasHeight * 0.7, 280, 260, 'rgba(53,231,255,.14)', 0.6)
  drawEllipticalGradient(context, layout.canvasWidth * 0.1, layout.canvasHeight * 0.04, 350, 250, 'rgba(53,231,255,.08)', 0.55)
}

function drawEllipticalGradient(
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number,
  color: string,
  stop: number,
): void {
  context.save()
  context.translate(centerX, centerY)
  context.scale(1, radiusY / radiusX)
  const gradient = context.createRadialGradient(0, 0, 0, 0, 0, radiusX)
  gradient.addColorStop(0, color)
  gradient.addColorStop(stop, 'transparent')
  context.fillStyle = gradient
  context.fillRect(-radiusX, -radiusX, radiusX * 2, radiusX * 2)
  context.restore()
}

function drawDecorations(context: CanvasRenderingContext2D, layout: LayoutDefinition): void {
  if (layout.watermark) {
    const watermark = layout.watermark
    context.save()
    context.translate(watermark.x, watermark.y)
    context.scale(watermark.width / 200, watermark.height / 420)
    context.globalAlpha = watermark.opacity
    context.strokeStyle = watermark.stroke
    context.lineWidth = watermark.strokeWidth / (watermark.width / 200)
    const figure = new Path2D()
    figure.arc(100, 46, 30, 0, Math.PI * 2)
    figure.moveTo(100, 76)
    figure.lineTo(100, 240)
    figure.moveTo(100, 110)
    figure.lineTo(20, 180)
    figure.moveTo(100, 110)
    figure.lineTo(180, 180)
    figure.moveTo(100, 240)
    figure.lineTo(40, 400)
    figure.moveTo(100, 240)
    figure.lineTo(160, 400)
    figure.moveTo(60, 130)
    figure.lineTo(140, 130)
    figure.moveTo(55, 170)
    figure.lineTo(145, 170)
    context.stroke(figure)
    context.restore()
    void watermarkPath
  }

  if (layout.techSpecks) {
    context.strokeStyle = colors.cyan
    context.lineWidth = 1.5
    for (const speck of layout.techSpecks) {
      context.globalAlpha = speck.opacity
      context.strokeRect(speck.left, speck.top, speck.width, speck.height)
    }
    context.globalAlpha = 1
  }

  if (layout.cornerBrackets) {
    for (const bracket of layout.cornerBrackets) {
      const bottomRight = bracket.bottom !== undefined && bracket.right !== undefined
      const anchorX = bracket.left ?? layout.canvasWidth - (bracket.right ?? 0) - 132
      const anchorY = bracket.top ?? layout.canvasHeight - (bracket.bottom ?? 0) - 132
      const horizontalX = bottomRight ? anchorX + 132 - bracket.horizontalWidth : anchorX
      const horizontalY = bottomRight ? anchorY + 132 - bracket.horizontalHeight : anchorY
      const verticalX = bottomRight ? anchorX + 132 - bracket.verticalWidth : anchorX
      const horizontal = context.createLinearGradient(horizontalX, horizontalY, horizontalX + bracket.horizontalWidth, horizontalY)
      horizontal.addColorStop(0, bracket.horizontalGradient.includes('#ffce54') ? colors.yellow : colors.orange)
      horizontal.addColorStop(1, colors.orange)
      context.fillStyle = horizontal
      context.fillRect(horizontalX, horizontalY, bracket.horizontalWidth, bracket.horizontalHeight)
      const vertical = context.createLinearGradient(verticalX, anchorY, verticalX, anchorY + bracket.verticalHeight)
      vertical.addColorStop(0, bracket.verticalGradient.includes('#ffce54') ? colors.yellow : colors.orange)
      vertical.addColorStop(1, colors.orange)
      context.fillStyle = vertical
      context.fillRect(verticalX, anchorY, bracket.verticalWidth, bracket.verticalHeight)
    }
  }
}

function setFont(context: CanvasRenderingContext2D, family: string, weight: number, size: number): void {
  context.font = `${weight} ${size}px ${family}`
}

function measuredTrackedWidth(context: CanvasRenderingContext2D, text: string, letterSpacing: number): number {
  return context.measureText(text).width + Math.max(0, text.length - 1) * letterSpacing
}

function drawTrackedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  baseline: number,
  letterSpacing: number,
): void {
  if (!letterSpacing) {
    context.fillText(text, x, baseline)
    return
  }

  let cursor = x
  for (const character of text) {
    context.fillText(character, cursor, baseline)
    cursor += context.measureText(character).width + letterSpacing
  }
}

function drawCenteredText(context: CanvasRenderingContext2D, text: string, definition: TextElementDef): void {
  setFont(context, definition.fontFamily, definition.fontWeight, definition.fontSize)
  context.fillStyle = definition.color
  const width = measuredTrackedWidth(context, text, definition.letterSpacing)
  drawTrackedText(context, text, definition.x + (definition.width - width) / 2, definition.y + definition.fontSize, definition.letterSpacing)
}

function drawBranding(context: CanvasRenderingContext2D, layout: LayoutDefinition, logo: HTMLImageElement): void {
  const logoBlock = layout.awsLogoBlock
  context.drawImage(logo, logoBlock.x, logoBlock.y, logoBlock.width, logoBlock.width * logo.naturalHeight / logo.naturalWidth)
  drawCenteredText(context, layout.studentLabel.text ?? 'STUDENT', layout.studentLabel)

  const title = layout.communityDayTitle
  setFont(context, title.fontFamily, title.fontWeight, title.fontSize)
  context.fillStyle = title.color
  context.shadowColor = colors.cyanGlow
  context.shadowBlur = 18
  const titleLines = title.lines ?? [title.text ?? 'COMMUNITY DAY']
  const lineHeight = title.fontSize * (title.lineHeight ?? 1)
  titleLines.forEach((line, index) => {
    const width = measuredTrackedWidth(context, line, title.letterSpacing)
    drawTrackedText(context, line, title.x + (title.width - width) / 2, title.y + title.fontSize + index * lineHeight, title.letterSpacing)
  })
  context.shadowColor = 'transparent'
  context.shadowBlur = 0

  const subtitle = layout.subtitleRow
  setFont(context, subtitle.fontFamily, subtitle.fontWeight, subtitle.fontSize)
  const textWidth = measuredTrackedWidth(context, subtitle.text, subtitle.letterSpacing)
  const groupWidth = subtitle.lineWidth * 2 + subtitle.dotSize * 2 + textWidth + subtitle.gap * 4
  let cursor = (layout.canvasWidth - groupWidth) / 2
  context.globalAlpha = subtitle.lineOpacity
  context.fillStyle = subtitle.color
  context.fillRect(cursor, subtitle.y + subtitle.fontSize / 2, subtitle.lineWidth, subtitle.lineHeight)
  cursor += subtitle.lineWidth + subtitle.gap
  context.globalAlpha = subtitle.dotOpacity
  context.beginPath()
  context.arc(cursor + subtitle.dotSize / 2, subtitle.y + subtitle.fontSize / 2, subtitle.dotSize / 2, 0, Math.PI * 2)
  context.fill()
  cursor += subtitle.dotSize + subtitle.gap
  context.globalAlpha = 1
  drawTrackedText(context, subtitle.text, cursor, subtitle.y + subtitle.fontSize, subtitle.letterSpacing)
  cursor += textWidth + subtitle.gap
  context.globalAlpha = subtitle.dotOpacity
  context.beginPath()
  context.arc(cursor + subtitle.dotSize / 2, subtitle.y + subtitle.fontSize / 2, subtitle.dotSize / 2, 0, Math.PI * 2)
  context.fill()
  cursor += subtitle.dotSize + subtitle.gap
  context.globalAlpha = subtitle.lineOpacity
  context.fillRect(cursor, subtitle.y + subtitle.fontSize / 2, subtitle.lineWidth, subtitle.lineHeight)
  context.globalAlpha = 1
}

function drawPhoto(context: CanvasRenderingContext2D, layout: LayoutDefinition, state: BadgeState): void {
  const area = layout.photoArea
  const borderGradient = context.createLinearGradient(area.x, area.y, area.x + area.width, area.y + area.height)
  borderGradient.addColorStop(0, area.borderGradient[0])
  borderGradient.addColorStop(1, area.borderGradient[1])
  context.save()
  context.shadowColor = colors.cyanGlow
  context.shadowBlur = 22
  context.fillStyle = borderGradient
  context.fill(polygonPath(area))
  context.restore()

  context.save()
    context.clip(polygonPath(area, 3))
  context.fillStyle = '#0a1420'
  context.fillRect(area.x + 3, area.y + 3, area.width - 6, area.height - 6)
  if (state.photo) {
    const photoDraw = computePhotoDrawPosition(area, state.photo, state.transform)
    context.drawImage(state.photo, photoDraw.x, photoDraw.y, photoDraw.width, photoDraw.height)
  } else {
    context.fillStyle = '#6c7a91'
    context.font = `400 16px ${fonts.jetbrainsMono}`
    context.textAlign = 'center'
    context.fillText('Upload a photo', area.x + area.width / 2, area.y + area.height / 2)
    context.textAlign = 'start'
  }
  context.restore()
}

function drawRoleBanner(context: CanvasRenderingContext2D, layout: LayoutDefinition, role: string): void {
  const banner = layout.roleBanner
  const path = new Path2D()
  const radius = banner.height / 2
  path.moveTo(banner.x + radius, banner.y)
  path.lineTo(banner.x + banner.width - radius, banner.y)
  path.arc(banner.x + banner.width - radius, banner.y + radius, radius, -Math.PI / 2, Math.PI / 2)
  path.lineTo(banner.x + radius, banner.y + banner.height)
  path.arc(banner.x + radius, banner.y + radius, radius, Math.PI / 2, Math.PI * 1.5)
  path.closePath()
  context.save()
  context.clip(path)
  context.fillStyle = banner.background
  context.fillRect(banner.x, banner.y, banner.width, banner.height)
  context.restore()
  context.save()
  context.shadowColor = 'rgba(53,231,255,.16)'
  context.shadowBlur = 12
  context.strokeStyle = banner.border
  context.stroke(path)
  context.restore()

  const bracketFont = banner.bracketFont ?? banner.textFont
  setFont(context, bracketFont, 400, banner.textSize)
  context.fillStyle = banner.bracketColor ?? banner.textColor
  const leftBracket = banner.leftBracket ?? '«'
  const rightBracket = banner.rightBracket ?? '»'
  const roleWidth = measuredTrackedWidth(context, role, banner.letterSpacing)
  setFont(context, banner.textFont, 700, banner.textSize)
  const bracketWidth = context.measureText(leftBracket).width + context.measureText(rightBracket).width
  const totalWidth = bracketWidth + roleWidth + (banner.clipVariant === 'hexagon' ? 44 : 32)
  let x = banner.x + (banner.width - totalWidth) / 2
  context.fillText(leftBracket, x, banner.y + banner.height / 2 + banner.textSize / 3)
  x += context.measureText(leftBracket).width + (banner.clipVariant === 'hexagon' ? 22 : 16)
  context.fillStyle = banner.textColor
  drawTrackedText(context, role, x, banner.y + banner.height / 2 + banner.textSize / 3, banner.letterSpacing)
  x += roleWidth + (banner.clipVariant === 'hexagon' ? 22 : 16)
  context.fillStyle = banner.bracketColor ?? banner.textColor
  context.fillText(rightBracket, x, banner.y + banner.height / 2 + banner.textSize / 3)
}

function fitName(context: CanvasRenderingContext2D, name: string, definition: NameBlockDef): { fontSize: number; lines: string[] } {
  let fontSize = definition.fontSize
  setFont(context, definition.fontFamily, definition.fontWeight, fontSize)
  while (context.measureText(name).width > definition.maxWidth && fontSize > definition.minFontSize) {
    fontSize -= 1
    setFont(context, definition.fontFamily, definition.fontWeight, fontSize)
  }
  if (context.measureText(name).width <= definition.maxWidth) {
    return { fontSize, lines: [name] }
  }

  const words = name.trim().split(/\s+/)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    if (context.measureText(word).width > definition.maxWidth) {
      if (current) {
        lines.push(current)
      }
      let chunk = ''
      for (const character of word) {
        const candidate = chunk + character
        if (chunk && context.measureText(candidate).width > definition.maxWidth) {
          lines.push(chunk)
          chunk = character
        } else {
          chunk = candidate
        }
      }
      current = chunk
      continue
    }
    const candidate = current ? `${current} ${word}` : word
    if (current && context.measureText(candidate).width > definition.maxWidth) {
      lines.push(current)
      current = word
    } else {
      current = candidate
    }
  }
  if (current) {
    lines.push(current)
  }
  return { fontSize, lines: lines.length > 0 ? lines : [''] }
}

function drawName(context: CanvasRenderingContext2D, layout: LayoutDefinition, name: string): void {
  if (!name) {
    return
  }
  const definition = layout.nameBlock
  const fitted = fitName(context, name, definition)
  setFont(context, definition.fontFamily, definition.fontWeight, fitted.fontSize)
  context.fillStyle = definition.color
  context.textAlign = 'start'
  fitted.lines.slice(0, 2).forEach((line, index) => {
    const lineWidth = context.measureText(line).width
    const lineX = definition.x + (definition.maxWidth - lineWidth) / 2
    context.fillText(line, lineX, definition.y + fitted.fontSize + index * fitted.fontSize * definition.lineHeight)
  })
}

function drawCalendarIcon(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const scale = 20 / 24
  ctx.save()
  ctx.translate(x, y)
  ctx.strokeStyle = colors.cyan
  ctx.lineWidth = 2
  ctx.lineJoin = 'round'
  // Outer rounded rectangle: original x=3,y=5,w=18,h=16,rx=2
  ctx.beginPath()
  ctx.roundRect(3 * scale, 5 * scale, 18 * scale, 16 * scale, 2 * scale)
  ctx.stroke()
  // Horizontal divider: original y1=y2=10, x1=3, x2=21
  ctx.beginPath()
  ctx.moveTo(3 * scale, 10 * scale)
  ctx.lineTo(21 * scale, 10 * scale)
  ctx.stroke()
  // Left tick: x=8, y1=3, y2=7
  ctx.beginPath()
  ctx.moveTo(8 * scale, 3 * scale)
  ctx.lineTo(8 * scale, 7 * scale)
  ctx.stroke()
  // Right tick: x=16, y1=3, y2=7
  ctx.beginPath()
  ctx.moveTo(16 * scale, 3 * scale)
  ctx.lineTo(16 * scale, 7 * scale)
  ctx.stroke()
  ctx.restore()
}

function drawMapPinIcon(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const scale = 20 / 24
  ctx.save()
  ctx.translate(x, y)
  ctx.strokeStyle = colors.cyan
  ctx.lineWidth = 2
  ctx.beginPath()
  const cx = 12 * scale
  const cy = 10 * scale
  const r = 7 * scale
  const tipY = 22 * scale
  // Top arc (left side to right side going clockwise over the top)
  ctx.arc(cx, cy, r, Math.PI * 0.75, Math.PI * 0.25, false)
  // Right side curves down to tip
  ctx.bezierCurveTo(cx + r, cy + r * 0.7, cx + r * 0.3, tipY - 2 * scale, cx, tipY)
  // Left side from tip back up
  ctx.bezierCurveTo(cx - r * 0.3, tipY - 2 * scale, cx - r, cy + r * 0.7, cx - r, cy)
  ctx.arc(cx, cy, r, Math.PI, Math.PI * 0.75, false)
  ctx.closePath()
  ctx.stroke()
  // Inner circle
  ctx.beginPath()
  ctx.arc(cx, cy, 2.5 * scale, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

function drawFooter(context: CanvasRenderingContext2D, layout: LayoutDefinition): void {
  const footer = layout.footer
  setFont(context, footer.fontFamily, footer.fontWeight, footer.fontSize)
  context.fillStyle = footer.color
  context.strokeStyle = colors.cyan
  context.lineWidth = 2
  const baseline = footer.y + footer.fontSize
  const dateWidth = context.measureText('10 October 2026').width
  const dividerWidth = context.measureText('|').width
  const locationWidth = context.measureText('Cochabamba, Bolivia').width
  const totalWidth = 20 + 10 + dateWidth + footer.gap + dividerWidth + footer.gap + 20 + 10 + locationWidth
  const rowX = (layout.canvasWidth - totalWidth) / 2
  const centeredDateX = rowX + 30
  context.textAlign = 'start'
  const iconY = footer.y + (footer.fontSize - 20) / 2
  drawCalendarIcon(context, rowX, iconY)
  context.fillStyle = footer.color
  context.fillText('10 October 2026', centeredDateX, baseline)
  const dividerX = centeredDateX + dateWidth + footer.gap
  context.fillStyle = 'rgba(255,255,255,.3)'
  context.fillText('|', dividerX, baseline)
  const locationX = dividerX + dividerWidth + footer.gap
  context.fillStyle = footer.color
  drawMapPinIcon(context, locationX, iconY)
  context.fillText('Cochabamba, Bolivia', locationX + 30, baseline)
}

function drawMetaAndPill(context: CanvasRenderingContext2D, layout: LayoutDefinition): void {
  if (layout.metaLine) {
    const meta = layout.metaLine
    setFont(context, meta.fontFamily, meta.fontWeight, meta.fontSize)
    context.globalAlpha = meta.opacity
    context.fillStyle = meta.color
    drawTrackedText(context, meta.leftText, meta.x, meta.y + meta.fontSize, meta.letterSpacing)
    const rightWidth = measuredTrackedWidth(context, meta.rightText, meta.letterSpacing)
    drawTrackedText(context, meta.rightText, meta.x + meta.width - rightWidth, meta.y + meta.fontSize, meta.letterSpacing)
    context.globalAlpha = 1
  }
  if (layout.pillBadge) {
    const pill = layout.pillBadge
    context.strokeStyle = pill.border
    context.fillStyle = pill.background
    context.lineWidth = 1
    context.beginPath()
    context.roundRect(pill.x, pill.y, pill.width, pill.height, pill.borderRadius)
    context.fill()
    context.stroke()
    context.fillStyle = pill.dotColor
    context.beginPath()
    context.arc(pill.x + pill.paddingX + pill.dotSize / 2, pill.y + pill.height / 2, pill.dotSize / 2, 0, Math.PI * 2)
    context.fill()
    setFont(context, pill.fontFamily, pill.fontWeight, pill.fontSize)
    context.fillStyle = pill.color
    context.fillText(pill.text, pill.x + pill.paddingX + pill.dotSize + pill.gap, pill.y + pill.paddingY + pill.fontSize)
  }
}

function drawTerminal(context: CanvasRenderingContext2D, layout: LayoutDefinition, role: string): void {
  const terminal = layout.terminalPanel
  if (!terminal) {
    return
  }
  context.fillStyle = terminal.background
  context.strokeStyle = terminal.border
  context.lineWidth = 1
  context.beginPath()
  context.roundRect(terminal.x, terminal.y, terminal.width, terminal.height, terminal.borderRadius)
  context.fill()
  context.stroke()
  context.fillStyle = terminal.trafficLightColor
  for (let index = 0; index < 3; index += 1) {
    context.beginPath()
    context.arc(terminal.x + terminal.barPaddingX + 4 + index * 15, terminal.y + terminal.barPaddingY + 5, 4.5, 0, Math.PI * 2)
    context.fill()
  }
  setFont(context, terminal.barFontFamily, 400, terminal.barFontSize)
  context.fillStyle = terminal.barColor
  context.textAlign = 'center'
  context.fillText(terminal.title, terminal.x + terminal.width / 2, terminal.y + terminal.barPaddingY + terminal.barFontSize)
  context.textAlign = 'right'
  context.fillStyle = terminal.liveColor
  context.fillText(terminal.liveLabel, terminal.x + terminal.width - terminal.barPaddingX, terminal.y + terminal.barPaddingY + terminal.barFontSize)
  context.textAlign = 'start'

  const x = terminal.x + terminal.bodyPaddingX
  const firstBaseline = terminal.y + terminal.barHeight + terminal.bodyPaddingTop + terminal.bodyFontSize
  const lineHeight = terminal.bodyFontSize * terminal.bodyLineHeight
  setFont(context, terminal.bodyFontFamily, 400, terminal.bodyFontSize)
  context.fillStyle = terminal.promptColor
  context.fillText('badge@scd', x, firstBaseline)
  context.fillStyle = colors.white
  context.fillText(' ~ $ issue --participant', x + context.measureText('badge@scd').width, firstBaseline)
  context.fillStyle = terminal.outputColor
  context.fillText('> verifying registration...', x, firstBaseline + lineHeight)
  context.fillText(`> role: ${role}`, x, firstBaseline + lineHeight * 2)
  context.fillStyle = terminal.okColor
  context.fillText('✓ badge generated', x, firstBaseline + lineHeight * 3)
  context.fillStyle = terminal.promptColor
  context.fillText('badge@scd', x, firstBaseline + lineHeight * 4)
  context.fillStyle = colors.white
  context.fillText(' ~ $ ', x + context.measureText('badge@scd').width, firstBaseline + lineHeight * 4)
  context.fillStyle = terminal.cursorColor
  context.fillRect(x + context.measureText('badge@scd ~ $ ').width, firstBaseline + lineHeight * 4 - terminal.cursorHeight + 2, terminal.cursorWidth, terminal.cursorHeight)
}

function drawVignette(context: CanvasRenderingContext2D, layout: LayoutDefinition): void {
  const centerX = layout.canvasWidth / 2
  const centerY = layout.id === '4x5' ? layout.canvasHeight * 0.45 : layout.canvasHeight * 0.4
  const radius = Math.max(layout.canvasWidth, layout.canvasHeight) * 0.72
  const gradient = context.createRadialGradient(centerX, centerY, radius * 0.3, centerX, centerY, radius)
  gradient.addColorStop(0, 'transparent')
  gradient.addColorStop(1, layout.id === '4x5' ? 'rgba(0,0,0,.55)' : 'rgba(0,0,0,.5)')
  context.fillStyle = gradient
  context.fillRect(0, 0, layout.canvasWidth, layout.canvasHeight)
}

function handleCanvasError(error: unknown): never {
  if (error instanceof DOMException && error.name === 'SecurityError') {
    throw new Error(exportError)
  }
  throw error
}

export async function renderToCanvas(layout: LayoutDefinition, state: BadgeState): Promise<HTMLCanvasElement> {
  await ensureFontsReady()
  const logoSource = ensureAwsLogo()
  const logo = await loadImage(logoSource)
  const canvas = document.createElement('canvas')
  canvas.width = layout.canvasWidth
  canvas.height = layout.canvasHeight
  const context = requireCanvasContext(canvas)

  drawBackground(context, layout)
  drawDecorations(context, layout)
  drawMetaAndPill(context, layout)
  drawBranding(context, layout, logo)
  drawPhoto(context, layout, state)
  drawRoleBanner(context, layout, state.role)
  drawName(context, layout, state.name)
  drawFooter(context, layout)
  drawTerminal(context, layout, state.role)
  drawVignette(context, layout)

  try {
    canvas.toDataURL('image/png')
  } catch (error) {
    handleCanvasError(error)
  }
  return canvas
}

export async function downloadBadge(layout: LayoutDefinition, state: BadgeState): Promise<void> {
  try {
    const canvas = await renderToCanvas(layout, state)
    const link = document.createElement('a')
    link.download = `badge-${layout.id}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  } catch (error) {
    handleCanvasError(error)
  }
}
