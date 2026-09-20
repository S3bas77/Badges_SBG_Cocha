import { useRef } from 'react'
import type { CSSProperties, KeyboardEvent, MouseEvent, TouchEvent } from 'react'
import { awsLogoSrc, calendarIconPath, colors, mapPinIconPath, watermarkPath } from './designSystem'
import { computePhotoDrawPosition } from './photoUtils'
import type { BadgeState, LayoutDefinition, PhotoAreaDef, TextElementDef } from './types'

interface BadgePreviewProps {
  state: BadgeState
  layout: LayoutDefinition
  wrapperWidth: number
  onDragOffset: (offsetX: number, offsetY: number) => void
  onRequestPhotoUpload: () => void
}

interface Point {
  x: number
  y: number
}

function clipPolygon(area: PhotoAreaDef): string {
  const corner = area.clipCorner
  return `polygon(${corner}px 0, calc(100% - ${corner}px) 0, 100% ${corner}px, 100% calc(100% - ${corner}px), calc(100% - ${corner}px) 100%, ${corner}px 100%, 0 calc(100% - ${corner}px), 0 ${corner}px)`
}

function textStyle(definition: TextElementDef): CSSProperties {
  return {
    position: 'absolute',
    left: definition.x,
    top: definition.y,
    width: definition.width,
    color: definition.color,
    fontFamily: definition.fontFamily,
    fontSize: definition.fontSize,
    fontWeight: definition.fontWeight,
    letterSpacing: definition.letterSpacing,
    lineHeight: definition.lineHeight,
    textAlign: definition.textAlign,
    textShadow: definition.textShadow,
    whiteSpace: definition.lines ? 'normal' : 'nowrap',
  }
}

function fitNameFontSize(name: string, fontFamily: string, fontWeight: number, fontSize: number, minFontSize: number, maxWidth: number): number {
  if (!name) {
    return fontSize
  }

  const characterWidth = fontFamily.includes('Poppins') && fontWeight >= 800 ? 0.62 : 0.58
  let currentSize = fontSize
  while (currentSize > minFontSize && name.length * currentSize * characterWidth > maxWidth) {
    currentSize -= 1
  }
  if (name.length * currentSize * characterWidth <= maxWidth) {
      return currentSize
  }

  return minFontSize
}

function Icon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="badge-footer-icon" dangerouslySetInnerHTML={{ __html: path }} />
  )
}

export function BadgePreview({ state, layout, wrapperWidth, onDragOffset, onRequestPhotoUpload }: BadgePreviewProps) {
  const dragStart = useRef<Point | null>(null)
  const previewScale = wrapperWidth / layout.canvasWidth
  const photoArea = layout.photoArea
  const photoClip = clipPolygon(photoArea)
  const photoDraw = state.photo ? computePhotoDrawPosition(photoArea, state.photo, state.transform) : null
  const photoImageStyle: CSSProperties | undefined = state.photo
    ? {
        position: 'absolute',
        width: photoDraw!.width,
        height: photoDraw!.height,
        left: photoDraw!.x - photoArea.x - 3,
        top: photoDraw!.y - photoArea.y - 3,
        maxWidth: 'none',
        objectFit: 'fill',
      }
    : undefined
  const nameFontSize = fitNameFontSize(
    state.name,
    layout.nameBlock.fontFamily,
    layout.nameBlock.fontWeight,
    layout.nameBlock.fontSize,
    layout.nameBlock.minFontSize,
    layout.nameBlock.maxWidth,
  )
  const backgroundLayers: string[] = []
  const backgroundSizes: string[] = []
  if (layout.background.dotSpacing && layout.background.dotColor) {
    const dotRadius = layout.background.dotRadius ?? 1
    backgroundLayers.push(`radial-gradient(circle, ${layout.background.dotColor} ${dotRadius}px, transparent ${dotRadius + 0.5}px)`)
    backgroundSizes.push(`${layout.background.dotSpacing}px ${layout.background.dotSpacing}px`)
  }
  backgroundLayers.push(
    `linear-gradient(${layout.background.gridColor} 1px, transparent 1px)`,
    `linear-gradient(90deg, ${layout.background.gridColor} 1px, transparent 1px)`,
  )
  backgroundSizes.push(
    `${layout.background.gridSize}px ${layout.background.gridSize}px`,
    `${layout.background.gridSize}px ${layout.background.gridSize}px`,
  )
  for (const gradient of layout.background.gradients) {
    backgroundLayers.push(gradient)
    backgroundSizes.push('auto')
  }
  const backgroundImage = backgroundLayers.join(', ')

  const beginDrag = (point: Point) => {
    if (state.photo) {
      dragStart.current = point
    }
  }

  const moveDrag = (point: Point) => {
    if (!dragStart.current || !state.photo) {
      return
    }

    onDragOffset(
      (point.x - dragStart.current.x) / previewScale,
      (point.y - dragStart.current.y) / previewScale,
    )
    dragStart.current = point
  }

  const endDrag = () => {
    dragStart.current = null
  }

  const handlePhotoKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onRequestPhotoUpload()
    }
  }

  const handleMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    beginDrag({ x: event.clientX, y: event.clientY })
  }

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    moveDrag({ x: event.clientX, y: event.clientY })
  }

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0]
    if (touch) {
      beginDrag({ x: touch.clientX, y: touch.clientY })
    }
  }

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0]
    if (touch) {
      moveDrag({ x: touch.clientX, y: touch.clientY })
    }
  }

  const canvasStyle: CSSProperties = {
    width: layout.canvasWidth,
    height: layout.canvasHeight,
    position: 'relative',
    transform: `scale(${previewScale})`,
    transformOrigin: 'top left',
    backgroundColor: layout.background.base,
    backgroundImage,
    backgroundSize: backgroundSizes.join(', '),
    overflow: 'hidden',
    color: colors.white,
  }

  return (
    <div
      className="badge-preview-frame"
      style={{ width: layout.canvasWidth * previewScale, height: layout.canvasHeight * previewScale }}
    >
      <div className="badge-canvas" style={canvasStyle}>
        {layout.watermark && (
          <svg
            className="badge-watermark"
            viewBox={layout.watermark.viewBox}
            style={{ left: layout.watermark.x, top: layout.watermark.y, width: layout.watermark.width, height: layout.watermark.height, opacity: layout.watermark.opacity, stroke: layout.watermark.stroke, strokeWidth: layout.watermark.strokeWidth }}
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: watermarkPath }}
          />
        )}
        {layout.cornerBrackets?.map((bracket, index) => {
          const bottomRight = bracket.bottom !== undefined && bracket.right !== undefined
          return (
          <span
            key={index}
            className="badge-corner-bracket"
            style={{ top: bracket.top, left: bracket.left, bottom: bracket.bottom, right: bracket.right }}
          >
            <span style={{ width: bracket.horizontalWidth, height: bracket.horizontalHeight, background: bracket.horizontalGradient, ...(bottomRight ? { top: 'auto', left: 'auto', bottom: 0, right: 0 } : {}) }} />
            <span style={{ width: bracket.verticalWidth, height: bracket.verticalHeight, background: bracket.verticalGradient, ...(bottomRight ? { top: 'auto', left: 'auto', bottom: 0, right: 0 } : {}) }} />
          </span>
          )
        })}
        {layout.metaLine && (
          <div
            className="badge-meta-line"
            style={{ left: layout.metaLine.x, top: layout.metaLine.y, width: layout.metaLine.width, fontFamily: layout.metaLine.fontFamily, fontSize: layout.metaLine.fontSize, fontWeight: layout.metaLine.fontWeight, color: layout.metaLine.color, opacity: layout.metaLine.opacity, letterSpacing: layout.metaLine.letterSpacing }}
          >
            <span>{layout.metaLine.leftText}</span>
            <span>{layout.metaLine.rightText}</span>
          </div>
        )}
        {layout.pillBadge && (
          <div
            className="badge-pill"
            style={{ left: layout.pillBadge.x, top: layout.pillBadge.y, width: layout.pillBadge.width, height: layout.pillBadge.height, border: `1px solid ${layout.pillBadge.border}`, borderRadius: layout.pillBadge.borderRadius, background: layout.pillBadge.background, fontFamily: layout.pillBadge.fontFamily, fontSize: layout.pillBadge.fontSize, fontWeight: layout.pillBadge.fontWeight, color: layout.pillBadge.color, letterSpacing: layout.pillBadge.letterSpacing, gap: layout.pillBadge.gap }}
          >
            <span className="badge-pill-dot" style={{ width: layout.pillBadge.dotSize, height: layout.pillBadge.dotSize, background: layout.pillBadge.dotColor }} />
            {layout.pillBadge.text}
          </div>
        )}
        <div className="badge-logo-placeholder" style={{ left: layout.awsLogoBlock.x, top: layout.awsLogoBlock.y, width: layout.awsLogoBlock.width, height: layout.awsLogoBlock.width * 182 / 304 }}>
          {awsLogoSrc === null ? 'AWS Logo — Pendiente' : <img src={awsLogoSrc} alt="AWS logo" width={layout.awsLogoBlock.width} />} 
        </div>
        <div style={textStyle(layout.studentLabel)}>{layout.studentLabel.text}</div>
        <div style={textStyle(layout.communityDayTitle)}>
          {layout.communityDayTitle.lines
            ? layout.communityDayTitle.lines.map((line, index) => (
                <div
                  key={line}
                  style={{
                    color: layout.communityDayTitle.lineColors?.[index] ?? layout.communityDayTitle.color,
                    textShadow: layout.communityDayTitle.lineGlow?.[index] ? layout.communityDayTitle.textShadow : 'none',
                  }}
                >
                  {line}
                </div>
              ))
            : layout.communityDayTitle.text}
        </div>
        <div
          className="badge-subtitle-row"
          style={{ left: layout.subtitleRow.x, top: layout.subtitleRow.y, width: layout.canvasWidth, gap: layout.subtitleRow.gap }}
        >
          <span style={{ width: layout.subtitleRow.lineWidth, opacity: layout.subtitleRow.lineOpacity }} />
          <i style={{ width: layout.subtitleRow.dotSize, height: layout.subtitleRow.dotSize, opacity: layout.subtitleRow.dotOpacity }} />
          <strong style={{ fontFamily: layout.subtitleRow.fontFamily, fontWeight: layout.subtitleRow.fontWeight, fontSize: layout.subtitleRow.fontSize, color: layout.subtitleRow.color, letterSpacing: layout.subtitleRow.letterSpacing }}>{layout.subtitleRow.text}</strong>
          <i style={{ width: layout.subtitleRow.dotSize, height: layout.subtitleRow.dotSize, opacity: layout.subtitleRow.dotOpacity }} />
          <span style={{ width: layout.subtitleRow.lineWidth, opacity: layout.subtitleRow.lineOpacity }} />
        </div>
        <div
          className="badge-photo-frame"
          style={{ left: photoArea.x, top: photoArea.y, width: photoArea.width, height: photoArea.height, clipPath: photoClip, background: `linear-gradient(135deg, ${photoArea.borderGradient[0]}, ${photoArea.borderGradient[1]})`, filter: photoArea.glow, cursor: state.photo ? 'grab' : 'pointer' }}
          role={state.photo ? undefined : 'button'}
          tabIndex={state.photo ? -1 : 0}
          aria-label={state.photo ? undefined : 'Upload a photo'}
          onClick={state.photo ? undefined : onRequestPhotoUpload}
          onKeyDown={state.photo ? undefined : handlePhotoKeyDown}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={endDrag}
        >
          <div className="badge-photo-inner" style={{ clipPath: clipPolygon({ ...photoArea, clipCorner: photoArea.clipCorner - 3 }), background: '#0a1420' }}>
            {state.photo ? <img src={state.photo.src} alt="Uploaded attendee" style={photoImageStyle} draggable={false} /> : <div className="badge-photo-placeholder">Upload a photo</div>}
          </div>
        </div>
        <div
          className={`badge-role-banner badge-role-${layout.roleBanner.clipVariant}`}
          style={{ left: layout.roleBanner.x, top: layout.roleBanner.y, width: layout.roleBanner.width, height: layout.roleBanner.height, border: `1px solid ${layout.roleBanner.border}`, background: layout.roleBanner.background, filter: 'drop-shadow(0 0 12px rgba(53,231,255,.16))' }}
        >
          <span className="badge-role-dot" style={{ width: layout.roleBanner.dotSize, height: layout.roleBanner.dotSize, background: layout.roleBanner.textColor }} />
          <strong style={{ fontFamily: layout.roleBanner.textFont, fontWeight: 600, fontSize: layout.roleBanner.textSize, color: layout.roleBanner.textColor, letterSpacing: layout.roleBanner.letterSpacing }}>{state.role}</strong>
          <span className="badge-role-dot" style={{ width: layout.roleBanner.dotSize, height: layout.roleBanner.dotSize, background: layout.roleBanner.textColor }} />
        </div>
        <div className="badge-name-block" style={{ left: layout.nameBlock.x, top: layout.nameBlock.y, width: layout.nameBlock.maxWidth, maxHeight: layout.footer.y - layout.nameBlock.y - 8, textAlign: 'center', fontFamily: layout.nameBlock.fontFamily, fontWeight: layout.nameBlock.fontWeight, fontSize: nameFontSize, lineHeight: layout.nameBlock.lineHeight, color: layout.nameBlock.color }}>{state.name || 'Your name'}</div>
        <div className="badge-footer-row" style={{ left: layout.footer.x, top: layout.footer.y, width: layout.canvasWidth - layout.footer.x * 2, justifyContent: 'center', gap: layout.footer.gap, fontFamily: layout.footer.fontFamily, fontWeight: layout.footer.fontWeight, fontSize: layout.footer.fontSize, color: layout.footer.color }}>
          <span><Icon path={calendarIconPath} />10 October 2026</span>
          <b>|</b>
          <span><Icon path={mapPinIconPath} />Cochabamba, Bolivia</span>
        </div>
        {layout.terminalPanel && (
          <div className="badge-terminal" style={{ left: layout.terminalPanel.x, top: layout.terminalPanel.y, width: layout.terminalPanel.width, height: layout.terminalPanel.height, borderRadius: layout.terminalPanel.borderRadius, background: layout.terminalPanel.background, borderColor: layout.terminalPanel.border }}>
            <div className="badge-terminal-bar" style={{ height: layout.terminalPanel.barHeight, padding: `${layout.terminalPanel.barPaddingY}px ${layout.terminalPanel.barPaddingX}px`, borderBottomColor: layout.terminalPanel.barBorderBottom, fontFamily: layout.terminalPanel.barFontFamily, fontSize: layout.terminalPanel.barFontSize, color: layout.terminalPanel.barColor }}>
              <span className="badge-terminal-dots"><i style={{ background: layout.terminalPanel.trafficLightColor }} /><i style={{ background: layout.terminalPanel.trafficLightColor }} /><i style={{ background: layout.terminalPanel.trafficLightColor }} /></span>
              <span>{layout.terminalPanel.title}</span>
              <span className="badge-terminal-live" style={{ color: layout.terminalPanel.liveColor }}><i style={{ background: layout.terminalPanel.liveColor }} />{layout.terminalPanel.liveLabel}</span>
            </div>
            <div className="badge-terminal-body" style={{ padding: `${layout.terminalPanel.bodyPaddingTop}px ${layout.terminalPanel.bodyPaddingX}px ${layout.terminalPanel.bodyPaddingBottom}px`, fontFamily: layout.terminalPanel.bodyFontFamily, fontSize: layout.terminalPanel.bodyFontSize, lineHeight: layout.terminalPanel.bodyLineHeight }}>
              <div><span style={{ color: layout.terminalPanel.promptColor }}>badge@scd</span> ~ $ issue --participant</div>
              <div style={{ color: layout.terminalPanel.outputColor }}>&gt; verifying registration...</div>
              <div style={{ color: layout.terminalPanel.outputColor }}>&gt; role: {state.role}</div>
              <div style={{ color: layout.terminalPanel.okColor }}>✓ badge generated</div>
              <div><span style={{ color: layout.terminalPanel.promptColor }}>badge@scd</span> ~ $ <span className="badge-terminal-cursor" style={{ width: layout.terminalPanel.cursorWidth, height: layout.terminalPanel.cursorHeight, background: layout.terminalPanel.cursorColor }} /></div>
            </div>
          </div>
        )}
        <div className="badge-vignette" style={{ background: layout.vignette }} />
      </div>
    </div>
  )
}
