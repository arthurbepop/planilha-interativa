import { useMemo, useState } from 'react'
import type { PersonId } from '../data/types'
import { fmtLoad, people } from '../lib/format'
import { bpAdvice, series, trend, weeklyRate } from '../lib/progress'
import type { BloodPressure, Measure, Profile } from '../lib/store'
import { todayISO } from '../lib/store'
import { tone } from './ExerciseCard'
import { IconChevron, IconX } from './icons'

interface Props {
  order: PersonId[]
  measures: Record<PersonId, Measure[]>
  /** Grava (ou apaga, com `delete: true`) o registro do dia. */
  putMeasure: (p: PersonId, m: Measure | { date: string; delete: true }) => void
  profiles: Record<PersonId, Profile>
  putProfile: (p: PersonId, prof: Profile) => void
  bp: [string, BloodPressure][]
  deleteBp: (id: string) => void
}

const num = (s: string) => {
  const v = Number(s.replace(',', '.'))
  return s.trim() === '' || Number.isNaN(v) ? undefined : v
}
const fmtDate = (iso: string) => new Date(iso + 'T12:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })

export function ProgressView(props: Props) {
  return (
    <div className="space-y-4">
      {props.order.map((p) => (
        <PersonProgress key={p} p={p} {...props} />
      ))}
      <p className="px-2 text-center text-[12px] leading-relaxed text-muted">
        Dica: pesem-se pela manhã, depois do banheiro e antes de comer. O peso oscila 1–2 kg de um dia para o outro (água, sal, intestino) — por isso o app olha a <b>média de 7 dias</b>, não a pesagem isolada.
      </p>
    </div>
  )
}

function PersonProgress({ p, measures, putMeasure, profiles, putProfile, bp, deleteBp }: Props & { p: PersonId }) {
  const t = tone[p]
  const name = people.find((x) => x.id === p)!.name
  const list = measures[p] ?? []
  const prof = profiles[p] ?? {}
  const w = series(list, 'weight')
  const waist = series(list, 'waist')
  const tr = trend(w)
  const rate = weeklyRate(tr)
  const current = tr.at(-1)?.value
  const first = w[0]?.value
  const lastWaist = waist.at(-1)?.value
  const whtr = lastWaist && prof.height ? lastWaist / prof.height : null

  const [date, setDate] = useState(todayISO())
  const [weight, setWeight] = useState('')
  const [wst, setWst] = useState('')
  const [showGoals, setShowGoals] = useState(!prof.goalWeight && !prof.height)
  const [showList, setShowList] = useState(false)

  const save = () => {
    const wv = num(weight)
    const cv = num(wst)
    if (wv == null && cv == null) return
    const existing = list.find((x) => x.date === date)
    putMeasure(p, { ...(existing ?? {}), date, ...(wv != null ? { weight: wv } : {}), ...(cv != null ? { waist: cv } : {}) })
    setWeight('')
    setWst('')
  }

  const pct = rate != null && current ? (rate / current) * 100 : null
  const pace =
    pct == null
      ? null
      : prof.goalWeight != null && current != null && prof.goalWeight >= current - 0.5
        ? { label: 'na meta', tone: 'good' }
        : pct > 0.15
          ? { label: 'subindo', tone: 'warn' }
          : pct > -0.3
            ? { label: 'estável', tone: 'neutral' }
            : pct >= -1.05
              ? { label: 'ritmo ideal', tone: 'good' }
              : { label: 'rápido demais', tone: 'warn' }

  const toGo = prof.goalWeight != null && current != null ? current - prof.goalWeight : null
  const etaWeeks = toGo != null && toGo > 0 && rate != null && rate < -0.05 ? Math.ceil(toGo / -rate) : null

  return (
    <section className="rounded-[28px] border border-line bg-surface p-4">
      <header className="flex items-baseline justify-between">
        <h2 className={`font-display text-2xl font-extrabold uppercase tracking-tight ${t.text}`}>{name}</h2>
        <button onClick={() => setShowGoals((s) => !s)} className="flex items-center gap-1 font-mono text-[11px] uppercase text-muted">
          metas <IconChevron width={14} className={showGoals ? 'rotate-180' : ''} />
        </button>
      </header>

      {showGoals && (
        <div className="anim-fade mt-3 grid grid-cols-3 gap-2 rounded-2xl bg-surface-2 p-3">
          <Field label="Altura (cm)" value={prof.height} onChange={(v) => putProfile(p, { ...prof, height: v })} />
          <Field label="Peso-meta" value={prof.goalWeight} onChange={(v) => putProfile(p, { ...prof, goalWeight: v })} />
          <Field label="Cintura-meta" value={prof.goalWaist} onChange={(v) => putProfile(p, { ...prof, goalWaist: v })} />
          <p className="col-span-3 text-[12px] leading-snug text-muted">
            {p === 'arthur' ? 'Sugestão: peso-meta 85 kg (−15 kg), revisado a cada fase.' : 'Recomposição: a cintura e as cargas contam mais que a balança. Defina uma cintura-meta.'} A altura serve para calcular a relação cintura/altura.
          </p>
        </div>
      )}

      <dl className="mt-4 grid grid-cols-3 gap-2">
        <Stat label="peso (média 7d)" value={current != null ? `${fmtLoad(Math.round(current * 10) / 10)}` : '—'} unit="kg" />
        <Stat
          label="desde o início"
          value={current != null && first != null ? `${current - first > 0 ? '+' : ''}${fmtLoad(Math.round((current - first) * 10) / 10)}` : '—'}
          unit="kg"
        />
        <Stat label="ritmo / semana" value={rate != null ? `${rate > 0 ? '+' : ''}${fmtLoad(Math.round(rate * 100) / 100)}` : '—'} unit="kg" />
      </dl>

      {(pace || etaWeeks) && (
        <p className="mt-3 flex flex-wrap items-center gap-2 text-[13px] leading-snug">
          {pace && (
            <span
              className={`rounded-full px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase ${
                pace.tone === 'good' ? `${t.soft}` : pace.tone === 'warn' ? 'bg-signal-soft text-signal' : 'bg-surface-2 text-muted'
              }`}
            >
              {pace.label}
            </span>
          )}
          <span className="text-muted">
            {pct != null && `${fmtLoad(Math.round(pct * 100) / 100)}% do peso por semana (alvo: −0,5 a −1%).`}
            {etaWeeks != null && ` Nesse ritmo, ${fmtLoad(prof.goalWeight!)} kg em ~${etaWeeks} semanas.`}
          </span>
        </p>
      )}

      <WeightChart p={p} raw={w} tr={tr} goal={prof.goalWeight} />

      {(lastWaist != null || whtr != null) && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-surface-2 px-4 py-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted">cintura</div>
            <div className="font-mono text-lg font-semibold tabular">
              {lastWaist != null ? `${fmtLoad(lastWaist)} cm` : '—'}
              {waist.length > 1 && (
                <span className="ml-2 text-xs text-muted">
                  {lastWaist! - waist[0].value > 0 ? '+' : ''}
                  {fmtLoad(Math.round((lastWaist! - waist[0].value) * 10) / 10)} cm
                </span>
              )}
            </div>
          </div>
          {whtr != null && (
            <div className="text-right">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted">cintura ÷ altura</div>
              <div className="font-mono text-lg font-semibold tabular">{whtr.toFixed(2).replace('.', ',')}</div>
              <div className="text-[11px] text-muted">{whtr < 0.5 ? 'saudável (< 0,5)' : whtr < 0.6 ? 'risco aumentado (0,5–0,59)' : 'risco alto (≥ 0,6)'}</div>
            </div>
          )}
        </div>
      )}

      {/* registrar */}
      <div className="mt-4 rounded-2xl border border-line p-3">
        <div className="grid grid-cols-[1.2fr_1fr_1fr] gap-2">
          <label className="flex min-w-0 flex-col gap-1">
            <span className="font-mono text-[10px] uppercase text-muted">data</span>
            <input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} className="h-11 w-full min-w-0 rounded-xl bg-surface-2 px-2 font-mono text-sm outline-none" />
          </label>
          <label className="flex min-w-0 flex-col gap-1">
            <span className="font-mono text-[10px] uppercase text-muted">peso kg</span>
            <input inputMode="decimal" placeholder="0,0" value={weight} onChange={(e) => setWeight(e.target.value)} className="h-11 w-full min-w-0 rounded-xl bg-surface-2 px-3 font-mono text-base tabular outline-none" />
          </label>
          <label className="flex min-w-0 flex-col gap-1">
            <span className="font-mono text-[10px] uppercase text-muted">cintura cm</span>
            <input inputMode="decimal" placeholder="0,0" value={wst} onChange={(e) => setWst(e.target.value)} className="h-11 w-full min-w-0 rounded-xl bg-surface-2 px-3 font-mono text-base tabular outline-none" />
          </label>
        </div>
        <button
          onClick={save}
          disabled={num(weight) == null && num(wst) == null}
          className={`mt-2 w-full rounded-xl py-3 font-display text-sm font-bold uppercase tracking-wider text-bg transition-opacity disabled:opacity-30 ${t.bg}`}
        >
          Registrar
        </button>
        <p className="mt-2 text-[11px] leading-snug text-muted">Cintura: fita na altura do umbigo, no fim de uma expiração normal, sem apertar. 1× por semana basta.</p>
      </div>

      {list.length > 0 && (
        <div className="mt-3">
          <button onClick={() => setShowList((s) => !s)} className="flex w-full items-center justify-between py-1 font-mono text-[11px] uppercase text-muted">
            {list.length} registro{list.length > 1 ? 's' : ''} <IconChevron width={14} className={showList ? 'rotate-180' : ''} />
          </button>
          {showList && (
            <ul className="divide-y divide-line">
              {[...list].reverse().map((m) => (
                <li key={m.date} className="flex items-center gap-3 py-2 font-mono text-sm tabular">
                  <span className="w-20 whitespace-nowrap text-muted">{fmtDate(m.date)}</span>
                  <span className="flex-1">{m.weight != null ? `${fmtLoad(m.weight)} kg` : ''}</span>
                  <span className="flex-1 text-muted">{m.waist != null ? `${fmtLoad(m.waist)} cm` : ''}</span>
                  <button
                    aria-label={`Apagar registro de ${fmtDate(m.date)}`}
                    onClick={() => putMeasure(p, { date: m.date, delete: true })}
                    className="grid size-8 place-items-center rounded-full text-muted"
                  >
                    <IconX width={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {p === 'arthur' && <BpLog bp={bp} deleteBp={deleteBp} />}
    </section>
  )
}

function Field({ label, value, onChange }: { label: string; value?: number; onChange: (v: number | undefined) => void }) {
  const [txt, setTxt] = useState(value != null ? String(value).replace('.', ',') : '')
  return (
    <label className="flex flex-col gap-1">
      <span className="font-mono text-[10px] uppercase text-muted">{label}</span>
      <input
        inputMode="decimal"
        value={txt}
        placeholder="—"
        onChange={(e) => {
          setTxt(e.target.value)
          onChange(num(e.target.value))
        }}
        className="h-10 w-full rounded-xl bg-surface px-2 font-mono text-base tabular outline-none"
      />
    </label>
  )
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div>
      <dd className="font-mono text-xl font-semibold tabular">
        {value}
        {value !== '—' && <span className="ml-0.5 text-xs text-muted">{unit}</span>}
      </dd>
      <dt className="font-mono text-[10px] uppercase tracking-wide text-muted">{label}</dt>
    </div>
  )
}

/** Gráfico de peso: pesagens (pontos), média de 7 dias (linha) e meta (tracejado). */
function WeightChart({ p, raw, tr, goal }: { p: PersonId; raw: { date: string; value: number }[]; tr: { date: string; value: number }[]; goal?: number }) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 340
  const H = 170
  const pad = { l: 34, r: 10, t: 12, b: 22 }

  const geo = useMemo(() => {
    if (raw.length === 0) return null
    const t0 = Date.parse(raw[0].date)
    const t1 = Math.max(Date.parse(raw.at(-1)!.date), t0 + 14 * 86_400_000)
    const vals = raw.map((r) => r.value).concat(goal != null ? [goal] : [])
    let lo = Math.floor(Math.min(...vals) - 1)
    let hi = Math.ceil(Math.max(...vals) + 1)
    if (hi - lo < 4) {
      lo -= 2
      hi += 2
    }
    const x = (d: string) => pad.l + ((Date.parse(d) - t0) / (t1 - t0)) * (W - pad.l - pad.r)
    const y = (v: number) => pad.t + (1 - (v - lo) / (hi - lo)) * (H - pad.t - pad.b)
    const step = Math.max(1, Math.ceil((hi - lo) / 4))
    const ticks: number[] = []
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) ticks.push(v)
    return { x, y, ticks, t0, t1 }
  }, [raw, goal])

  if (!geo) {
    return (
      <div className="mt-4 grid h-[120px] place-items-center rounded-2xl border border-dashed border-line text-center text-[13px] text-muted">
        Registre o primeiro peso abaixo para ver o gráfico.
      </div>
    )
  }
  const { x, y, ticks } = geo
  const color = `var(--${p})`
  const path = tr.map((pt, i) => `${i ? 'L' : 'M'}${x(pt.date).toFixed(1)} ${y(pt.value).toFixed(1)}`).join(' ')
  const h = hover != null ? raw[hover] : null

  return (
    <figure className="relative mt-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Gráfico de evolução do peso">
        {ticks.map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeWidth={1} />
            <text x={pad.l - 6} y={y(v) + 3.5} textAnchor="end" className="fill-muted font-mono" fontSize={10}>
              {v}
            </text>
          </g>
        ))}
        {goal != null && (
          <g>
            <line x1={pad.l} x2={W - pad.r} y1={y(goal)} y2={y(goal)} stroke="var(--muted)" strokeWidth={1.5} strokeDasharray="4 4" />
            <text x={W - pad.r} y={y(goal) - 5} textAnchor="end" className="fill-muted font-mono" fontSize={10}>
              meta {fmtLoad(goal)}
            </text>
          </g>
        )}
        {raw.map((pt, i) => (
          <circle key={pt.date} cx={x(pt.date)} cy={y(pt.value)} r={hover === i ? 5 : 3.5} fill={color} fillOpacity={0.35} stroke="var(--surface)" strokeWidth={1.5} />
        ))}
        {tr.length > 1 && <path d={path} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />}
        <text x={pad.l} y={H - 5} className="fill-muted font-mono" fontSize={10}>
          {fmtDate(raw[0].date)}
        </text>
        <text x={W - pad.r} y={H - 5} textAnchor="end" className="fill-muted font-mono" fontSize={10}>
          {fmtDate(raw.at(-1)!.date)}
        </text>
        {/* áreas de toque */}
        {raw.map((pt, i) => (
          <rect
            key={'h' + pt.date}
            x={x(pt.date) - 12}
            y={pad.t}
            width={24}
            height={H - pad.t - pad.b}
            fill="transparent"
            onPointerEnter={() => setHover(i)}
            onPointerLeave={() => setHover(null)}
            onClick={() => setHover(hover === i ? null : i)}
          />
        ))}
      </svg>
      {h && (
        <div
          className="pointer-events-none absolute -top-1 -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink px-2 py-1 font-mono text-[11px] text-bg"
          style={{ left: `${(x(h.date) / W) * 100}%` }}
        >
          {fmtDate(h.date)} · {fmtLoad(h.value)} kg · média {fmtLoad(Math.round(tr[hover!].value * 10) / 10)}
        </div>
      )}
      <figcaption className="mt-1 flex gap-4 font-mono text-[10px] uppercase text-muted">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ background: color, opacity: 0.45 }} /> pesagem
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-3 rounded" style={{ background: color }} /> média 7 dias
        </span>
      </figcaption>
    </figure>
  )
}

function BpLog({ bp, deleteBp }: { bp: Props['bp']; deleteBp: Props['deleteBp'] }) {
  const last = bp.slice(-5).reverse()
  if (bp.length === 0) return null
  return (
    <div className="mt-4 rounded-2xl bg-surface-2 p-3">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted">pressão · últimas medições</div>
      <ul className="mt-2 space-y-1">
        {last.map(([id, b]) => {
          const a = bpAdvice(b.sys, b.dia)
          return (
            <li key={id} className="flex items-center gap-3 font-mono text-sm tabular">
              <span className="w-20 whitespace-nowrap text-muted">{fmtDate(b.date)}</span>
              <span className="flex-1">
                {b.sys}/{b.dia}
              </span>
              <span className={`size-2 rounded-full ${a.level === 'good' ? 'bg-arthur' : a.level === 'ok' ? 'bg-muted' : 'bg-signal'}`} aria-label={a.level} />
              <button aria-label="Apagar medição" onClick={() => deleteBp(id)} className="grid size-7 place-items-center text-muted">
                <IconX width={12} />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
