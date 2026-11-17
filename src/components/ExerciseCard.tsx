import { useState } from 'react'
import type { Exercise, PersonId, Phase } from '../data/types'
import { fmtLoad, fmtRest, people, repsFor } from '../lib/format'
import { isCounted, parseRange, rirFor, setsFor, shouldProgress } from '../lib/progress'
import type { ExerciseLog } from '../lib/store'
import { muscleLabel } from './BodyMap'
import { IconArrowUp, IconCheck, IconInfo, IconMinus, IconPlus } from './icons'

interface Props {
  index: number
  exercise: Exercise
  who: PersonId[]
  phase: Phase
  getLoad: (p: PersonId) => number | null
  setLoad: (p: PersonId, v: number | null) => void
  getLog: (p: PersonId) => ExerciseLog | undefined
  setReps: (p: PersonId, reps: (number | null)[], started: boolean) => void
  lastReps: (p: PersonId) => (number | null)[] | undefined
  lastLoad: (p: PersonId) => number | null | undefined
  onOpen: () => void
}

export const tone: Record<PersonId, { text: string; bg: string; soft: string }> = {
  arthur: { text: 'text-arthur', bg: 'bg-arthur', soft: 'bg-arthur-soft' },
  isa: { text: 'text-isa', bg: 'bg-isa', soft: 'bg-isa-soft' },
}

export function ExerciseCard(props: Props) {
  const { index, exercise: ex, who, phase, onOpen } = props
  const active = who.filter((p) => setsFor(ex, p, phase) > 0)
  if (active.length === 0) return null
  const complete = active.every((p) => (props.getLog(p)?.reps.length ?? 0) >= setsFor(ex, p, phase))
  const muscles = [...ex.primary, ...(ex.secondary ?? [])].slice(0, 3)

  return (
    <article className={`rounded-3xl border border-line bg-surface transition-opacity ${complete ? 'opacity-70' : ''}`}>
      <button onClick={onOpen} className="flex w-full items-start gap-3 px-4 pb-3 pt-4 text-left">
        <span className="font-mono text-xs leading-6 text-muted tabular">{String(index + 1).padStart(2, '0')}</span>
        <span className="min-w-0 flex-1">
          <span className="font-display text-[22px] font-bold uppercase leading-[1.05] tracking-tight">{ex.name}</span>
          {ex.isNew && <span className="ml-2 inline-block -translate-y-0.5 rounded-full bg-signal-soft px-2 py-0.5 align-middle font-mono text-[10px] font-semibold uppercase text-signal">novo</span>}
          <span className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] text-muted">
            <span>{ex.unit === 'tempo' ? ex.reps : `${ex.reps}${parseRange(ex.reps) ? ' reps' : ''}`}</span>
            {ex.rest > 0 && <span>⏱ {fmtRest(ex.rest)}</span>}
          </span>
          <span className="mt-2 block text-[13px] text-muted">{muscles.map((m) => muscleLabel[m]).join(' · ')}</span>
        </span>
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-muted" aria-hidden>
          {complete ? <IconCheck className="text-signal" /> : <IconInfo />}
        </span>
      </button>

      <div className="divide-y divide-line border-t border-line">
        {active.map((p) => (
          <PersonRow key={p} p={p} {...props} />
        ))}
      </div>
    </article>
  )
}

function PersonRow({ p, exercise: ex, phase, getLoad, setLoad, getLog, setReps, lastReps, lastLoad }: Props & { p: PersonId }) {
  const [sel, setSel] = useState<number | null>(null)
  const sets = setsFor(ex, p, phase)
  const reps = repsFor(ex, p)
  const range = parseRange(reps)
  const counted = isCounted(ex, reps)
  const log = getLog(p)
  const done = log?.reps ?? []
  const load = getLoad(p)
  const prev = lastLoad(p)
  const prevReps = lastReps(p)
  const went = prev != null && load != null && load > prev
  const t = tone[p]
  const name = people.find((x) => x.id === p)!.name
  const usesKg = ex.unit === 'kg' || ex.unit === undefined
  const ready = shouldProgress(done, sets, range)
  const bumped = ready && usesKg && log?.load != null && load != null && load > log.load
  const caution = ex.caution?.[p]
  const note = ex.notes?.[p]

  const tapSet = (i: number) => {
    if (i < done.length) {
      // série já feita: seleciona para ajustar (contadas) ou desfaz a última (não contadas)
      if (counted) setSel(sel === i ? null : i)
      else if (i === done.length - 1) setReps(p, done.slice(0, -1), false)
      return
    }
    // marca as séries até a tocada
    const next = [...done]
    for (let k = done.length; k <= i; k++) next.push(counted ? (prevReps?.[k] ?? range![0]) : null)
    setReps(p, next, true)
    setSel(counted ? i : null)
  }

  const adjust = (delta: number) => {
    if (sel == null) return
    const next = [...done]
    next[sel] = Math.max(0, (next[sel] ?? 0) + delta)
    setReps(p, next, false)
  }

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="min-w-[76px]">
          <div className={`font-display text-[15px] font-bold uppercase tracking-wide ${t.text}`}>{name}</div>
          <div className="font-mono text-[11px] text-muted tabular">
            {ex.unit === 'tempo' ? reps : `${sets}×${reps.replace(' por perna', '/perna')}`}
            {ex.unit !== 'tempo' && <span> · RIR {rirFor(p, phase)}</span>}
          </div>
        </div>

        {usesKg ? (
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
              <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[9px] uppercase text-muted">
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
          <div className="ml-auto font-mono text-[11px] uppercase text-muted">{ex.unit === 'corpo' ? 'peso corporal' : 'atividade'}</div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={`Séries de ${name}`}>
        {Array.from({ length: sets }, (_, i) => {
          const isDone = i < done.length
          const r = done[i]
          return (
            <button
              key={i}
              aria-pressed={isDone}
              aria-label={`${name}: série ${i + 1}${isDone ? (r != null ? `, ${r} repetições` : ' feita') : ''}`}
              onClick={() => tapSet(i)}
              className={`relative grid h-11 min-w-11 place-items-center rounded-2xl px-3 font-mono text-sm font-semibold tabular transition-colors active:scale-95 ${
                isDone ? `${t.bg} text-bg` : 'bg-surface-2 text-muted'
              } ${sel === i ? 'ring-2 ring-ink ring-offset-2 ring-offset-surface' : ''}`}
            >
              {isDone ? r != null ? <span className="anim-pop">{r}</span> : <IconCheck width={18} strokeWidth={3} /> : ex.unit === 'tempo' ? 'feito?' : i + 1}
            </button>
          )
        })}
        {!counted && ex.unit !== 'tempo' && <span className="self-center font-mono text-[11px] text-muted">{reps}</span>}
      </div>

      {sel != null && sel < done.length && (
        <div className="anim-fade mt-2.5 flex items-center gap-2 rounded-2xl bg-surface-2 p-1.5 pl-3">
          <span className="flex-1 font-mono text-[11px] uppercase text-muted">
            Série {sel + 1} · reps feitas
          </span>
          <button aria-label="Menos uma repetição" onClick={() => adjust(-1)} className="grid size-9 place-items-center rounded-xl bg-surface active:scale-90">
            <IconMinus width={16} />
          </button>
          <span className="w-8 text-center font-mono text-lg font-semibold tabular">{done[sel]}</span>
          <button aria-label="Mais uma repetição" onClick={() => adjust(1)} className="grid size-9 place-items-center rounded-xl bg-surface active:scale-90">
            <IconPlus width={16} />
          </button>
          <button
            onClick={() => {
              setReps(p, done.slice(0, sel), false)
              setSel(null)
            }}
            className="rounded-xl px-2 py-2 font-mono text-[11px] uppercase text-muted"
          >
            desfazer
          </button>
        </div>
      )}

      {ready && (
        <div className={`anim-fade mt-2.5 flex items-center gap-3 rounded-2xl px-3 py-2.5 ${t.soft}`}>
          <IconArrowUp width={18} strokeWidth={2.5} className={`shrink-0 ${t.text}`} />
          <p className="flex-1 text-[13px] leading-snug">
            {usesKg
              ? bumped
                ? `Carga do próximo treino: ${fmtLoad(load!)} kg. Mandou bem!`
                : `Topo da faixa em todas as séries. Suba para ${fmtLoad((load ?? 0) + (ex.step ?? 1))} kg no próximo treino.`
              : 'Topo da faixa em todas as séries! No próximo treino, deixe o exercício um pouco mais difícil.'}
          </p>
          {usesKg && !bumped && (
            <button onClick={() => setLoad(p, (load ?? 0) + (ex.step ?? 1))} className="rounded-xl bg-ink px-3 py-2 font-display text-xs font-bold uppercase tracking-wider text-bg active:scale-95">
              Subir
            </button>
          )}
        </div>
      )}

      {caution && <p className="mt-2.5 rounded-xl border border-signal/40 px-3 py-2 text-[13px] leading-snug">⚠︎ {caution}</p>}
      {note && <p className={`mt-2.5 rounded-xl px-3 py-2 text-[13px] leading-snug ${t.soft}`}>{note}</p>}
    </div>
  )
}
