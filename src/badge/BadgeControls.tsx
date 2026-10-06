import { useRef, useState } from 'react'
import type { ChangeEvent, RefObject } from 'react'
import type { BadgeState, FormatId, RoleId } from './types'

interface BadgeControlsProps {
  state: BadgeState
  onFormatChange: (format: FormatId) => void
  onPhotoUpload: (photo: HTMLImageElement) => void
  onNameChange: (name: string) => void
  onRoleChange: (role: RoleId) => void
  onZoomChange: (zoom: number) => void
  onResetPhoto: () => void
  onDownload: () => void
  isExporting: boolean
  exportError: string | null
  fileInputRef?: RefObject<HTMLInputElement | null>
}

const roles: Array<{ value: RoleId; label: string }> = [
  { value: 'PARTICIPANTE', label: 'Participante' },
  { value: 'SPEAKER', label: 'Speaker' },
  { value: 'VOLUNTARIO', label: 'Voluntario' },
]

const acceptedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const maxFileSize = 10 * 1024 * 1024

export function BadgeControls({
  state,
  onFormatChange,
  onPhotoUpload,
  onNameChange,
  onRoleChange,
  onZoomChange,
  onResetPhoto,
  onDownload,
  isExporting,
  exportError,
  fileInputRef,
}: BadgeControlsProps) {
  const [uploadError, setUploadError] = useState<string | null>(null)
  const localFileInput = useRef<HTMLInputElement>(null)
  const inputRef = fileInputRef ?? localFileInput

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    if (!acceptedTypes.has(file.type) || file.size > maxFileSize) {
      setUploadError('Accepted file types: JPEG, PNG, WebP, or GIF. Maximum size: 10 MB.')
      return
    }

    setUploadError(null)
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      onPhotoUpload(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      setUploadError('Could not load image.')
    }
    image.src = objectUrl
  }

  return (
    <aside className="badge-controls" aria-label="Badge controls">
      <div className="controls-kicker">AWS STUDENT COMMUNITY DAY</div>
      <h1>Build your badge</h1>
      <p className="controls-intro">Shape the frame, add your details, and make it yours.</p>

      <fieldset className="control-group">
        <legend>Format</legend>
        <div className="format-options">
          <button type="button" className={state.format === '4x5' ? 'format-option is-selected' : 'format-option'} onClick={() => onFormatChange('4x5')} aria-pressed={state.format === '4x5'}>
            <strong>4:5</strong><span>Instagram portrait</span>
          </button>
          <button type="button" className={state.format === '9x16' ? 'format-option is-selected' : 'format-option'} onClick={() => onFormatChange('9x16')} aria-pressed={state.format === '9x16'}>
            <strong>9:16</strong><span>Instagram Story / vertical</span>
          </button>
        </div>
      </fieldset>

      <div className="control-group">
        <div className="control-label-row"><label htmlFor="photo-upload">Photograph</label><span>10 MB max</span></div>
        <input ref={inputRef} id="photo-upload" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleFileChange} />
        {uploadError && <p className="control-error" role="alert">{uploadError}</p>}
      </div>

      <div className="control-group">
        <label htmlFor="attendee-name">Name</label>
        <input id="attendee-name" type="text" value={state.name} onChange={(event) => onNameChange(event.target.value)} placeholder="Your name" />
      </div>

      <div className="control-group">
        <label htmlFor="attendee-role">Role</label>
        <select id="attendee-role" value={state.role} onChange={(event) => onRoleChange(event.target.value as RoleId)}>
          {roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
        </select>
      </div>

      <div className="control-group">
        <div className="control-label-row"><label htmlFor="photo-zoom">Zoom</label><output>{state.photo ? `${state.transform.zoom.toFixed(2)}×` : 'Upload a photo'}</output></div>
        <input id="photo-zoom" type="range" min={state.minZoom} max={state.minZoom * 3} step="0.01" value={state.transform.zoom} onChange={(event) => onZoomChange(Number(event.target.value))} disabled={!state.photo} />
      </div>

      <div className="control-actions">
        <button type="button" className="secondary-action" onClick={onResetPhoto} disabled={!state.photo}>Reset Photo</button>
        <button type="button" className="primary-action" onClick={onDownload} disabled={isExporting}>Download PNG</button>
      </div>
      {exportError && <p className="control-error" role="alert">{exportError}</p>}
    </aside>
  )
}
