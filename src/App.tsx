import { useEffect, useRef, useState } from 'react'
import type { BadgeState, FormatId, RoleId } from './badge/types'
import { BadgeControls } from './badge/BadgeControls'
import { BadgePreview } from './badge/BadgePreview'
import { downloadBadge } from './badge/exportUtils'
import { layout4x5 } from './badge/layouts/layout4x5'
import { layout9x16 } from './badge/layouts/layout9x16'
import {
  clampOffset,
  computeInitialFraming,
  computeMinZoom,
  scaleTransformToFormat,
} from './badge/photoUtils'
import './App.css'

const layouts = {
  '4x5': layout4x5,
  '9x16': layout9x16,
} as const

const initialState: BadgeState = {
  format: '4x5',
  name: '',
  role: 'PARTICIPANTE',
  photo: null,
  transform: { zoom: 1, offsetX: 0, offsetY: 0 },
  minZoom: 1,
}

function App() {
  const [state, setState] = useState<BadgeState>(initialState)
  const [previewWidth, setPreviewWidth] = useState(560)
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const previewColumn = useRef<HTMLDivElement>(null)
  const layout = layouts[state.format]

  useEffect(() => {
    const element = previewColumn.current
    if (!element) {
      return
    }

    const updateWidth = () => {
      setPreviewWidth(Math.max(280, Math.min(element.clientWidth, 1080)))
    }
    if (typeof ResizeObserver === 'undefined') {
      updateWidth()
      return
    }
    const observer = new ResizeObserver(updateWidth)
    observer.observe(element)
    updateWidth()
    return () => observer.disconnect()
  }, [])

  const handleFormatChange = (format: FormatId) => {
    setState((current) => {
      if (current.format === format) {
        return current
      }

      const oldLayout = layouts[current.format]
      const nextLayout = layouts[format]
      const scaledTransform = scaleTransformToFormat(current.transform, oldLayout.photoArea, nextLayout.photoArea)

      if (!current.photo) {
        return { ...current, format, transform: scaledTransform }
      }

      const minZoom = computeMinZoom(
        current.photo.naturalWidth,
        current.photo.naturalHeight,
        nextLayout.photoArea.width,
        nextLayout.photoArea.height,
      )
      const zoom = Math.max(minZoom, Math.min(minZoom * 3, scaledTransform.zoom))
      const offset = clampOffset(
        scaledTransform.offsetX,
        scaledTransform.offsetY,
        current.photo.naturalWidth,
        current.photo.naturalHeight,
        zoom,
        nextLayout.photoArea.width,
        nextLayout.photoArea.height,
      )

      return { ...current, format, minZoom, transform: { ...offset, zoom } }
    })
  }

  const handlePhotoUpload = (photo: HTMLImageElement) => {
    const minZoom = computeMinZoom(
      photo.naturalWidth,
      photo.naturalHeight,
      layout.photoArea.width,
      layout.photoArea.height,
    )
    const transform = computeInitialFraming(
      photo.naturalWidth,
      photo.naturalHeight,
      layout.photoArea.width,
      layout.photoArea.height,
    )
    setState((current) => ({ ...current, photo, minZoom, transform }))
  }

  const handleZoomChange = (requestedZoom: number) => {
    setState((current) => {
      if (!current.photo) {
        return current
      }

      const zoom = Math.max(current.minZoom, Math.min(current.minZoom * 3, requestedZoom))
      const offset = clampOffset(
        current.transform.offsetX,
        current.transform.offsetY,
        current.photo.naturalWidth,
        current.photo.naturalHeight,
        zoom,
        layout.photoArea.width,
        layout.photoArea.height,
      )
      return { ...current, transform: { ...offset, zoom } }
    })
  }

  const handleDragOffset = (offsetX: number, offsetY: number) => {
    setState((current) => {
      if (!current.photo) {
        return current
      }

      const offset = clampOffset(
        current.transform.offsetX + offsetX,
        current.transform.offsetY + offsetY,
        current.photo.naturalWidth,
        current.photo.naturalHeight,
        current.transform.zoom,
        layout.photoArea.width,
        layout.photoArea.height,
      )
      return { ...current, transform: { ...current.transform, ...offset } }
    })
  }

  const handleResetPhoto = () => {
    setState((current) => {
      if (!current.photo) {
        return current
      }

      const minZoom = computeMinZoom(
        current.photo.naturalWidth,
        current.photo.naturalHeight,
        layout.photoArea.width,
        layout.photoArea.height,
      )
      return {
        ...current,
        minZoom,
        transform: computeInitialFraming(
          current.photo.naturalWidth,
          current.photo.naturalHeight,
          layout.photoArea.width,
          layout.photoArea.height,
        ),
      }
    })
  }

  const handleNameChange = (name: string) => setState((current) => ({ ...current, name }))
  const handleRoleChange = (role: RoleId) => setState((current) => ({ ...current, role }))
  const handleDownload = async () => {
    setIsExporting(true)
    setExportError(null)
    try {
      await downloadBadge(layout, state)
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Export failed.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <main className="badge-app">
      <header className="app-header">
        <div>
          <p className="app-eyebrow">SCD · COCHABAMBA · 2026</p>
          <h1>AWS Student Community Day</h1>
        </div>
        <span className="app-status"><i />Badge generator</span>
      </header>
      <div className="badge-workspace">
        <BadgeControls
          state={state}
          onFormatChange={handleFormatChange}
          onPhotoUpload={handlePhotoUpload}
          onNameChange={handleNameChange}
          onRoleChange={handleRoleChange}
          onZoomChange={handleZoomChange}
          onResetPhoto={handleResetPhoto}
          onDownload={handleDownload}
          isExporting={isExporting}
          exportError={exportError}
        />
        <section className="preview-column" ref={previewColumn} aria-label="Badge preview">
          <div className="preview-heading"><span>Live preview</span><span>{layout.canvasWidth} × {layout.canvasHeight} px</span></div>
          <BadgePreview state={state} layout={layout} wrapperWidth={previewWidth} onDragOffset={handleDragOffset} />
        </section>
      </div>
    </main>
  )
}

export default App
