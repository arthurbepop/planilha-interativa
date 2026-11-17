import { useCallback, useEffect, useMemo, useState } from 'react'
import { BodyMap } from './components/BodyMap'
import { ExerciseCard } from './components/ExerciseCard'
import { ExerciseSheet } from './components/ExerciseSheet'
import { IconBook, IconChevron, IconFlame } from './components/icons'
import { MethodSheet } from './components/MethodSheet'
import { RestTimer, type Timer } from './components/RestTimer'
import { program } from './data/program'
import type { Exercise, Muscle, PersonId } from './data/types'
import { estimateMinutes, people, relativeDays, weekdayLong, weekdayShort } from './lib/format'
import { slot, todayISO, usePersistent, type HistoryEntry, type Loads, type SetsDone, type Viewer } from './lib/store'

const weekOrder = [1, 2, 3, 4, 5, 6, 0]
const dayFor = (weekday: number) => program.find((d) => d.weekday === weekday)!

export default function App() {
  const today = todayISO()
  const todayWeekday = new Date().getDay()

  const [viewer, setViewer] = usePersistent<Viewer>('viewer', 'ambos')
  const [loads, setLoads] = usePersistent<Loads>('loads', {})
  const [progress, setProgress] = usePersistent<Record<string, SetsDone>>('progress', {})
  const [history, setHistory] = usePersistent<HistoryEntry[]>('history', [])
  const [dayId, setDayId] = useState(() => dayFor(todayWeekday).id)
  const [sheet, setSheet] = useState<Exercise | 'metodo' | null>(null)
  const [timer, setTimer] = useState<Timer | null>(null)
  const [warmOpen, setWarmOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // séries marcadas valem só para o dia de hoje
  useEffect(() => {
    const stale = Object.keys(progress).filter((k) => !k.startsWith(today))
    if (stale.length) setProgress((p) => Object.fromEntries(Object.entries(p).filter(([k]) => k.startsWith(today))))
  }, [today, progress, setProgress])

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(id)
  }, [toast])

  const day = program.find((d) => d.id === dayId)!
  const who: PersonId[] = viewer === 'ambos' ? ['arthur', 'isa'] : [viewer]
  const progKey = `${today}|${day.id}`
  const done = progress[progKey] ?? {}

  const lastSession = useMemo(() => [...history].reverse().find((h) => h.dayId === day.id && h.date !== today), [history, day.id, today])
  const savedToday = history.some((h) => h.dayId === day.id && h.date === today)

  const getLoad = (ex: Exercise, p: PersonId) => loads[slot(ex.id, p)] ?? ex[p].load
  const setLoad = (ex: Exercise, p: PersonId, v: number | null) =>
    setLoads((l) => {
      const next = { ...l }
      if (v == null || Number.isNaN(v)) delete next[slot(ex.id, p)]
      else next[slot(ex.id, p)] = Math.round(v * 100) / 100
      return next
    })

  const setDone = (ex: Exercise, p: PersonId, n: number) => {
    const prev = done[slot(ex.id, p)] ?? 0
    setProgress((pr) => ({ ...pr, [progKey]: { ...(pr[progKey] ?? {}), [slot(ex.id, p)]: n } }))
    const finishedAll = n >= ex[p].sets
    if (n > prev && ex.rest > 0 && !finishedAll) {
      setTimer({ endsAt: Date.now() + ex.rest * 1000, total: ex.rest, label: ex.name })
    }
  }

  const totals = who.reduce(
    (acc, p) => {
      for (const ex of day.exercises) {
        acc.total += ex[p].sets
        acc.done += Math.min(done[slot(ex.id, p)] ?? 0, ex[p].sets)
      }
      return acc
    },
    { total: 0, done: 0 },
  )

  const dayMuscles = useMemo(() => {
    const prim = new Set<Muscle>()
    day.exercises.forEach((e) => e.primary.forEach((m) => prim.add(m)))
    return [...prim]
  }, [day])

  const finish = () => {
    const entries: HistoryEntry['entries'] = {}
    for (const ex of day.exercises)
      for (const p of ['arthur', 'isa'] as const) {
        const sets = done[slot(ex.id, p)] ?? 0
        if (ex[p].sets && sets) entries[slot(ex.id, p)] = { load: getLoad(ex, p), sets }
      }
    setHistory((h) => [...h.filter((x) => !(x.date === today && x.dayId === day.id)), { date: today, dayId: day.id, entries }].slice(-200))
    setToast(savedToday ? 'Treino atualizado ✓' : `${day.code} registrado ✓ Bom trabalho!`)
    setTimer(null)
  }

  const closeSheet = useCallback(() => setSheet(null), [])
  const mins = Math.round(estimateMinutes(day, who) / 5) * 5
  const isToday = day.weekday === todayWeekday

  return (
    <div className="mx-auto min-h-dvh max-w-lg px-4 pb-40 pt-[calc(env(safe-area-inset-top)+16px)]">
      {/* ── cabeçalho */}
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 className="mt-0.5 font-display text-[40px] font-extrabold uppercase leading-[0.85] tracking-tight">
            Treino<span className="text-signal">/</span>Hub
          </h1>
        </div>
        <button
          onClick={() => setSheet('metodo')}
          className="flex h-10 items-center gap-2 rounded-full border border-line bg-surface px-4 font-display text-sm font-bold uppercase tracking-wider active:scale-95"
        >
          <IconBook width={16} height={16} /> Método
        </button>
      </header>

      {/* ── quem está treinando */}
      <div className="mt-5 grid grid-cols-3 rounded-full border border-line bg-surface p-1" role="tablist" aria-label="Quem está treinando">
        {(['ambos', 'arthur', 'isa'] as Viewer[]).map((v) => {
          const on = viewer === v
          const color = v === 'arthur' ? 'bg-arthur text-bg' : v === 'isa' ? 'bg-isa text-bg' : 'bg-ink text-bg'
          return (
            <button
              key={v}
              role="tab"
              aria-selected={on}
              onClick={() => setViewer(v)}
              className={`rounded-full py-2 font-display text-[15px] font-bold uppercase tracking-wide transition-colors ${on ? color : 'text-muted'}`}
            >
              {v === 'ambos' ? 'Os dois' : people.find((p) => p.id === v)!.name}
            </button>
          )
        })}
      </div>

      {/* ── semana */}
      <nav className="mt-4 grid grid-cols-7 gap-1.5" aria-label="Dias da semana">
        {weekOrder.map((wd) => {
          const d = dayFor(wd)
          const on = d.id === day.id
          const isT = wd === todayWeekday
          const trained = history.some((h) => h.dayId === d.id && Date.parse(today) - Date.parse(h.date) < 7 * 86_400_000 && new Date(h.date + 'T12:00').getDay() === wd)
          return (
            <button
              key={wd}
              onClick={() => setDayId(d.id)}
              aria-current={on ? 'date' : undefined}
              className={`relative flex flex-col items-center rounded-2xl py-2.5 transition-colors ${on ? 'bg-ink text-bg' : 'bg-surface text-ink'} ${
                isT && !on ? 'ring-2 ring-signal ring-inset' : ''
              }`}
            >
              <span className={`font-mono text-[10px] ${on ? 'opacity-70' : 'text-muted'}`}>{weekdayShort[wd]}</span>
              <span className="font-display text-lg font-extrabold leading-tight">{d.kind === 'descanso' ? '—' : d.code}</span>
              {trained && <span className={`absolute right-1.5 top-1.5 size-1.5 rounded-full ${on ? 'bg-bg' : 'bg-signal'}`} aria-label="feito nesta semana" />}
            </button>
          )
        })}
      </nav>

      {/* ── destaque do dia */}
      <section className="grain relative mt-4 overflow-hidden rounded-[28px] border border-line bg-surface p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
              {isToday ? 'Hoje' : weekdayLong[day.weekday]}
              {lastSession && ` · último ${relativeDays(lastSession.date, today)}`}
            </p>
            <h2 className="mt-2 font-display text-[34px] font-extrabold uppercase leading-[0.9] tracking-tight">{day.title}</h2>
            <p className="mt-2 max-w-[30ch] text-[15px] leading-snug text-muted">{day.focus}</p>
          </div>
          <span
            className="pointer-events-none -mr-1 -mt-3 font-display text-[88px] font-extrabold leading-none tracking-tighter text-transparent"
            style={{ WebkitTextStroke: '1.5px var(--signal)' }}
            aria-hidden
          >
            {day.kind === 'descanso' ? 'Z' : day.code}
          </span>
        </div>

        {day.kind !== 'descanso' ? (
          <dl className="mt-5 grid grid-cols-3 gap-2 border-t border-line pt-4">
            <Stat label="exercícios" value={day.exercises.filter((e) => who.some((p) => e[p].sets)).length} />
            <Stat label="séries" value={`${totals.done}/${totals.total}`} />
            <Stat label="minutos" value={`~${mins}`} />
          </dl>
        ) : (
          <div className="mt-5 border-t border-line pt-4">
            <p className="text-[15px] leading-relaxed">
              Amanhã é <b>{dayFor(1).code}</b> — {dayFor(1).title.toLowerCase()}. Hoje: sono de 7–9 h, proteína distribuída nas refeições (~1,6 g por kg de peso por dia) e, se der vontade, uma caminhada leve.
            </p>
            <button onClick={() => setDayId(dayFor(1).id)} className="mt-4 rounded-full bg-ink px-5 py-2.5 font-display text-sm font-bold uppercase tracking-wider text-bg">
              Ver o treino de segunda
            </button>
          </div>
        )}
      </section>

      {day.kind === 'forca' && (
        <div className="mt-3 grid grid-cols-[auto_1fr] items-center gap-4 rounded-3xl border border-line bg-surface p-4">
          <div className="scale-[0.55] -my-12 -mx-10 origin-center">
            <BodyMap primary={dayMuscles} />
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Músculos do dia</p>
            <p className="mt-1 font-display text-lg font-bold uppercase leading-tight">{day.title.split(' · ')[0]}</p>
            {day.finisher && (
              <p className="mt-2 text-[13px] leading-snug text-muted">
                <IconFlame width={14} height={14} className="-mt-0.5 mr-1 inline text-signal" />
                {day.finisher.title}: {who.map((p) => `${people.find((x) => x.id === p)!.name} ${day.finisher![p]}`).join(' · ')}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── aquecimento */}
      {day.warmup.length > 0 && (
        <div className="mt-3 rounded-3xl border border-line bg-surface">
          <button onClick={() => setWarmOpen((o) => !o)} aria-expanded={warmOpen} className="flex w-full items-center justify-between px-4 py-3.5">
            <span className="font-display text-base font-bold uppercase tracking-wide">Aquecimento</span>
            <span className="flex items-center gap-2 font-mono text-[11px] text-muted">
              ~5–8 min <IconChevron width={18} className={`transition-transform ${warmOpen ? 'rotate-180' : ''}`} />
            </span>
          </button>
          {warmOpen && (
            <ul className="anim-fade space-y-2 border-t border-line px-4 py-3">
              {day.warmup.map((w) => (
                <li key={w} className="flex gap-3 text-[14px] leading-snug">
                  <span className="mt-[9px] h-0.5 w-3 shrink-0 bg-signal" />
                  {w}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── exercícios */}
      <div className="mt-3 space-y-3">
        {day.exercises.map((ex, i) => (
          <ExerciseCard
            key={ex.id}
            index={i}
            exercise={ex}
            who={who}
            getLoad={(p) => getLoad(ex, p)}
            setLoad={(p, v) => setLoad(ex, p, v)}
            getDone={(p) => done[slot(ex.id, p)] ?? 0}
            setDone={(p, n) => setDone(ex, p, n)}
            lastLoad={(p) => lastSession?.entries[slot(ex.id, p)]?.load}
            onOpen={() => setSheet(ex)}
          />
        ))}
      </div>

      {/* ── barra inferior: cronômetro + finalizar */}
      {day.kind !== 'descanso' && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40">
          <div className="pointer-events-auto mx-auto max-w-lg space-y-2 bg-gradient-to-t from-bg via-bg/95 to-transparent px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-6">
            {timer && <RestTimer timer={timer} onChange={setTimer} />}
            <button
              onClick={finish}
              disabled={totals.done === 0}
              className="relative flex w-full items-center justify-between overflow-hidden rounded-2xl bg-signal px-5 py-4 font-display text-lg font-extrabold uppercase tracking-wide text-white transition-opacity active:scale-[0.99] disabled:opacity-40"
            >
              <span
                className="absolute inset-y-0 left-0 bg-black/15 transition-[width] duration-500"
                style={{ width: `${totals.total ? (totals.done / totals.total) * 100 : 0}%` }}
                aria-hidden
              />
              <span className="relative">{savedToday ? 'Atualizar registro' : 'Finalizar treino'}</span>
              <span className="relative font-mono text-sm font-semibold tabular">
                {totals.done}/{totals.total}
              </span>
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="anim-sheet fixed inset-x-4 top-[calc(env(safe-area-inset-top)+12px)] z-[60] mx-auto max-w-sm rounded-2xl bg-ink px-4 py-3 text-center font-display text-base font-bold uppercase tracking-wide text-bg shadow-2xl" role="status">
          {toast}
        </div>
      )}

      {sheet === 'metodo' && <MethodSheet history={history} defaultPerson={viewer === 'isa' ? 'isa' : 'arthur'} onClose={closeSheet} />}
      {sheet && sheet !== 'metodo' && <ExerciseSheet exercise={sheet} who={who} onClose={closeSheet} />}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dd className="font-mono text-xl font-semibold tabular">{value}</dd>
      <dt className="font-mono text-[10px] uppercase tracking-widest text-muted">{label}</dt>
    </div>
  )
}
