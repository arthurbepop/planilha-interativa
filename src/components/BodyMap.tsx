import type { Muscle } from '../data/types'

type Shape = { m: Muscle | null; d: string; center?: boolean }

/*
 * Figura estilizada em viewBox 120×240. As formas da metade esquerda são
 * espelhadas automaticamente; `center: true` desenha só uma vez.
 * m = null → parte neutra do corpo (cabeça, mãos, joelhos, pés).
 */
const common: Shape[] = [
  { m: null, d: 'M60 5 a10.5 12 0 1 1 -0.01 0 Z', center: true },
  { m: null, d: 'M54.5 28 L65.5 28 L66.5 37 L53.5 37 Z', center: true },
  { m: 'deltoide-lateral', d: 'M40.5 41 Q32 42 30.5 51 Q30 58 32.5 63 L36.5 59 Q34.5 50 40.5 41 Z' },
  { m: 'antebraco', d: 'M28.5 90 Q33.5 88 37 90.5 Q36.5 104 33.5 118 L28 118 Q24.5 104 28.5 90 Z' },
  { m: null, d: 'M30.5 120 a3.6 5.2 0 1 1 -0.01 0 Z' },
  { m: null, d: 'M49 171 a5.2 4.2 0 1 1 -0.01 0 Z' },
  { m: null, d: 'M47.5 220 a4.4 3.2 0 1 1 -0.01 0 Z' },
]

const front: Shape[] = [
  ...common,
  { m: 'trapezio', d: 'M53.5 33 Q47 37.5 42 40.5 L50 41 Q55 39.5 56 36 Z' },
  { m: 'deltoide-anterior', d: 'M41.5 41.5 Q36 50 38 58.5 L44 53 Q45.5 47 47.5 42.5 Q44.5 41 41.5 41.5 Z' },
  { m: 'peitoral', d: 'M49 43 Q57 42 59.3 45 L59.3 63 Q52 67.5 45 64 Q40 60.5 40.5 56 L45.5 52 Q46.5 46 49 43 Z' },
  { m: 'biceps', d: 'M32.5 64 Q37.5 60.5 39.5 64.5 Q40.5 76 37.5 86.5 Q33 88.5 29.8 85.5 Q28 74 32.5 64 Z' },
  { m: 'obliquos', d: 'M43 68 Q47.5 69.5 48.3 72 L48.3 104 Q44 102.5 42.3 96 Q41 82 43 68 Z' },
  { m: 'abdomen', d: 'M50.2 68.5 h8.6 v11 h-8.6 Z' },
  { m: 'abdomen', d: 'M50.2 81.5 h8.6 v11 h-8.6 Z' },
  { m: 'abdomen', d: 'M50.2 94.5 Q50.2 106 58.8 109.5 L58.8 94.5 Z' },
  { m: 'quadriceps', d: 'M42 115 Q49 111.5 54.5 116.5 Q57 136 55 157 Q52.5 166.5 49 167.5 Q43 164 41 151 Q39.5 131 42 115 Z' },
  { m: 'adutores', d: 'M55.8 116.5 Q59 116 59.4 118.5 L59.4 143 Q57.3 137 56.3 128 Z' },
  { m: 'panturrilha', d: 'M43 179.5 Q48 177 51.5 180 Q53.5 197 50.5 213 L46 214.5 Q42 197 43 179.5 Z' },
]

const back: Shape[] = [
  ...common,
  {
    m: 'trapezio',
    center: true,
    d: 'M60 29 Q57.5 36 47 39.5 Q42.5 41 41.5 43.5 Q50.5 45.5 54 55 Q57 68 60 81 Q63 68 66 55 Q69.5 45.5 78.5 43.5 Q77.5 41 73 39.5 Q62.5 36 60 29 Z',
  },
  { m: 'deltoide-posterior', d: 'M41.5 41.5 Q36 50 38 58.5 L44 53 Q44 47.5 41.5 44 Z' },
  { m: 'triceps', d: 'M32.5 64 Q37.5 60.5 39.5 64.5 Q40.5 76 37.5 86.5 Q33 88.5 29.8 85.5 Q28 74 32.5 64 Z' },
  { m: 'dorsal', d: 'M43 56 Q48 51.5 53 58.5 Q57 70 58.5 84 Q56 93 50 98.5 Q45 93 43 83 Q41 70 43 56 Z' },
  { m: 'lombar', center: true, d: 'M52.5 91 Q60 87 67.5 91 L67.5 107 Q60 111 52.5 107 Z' },
  { m: 'gluteo-medio', d: 'M42.5 104 Q48 102.5 51.5 107.5 L50 114.5 Q44.5 115 41.5 112 Z' },
  { m: 'gluteo-maximo', d: 'M42 116 Q51.5 112 59.3 115.5 L59.3 134.5 Q52 141 45 137.5 Q40 128 42 116 Z' },
  { m: 'isquiotibiais', d: 'M42 141.5 Q50 139 57.5 143 Q57 159 54 166.5 Q48.5 168.5 44 165 Q41 154 42 141.5 Z' },
  { m: 'panturrilha', d: 'M42.5 178.5 Q48.5 175 54 179 Q56 193 51 209 L46 211 Q40 195 42.5 178.5 Z' },
]

function Figure({ shapes, primary, secondary, label }: { shapes: Shape[]; primary: Set<Muscle>; secondary: Set<Muscle>; label: string }) {
  const fill = (m: Muscle | null) => {
    if (m && primary.has(m)) return 'var(--signal)'
    if (m && secondary.has(m)) return 'color-mix(in oklab, var(--signal) 42%, var(--body))'
    return 'var(--body)'
  }
  const render = (s: Shape, i: number, mirror: boolean) => (
    <path key={`${mirror ? 'r' : 'l'}${i}`} d={s.d} fill={fill(s.m)} transform={mirror ? 'translate(120 0) scale(-1 1)' : undefined} />
  )
  return (
    <figure className="flex flex-col items-center gap-1">
      <svg viewBox="22 2 76 226" className="h-56 w-auto" role="img" aria-label={`Vista ${label.toLowerCase()}`}>
        {shapes.map((s, i) => render(s, i, false))}
        {shapes.filter((s) => !s.center).map((s, i) => render(s, i, true))}
      </svg>
      <figcaption className="font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">{label}</figcaption>
    </figure>
  )
}

export const muscleLabel: Record<Muscle, string> = {
  peitoral: 'Peitoral',
  'deltoide-anterior': 'Deltoide anterior',
  'deltoide-lateral': 'Deltoide lateral',
  'deltoide-posterior': 'Deltoide posterior',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  antebraco: 'Antebraço',
  trapezio: 'Trapézio',
  dorsal: 'Dorsais',
  lombar: 'Lombar',
  abdomen: 'Abdômen',
  obliquos: 'Oblíquos',
  'gluteo-maximo': 'Glúteo máximo',
  'gluteo-medio': 'Glúteo médio',
  quadriceps: 'Quadríceps',
  adutores: 'Adutores',
  isquiotibiais: 'Posteriores de coxa',
  panturrilha: 'Panturrilha',
}

export function BodyMap({ primary, secondary = [] }: { primary: Muscle[]; secondary?: Muscle[] }) {
  const p = new Set(primary)
  const s = new Set(secondary)
  return (
    <div className="flex items-end justify-center gap-6">
      <Figure shapes={front} primary={p} secondary={s} label="Frente" />
      <Figure shapes={back} primary={p} secondary={s} label="Costas" />
    </div>
  )
}
