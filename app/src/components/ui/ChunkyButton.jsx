// Base for the flat, hard-shadow buttons. Colour, size and shadow come from className;
// this adds the shared behaviour (layout, pressed effect, disabled state).
export default function ChunkyButton ({ className = '', type = 'button', ...props }) {
  return (
    <button
      type={type}
      {...props}
      className={`inline-flex cursor-pointer items-center justify-center gap-[0.5vw] font-bold leading-none transition-transform active:translate-x-[0.2vw] active:translate-y-[0.2vw] disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    />
  )
}
