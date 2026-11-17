import type { Exercise, PersonId, TrainingDay } from '../data/types'

export const people: { id: PersonId; name: string }[] = [
  { id: 'arthur', name: 'Arthur' },
  { id: 'isa', name: 'Isa' },
]

export const weekdayShort = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']
export const weekdayLong = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

export const fmtRest = (s: number) => (s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : `${s}s`)

export const fmtClock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export const fmtLoad = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ','))

export const repsFor = (ex: Exercise, p: PersonId) => ex[p].reps ?? ex.reps

/** Duração estimada em minutos (a maior entre os dois). */
export function estimateMinutes(day: TrainingDay, who: PersonId[], maxSets = 99) {
  return Math.max(
    0,
    ...who.map((p) =>
      day.exercises.reduce((acc, ex) => {
        const sets = Math.min(ex[p].sets, maxSets)
        if (!sets) return acc
        if (ex.unit === 'tempo') return acc + (parseInt(repsFor(ex, p)) || 0) * 60
        return acc + sets * (ex.rest + (/\bmin\b/.test(ex.reps) ? 90 : 45))
      }, 0),
    ),
  ) / 60
}

export const relativeDays = (iso: string, today: string) => {
  const d = Math.round((Date.parse(today) - Date.parse(iso)) / 86_400_000)
  if (d <= 0) return 'hoje'
  if (d === 1) return 'ontem'
  return `há ${d} dias`
}
