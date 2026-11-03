// Renders decorative images at absolute positions.
//
// Each item: { src, left/right/top/bottom/width, rotate?, shadow?, zIndex? }
// - `rotate` spins the image (e.g. '174deg')
// - `shadow` is a hard black drop-shadow offset (e.g. '1vw 0.2vw'). It lives on the
//   wrapper so it is applied *after* the rotation and keeps pointing the same way.
// - any other key is passed straight through as an inline style
export default function Decorations ({ items }) {
  return items.map(({ src, rotate, shadow, ...position }, i) => (
    <div
      key={i}
      aria-hidden="true"
      className="pointer-events-none absolute select-none"
      style={{ ...position, filter: shadow ? `drop-shadow(${shadow} 0 #000)` : undefined }}
    >
      <img src={src} alt="" draggable={false} className="block w-full" style={{ rotate }} />
    </div>
  ))
}
