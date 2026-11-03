import { Folder } from 'lucide-react'
import WindowCard from '../ui/WindowCard'
import Stage from '../ui/Stage'
import ChunkyButton from '../ui/ChunkyButton'
import sadFolder from '../../assets/Group 150.svg'
import burst from '../../assets/Vector 103.svg'
import happyFolder from '../../assets/happy.svg'
import zigzagPattern from '../../assets/zigzag-pattern.svg'

// "C:\Users\me\Desktop\New Folder" → "Desktop/New Folder"
function shortPath (fullPath) {
  return fullPath.split(/[\\/]/).filter(Boolean).slice(-2).join('/')
}

// Tilted sad folder + "shock" burst + red ✕ badge
function MissingFolderArt () {
  return (
    <div className="relative w-[16.5cqw]">
      <img src={sadFolder} alt="" className="w-full" />
      <img src={burst} alt="" className="absolute left-[-6%] top-[2%] w-[24%] -scale-x-100" />
      <span className="absolute bottom-[16%] right-[8%] flex h-[3.2cqw] w-[3.2cqw] items-center justify-center rounded-full border-[0.3cqw] border-white bg-[#FF4D6D] text-[1.8cqw] font-bold leading-none text-white">
        ✕
      </span>
    </div>
  )
}

function SelectedFolderArt () {
  return <img src={happyFolder} alt="" className="mt-[1.3cqw] w-[15.4cqw]" />
}

// Full-screen purple page with a window in the middle.
//   variant="selected": confirms the folder picked during onboarding (Continue)
//   variant="missing":  the saved output folder was moved or deleted (Go Back)
// The white path pill is a button in both cases: it re-opens the folder picker.
export default function DirectoryModal ({ variant = 'selected', path = '', onPickFolder, onContinue, onGoBack }) {
  const missing = variant === 'missing'

  return (
    <Stage
      portal
      role="dialog"
      aria-modal="true"
      aria-labelledby="directory-modal-title"
      data-ui
      // the zig-zag covers the whole window, not just the 16:9 canvas
      style={{ backgroundImage: `url("${zigzagPattern}")` }}
      className="z-50 bg-sb-page-purple bg-cover bg-center font-display text-black"
    >
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Nudged by half the shadow (which falls down-left) so the card + shadow
            sit in the middle with even space around them */}
        <WindowCard
          preset="modal"
          tone="purple"
          className="w-[62.8cqw] shrink-0 translate-x-[1.23cqw] -translate-y-[1.57cqw]"
          bodyClassName="h-[38.6cqw] bg-sb-modal"
        >
          <div className="flex h-full flex-col items-center pt-[1.1cqw]">
            {missing ? <MissingFolderArt /> : <SelectedFolderArt />}

            <h2 id="directory-modal-title" className={`${missing ? '-mt-[0.6cqw]' : 'mt-[1.7cqw]'} text-[2.9cqw] font-bold leading-none`}>
              {missing
                ? <>Oops! <span className="text-sb-purple-ink">Can&apos;t Find the Directory</span></>
                : <>Selected <span className="text-sb-purple-ink">Directory</span></>}
            </h2>

            {missing && (
              <p className="mt-[0.9cqw] text-center text-[1.35cqw] font-medium leading-[1.6cqw]">
                The Directory you&apos;re looking for doesn&apos;t exist<br />or may have been moved
              </p>
            )}

            <ChunkyButton
              onClick={onPickFolder}
              title={missing ? undefined : path}
              className={`${missing ? 'mt-[1.6cqw] w-[35.3cqw]' : 'mt-[2.1cqw] w-[29.8cqw]'} h-[3.9cqw] gap-[0.9cqw] rounded-[0.4cqw] bg-white px-[1.2cqw] text-[1.85cqw] text-sb-ink shadow-[0.4cqw_0.45cqw_0_#000]`}
            >
              <Folder className="h-[2.4cqw] w-[2.4cqw] shrink-0" strokeWidth={1.5} />
              <span className="truncate">{missing ? 'Search Directory/Set Directory' : shortPath(path)}</span>
            </ChunkyButton>

            <ChunkyButton
              onClick={missing ? onGoBack : onContinue}
              className={`${missing ? 'mt-[2.4cqw]' : 'mt-[2.1cqw]'} h-[3.6cqw] rounded-[0.4cqw] border-[0.15cqw] border-black bg-sb-purple-dark px-[1.3cqw] text-[1.95cqw] text-white shadow-[0.25cqw_0.3cqw_0_#000]`}
            >
              {missing ? 'Go Back' : 'Continue'} →
            </ChunkyButton>
          </div>
        </WindowCard>
      </div>
    </Stage>
  )
}
