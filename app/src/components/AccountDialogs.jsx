import { useState } from 'react'
import DialogCard from './ui/DialogCard'
import ChunkyButton from './ui/ChunkyButton'

// Confirmations for the two account actions in Settings. They open on top of the
// Settings dialog; Escape or clicking outside backs out.

const BUTTON = 'h-[2.9cqw] rounded-[0.3cqw] border-[0.12cqw] border-black px-[1.4cqw] text-[1.3cqw] shadow-[0.25cqw_0.3cqw_0_#000]'

export function LogoutDialog ({ onCancel, onConfirm }) {
  return (
    <DialogCard label="Log out" onClose={onCancel} className="w-[36cqw]" bodyClassName="flex flex-col items-center px-[2.5cqw] pb-[2cqw] pt-[1.6cqw] text-center">
      <h3 className="text-[2.2cqw] font-bold">Log out?</h3>
      <p className="mt-[0.6cqw] font-body text-[1.1cqw]">
        You&apos;ll need to log in again to make clips. Your clips and settings stay on this PC.
      </p>
      <div className="mt-[1.6cqw] flex gap-[1.2cqw]">
        <ChunkyButton onClick={onCancel} className={`${BUTTON} bg-white`}>Cancel</ChunkyButton>
        <ChunkyButton onClick={onConfirm} className={`${BUTTON} bg-sb-yellow`}>Log Out</ChunkyButton>
      </div>
    </DialogCard>
  )
}

// Deleting can't be undone, so the user types DELETE first, as most apps ask for
const CONFIRM_WORD = 'DELETE'

export function DeleteAccountDialog ({ email, deleting, error, onCancel, onConfirm }) {
  const [typed, setTyped] = useState('')
  const ready = typed.trim().toUpperCase() === CONFIRM_WORD

  return (
    <DialogCard label="Delete account" onClose={deleting ? undefined : onCancel} className="w-[42cqw]" bodyClassName="flex flex-col items-center px-[2.8cqw] pb-[2cqw] pt-[1.6cqw] text-center">
      <h3 className="text-[2.2cqw] font-bold">Delete your <span className="text-red-700">account</span>?</h3>
      <p className="mt-[0.6cqw] font-body text-[1.1cqw] leading-[1.45]">
        This permanently deletes the StreamBuddy account for <strong>{email}</strong>. You won&apos;t be able to log in with it again.
      </p>
      <p className="mt-[0.5cqw] font-body text-[1.1cqw] leading-[1.45]">
        Clips you&apos;ve already made stay in your output folder. <strong>This can&apos;t be undone.</strong>
      </p>

      <label className="mt-[1.4cqw] flex flex-col items-center gap-[0.5cqw] font-body text-[1.05cqw] font-bold">
        Type {CONFIRM_WORD} to confirm
        <input
          value={typed}
          onChange={e => setTyped(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && ready && !deleting) onConfirm() }}
          autoFocus
          autoComplete="off"
          spellCheck={false}
          className="h-[2.6cqw] w-[16cqw] rounded-[0.3cqw] border-[0.12cqw] border-black bg-white px-[0.8cqw] text-center font-body text-[1.2cqw] font-bold tracking-[0.15em] outline-none focus-visible:ring-[0.15cqw] focus-visible:ring-red-700"
        />
      </label>

      {error && <p role="alert" className="mt-[0.8cqw] font-body text-[1cqw] font-bold text-red-700">{error}</p>}

      <div className="mt-[1.6cqw] flex gap-[1.2cqw]">
        <ChunkyButton onClick={onCancel} disabled={deleting} className={`${BUTTON} bg-white`}>Keep My Account</ChunkyButton>
        <ChunkyButton onClick={onConfirm} disabled={!ready || deleting} className={`${BUTTON} bg-sb-pink`}>
          {deleting ? 'Deleting…' : 'Delete Account'}
        </ChunkyButton>
      </div>
    </DialogCard>
  )
}
