// Renders decorative images at absolute positions.
//
// Each item: { src, left/right/top/bottom/width, rotate?, shadow?, pin?, zIndex? }
// - `rotate` spins the image (e.g. '174deg')
// - `shadow` is a hard black drop-shadow offset (e.g. '1cqw 0.2cqw'). It lives on the
//   wrapper so it is applied *after* the rotation and keeps pointing the same way.
// - `pin` ('left', 'right', 'top', 'bottom' or two of them, e.g. 'right top') is for
//   shapes that bleed off an edge of the design. When the window isn't 16:9 the
//   canvas is letterboxed, so the shape is shifted by the letterbox to sit on the
//   real window edge instead of stopping mid-page.
// - any other key is passed straight through as an inline style
const BLEED_X = '(100vw - 100cqw) / 2'
const BLEED_Y = '(100vh - 100cqh) / 2'

function pinOffset (pin = '') {
  if (!pin) return undefined
  const x = pin.includes('left') ? `calc(-1 * ${BLEED_X})` : pin.includes('right') ? `calc(${BLEED_X})` : '0px'
  const y = pin.includes('top') ? `calc(-1 * ${BLEED_Y})` : pin.includes('bottom') ? `calc(${BLEED_Y})` : '0px'
  return `${x} ${y}`
}

export default function Decorations ({ items }) {
  return items.map(({ src, rotate, shadow, pin, ...position }, i) => (
    <div
      key={i}
      aria-hidden="true"
      className="pointer-events-none absolute select-none"
      style={{ ...position, translate: pinOffset(pin), filter: shadow ? `drop-shadow(${shadow} 0 #000)` : undefined }}
    >
      <img src={src} alt="" draggable={false} className="block w-full" style={{ rotate }} />
    </div>
  ))
}
