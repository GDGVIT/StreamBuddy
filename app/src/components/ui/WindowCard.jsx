import windowControls from '../../assets/Frame 216.svg'

// Two sizes of the "fake desktop window" used across onboarding and modals
const PRESETS = {
  // onboarding step cards
  panel: {
    frame: 'rounded-[0.7vw] border-[0.2vw] shadow-[0.6vw_0.6vw_0_#000]',
    bar: 'h-[3.45vw] px-[1.1vw]',
    controls: 'w-[8.6vw]'
  },
  // full-screen modals (Selected Directory / Can't Find the Directory)
  modal: {
    frame: 'rounded-[1.3vw] border-[0.35vw] shadow-[-2.15vw_2.75vw_0_#000]',
    bar: 'h-[5.2vw] px-[1.9vw] border-b-[0.35vw] border-black',
    controls: 'w-[11.4vw]'
  }
}

const TITLEBAR_TONES = {
  dark: 'bg-sb-titlebar',
  error: 'bg-sb-titlebar-error',
  purple: 'bg-sb-purple-dark'
}

// A window with a coloured title bar (close / maximise / minimise dots — decorative),
// a body, and an optional footer bar pinned to the bottom of the body.
export default function WindowCard ({
  preset = 'panel',
  tone = 'dark',
  controlsSide = 'left',
  footer,
  className = '',
  bodyClassName = '',
  children
}) {
  const p = PRESETS[preset]
  return (
    <div className={`flex flex-col overflow-hidden border-black ${p.frame} ${className}`}>
      <div className={`flex shrink-0 items-center ${controlsSide === 'right' ? 'justify-end' : ''} ${p.bar} ${TITLEBAR_TONES[tone]}`}>
        <img
          src={windowControls}
          alt=""
          aria-hidden="true"
          draggable={false}
          className={`${p.controls} ${controlsSide === 'right' ? '-scale-x-100' : ''}`}
        />
      </div>
      <div className={`flex flex-col ${bodyClassName}`}>
        <div className="min-h-0 flex-1">{children}</div>
        {footer}
      </div>
    </div>
  )
}
