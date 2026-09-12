import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from '../App'
import { BadgeControls } from '../badge/BadgeControls'
import { awsLogoSrc } from '../badge/designSystem'
import type { BadgeState } from '../badge/types'

function emptyState(): BadgeState {
  return {
    format: '4x5',
    name: '',
    role: 'PARTICIPANTE',
    photo: null,
    transform: { offsetX: 0, offsetY: 0, zoom: 1 },
    minZoom: 1,
  }
}

describe('badge generator integration', () => {
  it('starts with the 4:5 format and offers exactly two format buttons', () => {
    render(<App />)

    expect(screen.getAllByRole('button', { name: /Instagram|Story/ })).toHaveLength(2)
    expect(screen.getByRole('button', { name: /4:5/ }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText('1080 × 1350 px')).toBeTruthy()
  })

  it('renders the official AWS SVG asset in the preview', () => {
    render(<App />)

    expect(awsLogoSrc).toBe('/assets/aws-logo.svg')
    expect(screen.getByRole('img', { name: 'AWS logo' }).getAttribute('src')).toBe('/assets/aws-logo.svg')
  })

  it('switches format while keeping the preview in the selected dimensions', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /9:16/ }))

    expect(screen.getByRole('button', { name: /9:16/ }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText('1080 × 1920 px')).toBeTruthy()
  })

  it('updates the attendee name in the preview', () => {
    render(<App />)
    const nameInput = screen.getByLabelText('Name')

    fireEvent.change(nameInput, { target: { value: 'Grace Hopper' } })

    expect((screen.getByDisplayValue('Grace Hopper') as HTMLInputElement).value).toBe('Grace Hopper')
    expect(screen.getByText('Grace Hopper')).toBeTruthy()
  })

  it('updates the role in the preview and 4:5 banner', () => {
    render(<App />)

    fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'SPEAKER' } })

    expect(screen.getAllByText('SPEAKER').length).toBeGreaterThanOrEqual(1)
  })

  it('rejects an invalid upload without changing the photo area', () => {
    render(<App />)
    const input = screen.getByLabelText('Photograph')
    const invalidFile = new File(['not an image'], 'notes.pdf', { type: 'application/pdf' })

    fireEvent.change(input, { target: { files: [invalidFile] } })

    expect(screen.getByRole('alert').textContent).toContain('JPEG, PNG, WebP, or GIF')
    expect(document.querySelector('.badge-photo-placeholder')).toBeTruthy()
  })

  it('keeps the download control disabled while export is in progress', () => {
    render(
      <BadgeControls
        state={emptyState()}
        onFormatChange={() => undefined}
        onPhotoUpload={() => undefined}
        onNameChange={() => undefined}
        onRoleChange={() => undefined}
        onZoomChange={() => undefined}
        onResetPhoto={() => undefined}
        onDownload={() => undefined}
        isExporting
        exportError={null}
      />,
    )

    expect((screen.getByRole('button', { name: 'Download PNG' }) as HTMLButtonElement).disabled).toBe(true)
  })
})
