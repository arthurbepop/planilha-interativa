import type { ReactNode } from 'react'
import type { Exercise, PersonId } from '../data/types'
import { fmtRest, people } from '../lib/format'
import { BodyMap, muscleLabel } from './BodyMap'
import { IconPlay } from './icons'
import { Sheet } from './Sheet'

export function ExerciseSheet({ exercise: ex, who, onClose }: { exercise: Exercise; who: PersonId[]; onClose: () => void }) {
  const notes = people.filter((p) => who.includes(p.id) && ex.notes?.[p.id])
  return (
    <Sheet title={ex.name} kicker={[ex.unit === 'tempo' ? ex.reps : `${ex.reps} reps`, ex.rir && `RIR ${ex.rir}`, ex.rest > 0 && `descanso ${fmtRest(ex.rest)}`].filter(Boolean).join(' · ')} onClose={onClose}>
      <div className="grain rounded-3xl border border-line bg-bg px-4 pb-4 pt-5">
        <BodyMap primary={ex.primary} secondary={ex.secondary} />
        <ul className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-[13px]">
          {ex.primary.map((m) => (
            <li key={m} className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-signal" /> {muscleLabel[m]}
            </li>
          ))}
          {ex.secondary?.map((m) => (
            <li key={m} className="flex items-center gap-1.5 text-muted">
              <span className="size-2.5 rounded-full bg-signal/40" /> {muscleLabel[m]}
            </li>
          ))}
        </ul>
      </div>

      {notes.length > 0 && (
        <div className="mt-4 space-y-2">
          {notes.map((p) => (
            <p key={p.id} className={`rounded-2xl px-4 py-3 text-[15px] leading-snug ${p.id === 'arthur' ? 'bg-arthur-soft' : 'bg-isa-soft'}`}>
              <b className="font-display text-sm uppercase tracking-wide">{p.name} · </b>
              {ex.notes![p.id]}
            </p>
          ))}
        </div>
      )}

      <Section title="Como fazer">
        <ol className="space-y-3">
          {ex.how.map((step, i) => (
            <li key={i} className="flex gap-3 text-[15px] leading-snug">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-ink font-mono text-[11px] font-semibold text-bg">{i + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </Section>

      {ex.avoid && (
        <Section title="Evite">
          <ul className="space-y-2">
            {ex.avoid.map((a, i) => (
              <li key={i} className="flex gap-3 text-[15px] leading-snug">
                <span className="mt-[9px] h-0.5 w-3 shrink-0 bg-signal" />
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Por que está no treino">
        <p className="text-[15px] leading-relaxed text-ink/85">{ex.why}</p>
      </Section>

      {ex.video && (
        <a
          href={`https://www.youtube.com/results?search_query=${encodeURIComponent(ex.video)}`}
          target="_blank"
          rel="noreferrer"
          className="mt-6 flex items-center justify-center gap-2 rounded-2xl bg-ink py-4 font-display text-base font-bold uppercase tracking-wider text-bg active:scale-[0.98]"
        >
          <IconPlay width={16} height={16} /> Ver demonstração em vídeo
        </a>
      )}
    </Sheet>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6">
      <h3 className="mb-3 font-display text-[13px] font-bold uppercase tracking-[0.18em] text-muted">{title}</h3>
      {children}
    </section>
  )
}
