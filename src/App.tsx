import { useCallback, useEffect, useMemo, useState } from 'react'
import { BodyMap } from './components/BodyMap'
import { ExerciseCard, tone } from './components/ExerciseCard'
import { ExerciseSheet } from './components/ExerciseSheet'
import { GuideView } from './components/GuideView'
import { IconBook, IconChart, IconChevron, IconDumbbell } from './components/icons'
import { ProgressView } from './components/ProgressView'
import { RestTimer, type Timer } from './components/RestTimer'
import { program } from './data/program'
import type { Exercise, Muscle, PersonId } from './data/types'
import { estimateMinutes, people, relativeDays, weekdayLong, weekdayShort } from './lib/format'
import { bpAdvice, phaseFor, setsFor, weekOf } from './lib/progress'
import {
  slot,
  todayISO,
  usePersistent,
  type BloodPressure,
  type HistoryEntry,
  type Loads,
  type Measure,
  type Profile,
  type SetLog,
  type Viewer,
} from './lib/store'

const weekOrder = [1, 2, 3, 4, 5, 6, 0]
const dayFor = (weekday: number) => program.find((d) => d.weekday === weekday)!
type Tab = 'treino' | 'progresso' | 'guia'

export default function App() {
  const today = todayISO()
  const todayWeekday = new Date().getDay()

  const [tab, setTab] = usePersistent<Tab>('tab', 'treino')
  const [viewer, setViewer] = usePersistent<Viewer>('viewer', 'ambos')
  const [loads, setLoads] = usePersistent<Loads>('loads', {})
  const [setlog, setSetlog] = usePersistent<Record<string, SetLog>>('setlog', {})
  const [history, setHistory] = usePersistent<HistoryEntry[]>('history', [])
  const [startDate, setStartDate] = usePersistent<string | null>('startDate', null)
  const [profiles, setProfiles] = usePersistent<Record<PersonId, Profile>>('profiles', { arthur: { goalWeight: 85 }, isa: {} })
  const [measures, setMeasures] = usePersistent<Record<PersonId, Measure[]>>('measures', { arthur: [], isa: [] })
  const [bp, setBp] = usePersistent<BloodPressure[]>('bp', [])
  const [dayId, setDayId] = useState(() => dayFor(todayWeekday).id)
  const [sheet, setSheet] = useState<Exercise | null>(null)
  const [timer, setTimer] = useState<Timer | null>(null)
  const [warmOpen, setWarmOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // o registro de séries vale só para o dia de hoje
  useEffect(() => {
    if (Object.keys(setlog).some((k) => !k.startsWith(today)))
      setSetlog((s) => Object.fromEntries(Object.entries(s).filter(([k]) => k.startsWith(today))))
  }, [today, setlog, setSetlog])

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(id)
  }, [toast])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [tab])

  const week = weekOf(startDate, today)
  const phase = phaseFor(week)
  const day = program.find((d) => d.id === dayId)!
  const who: PersonId[] = viewer === 'ambos' ? ['arthur', 'isa'] : [viewer]
  const progKey = `${today}|${day.id}`
  const log = setlog[progKey] ?? {}

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

  const setReps = (ex: Exercise, p: PersonId, reps: (number | null)[], started: boolean) => {
    const k = slot(ex.id, p)
    const prev = log[k]
    setSetlog((s) => ({
      ...s,
      [progKey]: { ...(s[progKey] ?? {}), [k]: { reps, load: prev && prev.reps.length ? prev.load : getLoad(ex, p) } },
    }))
    if (started && ex.rest > 0 && reps.length < setsFor(ex, p, phase)) {
      setTimer({ endsAt: Date.now() + ex.rest * 1000, total: ex.rest, label: ex.name })
    }
  }

  const totals = who.reduce(
    (acc, p) => {
      for (const ex of day.exercises) {
        const n = setsFor(ex, p, phase)
        acc.total += n
        acc.done += Math.min(log[slot(ex.id, p)]?.reps.length ?? 0, n)
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
    for (const [k, v] of Object.entries(log)) if (v.reps.length) entries[k] = { load: v.load, sets: v.reps.length, reps: v.reps }
    setHistory((h) => [...h.filter((x) => !(x.date === today && x.dayId === day.id)), { date: today, dayId: day.id, entries }].slice(-300))
    setToast(savedToday ? 'Registro atualizado ✓' : day.kind === 'forca' ? `${day.code} registrado ✓ Bom trabalho!` : 'Atividade registrada ✓')
    setTimer(null)
  }

  const closeSheet = useCallback(() => setSheet(null), [])
  const mins = Math.round(estimateMinutes(day, who, phase.maxSets) / 5) * 5
  const isToday = day.weekday === todayWeekday
  const order: PersonId[] = viewer === 'isa' ? ['isa', 'arthur'] : ['arthur', 'isa']

  return (
    <div className="mx-auto min-h-dvh max-w-lg px-4 pb-48 pt-[calc(env(safe-area-inset-top)+16px)]">
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
        <button onClick={() => setTab('guia')} className="text-right">
          <span className="block font-mono text-[10px] uppercase tracking-widest text-muted">{startDate ? `semana ${week}` : 'programa'}</span>
          <span className="font-display text-base font-bold uppercase text-signal">
            Fase {phase.id} · {phase.name}
          </span>
        </button>
      </header>

      {/* ── quem */}
      <div className="mt-5 grid grid-cols-3 rounded-full border border-line bg-surface p-1" role="tablist" aria-label="Quem está treinando">
        {(['ambos', 'arthur', 'isa'] as Viewer[]).map((v) => {
          const on = viewer === v
          const color = v === 'ambos' ? 'bg-ink text-bg' : `${tone[v].bg} text-bg`
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

      {tab === 'treino' && (
        <>
          {!startDate && (
            <section className="anim-fade mt-4 rounded-[28px] bg-signal p-5 text-white">
              <p className="font-mono text-[10px] uppercase tracking-widest opacity-80">novo programa</p>
              <h2 className="mt-1 font-display text-3xl font-extrabold uppercase leading-none">Recomeço</h2>
              <p className="mt-2 text-[15px] leading-snug">
                3 treinos de corpo inteiro por semana, em 3 fases, adaptados à pressão e ao ombro do Arthur e à anemia da Isa. Antes de tudo, leiam a parte de saúde no Guia.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={() => setStartDate(today)} className="rounded-full bg-white px-5 py-2.5 font-display text-sm font-bold uppercase tracking-wider text-black">
                  Começar hoje
                </button>
                <button onClick={() => setTab('guia')} className="rounded-full border border-white/60 px-5 py-2.5 font-display text-sm font-bold uppercase tracking-wider">
                  Ler o guia
                </button>
              </div>
            </section>
          )}

          {/* ── semana */}
          <nav className="mt-4 grid grid-cols-7 gap-1.5" aria-label="Dias da semana">
            {weekOrder.map((wd) => {
              const d = dayFor(wd)
              const on = d.id === day.id
              const isT = wd === todayWeekday
              const trained = history.some((h) => h.dayId === d.id && Date.parse(today) - Date.parse(h.date) < 7 * 86_400_000)
              return (
                <button
                  key={wd}
                  onClick={() => setDayId(d.id)}
                  aria-current={on ? 'date' : undefined}
                  className={`relative flex flex-col items-center rounded-2xl py-2.5 transition-colors ${on ? 'bg-ink text-bg' : d.optional || d.kind === 'descanso' ? 'bg-surface/50 text-muted' : 'bg-surface text-ink'} ${
                    isT && !on ? 'ring-2 ring-inset ring-signal' : ''
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
                  {day.optional && ' · opcional'}
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

            {day.kind === 'forca' ? (
              <dl className="mt-5 grid grid-cols-3 gap-2 border-t border-line pt-4">
                <Stat label="exercícios" value={day.exercises.filter((e) => who.some((p) => setsFor(e, p, phase))).length} />
                <Stat label="séries" value={`${totals.done}/${totals.total}`} />
                <Stat label="minutos" value={`~${mins}`} />
              </dl>
            ) : day.kind === 'descanso' ? (
              <div className="mt-5 border-t border-line pt-4">
                <p className="text-[15px] leading-relaxed">
                  Amanhã é <b>{dayFor(1).code}</b>. Hoje: sono, proteína em todas as refeições e, se der vontade, uma caminhada leve em família.
                </p>
                <button onClick={() => setDayId(dayFor(1).id)} className="mt-4 rounded-full bg-ink px-5 py-2.5 font-display text-sm font-bold uppercase tracking-wider text-bg">
                  Ver o treino de segunda
                </button>
              </div>
            ) : null}
          </section>

          {day.kind === 'forca' && who.includes('arthur') && <BpCheck bp={bp} setBp={setBp} today={today} />}

          {day.kind === 'forca' && (
            <div className="mt-3 grid grid-cols-[auto_1fr] items-center gap-4 rounded-3xl border border-line bg-surface p-4">
              <div className="-mx-10 -my-12 origin-center scale-[0.55]">
                <BodyMap primary={dayMuscles} />
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Fase {phase.id} · {phase.name}</p>
                <p className="mt-1 font-display text-lg font-bold uppercase leading-tight">Até {phase.maxSets} séries · RIR {phase.rir}</p>
                <p className="mt-1 text-[13px] leading-snug text-muted">Toque numa série ao terminá-la e ajuste as repetições feitas. O descanso começa sozinho.</p>
              </div>
            </div>
          )}

          {day.warmup.length > 0 && (
            <div className="mt-3 rounded-3xl border border-line bg-surface">
              <button onClick={() => setWarmOpen((o) => !o)} aria-expanded={warmOpen} className="flex w-full items-center justify-between px-4 py-3.5">
                <span className="font-display text-base font-bold uppercase tracking-wide">Aquecimento</span>
                <span className="flex items-center gap-2 font-mono text-[11px] text-muted">
                  ~8 min <IconChevron width={18} className={`transition-transform ${warmOpen ? 'rotate-180' : ''}`} />
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

          <div className="mt-3 space-y-3">
            {day.exercises.map((ex, i) => (
              <ExerciseCard
                key={ex.id}
                index={i}
                exercise={ex}
                who={who}
                phase={phase}
                getLoad={(p) => getLoad(ex, p)}
                setLoad={(p, v) => setLoad(ex, p, v)}
                getLog={(p) => log[slot(ex.id, p)]}
                setReps={(p, r, started) => setReps(ex, p, r, started)}
                lastReps={(p) => lastSession?.entries[slot(ex.id, p)]?.reps}
                lastLoad={(p) => lastSession?.entries[slot(ex.id, p)]?.load}
                onOpen={() => setSheet(ex)}
              />
            ))}
          </div>
        </>
      )}

      {tab === 'progresso' && (
        <div className="mt-4">
          <ProgressView order={order} measures={measures} setMeasures={setMeasures} profiles={profiles} setProfiles={setProfiles} bp={bp} setBp={setBp} />
        </div>
      )}

      {tab === 'guia' && (
        <div className="mt-4">
          <GuideView history={history} defaultPerson={order[0]} phase={phase} week={week} startDate={startDate} setStartDate={setStartDate} />
        </div>
      )}

      {/* ── rodapé fixo: cronômetro, finalizar e abas */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40">
        <div className="pointer-events-auto mx-auto max-w-lg space-y-2 bg-gradient-to-t from-bg via-bg/95 to-transparent px-4 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-6">
          {tab === 'treino' && timer && <RestTimer timer={timer} onChange={setTimer} />}
          {tab === 'treino' && day.kind !== 'descanso' && (
            <button
              onClick={finish}
              disabled={totals.done === 0}
              className="relative flex w-full items-center justify-between overflow-hidden rounded-2xl bg-signal px-5 py-3.5 font-display text-lg font-extrabold uppercase tracking-wide text-white transition-opacity active:scale-[0.99] disabled:opacity-40"
            >
              <span className="absolute inset-y-0 left-0 bg-black/15 transition-[width] duration-500" style={{ width: `${totals.total ? (totals.done / totals.total) * 100 : 0}%` }} aria-hidden />
              <span className="relative">{savedToday ? 'Atualizar registro' : day.kind === 'forca' ? 'Finalizar treino' : 'Registrar atividade'}</span>
              <span className="relative font-mono text-sm font-semibold tabular">
                {totals.done}/{totals.total}
              </span>
            </button>
          )}
          <nav className="grid grid-cols-3 rounded-2xl border border-line bg-surface p-1 shadow-lg" aria-label="Seções">
            {(
              [
                ['treino', 'Treino', IconDumbbell],
                ['progresso', 'Progresso', IconChart],
                ['guia', 'Guia', IconBook],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                aria-current={tab === id ? 'page' : undefined}
                className={`flex flex-col items-center gap-0.5 rounded-xl py-1.5 font-display text-[12px] font-bold uppercase tracking-wider transition-colors ${tab === id ? 'bg-ink text-bg' : 'text-muted'}`}
              >
                <Icon width={18} height={18} />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {toast && (
        <div className="anim-sheet fixed inset-x-4 top-[calc(env(safe-area-inset-top)+12px)] z-[60] mx-auto max-w-sm rounded-2xl bg-ink px-4 py-3 text-center font-display text-base font-bold uppercase tracking-wide text-bg shadow-2xl" role="status">
          {toast}
        </div>
      )}

      {sheet && <ExerciseSheet exercise={sheet} who={who} onClose={closeSheet} />}
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

/** Medição de pressão do Arthur antes do treino de força. */
function BpCheck({ bp, setBp, today }: { bp: BloodPressure[]; setBp: (fn: (b: BloodPressure[]) => BloodPressure[]) => void; today: string }) {
  const todays = bp.filter((b) => b.date === today).at(-1)
  const [sys, setSys] = useState('')
  const [dia, setDia] = useState('')
  const [editing, setEditing] = useState(false)
  const s = Number(sys)
  const d = Number(dia)
  const valid = s >= 70 && s <= 260 && d >= 40 && d <= 160

  if (todays && !editing) {
    const a = bpAdvice(todays.sys, todays.dia)
    return (
      <div className={`mt-3 rounded-3xl border p-4 ${a.level === 'stop' || a.level === 'care' ? 'border-signal bg-signal-soft' : 'border-line bg-surface'}`}>
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">pressão do arthur hoje</p>
          <button onClick={() => setEditing(true)} className="font-mono text-[11px] uppercase text-muted underline">
            medir de novo
          </button>
        </div>
        <p className="mt-1 font-mono text-2xl font-semibold tabular">
          {todays.sys}/{todays.dia} <span className="text-sm text-muted">mmHg</span>
        </p>
        <p className="mt-1 text-[14px] leading-snug">{a.text}</p>
      </div>
    )
  }

  return (
    <div className="mt-3 rounded-3xl border border-line bg-surface p-4">
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted">arthur · pressão antes do treino (opcional)</p>
      <div className="mt-2 flex items-center gap-2">
        <input inputMode="numeric" placeholder="12×" aria-label="Sistólica" value={sys} onChange={(e) => setSys(e.target.value.replace(/\D/g, ''))} className="h-11 w-20 rounded-xl bg-surface-2 text-center font-mono text-lg tabular outline-none" />
        <span className="font-mono text-muted">/</span>
        <input inputMode="numeric" placeholder="8×" aria-label="Diastólica" value={dia} onChange={(e) => setDia(e.target.value.replace(/\D/g, ''))} className="h-11 w-20 rounded-xl bg-surface-2 text-center font-mono text-lg tabular outline-none" />
        <span className="font-mono text-xs text-muted">mmHg</span>
        <button
          disabled={!valid}
          onClick={() => {
            setBp((b) => [...b, { date: today, sys: s, dia: d }].slice(-200))
            setSys('')
            setDia('')
            setEditing(false)
          }}
          className="ml-auto rounded-xl bg-arthur px-4 py-3 font-display text-sm font-bold uppercase tracking-wider text-bg disabled:opacity-30"
        >
          Ok
        </button>
      </div>
      <p className="mt-2 text-[12px] leading-snug text-muted">Sentado, 5 min em repouso, braço apoiado na altura do coração. Ex.: "13 por 8" = 130/80.</p>
    </div>
  )
}
