import type { Exercise, PersonId } from '../data/types'
import { fmtLoad, fmtRest, people, repsFor } from '../lib/format'
import { muscleLabel } from './BodyMap'
import { IconArrowUp, IconCheck, IconInfo, IconMinus, IconPlus } from './icons'

interface Props {
  index: number
  exercise: Exercise
  who: PersonId[]
  getLoad: (p: PersonId) => number | null
  setLoad: (p: PersonId, v: number | null) => void
  getDone: (p: PersonId) => number
  setDone: (p: PersonId, n: number) => void
  lastLoad: (p: PersonId) => number | null | undefined
  onOpen: () => void
}

const tone: Record<PersonId, { text: string; bg: string; soft: string; ring: string }> = {
  arthur: { text: 'text-arthur', bg: 'bg-arthur', soft: 'bg-arthur-soft', ring: 'ring-arthur' },
  isa: { text: 'text-isa', bg: 'bg-isa', soft: 'bg-isa-soft', ring: 'ring-isa' },
}

export function ExerciseCard({ index, exercise: ex, who, getLoad, setLoad, getDone, setDone, lastLoad, onOpen }: Props) {
  const active = who.filter((p) => ex[p].sets > 0)
  if (active.length === 0) return null
  const complete = active.every((p) => getDone(p) >= ex[p].sets)
  const muscles = [...ex.primary, ...(ex.secondary ?? [])].slice(0, 3)

  return (
    <article className={`rounded-3xl border border-line bg-surface transition-opacity ${complete ? 'opacity-60' : ''}`}>
      <button onClick={onOpen} className="flex w-full items-start gap-3 px-4 pb-3 pt-4 text-left">
        <span className="font-mono text-xs leading-6 text-muted tabular">{String(index + 1).padStart(2, '0')}</span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="font-display text-[22px] font-bold uppercase leading-[1.05] tracking-tight">{ex.name}</span>
            {ex.isNew && <span className="rounded-full bg-signal-soft px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-signal">novo</span>}
          </span>
          <span className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] text-muted">
            <span>{ex.unit === 'tempo' ? ex.reps : `${ex.reps} reps`}</span>
            {ex.rir && <span>RIR {ex.rir}</span>}
            {ex.rest > 0 && <span>⏱ {fmtRest(ex.rest)}</span>}
          </span>
          <span className="mt-2 block text-[13px] text-muted">{muscles.map((m) => muscleLabel[m]).join(' · ')}</span>
        </span>
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-muted" aria-hidden>
          {complete ? <IconCheck className="text-signal" /> : <IconInfo />}
        </span>
      </button>

      <div className="divide-y divide-line border-t border-line">
        {active.map((p) => {
          const pres = ex[p]
          const done = getDone(p)
          const load = getLoad(p)
          const prev = lastLoad(p)
          const went = prev != null && load != null && load > prev
          const t = tone[p]
          const name = people.find((x) => x.id === p)!.name
          const note = ex.notes?.[p]
          return (
            <div key={p} className="px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-[72px] shrink-0">
                  <div className={`font-display text-[15px] font-bold uppercase tracking-wide ${t.text}`}>{name}</div>
                  <div className="font-mono text-[11px] text-muted tabular">
                    {ex.unit === 'tempo' ? repsFor(ex, p) : `${pres.sets}×${repsFor(ex, p).replace(' por perna', '')}`}
                  </div>
                </div>

                {ex.unit === 'kg' || ex.unit === undefined ? (
                  <div className="ml-auto flex items-center gap-1">
                    <button
                      aria-label={`Diminuir carga de ${name}`}
                      onClick={() => setLoad(p, Math.max(0, (load ?? 0) - (ex.step ?? 1)))}
                      className="grid size-9 place-items-center rounded-full bg-surface-2 text-muted active:scale-90"
                    >
                      <IconMinus width={16} />
                    </button>
                    <label className="relative flex items-baseline justify-center">
                      <span className="sr-only">Carga de {name} em kg</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="any"
                        min={0}
                        placeholder="—"
                        value={load ?? ''}
                        onChange={(e) => {
                          const v = e.target.value.replace(',', '.')
                          setLoad(p, v === '' ? null : Math.max(0, Number(v)))
                        }}
                        className="w-[58px] bg-transparent text-center font-mono text-xl font-semibold tabular outline-none placeholder:text-muted"
                      />
                      <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 font-mono text-[9px] uppercase text-muted">
                        {went ? (
                          <span className={`flex items-center gap-0.5 ${t.text}`}>
                            <IconArrowUp width={9} height={9} strokeWidth={3} />
                            {fmtLoad(prev!)}
                          </span>
                        ) : (
                          'kg'
                        )}
                      </span>
                    </label>
                    <button
                      aria-label={`Aumentar carga de ${name}`}
                      onClick={() => setLoad(p, (load ?? 0) + (ex.step ?? 1))}
                      className="grid size-9 place-items-center rounded-full bg-surface-2 text-muted active:scale-90"
                    >
                      <IconPlus width={16} />
                    </button>
                  </div>
                ) : (
                  <div className="ml-auto font-mono text-[11px] uppercase text-muted">{ex.unit === 'corpo' ? 'peso corporal' : 'cardio'}</div>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={`Séries de ${name}`}>
                {Array.from({ length: pres.sets }, (_, i) => {
                  const isDone = i < done
                  return (
                    <button
                      key={i}
                      aria-pressed={isDone}
                      aria-label={`${name}: série ${i + 1}${isDone ? ' feita' : ''}`}
                      onClick={() => setDone(p, isDone && i === done - 1 ? i : i + 1)}
                      className={`grid h-10 min-w-10 place-items-center rounded-2xl px-3 font-mono text-sm font-semibold tabular transition-colors active:scale-95 ${
                        isDone ? `${t.bg} anim-pop text-bg` : `bg-surface-2 text-muted`
                      }`}
                    >
                      {isDone ? <IconCheck width={18} strokeWidth={3} /> : ex.unit === 'tempo' ? 'feito?' : i + 1}
                    </button>
                  )
                })}
              </div>
              {note && <p className={`mt-2.5 rounded-xl px-3 py-2 text-[13px] leading-snug ${t.soft}`}>{note}</p>}
            </div>
          )
        })}
      </div>
    </article>
  )
}
