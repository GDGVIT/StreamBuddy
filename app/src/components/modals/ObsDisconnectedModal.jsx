import { useEffect } from 'react'
import ChunkyButton from '../ui/ChunkyButton'
import Decorations from '../ui/Decorations'
import obsLogo from '../../assets/Obs-Studio-Logo--Streamline-Logos.svg'
import burst from '../../assets/Vector 103.svg'
import gridPatch from '../../assets/Group 97.svg'
import squiggleM from '../../assets/gemini-svg (2) 1.svg'
import squiggleW from '../../assets/gemini-svg (2) 2.svg'
import doodleA from '../../assets/image 68.svg'
import doodleB from '../../assets/image 69.svg'

// Positions measured from the Figma frame, as a % of the window.
// The doodles sit behind the card; the grids + squiggles overlap its edges.
const BACK_DECOR = [
  { src: doodleA, left: '85%', top: '0', width: '15%' },
  { src: doodleB, left: '0', top: '65.3%', width: '11.8%' }
]
const FRONT_DECOR = [
  { src: gridPatch, left: '0', top: '3.6%', width: '13.2%' },
  { src: squiggleM, left: '2.15%', top: '0.85%', width: '21%' },
  { src: gridPatch, left: '80.5%', top: '75.1%', width: '11.2%' },
  { src: squiggleW, left: '79%', top: '71.9%', width: '20.1%' }
]

// A burst of three strokes, recoloured with a CSS mask so it can be yellow or black
function Burst ({ color = '#000', className = '', style }) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute block ${className}`}
      style={{ backgroundColor: color, maskImage: `url("${burst}")`, maskSize: 'contain', maskRepeat: 'no-repeat', aspectRatio: '79 / 76', ...style }}
    />
  )
}

// TODO: replace this stand-in with the laptop illustration from Figma once exported
function DisconnectedLaptop () {
  return (
    <div className="relative flex h-[18.3vw] w-[20vw] items-center justify-center">
      <span className="absolute inset-[4%_6%_10%] rounded-[45%] bg-[#D7B2FF]" />
      <img src={obsLogo} alt="" className="relative w-[8vw]" />
      <span className="absolute left-[56%] top-[48%] flex h-[3vw] w-[3vw] items-center justify-center rounded-full border-[0.3vw] border-white bg-[#FF4D6D] text-[1.6vw] font-bold leading-none text-white">
        ✕
      </span>
      <span className="absolute bottom-0 h-[1vw] w-[16vw] rounded-[50%] bg-[#AC72E9]" />
    </div>
  )
}

// Full-screen alert shown on the dashboard when the OBS WebSocket drops.
// Escape closes it so the user can keep browsing clips without OBS.
export default function ObsDisconnectedModal ({ onRetry, reconnecting, onDismiss }) {
  useEffect(() => {
    function handleKey (e) { if (e.key === 'Escape') onDismiss?.() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onDismiss])

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="obs-disconnected-title"
      data-ui
      className="fixed inset-0 z-50 overflow-hidden bg-sb-page-purple font-display text-black"
    >
      <Decorations items={BACK_DECOR} />

      <div className="absolute left-[19.85vw] top-[4.4vw] flex h-[44.5vw] w-[62.6vw] flex-col items-center rounded-[1.4vw] border-[0.35vw] border-black bg-sb-modal pt-[2.4vw] shadow-[-2.15vw_2.75vw_0_#000]">
        {/* TODO: yellow line doodles inside the card from Figma */}
        <DisconnectedLaptop />

        <div className="relative mt-[2vw]">
          <Burst color="#FDF204" className="-left-[4.4vw] -top-[1.2vw] w-[3.4vw] -scale-x-100" />
          <h2 id="obs-disconnected-title" className="text-[4.4vw] font-bold leading-none">
            OBS <span className="text-sb-purple-ink">Disconnected</span>
          </h2>
          <Burst color="#FDF204" className="-right-[4.4vw] -top-[1.2vw] w-[3.4vw]" />
        </div>

        <p className="mt-[2.1vw] text-[1.65vw] font-semibold">Looks like the connection was lost.</p>

        <div className="relative mt-[4.3vw]">
          <ChunkyButton
            onClick={onRetry}
            disabled={reconnecting}
            className="h-[4vw] w-[14.1vw] rounded-[0.3vw] border-[0.15vw] border-black bg-sb-purple-dark text-[2.2vw] text-white shadow-[0.6vw_0.9vw_0_#000]"
          >
            {reconnecting ? 'Checking…' : 'Retry →'}
          </ChunkyButton>
          <Burst className="-right-[3.2vw] -top-[2.6vw] w-[3.1vw]" />
          <Burst className="-bottom-[3vw] -left-[3.8vw] w-[3.1vw] rotate-180" />
        </div>
      </div>

      <Decorations items={FRONT_DECOR} />
    </div>
  )
}
