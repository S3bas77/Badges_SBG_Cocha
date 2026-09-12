import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as fc from 'fast-check'
import { layout4x5 } from './layouts/layout4x5'
import { layout9x16 } from './layouts/layout9x16'
import type { BadgeState } from './types'

vi.mock('./designSystem', () => ({
  awsLogoSrc: '/assets/aws-logo.svg',
  calendarIconPath: '<calendar />',
  mapPinIconPath: '<map-pin />',
  watermarkPath: '<watermark />',
  colors: {
    navy950: '#04060d',
    cyan: '#35e7ff',
    cyanGlow: 'rgba(53,231,255,0.5)',
    orange: '#ff9900',
    yellow: '#ffce54',
    white: '#ffffff',
  },
  fonts: {
    poppins: 'Poppins, sans-serif',
    jetbrainsMono: "'JetBrains Mono', monospace",
  },
}))

import { downloadBadge, renderToCanvas } from './exportUtils'

class FakePath2D {
  arc() {}
  bezierCurveTo() {}
  closePath() {}
  lineTo() {}
  moveTo() {}
  rect() {}
}

class FakeGradient {
  addColorStop() {}
}

class FakeContext {
  font = ''
  fills: Array<{ text: string; font: string }> = []
  fillStyle: unknown
  strokeStyle: unknown
  lineWidth = 1
  textAlign = 'start'
  shadowColor = ''
  shadowBlur = 0
  fillText = vi.fn((text: string) => {
    this.fills.push({ text, font: this.font })
  })
  measureText = vi.fn((text: string) => ({ width: text.length * 10 }))
  drawImage = vi.fn()
  fillRect = vi.fn()
  strokeRect = vi.fn()
  beginPath = vi.fn()
  moveTo = vi.fn()
  lineTo = vi.fn()
  closePath = vi.fn()
  arc = vi.fn()
  bezierCurveTo = vi.fn()
  rect = vi.fn()
  roundRect = vi.fn()
  fill = vi.fn()
  stroke = vi.fn()
  clip = vi.fn()
  save = vi.fn()
  restore = vi.fn()
  translate = vi.fn()
  scale = vi.fn()
  createLinearGradient = vi.fn(() => new FakeGradient())
  createRadialGradient = vi.fn(() => new FakeGradient())
}

class FakeImage {
  naturalWidth = 304
  naturalHeight = 182
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  set src(value: string) {
    void value
    queueMicrotask(() => this.onload?.())
  }
}

function makeState(format: BadgeState['format'], name = 'Ada Lovelace'): BadgeState {
  return {
    format,
    name,
    role: 'PARTICIPANTE',
    photo: new FakeImage() as unknown as HTMLImageElement,
    transform: { offsetX: 24, offsetY: -18, zoom: 2 },
    minZoom: 1,
  }
}

let context: FakeContext

beforeEach(() => {
  context = new FakeContext()
  vi.stubGlobal('Path2D', FakePath2D)
  vi.stubGlobal('Image', FakeImage)
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D)
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,export')
  Object.defineProperty(document, 'fonts', {
    configurable: true,
    value: { ready: Promise.resolve(), check: () => true },
  })
})

describe('canvas export', () => {
  it('returns the exact native dimensions for both formats', async () => {
    const portrait = await renderToCanvas(layout4x5, makeState('4x5'))
    const story = await renderToCanvas(layout9x16, makeState('9x16'))

    expect([portrait.width, portrait.height]).toEqual([1080, 1350])
    expect([story.width, story.height]).toEqual([1080, 1920])
  })

  it('uses the center-based photo draw coordinates', async () => {
    const state = makeState('4x5')
    await renderToCanvas(layout4x5, state)

    const area = layout4x5.photoArea
    const scaledWidth = state.photo!.naturalWidth * state.transform.zoom
    const scaledHeight = state.photo!.naturalHeight * state.transform.zoom
    const drawX = area.x + area.width / 2 - scaledWidth / 2 + state.transform.offsetX
    const drawY = area.y + area.height / 2 - scaledHeight / 2 + state.transform.offsetY

    expect(context.drawImage).toHaveBeenCalledWith(state.photo, drawX, drawY, scaledWidth, scaledHeight)
  })

  it('draws the official logo asset at each layout logo position without distortion', async () => {
    for (const [layout, format] of [[layout4x5, '4x5'], [layout9x16, '9x16']] as const) {
      context.drawImage.mockClear()
      await renderToCanvas(layout, makeState(format))

      expect(context.drawImage).toHaveBeenCalledWith(
        expect.any(FakeImage),
        layout.awsLogoBlock.x,
        layout.awsLogoBlock.y,
        layout.awsLogoBlock.width,
        layout.awsLogoBlock.width * 182 / 304,
      )
    }
  })

  it('shrinks long names and wraps the remaining text within the width', async () => {
    const name = 'A'.repeat(200)
    await renderToCanvas(layout4x5, makeState('4x5', name))

    // Filter out studentLabel calls (weight 800, fontSize 30) — they're drawn before the name block
    const nameWeight = layout4x5.nameBlock.fontWeight
    const studentFontSize = layout4x5.studentLabel.fontSize
    const nameCalls = context.fills.filter(({ font }) =>
      font.startsWith(`${nameWeight} `) && !font.startsWith(`${nameWeight} ${studentFontSize}px`))
    const fontSize = Number(nameCalls[0]?.font.match(/(\d+)px/)?.[1])
    expect(name.length * 10).toBeGreaterThan(layout4x5.nameBlock.maxWidth)
    expect(fontSize).toBe(layout4x5.nameBlock.minFontSize)
    expect(nameCalls.every(({ text }) => text.length * 10 <= layout4x5.nameBlock.maxWidth)).toBe(true)
  })

  it('preserves state when download fails', async () => {
    const state = makeState('4x5')
    const originalTransform = { ...state.transform }
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(() => {
      throw new DOMException('Canvas is tainted', 'SecurityError')
    })

    await expect(downloadBadge(layout4x5, state)).rejects.toThrow('uploaded image may be from a restricted source')
    expect(state.transform).toEqual(originalTransform)
    expect(state.photo).not.toBeNull()
  })

  it('runs at least 100 export dimension property cases per format', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constantFrom('4x5' as const, '9x16' as const), async (format) => {
        const canvas = await renderToCanvas(
          format === '4x5' ? layout4x5 : layout9x16,
          makeState(format),
        )
        expect(canvas.width).toBe(format === '4x5' ? 1080 : 1080)
        expect(canvas.height).toBe(format === '4x5' ? 1350 : 1920)
      }),
      { numRuns: 100 },
    )
  })

  it('keeps every rendered name line within the configured width', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string({ maxLength: 200 }), async (name) => {
        context.fills = []
        await renderToCanvas(layout4x5, makeState('4x5', name))
        const nameLines = context.fills
          .filter(({ font }) => font.startsWith('800 '))
          .map(({ text }) => text)

        for (const line of nameLines) {
          expect(line.length * 10).toBeLessThanOrEqual(layout4x5.nameBlock.maxWidth)
        }
      }),
      { numRuns: 100 },
    )
  })
})

describe('canvas export guards', () => {
  it('rejects when Poppins is unavailable', async () => {
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: { ready: Promise.resolve(), check: () => false },
    })

    await expect(renderToCanvas(layout4x5, makeState('4x5'))).rejects.toThrow('Required font Poppins')
  })

  it('rejects when JetBrains Mono is unavailable', async () => {
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: { ready: Promise.resolve(), check: (font: string) => !font.includes('JetBrains') },
    })

    await expect(renderToCanvas(layout4x5, makeState('4x5'))).rejects.toThrow('Required font JetBrains Mono')
  })
})
