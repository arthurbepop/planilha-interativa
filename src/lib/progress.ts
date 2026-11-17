import { phases } from '../data/program'
import type { Exercise, PersonId, Phase } from '../data/types'
import type { Measure } from './store'

/** "10–12" → [10, 12]; "8–10 por perna" → [8, 10]; "12" → [12, 12]; durações → null. */
export function parseRange(reps: string): [number, number] | null {
  if (/\b(s|min)\b/.test(reps)) return null
  const m = reps.match(/(\d+)\s*[–-]\s*(\d+)/)
  if (m) return [Number(m[1]), Number(m[2])]
  const one = reps.match(/^(\d+)/)
  return one ? [Number(one[1]), Number(one[1])] : null
}

export const isCounted = (ex: Exercise, reps: string) => ex.unit !== 'tempo' && parseRange(reps) != null

const DAY = 86_400_000

export function weekOf(startISO: string | null, todayISO: string) {
  if (!startISO) return 1
  const d = Math.floor((Date.parse(todayISO) - Date.parse(startISO)) / DAY)
  return Math.max(1, Math.floor(d / 7) + 1)
}

export function phaseFor(week: number): Phase {
  return phases.find((p) => week >= p.from && week <= p.to) ?? phases[phases.length - 1]
}

export const setsFor = (ex: Exercise, p: PersonId, phase: Phase) => Math.min(ex[p].sets, phase.maxSets)

/** RIR alvo: o Arthur nunca abaixo de 2 (pressão alta). */
export const rirFor = (p: PersonId, phase: Phase) => (p === 'arthur' && phase.id >= 3 ? '2' : phase.rir)

/** Sugere subir a carga quando todas as séries atingem o topo da faixa. */
export function shouldProgress(reps: (number | null)[], sets: number, range: [number, number] | null) {
  if (!range || reps.length < sets) return false
  return reps.slice(0, sets).every((r) => r != null && r >= range[1])
}

/** Média móvel de 7 dias (por data, não por número de pesagens). */
export function trend(points: { date: string; value: number }[]) {
  return points.map((pt) => {
    const t = Date.parse(pt.date)
    const win = points.filter((q) => {
      const dt = t - Date.parse(q.date)
      return dt >= 0 && dt < 7 * DAY
    })
    return { date: pt.date, value: win.reduce((a, q) => a + q.value, 0) / win.length }
  })
}

/** Inclinação (kg/semana) por regressão linear nas últimas `days` dias. */
export function weeklyRate(points: { date: string; value: number }[], days = 28) {
  if (points.length < 2) return null
  const last = Date.parse(points[points.length - 1].date)
  const win = points.filter((p) => last - Date.parse(p.date) <= days * DAY)
  if (win.length < 2) return null
  const xs = win.map((p) => (Date.parse(p.date) - last) / DAY)
  const ys = win.map((p) => p.value)
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length
  const my = ys.reduce((a, b) => a + b, 0) / ys.length
  const den = xs.reduce((a, x) => a + (x - mx) ** 2, 0)
  if (den === 0 || xs[0] - xs[xs.length - 1] > -6) return null // precisa de ≥ 1 semana de dados
  const slope = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / den
  return slope * 7
}

export const series = (ms: Measure[], key: 'weight' | 'waist') =>
  ms
    .filter((m) => m[key] != null)
    .map((m) => ({ date: m.date, value: m[key] as number }))
    .sort((a, b) => a.date.localeCompare(b.date))

export function bpAdvice(sys: number, dia: number) {
  if (sys >= 180 || dia >= 110)
    return { level: 'stop' as const, text: 'Pressão muito alta. Não treine hoje e procure orientação médica — se houver dor no peito, falta de ar ou dor de cabeça forte, procure atendimento imediatamente.' }
  if (sys >= 160 || dia >= 100)
    return { level: 'care' as const, text: 'Pressão alta hoje. Faça só a caminhada leve ou o treino com metade das séries, respirando bem, e meça de novo depois. Se repetir, fale com seu médico.' }
  if (sys >= 140 || dia >= 90) return { level: 'ok' as const, text: 'Acima do ideal, mas dentro do que permite treinar. Respire em todas as repetições e respeite o RIR.' }
  return { level: 'good' as const, text: 'Pressão boa para treinar.' }
}
