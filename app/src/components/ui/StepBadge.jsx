// Numbered circle used in the onboarding sidebar and the OBS status lines.
// green = done, yellow = in progress, pink = not started (or failed)
const STATUS_COLORS = {
  done: 'bg-sb-green',
  active: 'bg-sb-yellow',
  pending: 'bg-sb-pink'
}

export default function StepBadge ({ number, status, className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold leading-none text-black shadow-[0.3cqw_0.1cqw_0_#000] ${STATUS_COLORS[status]} ${className}`}
    >
      {number}
    </span>
  )
}
