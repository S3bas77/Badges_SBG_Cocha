/**
 * Typography note:
 * The badge design specifies Amazon Ember Bold (COMMUNITY DAY) and Amazon Ember Condensed Bold (STUDENT).
 * Amazon Ember is a proprietary font owned by Amazon and is not publicly available.
 * This project uses Poppins (Google Fonts) as the implementation font:
 * - COMMUNITY DAY: Poppins weight 900 (closest available equivalent to Amazon Ember Bold/Heavy)
 * - STUDENT: Poppins weight 800 (closest available equivalent to Amazon Ember Condensed Bold)
 * If Amazon Ember font files are provided by the event organizer, declare them in @font-face
 * in src/index.css and update the fontFamily values in the layout definitions.
 */

export const colors = {
  navy950: '#04060d',
  navy900: '#060a16',
  navy800: '#0a1224',
  cyan: '#35e7ff',
  cyanDim: '#1c9db8',
  cyanGlow: 'rgba(53,231,255,0.5)',
  orange: '#ff9900',
  yellow: '#ffce54',
  white: '#ffffff',
  grey200_45: '#cddaeb',
  grey200_916: '#c8d3e3',
  grey400: '#8b97ac',
  mint: '#6ff2c8',
} as const

export const fonts = {
  poppins: 'Poppins, sans-serif',
  jetbrainsMono: "'JetBrains Mono', monospace",
} as const

export const awsLogoSrc: string | null = '/assets/aws-logo.svg'

export const calendarIconPath =
  '<rect x="3" y="5" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="16" y1="3" x2="16" y2="7"/>'

export const mapPinIconPath =
  '<path d="M12 22s7-7.2 7-12a7 7 0 1 0-14 0c0 4.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>'

export const watermarkPath =
  '<circle cx="100" cy="46" r="30"/><line x1="100" y1="76" x2="100" y2="240"/><line x1="100" y1="110" x2="20" y2="180"/><line x1="100" y1="110" x2="180" y2="180"/><line x1="100" y1="240" x2="40" y2="400"/><line x1="100" y1="240" x2="160" y2="400"/><line x1="60" y1="130" x2="140" y2="130"/><line x1="55" y1="170" x2="145" y2="170"/>'
