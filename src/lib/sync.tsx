/**
 * Sincronização entre celulares via Firebase (Auth + Firestore).
 *
 * - Sem `firebaseConfig`, o app funciona só no aparelho (como antes).
 * - Com config e login, cada coleção fica em households/{uid}/{coleção}/{id}.
 *   O casal usa a mesma conta nos dois celulares.
 * - Cada registro é um documento separado (carga de um exercício, uma pesagem,
 *   uma série do dia...), então edições simultâneas nos dois celulares não se
 *   sobrescrevem.
 * - O Firestore guarda cache offline (IndexedDB): na academia sem sinal, tudo
 *   funciona e sincroniza quando a conexão volta.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { firebaseConfig as prodConfig } from './firebase-config'

// Para testes locais: `VITE_FIREBASE_EMULATOR=1 npm run build` usa os emuladores do Firebase.
const EMULATOR = import.meta.env.VITE_FIREBASE_EMULATOR === '1'
const firebaseConfig = prodConfig ?? (EMULATOR ? { apiKey: 'demo-key', projectId: 'demo-treino', authDomain: 'demo-treino.firebaseapp.com', appId: 'demo' } : null)

type FirebaseMods = {
  auth: import('firebase/auth').Auth
  db: import('firebase/firestore').Firestore
  a: typeof import('firebase/auth')
  f: typeof import('firebase/firestore')
}

let modsPromise: Promise<FirebaseMods> | null = null
function loadFirebase(): Promise<FirebaseMods> {
  if (!firebaseConfig) return Promise.reject(new Error('sem config'))
  modsPromise ??= (async () => {
    const [{ initializeApp }, a, f] = await Promise.all([import('firebase/app'), import('firebase/auth'), import('firebase/firestore')])
    const app = initializeApp(firebaseConfig!)
    const auth = a.initializeAuth(app, { persistence: [a.indexedDBLocalPersistence, a.browserLocalPersistence] })
    const db = f.initializeFirestore(app, {
      localCache: f.persistentLocalCache({ tabManager: f.persistentMultipleTabManager() }),
      ignoreUndefinedProperties: true,
    })
    if (EMULATOR) {
      a.connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
      f.connectFirestoreEmulator(db, '127.0.0.1', 8080)
    }
    return { auth, db, a, f }
  })()
  return modsPromise
}

export type SyncStatus = 'local' | 'loading' | 'signed-out' | 'synced' | 'offline'

interface SyncCtx {
  configured: boolean
  status: SyncStatus
  email: string | null
  uid: string | null
  mods: FirebaseMods | null
  signIn: (email: string, password: string) => Promise<string | null>
  signUp: (email: string, password: string) => Promise<string | null>
  resetPassword: (email: string) => Promise<string | null>
  signOut: () => Promise<void>
}

const Ctx = createContext<SyncCtx | null>(null)

const errorText = (code: string) =>
  ({
    'auth/invalid-credential': 'E-mail ou senha incorretos.',
    'auth/wrong-password': 'E-mail ou senha incorretos.',
    'auth/user-not-found': 'Conta não encontrada. Use "Criar conta" na primeira vez.',
    'auth/email-already-in-use': 'Essa conta já existe — use "Entrar".',
    'auth/weak-password': 'A senha precisa de pelo menos 6 caracteres.',
    'auth/invalid-email': 'E-mail inválido.',
    'auth/network-request-failed': 'Sem conexão. Tente de novo com internet.',
    'auth/too-many-requests': 'Muitas tentativas. Espere alguns minutos.',
    'auth/operation-not-allowed': 'Login por e-mail não está ativado no Firebase.',
  })[code] ?? `Não deu certo (${code}).`

export function SyncProvider({ children }: { children: ReactNode }) {
  const configured = firebaseConfig != null
  const [mods, setMods] = useState<FirebaseMods | null>(null)
  const [user, setUser] = useState<{ uid: string; email: string | null } | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [online, setOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  useEffect(() => {
    if (!configured) return
    let unsub = () => {}
    loadFirebase()
      .then((m) => {
        setMods(m)
        unsub = m.a.onAuthStateChanged(m.auth, (u) => {
          setUser(u ? { uid: u.uid, email: u.email } : null)
          setAuthReady(true)
        })
      })
      .catch(() => setAuthReady(true))
    return () => unsub()
  }, [configured])

  const wrap = useCallback(
    async (fn: (m: FirebaseMods) => Promise<unknown>) => {
      try {
        await fn(await loadFirebase())
        return null
      } catch (e) {
        return errorText((e as { code?: string }).code ?? 'erro')
      }
    },
    [],
  )

  const value = useMemo<SyncCtx>(
    () => ({
      configured,
      status: !configured ? 'local' : !authReady ? 'loading' : !user ? 'signed-out' : online ? 'synced' : 'offline',
      email: user?.email ?? null,
      uid: user?.uid ?? null,
      mods: user ? mods : null,
      signIn: (email, pw) => wrap((m) => m.a.signInWithEmailAndPassword(m.auth, email.trim(), pw)),
      signUp: (email, pw) => wrap((m) => m.a.createUserWithEmailAndPassword(m.auth, email.trim(), pw)),
      resetPassword: (email) => wrap((m) => m.a.sendPasswordResetEmail(m.auth, email.trim())),
      signOut: async () => {
        const m = await loadFirebase()
        await m.a.signOut(m.auth)
      },
    }),
    [configured, authReady, user, online, mods, wrap],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useSync = () => useContext(Ctx)!

// ───────────────────────────────────────── coleções

const LOCAL = 'treinohub:c:'

function readLocal<T>(name: string): Record<string, T> {
  try {
    return JSON.parse(localStorage.getItem(LOCAL + name) ?? '{}')
  } catch {
    return {}
  }
}
function writeLocal(name: string, map: Record<string, unknown>) {
  try {
    localStorage.setItem(LOCAL + name, JSON.stringify(map))
  } catch {
    /* armazenamento cheio/privado */
  }
}

/**
 * Coleção de registros { id → valor }, salva no aparelho e, com login,
 * sincronizada em tempo real com a nuvem.
 */
export function useCollection<T>(name: string) {
  const { mods, uid } = useSync()
  const [map, setMap] = useState<Record<string, T>>(() => readLocal<T>(name))
  const mapRef = useRef(map)
  mapRef.current = map

  useEffect(() => {
    if (!mods || !uid) return
    const { db, f } = mods
    const col = f.collection(db, 'households', uid, name)
    const flag = `${LOCAL}uploaded:${uid}:${name}`
    return f.onSnapshot(col, (snap) => {
      const remote: Record<string, T> = {}
      snap.forEach((d) => {
        remote[d.id] = (d.data() as { v: T }).v
      })
      // 1ª conexão deste aparelho com o servidor: envia o que só existe aqui.
      if (!snap.metadata.fromCache && localStorage.getItem(flag) == null) {
        for (const [id, v] of Object.entries(mapRef.current)) {
          if (!(id in remote)) {
            remote[id] = v
            void f.setDoc(f.doc(col, id), { v })
          }
        }
        try {
          localStorage.setItem(flag, '1')
        } catch {
          /* ignore */
        }
      }
      setMap(remote)
      writeLocal(name, remote)
    })
  }, [mods, uid, name])

  const put = useCallback(
    (id: string, value: T | null) => {
      setMap((m) => {
        const next = { ...m }
        if (value == null) delete next[id]
        else next[id] = value
        writeLocal(name, next)
        return next
      })
      if (mods && uid) {
        const ref = mods.f.doc(mods.db, 'households', uid, name, id)
        void (value == null ? mods.f.deleteDoc(ref) : mods.f.setDoc(ref, { v: value }))
      }
    },
    [mods, uid, name],
  )

  return [map, put] as const
}

/** Converte os dados salvos pela v3/v4 (localStorage) para coleções, uma única vez. */
export function migrateLegacy() {
  try {
    if (localStorage.getItem(LOCAL + 'migrated')) return
    const old = (k: string) => {
      const raw = localStorage.getItem('treinohub:v3:' + k)
      return raw ? JSON.parse(raw) : null
    }
    const put = (name: string, map: Record<string, unknown>) => {
      if (Object.keys(map).length) writeLocal(name, { ...readLocal(name), ...map })
    }
    const loads = old('loads')
    if (loads) put('loads', loads)
    const setlog = old('setlog') as Record<string, Record<string, unknown>> | null
    if (setlog) {
      const m: Record<string, unknown> = {}
      for (const [k, slots] of Object.entries(setlog)) for (const [s, v] of Object.entries(slots)) m[`${k}|${s}`] = v
      put('setlog', m)
    }
    const history = old('history') as { date: string; dayId: string }[] | null
    if (history) put('history', Object.fromEntries(history.map((h) => [`${h.date}|${h.dayId}`, h])))
    const measures = old('measures') as Record<string, { date: string }[]> | null
    if (measures) {
      const m: Record<string, unknown> = {}
      for (const [p, arr] of Object.entries(measures)) for (const x of arr) m[`${p}|${x.date}`] = { ...x, person: p }
      put('measures', m)
    }
    const bp = old('bp') as { date: string }[] | null
    if (bp) put('bp', Object.fromEntries(bp.map((b, i) => [`${b.date}-${i}`, b])))
    const profiles = old('profiles')
    if (profiles) put('profiles', profiles)
    const start = old('startDate')
    if (start) put('meta', { startDate: start })
    localStorage.setItem(LOCAL + 'migrated', '1')
  } catch {
    /* ignore */
  }
}
