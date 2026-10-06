export type FormatId = '4x5' | '9x16'

export type RoleId =
  | 'PARTICIPANTE'
  | 'SPEAKER'
  | 'VOLUNTARIO'

export interface PhotoTransform {
  offsetX: number
  offsetY: number
  zoom: number
}

export interface BadgeState {
  format: FormatId
  name: string
  role: RoleId
  photo: HTMLImageElement | null
  transform: PhotoTransform
  minZoom: number
}

export interface PhotoAreaDef {
  x: number
  y: number
  width: number
  height: number
  clipCorner: number
  borderGradient: [string, string]
  glow: string
}

export interface NameBlockDef {
  x: number
  y: number
  maxWidth: number
  fontFamily: string
  fontWeight: number
  fontSize: number
  minFontSize: number
  lineHeight: number
  color: string
}

export interface RoleBannerDef {
  x: number
  y: number
  width: number
  height: number
  clipVariant: 'hexagon' | 'parallelogram'
  border: string
  background: string
  textFont: string
  textSize: number
  textColor: string
  letterSpacing: number
  dotSize?: number
}

export interface BackgroundDef {
  base: string
  gridSize: number
  gridColor: string
  gridOpacity: number
  gradients: string[]
  dotSpacing?: number
  dotRadius?: number
  dotColor?: string
}

export interface WatermarkDef {
  x: number
  y: number
  width: number
  height: number
  opacity: number
  stroke: string
  strokeWidth: number
  viewBox: string
}

export interface CornerBracketDef {
  top?: number
  left?: number
  bottom?: number
  right?: number
  horizontalWidth: number
  horizontalHeight: number
  verticalWidth: number
  verticalHeight: number
  horizontalGradient: string
  verticalGradient: string
}

export interface AwsLogoBlockDef {
  x: number
  y: number
  width: number
  wordmarkFontFamily: string
  wordmarkFontWeight: number
  wordmarkFontSize: number
  wordmarkColor: string
  wordmarkLetterSpacing: number
  underlineWidth: number
  underlineHeight: number
}

export interface TextElementDef {
  x: number
  y: number
  width: number
  fontFamily: string
  fontWeight: number
  fontSize: number
  color: string
  letterSpacing: number
  lineHeight?: number
  textAlign?: 'left' | 'center' | 'right'
  text?: string
  lines?: string[]
  lineColors?: string[]
  lineGlow?: boolean[]
  textShadow?: string
}

export interface SubtitleRowDef {
  x: number
  y: number
  lineWidth: number
  lineHeight: number
  dotSize: number
  gap: number
  text: string
  fontFamily: string
  fontWeight: number
  fontSize: number
  color: string
  letterSpacing: number
  lineOpacity: number
  dotOpacity: number
}

export interface MetaLineDef {
  x: number
  y: number
  width: number
  leftText: string
  rightText: string
  fontFamily: string
  fontWeight: number
  fontSize: number
  color: string
  opacity: number
  letterSpacing: number
}

export interface PillBadgeDef {
  x: number
  y: number
  width: number
  height: number
  text: string
  fontFamily: string
  fontWeight: number
  fontSize: number
  color: string
  letterSpacing: number
  border: string
  borderRadius: number
  background: string
  dotSize: number
  dotColor: string
  gap: number
}

export interface TerminalPanelDef {
  x: number
  y: number
  width: number
  height: number
  borderRadius: number
  background: string
  border: string
  barHeight: number
  barPaddingX: number
  barPaddingY: number
  barBorderBottom: string
  barFontFamily: string
  barFontSize: number
  barColor: string
  bodyPaddingX: number
  bodyPaddingTop: number
  bodyPaddingBottom: number
  bodyFontFamily: string
  bodyFontSize: number
  bodyLineHeight: number
  promptColor: string
  outputColor: string
  okColor: string
  cursorWidth: number
  cursorHeight: number
  cursorColor: string
  liveColor: string
  trafficLightColor: string
  title: string
  liveLabel: string
}

export interface FooterDef {
  x: number
  y: number
  fontFamily: string
  fontWeight: number
  fontSize: number
  color: string
  gap: number
}

export interface LayoutDefinition {
  id: FormatId
  canvasWidth: number
  canvasHeight: number
  background: BackgroundDef
  watermark?: WatermarkDef
  cornerBrackets?: CornerBracketDef[]
  awsLogoBlock: AwsLogoBlockDef
  studentLabel: TextElementDef
  communityDayTitle: TextElementDef
  subtitleRow: SubtitleRowDef
  photoArea: PhotoAreaDef
  roleBanner: RoleBannerDef
  nameBlock: NameBlockDef
  footer: FooterDef
  metaLine?: MetaLineDef
  pillBadge?: PillBadgeDef
  terminalPanel?: TerminalPanelDef
  vignette: string
}
