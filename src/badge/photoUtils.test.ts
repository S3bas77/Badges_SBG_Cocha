import { describe, expect, it } from 'vitest'
import * as fc from 'fast-check'
import {
  clampOffset,
  computeInitialFraming,
  computeMaxZoom,
  computeMinZoom,
  scaleTransformToFormat,
} from './photoUtils'

const photoDimensions = fc.record({
  imgW: fc.integer({ min: 1, max: 4000 }),
  imgH: fc.integer({ min: 1, max: 4000 }),
  areaW: fc.integer({ min: 100, max: 1080 }),
  areaH: fc.integer({ min: 100, max: 1080 }),
})

describe('photo utilities', () => {
  it('computes the minimum crop-to-fill zoom', () => {
    expect(computeMinZoom(400, 800, 600, 600)).toBe(1.5)
    expect(computeMinZoom(1200, 800, 600, 600)).toBe(0.75)
  })

  it('clamps offsets to keep the complete photo area covered', () => {
    expect(clampOffset(1000, -1000, 1000, 1000, 1, 600, 600)).toEqual({
      offsetX: 200,
      offsetY: -200,
    })
  })

  it('scales offsets while preserving zoom', () => {
    expect(
      scaleTransformToFormat(
        { offsetX: 100, offsetY: -50, zoom: 2 },
        { width: 600, height: 600 },
        { width: 680, height: 680 },
      ),
    ).toEqual({ offsetX: 680 / 6, offsetY: -680 / 12, zoom: 2 })
  })

  it('round-trips format offsets within one pixel', () => {
    fc.assert(
      fc.property(
        fc.record({
          offsetX: fc.float({ min: -500, max: 500, noNaN: true }),
          offsetY: fc.float({ min: -500, max: 500, noNaN: true }),
          zoom: fc.float({ min: Math.fround(0.1), max: Math.fround(5), noNaN: true }),
        }),
        (transform) => {
          const toStory = scaleTransformToFormat(
            transform,
            { width: 600, height: 600 },
            { width: 680, height: 680 },
          )
          const back = scaleTransformToFormat(
            toStory,
            { width: 680, height: 680 },
            { width: 600, height: 600 },
          )

          expect(Math.abs(back.offsetX - transform.offsetX)).toBeLessThanOrEqual(1)
          expect(Math.abs(back.offsetY - transform.offsetY)).toBeLessThanOrEqual(1)
          expect(back.zoom).toBe(transform.zoom)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('maintains photo coverage for arbitrary valid dimensions and zooms', () => {
    fc.assert(
      fc.property(
        photoDimensions.chain(({ imgW, imgH, areaW, areaH }) => {
          const minZoom = computeMinZoom(imgW, imgH, areaW, areaH)
          return fc.record({
            imgW: fc.constant(imgW),
            imgH: fc.constant(imgH),
            areaW: fc.constant(areaW),
            areaH: fc.constant(areaH),
            zoom: fc.float({
              min: Math.fround(minZoom),
              max: Math.fround(computeMaxZoom(minZoom)),
              noNaN: true,
            }),
            offsetX: fc.integer({ min: -10000, max: 10000 }),
            offsetY: fc.integer({ min: -10000, max: 10000 }),
          })
        }),
        ({ imgW, imgH, areaW, areaH, zoom, offsetX, offsetY }) => {
          const clamped = clampOffset(
            offsetX,
            offsetY,
            imgW,
            imgH,
            zoom,
            areaW,
            areaH,
          )
          const scaledW = imgW * zoom
          const scaledH = imgH * zoom

          expect(scaledW / 2 + clamped.offsetX).toBeGreaterThanOrEqual(areaW / 2 - 1e-4)
          expect(scaledW / 2 - clamped.offsetX).toBeGreaterThanOrEqual(areaW / 2 - 1e-4)
          expect(scaledH / 2 + clamped.offsetY).toBeGreaterThanOrEqual(areaH / 2 - 1e-4)
          expect(scaledH / 2 - clamped.offsetY).toBeGreaterThanOrEqual(areaH / 2 - 1e-4)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('computes centered initial framing that covers the photo area', () => {
    fc.assert(
      fc.property(photoDimensions, ({ imgW, imgH, areaW, areaH }) => {
        const framing = computeInitialFraming(imgW, imgH, areaW, areaH)

        expect(framing.offsetX).toBe(0)
        expect(framing.offsetY).toBe(0)
        expect(framing.zoom * imgW).toBeGreaterThanOrEqual(areaW - 1e-9)
        expect(framing.zoom * imgH).toBeGreaterThanOrEqual(areaH - 1e-9)
      }),
      { numRuns: 100 },
    )
  })

  it('uses three times the minimum zoom for the MVP maximum', () => {
    expect(computeMaxZoom(1.25)).toBe(3.75)
  })
})
