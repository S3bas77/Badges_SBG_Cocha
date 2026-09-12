import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as fc from 'fast-check'

vi.mock('./designSystem', () => ({
  awsLogoSrc: null,
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

import { layout4x5 } from './layouts/layout4x5'
import { renderToCanvas } from './exportUtils'
import type { BadgeState } from './types'

function makeState(name: string): BadgeState {
  return {
    format: '4x5',
    name,
    role: 'PARTICIPANTE',
    photo: null,
    transform: { offsetX: 0, offsetY: 0, zoom: 1 },
    minZoom: 1,
  }
}

beforeEach(() => {
  Object.defineProperty(document, 'fonts', {
    configurable: true,
    value: { ready: Promise.resolve(), check: () => true },
  })
})

describe('missing AWS logo export guard', () => {
  it('rejects before producing a canvas when the required asset is missing', async () => {
    await expect(renderToCanvas(layout4x5, makeState('Ada'))).rejects.toThrow('Required asset (AWS logo) could not be loaded')
  })

  it('preserves every state value after a missing-asset failure', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string(), async (name) => {
        const state = makeState(name)
        const original = {
          format: state.format,
          name: state.name,
          role: state.role,
          photo: state.photo,
          transform: { ...state.transform },
          minZoom: state.minZoom,
        }

        await expect(renderToCanvas(layout4x5, state)).rejects.toThrow('Required asset')
        expect(state).toMatchObject(original)
        expect(state.transform).toEqual(original.transform)
      }),
      { numRuns: 100 },
    )
  })
})
