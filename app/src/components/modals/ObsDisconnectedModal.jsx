import { useEffect } from 'react'
import ChunkyButton from '../ui/ChunkyButton'
import Decorations from '../ui/Decorations'
import Stage from '../ui/Stage'
import cardArt from '../../assets/jj.svg'
import laptop from '../../assets/wrong.svg'
import burst from '../../assets/Vector 103.svg'
import gridPatch from '../../assets/Group 97.svg'
import squiggleM from '../../assets/gemini-svg (2) 1.svg'
import squiggleW from '../../assets/gemini-svg (2) 2.svg'
import doodleA from '../../assets/image 68.svg'
import doodleB from '../../assets/image 69.svg'

// Positions measured from the Figma frame, as a % of the window.
// The doodles sit behind the card; the grids + squiggles overlap its edges.
const BACK_DECOR = [
  { src: doodleA, left: '85%', top: '0', width: '15%', pin: 'right top' },
  { src: doodleB, left: '0', top: '65.3%', width: '11.8%', pin: 'left bottom' }
]
const FRONT_DECOR = [
  { src: gridPatch, left: '0', top: '3.6%', width: '13.2%', pin: 'left' },
  { src: squiggleM, left: '2.15%', top: '0.85%', width: '21%', pin: 'left' },
  { src: gridPatch, left: '80.5%', top: '75.1%', width: '11.2%', pin: 'bottom' },
  { src: squiggleW, left: '79%', top: '71.9%', width: '20.1%', pin: 'bottom' }
]

// The yellow bursts beside the title: the burst shape recoloured with a CSS mask
function Burst ({ color, className = '', style }) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute block ${className}`}
      style={{ backgroundColor: color, maskImage: `url("${burst}")`, maskSize: 'contain', maskRepeat: 'no-repeat', aspectRatio: '79 / 76', ...style }}
    />
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
    <Stage
      portal
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="obs-disconnected-title"
      data-ui
      className="z-50 bg-sb-page-purple font-display text-black"
    >
      <Decorations items={BACK_DECOR} />

      {/* Card artwork: purple face, black shadow, yellow doodles and the bursts beside Retry */}
      <img src={cardArt} alt="" aria-hidden="true" draggable={false} className="pointer-events-none absolute left-[17.46cqw] top-[4.31cqw] w-[66cqw] select-none" />

      <div className="absolute left-[19.85cqw] top-[4.4cqw] flex h-[44.5cqw] w-[62.6cqw] flex-col items-center pt-[2.3cqw]">
        <img src={laptop} alt="" className="w-[20.8cqw]" />

        <div className="relative mt-[0.7cqw]">
          <Burst color="#FDF204" className="-left-[4.4cqw] -top-[1.2cqw] w-[3.4cqw] -scale-x-100" />
          <h2 id="obs-disconnected-title" className="text-[4.4cqw] font-bold leading-none">
            OBS <span className="text-sb-purple-ink">Disconnected</span>
          </h2>
          <Burst color="#FDF204" className="-right-[4.4cqw] -top-[1.2cqw] w-[3.4cqw]" />
        </div>

        <p className="mt-[2.1cqw] text-[1.65cqw] font-semibold">Looks like the connection was lost.</p>

        <ChunkyButton
          onClick={onRetry}
          disabled={reconnecting}
          className="mt-[4.3cqw] h-[4cqw] w-[14.1cqw] rounded-[0.3cqw] border-[0.15cqw] border-black bg-sb-purple-dark text-[2.2cqw] text-white shadow-[0.6cqw_0.9cqw_0_#000]"
        >
          {reconnecting ? 'Checking…' : 'Retry →'}
        </ChunkyButton>
      </div>

      <Decorations items={FRONT_DECOR} />
    </Stage>
  )
}
