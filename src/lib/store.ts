import { useCallback, useEffect, useState } from 'react'
import type { PersonId } from '../data/types'

const PREFIX = 'treinohub:v3:'

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw == null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    /* modo privado / armazenamento cheio: segue só em memória */
  }
}

/** useState que persiste no localStorage e sincroniza entre abas. */
export function usePersistent<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => read(key, fallback))

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === PREFIX + key) setValue(read(key, fallback))
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next
        write(key, resolved)
        return resolved
      })
    },
    [key],
  )

  return [value, update] as const
}

export const slot = (exerciseId: string, person: PersonId) => `${exerciseId}:${person}`

export type Loads = Record<string, number>
/** Registro de um exercício no treino do dia: repetições por série (null = sem contagem) e a carga usada. */
export interface ExerciseLog {
  reps: (number | null)[]
  load: number | null
}
export type SetLog = Record<string, ExerciseLog>

export interface HistoryEntry {
  date: string
  dayId: string
  /** slot → { carga, séries feitas, repetições por série } */
  entries: Record<string, { load: number | null; sets: number; reps?: (number | null)[] }>
}

export interface Profile {
  height?: number
  goalWeight?: number
  goalWaist?: number
}

export interface Measure {
  date: string
  weight?: number
  waist?: number
}

export interface BloodPressure {
  date: string
  sys: number
  dia: number
}

export type Viewer = 'ambos' | PersonId

export const todayISO = () => {
  const d = new Date()
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10)
}

const COLL = 'treinohub:c:'
const isData = (k: string) => k.startsWith(COLL) && !k.startsWith(COLL + 'uploaded:') && k !== COLL + 'migrated'

/** Exporta tudo que o app guardou, para backup. */
export function exportAll(): string {
  const data: Record<string, unknown> = {}
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && isData(k)) data[k.slice(COLL.length)] = JSON.parse(localStorage.getItem(k)!)
    }
  } catch {
    /* ignore */
  }
  return JSON.stringify({ app: 'treino-hub', version: 5, exportedAt: new Date().toISOString(), collections: data }, null, 2)
}

/** Restaura um backup (mescla com o que existe). Com login, os itens novos sobem para a nuvem. */
export function importAll(json: string): boolean {
  try {
    const parsed = JSON.parse(json)
    if (parsed?.app !== 'treino-hub' || typeof parsed.collections !== 'object') return false
    for (const [name, map] of Object.entries(parsed.collections as Record<string, object>)) {
      const cur = JSON.parse(localStorage.getItem(COLL + name) ?? '{}')
      localStorage.setItem(COLL + name, JSON.stringify({ ...cur, ...map }))
    }
    // força o reenvio do que não existir na nuvem
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i)
      if (k?.startsWith(COLL + 'uploaded:')) localStorage.removeItem(k)
    }
    return true
  } catch {
    return false
  }
}
