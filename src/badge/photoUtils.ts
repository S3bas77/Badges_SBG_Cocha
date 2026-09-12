import type { PhotoTransform } from './types'

export interface PhotoDrawPosition {
  x: number
  y: number
  width: number
  height: number
}

export function computePhotoDrawPosition(
  area: { x: number; y: number; width: number; height: number },
  image: { naturalWidth: number; naturalHeight: number },
  transform: PhotoTransform,
): PhotoDrawPosition {
  const width = image.naturalWidth * transform.zoom
  const height = image.naturalHeight * transform.zoom
  return {
    x: area.x + area.width / 2 - width / 2 + transform.offsetX,
    y: area.y + area.height / 2 - height / 2 + transform.offsetY,
    width,
    height,
  }
}

/** Minimum zoom so the image exactly covers the photo area. */
export function computeMinZoom(
  imgW: number,
  imgH: number,
  areaW: number,
  areaH: number,
): number {
  return Math.max(areaW / imgW, areaH / imgH)
}

/** Clamp offsets so the photo fully covers the area at the given zoom. */
export function clampOffset(
  offsetX: number,
  offsetY: number,
  imgW: number,
  imgH: number,
  zoom: number,
  areaW: number,
  areaH: number,
): { offsetX: number; offsetY: number } {
  const scaledW = imgW * zoom
  const scaledH = imgH * zoom
  const maxX = (scaledW - areaW) / 2
  const maxY = (scaledH - areaH) / 2

  return {
    offsetX: Math.max(-maxX, Math.min(maxX, offsetX)),
    offsetY: Math.max(-maxY, Math.min(maxY, offsetY)),
  }
}

/** Scale a photo transform from one format's photo area to another. */
export function scaleTransformToFormat(
  transform: PhotoTransform,
  oldArea: { width: number; height: number },
  newArea: { width: number; height: number },
): PhotoTransform {
  const scaleX = newArea.width / oldArea.width
  const scaleY = newArea.height / oldArea.height

  return {
    zoom: transform.zoom,
    offsetX: transform.offsetX * scaleX,
    offsetY: transform.offsetY * scaleY,
  }
}

/** Initial framing: minimum zoom with centered offsets. */
export function computeInitialFraming(
  imgW: number,
  imgH: number,
  areaW: number,
  areaH: number,
): PhotoTransform {
  return {
    zoom: computeMinZoom(imgW, imgH, areaW, areaH),
    offsetX: 0,
    offsetY: 0,
  }
}

/** MVP maximum zoom: three times the minimum cover zoom. */
export function computeMaxZoom(minZoom: number): number {
  return minZoom * 3
}
