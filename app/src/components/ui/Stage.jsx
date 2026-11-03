import { createPortal } from 'react-dom'

// Every screen is designed on a 16:9 canvas and sized in `cqw` (1cqw = 1% of the
// canvas width). Stage fits that canvas inside the window, centred, and lets the
// outer element's background (className) fill whatever space is left over, so nothing
// gets cut off when the window is wider or taller than 16:9. canvasClassName styles
// the 16:9 canvas itself.
//
// `portal` renders the stage straight into <body> — used by dialogs, so their
// backdrop covers the whole window rather than just the canvas they were opened from.
export default function Stage ({ className = '', canvasClassName = '', portal = false, children, ...props }) {
  const stage = (
    <div {...props} className={`fixed inset-0 flex items-center justify-center overflow-hidden ${className}`}>
      <div data-stage className={`relative h-[min(100vh,56.25vw)] w-[min(100vw,177.78vh)] shrink-0 @container-size ${canvasClassName}`}>
        {children}
      </div>
    </div>
  )
  return portal ? createPortal(stage, document.body) : stage
}
