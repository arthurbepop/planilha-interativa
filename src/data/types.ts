export type PersonId = 'arthur' | 'isa'

export type Muscle =
  | 'peitoral'
  | 'deltoide-anterior'
  | 'deltoide-lateral'
  | 'deltoide-posterior'
  | 'biceps'
  | 'triceps'
  | 'antebraco'
  | 'trapezio'
  | 'dorsal'
  | 'lombar'
  | 'abdomen'
  | 'obliquos'
  | 'gluteo-maximo'
  | 'gluteo-medio'
  | 'quadriceps'
  | 'adutores'
  | 'isquiotibiais'
  | 'panturrilha'

/** Prescrição individual. `sets: 0` = essa pessoa não faz o exercício. */
export interface Prescription {
  sets: number
  /** Carga inicial sugerida em kg. `null` = definir na primeira sessão. */
  load: number | null
  /** Sobrescreve a faixa de repetições/duração só para essa pessoa. */
  reps?: string
}

export interface Exercise {
  id: string
  name: string
  /** Faixa de repetições ou duração, ex.: "8–10", "45 s", "30 min". */
  reps: string
  /** Repetições na reserva no fim da série (0 = falha). */
  rir?: string
  /** Descanso entre séries, em segundos. */
  rest: number
  /** Incremento do botão +/− de carga, em kg. */
  step?: number
  /** Tipo de carga. `kg` mostra o campo de carga; `corpo` = peso corporal; `tempo` = cardio. */
  unit?: 'kg' | 'corpo' | 'tempo'
  arthur: Prescription
  isa: Prescription
  primary: Muscle[]
  secondary?: Muscle[]
  /** Como fazer, passo a passo. */
  how: string[]
  /** Erros comuns. */
  avoid?: string[]
  /** Por que esse exercício está aqui (com a evidência, quando houver). */
  why: string
  /** Notas pessoais. */
  notes?: Partial<Record<PersonId, string>>
  /** Termo de busca para vídeo de demonstração. */
  video?: string
  /** Indica uma novidade da versão 3 (aparece com selo "novo"). */
  isNew?: boolean
}

export type DayKind = 'forca' | 'cardio' | 'descanso'

export interface TrainingDay {
  id: string
  code: string
  /** 0 = domingo … 6 = sábado (Date.getDay()). */
  weekday: number
  kind: DayKind
  title: string
  focus: string
  warmup: string[]
  exercises: Exercise[]
  /** Cardio opcional depois do treino de força. */
  finisher?: { title: string; detail: string; arthur: string; isa: string }
}
