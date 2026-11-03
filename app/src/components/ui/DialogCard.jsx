import { useEffect } from 'react'
import Stage from './Stage'

// Dialog over a blurred dashboard: purple title bar, lavender body, black border + hard shadow.
// Escape and clicking the backdrop both call onClose.
export default function DialogCard ({ label, onClose, className = '', bodyClassName = '', children }) {
  useEffect(() => {
    function handleKey (e) { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Only clicks on the empty backdrop close the dialog, not clicks inside the card
  function handleBackdrop (e) {
    if (e.target === e.currentTarget || 'stage' in e.target.dataset || 'backdrop' in e.target.dataset) onClose?.()
  }

  return (
    <Stage
      portal
      role="dialog"
      aria-modal="true"
      aria-label={label}
      data-ui
      onMouseDown={handleBackdrop}
      className="z-50 bg-white/20 font-display text-black backdrop-blur-[6px]"
    >
      <div data-backdrop className="absolute inset-0 flex items-center justify-center">
        <div className={`overflow-hidden rounded-[0.9cqw] border-[0.3cqw] border-black bg-sb-dash shadow-[0.8cqw_0.9cqw_0_#000] ${className}`}>
          <div className="h-[3cqw] border-b-[0.25cqw] border-black bg-sb-purple-dark" />
          <div className={bodyClassName}>{children}</div>
        </div>
      </div>
    </Stage>
  )
}
