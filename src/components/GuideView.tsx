import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { health, phases, principles, program } from '../data/program'
import type { Muscle, PersonId, Phase } from '../data/types'
import { people, relativeDays, weekdayLong } from '../lib/format'
import { exportAll, importAll, todayISO, type HistoryEntry } from '../lib/store'
import { muscleLabel } from './BodyMap'
import { tone } from './ExerciseCard'

/** Séries semanais por músculo: principal conta 1, secundário conta 0,5. */
function weeklyVolume(p: PersonId, phase: Phase) {
  const vol = new Map<Muscle, number>()
  for (const day of program) {
    if (day.kind !== 'forca') continue
    for (const ex of day.exercises) {
      const sets = Math.min(ex[p].sets, phase.maxSets)
      if (!sets) continue
      ex.primary.forEach((m) => vol.set(m, (vol.get(m) ?? 0) + sets))
      ex.secondary?.forEach((m) => vol.set(m, (vol.get(m) ?? 0) + sets * 0.5))
    }
  }
  return [...vol.entries()].filter(([, v]) => v >= 3).sort((a, b) => b[1] - a[1])
}

const refs: [string, string][] = [
  ['ACSM 2026 — Posição sobre treino resistido', 'https://acsm.org/resistance-training-guidelines-update-2026/'],
  ['ACSM 2024 — Atividade física e excesso de peso', 'https://acsm.org/3-new-pronouncements-2024/'],
  ['Lopez et al. 2022 — Treino resistido em adultos com sobrepeso (meta-análise)', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9285060'],
  ['Edwards et al. 2023 — Exercício e pressão arterial (BJSM)', 'https://bjsm.bmj.com/content/bjsports/57/20/1317.full.pdf'],
  ['Treino isométrico na hipertensão — guia de eficácia e segurança', 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10015931/'],
  ['Paluch et al. 2022 — Passos diários e mortalidade (Lancet Public Health)', 'https://doaj.org/article/c3639c468b4348958202e52793ab979d'],
  ['Deficiência de ferro e exercício — revisão (Frontiers 2022)', 'https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2022.903937/pdf'],
  ['NICE — Relação cintura/altura', 'https://www.ncbi.nlm.nih.gov/books/NBK588750/'],
]

interface Props {
  history: HistoryEntry[]
  defaultPerson: PersonId
  phase: Phase
  week: number
  startDate: string | null
  setStartDate: (d: string) => void
}

export function GuideView({ history, defaultPerson, phase, week, startDate, setStartDate }: Props) {
  const [person, setPerson] = useState<PersonId>(defaultPerson)
  const [msg, setMsg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const vol = weeklyVolume(person, phase)
  const max = 24
  const today = todayISO()

  const download = () => {
    const blob = new Blob([exportAll()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `treino-hub-backup-${today}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const upload = async (file: File) => {
    const ok = importAll(await file.text())
    setMsg(ok ? 'Backup restaurado. Recarregando…' : 'Arquivo inválido.')
    if (ok) setTimeout(() => location.reload(), 800)
  }

  return (
    <div className="space-y-4">
      <Card>
        <Kicker>o plano</Kicker>
        <h2 className="font-display text-3xl font-extrabold uppercase leading-none tracking-tight">Recomeço · 3 fases</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink/85">
          3 treinos de corpo inteiro por semana (seg, qua, sex) + caminhadas nos outros dias. As séries e o esforço sobem por fase, contadas a partir da data de início.
        </p>
        <ol className="mt-4 space-y-2">
          {phases.map((ph) => {
            const on = ph.id === phase.id
            return (
              <li key={ph.id} className={`rounded-2xl border p-3 ${on ? 'border-signal bg-signal-soft/50' : 'border-line'}`}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-display text-lg font-bold uppercase">
                    {ph.id}. {ph.name}
                  </span>
                  <span className="font-mono text-[11px] text-muted">{ph.to > 999 ? `sem ${ph.from}+` : `sem ${ph.from}–${ph.to}`}</span>
                </div>
                <p className="mt-1 text-[13px] leading-snug text-ink/80">{ph.summary}</p>
                <p className="mt-1.5 font-mono text-[11px] text-muted">
                  até {ph.maxSets} séries · RIR {ph.rir}
                </p>
              </li>
            )
          })}
        </ol>
        <label className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-surface-2 px-4 py-3">
          <span>
            <span className="block font-mono text-[10px] uppercase tracking-widest text-muted">início do programa</span>
            <span className="text-[13px]">{startDate ? `Semana ${week} · fase ${phase.id}` : 'Ainda não definido'}</span>
          </span>
          <input type="date" value={startDate ?? ''} onChange={(e) => e.target.value && setStartDate(e.target.value)} className="rounded-xl bg-surface px-2 py-2 font-mono text-sm outline-none" />
        </label>
      </Card>

      <Card>
        <Kicker>saúde — leiam antes de começar</Kicker>
        <div className="mt-1 space-y-4">
          {people.map((pp) => (
            <div key={pp.id}>
              <h3 className={`font-display text-lg font-bold uppercase ${tone[pp.id].text}`}>
                {pp.name} · {health[pp.id].title}
              </h3>
              <ul className="mt-2 space-y-2">
                {health[pp.id].items.map((it) => (
                  <li key={it} className="flex gap-3 text-[14px] leading-snug">
                    <span className="mt-[8px] h-0.5 w-3 shrink-0 bg-signal" />
                    {it}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <Kicker>como o programa funciona</Kicker>
      <ol className="mt-2 space-y-5">
        {principles.map((p, i) => (
          <li key={p.title} className="flex gap-4">
            <span className="font-display text-3xl font-extrabold leading-none text-signal tabular">{String(i + 1).padStart(2, '0')}</span>
            <div>
              <h3 className="font-display text-lg font-bold uppercase leading-tight tracking-tight">{p.title}</h3>
              <p className="mt-1 text-[15px] leading-relaxed text-ink/85">{p.body}</p>
            </div>
          </li>
        ))}
      </ol>
      </Card>

      <section className="rounded-[28px] border border-line bg-surface p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-lg font-bold uppercase tracking-tight">Séries por semana</h3>
          <div className="flex rounded-full bg-surface-2 p-1" role="tablist">
            {people.map((p) => (
              <button
                key={p.id}
                role="tab"
                aria-selected={person === p.id}
                onClick={() => setPerson(p.id)}
                className={`rounded-full px-3 py-1 font-display text-sm font-bold uppercase ${person === p.id ? 'bg-ink text-bg' : 'text-muted'}`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-1 text-[13px] text-muted">Fase atual. Exercício principal conta 1 série; músculo auxiliar conta ½. A faixa marcada (10–20) é onde fica a maior parte do ganho de massa — na fase 1 é normal ficar abaixo.</p>
        <div className="relative mt-4">
          <div
            className="pointer-events-none absolute inset-y-0 rounded-sm bg-signal/10"
            style={{ left: `calc(104px + (100% - 144px) * ${10 / max})`, width: `calc((100% - 144px) * ${10 / max})` }}
            aria-hidden
          />
          <ul className="relative space-y-1.5">
            {vol.map(([m, v]) => (
              <li key={m} className="flex items-center gap-2 text-[13px]" title={`${muscleLabel[m]}: ${v} séries`}>
                <span className="w-[96px] shrink-0 truncate">{muscleLabel[m]}</span>
                <span className="relative h-3.5 flex-1">
                  <span className="absolute inset-y-0 left-0 rounded-r-[4px] bg-signal" style={{ width: `${Math.min(100, (v / max) * 100)}%` }} />
                </span>
                <span className="w-8 shrink-0 text-right font-mono text-xs tabular">{v % 1 ? v.toFixed(1).replace('.', ',') : v}</span>
              </li>
            ))}
          </ul>
          <div className="relative mt-1 h-4 font-mono text-[10px] text-muted tabular" aria-hidden>
            {[0, 10, 20].map((t) => (
              <span key={t} className="absolute -translate-x-1/2" style={{ left: `calc(104px + (100% - 144px) * ${t / max})` }}>
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-line bg-surface p-4">
        <h3 className="font-display text-lg font-bold uppercase tracking-tight">Histórico</h3>
        {history.length === 0 ? (
          <p className="mt-2 text-[15px] text-muted">Nenhum treino finalizado ainda. Ao terminar, toque em "Finalizar treino" para registrar cargas e séries.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {[...history].reverse().slice(0, 20).map((h) => {
              const day = program.find((d) => d.id === h.dayId)
              const sets = (p: PersonId) => Object.entries(h.entries).filter(([k]) => k.endsWith(':' + p)).reduce((a, [, e]) => a + e.sets, 0)
              return (
                <li key={h.date + h.dayId} className="flex items-center gap-3 py-2.5">
                  <span className="w-11 font-display text-xl font-extrabold">{day?.code ?? h.dayId}</span>
                  <span className="flex-1 text-[14px]">
                    {weekdayLong[new Date(h.date + 'T12:00').getDay()]}, {new Date(h.date + 'T12:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
                    <span className="text-muted"> · {relativeDays(h.date, today)}</span>
                  </span>
                  <span className="font-mono text-[11px] text-muted tabular">
                    <span className="text-arthur">A {sets('arthur')}</span> · <span className="text-isa">I {sets('isa')}</span>
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <Card>
        <Kicker>referências</Kicker>
        <ul className="mt-1 space-y-2">
          {refs.map(([t, u]) => (
            <li key={u}>
              <a href={u} target="_blank" rel="noreferrer" className="text-[14px] leading-snug underline decoration-line underline-offset-4">
                {t}
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[12px] leading-snug text-muted">Este app organiza o treino com base nessas referências, mas não substitui avaliação médica, de fisioterapeuta ou de nutricionista.</p>
      </Card>

      <section className="rounded-[28px] border border-line bg-surface p-4">
        <h3 className="font-display text-lg font-bold uppercase tracking-tight">Backup</h3>
        <p className="mt-1 text-[13px] text-muted">Os dados ficam salvos só neste celular. Exporte de vez em quando — ou para passar as cargas para outro aparelho.</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button onClick={download} className="rounded-2xl bg-surface-2 py-3 font-display text-sm font-bold uppercase tracking-wider active:scale-95">
            Exportar
          </button>
          <button onClick={() => fileRef.current?.click()} className="rounded-2xl bg-surface-2 py-3 font-display text-sm font-bold uppercase tracking-wider active:scale-95">
            Importar
          </button>
        </div>
        <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        {msg && <p className="mt-2 text-[13px]">{msg}</p>}
      </section>
      <p className="pt-2 text-center font-mono text-[10px] uppercase tracking-widest text-muted">Treino Hub v4 · {new Date().getFullYear()}</p>
    </div>
  )
}

function Card({ children }: { children: ReactNode }) {
  return <section className="rounded-[28px] border border-line bg-surface p-4">{children}</section>
}

function Kicker({ children }: { children: ReactNode }) {
  return <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">{children}</p>
}
