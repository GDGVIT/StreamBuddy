import { Folder } from 'lucide-react'
import WindowCard from '../ui/WindowCard'
import ChunkyButton from '../ui/ChunkyButton'
import sadFolder from '../../assets/Group 150.svg'
import burst from '../../assets/Vector 103.svg'
// TODO: swap for the happy upright folder from Figma once it's exported
import happyFolderStandIn from '../../assets/emojione-v1_open-folder.svg'

// "C:\Users\me\Desktop\New Folder" → "Desktop/New Folder"
function shortPath (fullPath) {
  return fullPath.split(/[\\/]/).filter(Boolean).slice(-2).join('/')
}

// Tilted sad folder + "shock" burst + red ✕ badge
function MissingFolderArt () {
  return (
    <div className="relative w-[16.5vw]">
      <img src={sadFolder} alt="" className="w-full" />
      <img src={burst} alt="" className="absolute left-[-6%] top-[2%] w-[24%] -scale-x-100" />
      <span className="absolute bottom-[16%] right-[8%] flex h-[3.2vw] w-[3.2vw] items-center justify-center rounded-full border-[0.3vw] border-white bg-[#FF4D6D] text-[1.8vw] font-bold leading-none text-white">
        ✕
      </span>
    </div>
  )
}

function SelectedFolderArt () {
  return (
    <div className="flex h-[19vw] w-[18.2vw] items-center justify-center">
      <img src={happyFolderStandIn} alt="" className="w-[11vw]" />
    </div>
  )
}

// Full-screen purple page with a window in the middle.
//   variant="selected": confirms the folder picked during onboarding (Continue)
//   variant="missing":  the saved output folder was moved or deleted (Go Back)
// The white path pill is a button in both cases: it re-opens the folder picker.
export default function DirectoryModal ({ variant = 'selected', path = '', onPickFolder, onContinue, onGoBack }) {
  const missing = variant === 'missing'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="directory-modal-title"
      data-ui
      className="fixed inset-0 z-50 overflow-hidden bg-sb-page-purple font-display text-black"
    >
      {/* TODO: yellow zig-zag background pattern from Figma goes here */}

      <WindowCard
        preset="modal"
        tone="purple"
        className="absolute left-[19.4vw] top-[5vw] w-[62.8vw]"
        bodyClassName="h-[38.6vw] bg-sb-modal"
      >
        <div className="flex h-full flex-col items-center pt-[1.1vw]">
          {missing ? <MissingFolderArt /> : <SelectedFolderArt />}

          <h2 id="directory-modal-title" className={`${missing ? '-mt-[0.6vw]' : 'mt-[0.3vw]'} text-[2.9vw] font-bold leading-none`}>
            {missing
              ? <>Oops! <span className="text-sb-purple-ink">Can&apos;t Find the Directory</span></>
              : <>Selected <span className="text-sb-purple-ink">Directory</span></>}
          </h2>

          {missing && (
            <p className="mt-[0.9vw] text-center text-[1.35vw] font-medium leading-[1.6vw]">
              The Directory you&apos;re looking for doesn&apos;t exist<br />or may have been moved
            </p>
          )}

          <ChunkyButton
            onClick={onPickFolder}
            title={missing ? undefined : path}
            className={`${missing ? 'mt-[1.6vw] w-[35.3vw]' : 'mt-[2.1vw] w-[29.8vw]'} h-[3.9vw] gap-[0.9vw] rounded-[0.4vw] bg-white px-[1.2vw] text-[1.85vw] text-sb-ink shadow-[0.4vw_0.45vw_0_#000]`}
          >
            <Folder className="h-[2.4vw] w-[2.4vw] shrink-0" strokeWidth={1.5} />
            <span className="truncate">{missing ? 'Search Directory/Set Directory' : shortPath(path)}</span>
          </ChunkyButton>

          <ChunkyButton
            onClick={missing ? onGoBack : onContinue}
            className={`${missing ? 'mt-[2.4vw]' : 'mt-[2.1vw]'} h-[3.6vw] rounded-[0.4vw] border-[0.15vw] border-black bg-sb-purple-dark px-[1.3vw] text-[1.95vw] text-white shadow-[0.25vw_0.3vw_0_#000]`}
          >
            {missing ? 'Go Back' : 'Continue'} →
          </ChunkyButton>
        </div>
      </WindowCard>
    </div>
  )
}
