import { useEffect, useState } from 'react'
import { fmtClock } from '../lib/format'
import { IconPlus, IconX } from './icons'

export interface Timer {
  endsAt: number
  total: number
  label: string
}

export function RestTimer({ timer, onChange }: { timer: Timer; onChange: (t: Timer | null) => void }) {
  const [now, setNow] = useState(Date.now())
  const left = timer.endsAt - now
  const finished = left <= 0

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!finished) return
    try {
      navigator.vibrate?.([180, 90, 180])
    } catch {
      /* sem vibração */
    }
    const id = setTimeout(() => onChange(null), 4000)
    return () => clearTimeout(id)
  }, [finished, onChange])

  const pct = Math.min(100, Math.max(0, (1 - left / (timer.total * 1000)) * 100))

  return (
    <div className="anim-sheet relative overflow-hidden rounded-2xl bg-ink text-bg shadow-2xl" role="timer" aria-live="polite">
      <div className="absolute inset-y-0 left-0 bg-signal/25 transition-[width] duration-300" style={{ width: `${pct}%` }} />
      <div className="relative flex items-center gap-3 px-4 py-2.5">
        <div className="min-w-0 flex-1">
          <div className="truncate font-mono text-[10px] uppercase tracking-wider opacity-60">{finished ? 'descanso concluído' : `descanso · ${timer.label}`}</div>
          <div className="font-mono text-2xl font-semibold leading-tight tabular">{finished ? 'Próxima série!' : fmtClock(left)}</div>
        </div>
        {!finished && (
          <button
            onClick={() => onChange({ ...timer, endsAt: timer.endsAt + 15_000, total: timer.total + 15 })}
            className="flex h-9 items-center gap-1 rounded-full bg-bg/15 px-3 font-mono text-xs font-semibold active:scale-95"
          >
            <IconPlus width={12} height={12} strokeWidth={3} />
            15s
          </button>
        )}
        <button onClick={() => onChange(null)} aria-label="Fechar cronômetro" className="grid size-9 place-items-center rounded-full bg-bg/15 active:scale-95">
          <IconX width={16} />
        </button>
      </div>
    </div>
  )
}
