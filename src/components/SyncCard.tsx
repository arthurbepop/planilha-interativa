import { useState } from 'react'
import { useSync } from '../lib/sync'

export function SyncCard() {
  const sync = useSync()
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const run = async (fn: () => Promise<string | null>, ok?: string) => {
    setBusy(true)
    setMsg(null)
    const err = await fn()
    setBusy(false)
    setMsg(err ?? ok ?? null)
  }

  return (
    <section className="rounded-[28px] border border-line bg-surface p-4">
      <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">sincronização</p>
      {sync.status === 'local' && (
        <p className="text-[14px] leading-snug text-ink/85">
          Ainda não configurada: os dados ficam só neste celular. Assim que o projeto na nuvem estiver pronto, aparece aqui o login para os dois celulares compartilharem treinos, cargas e medidas.
        </p>
      )}
      {sync.status === 'loading' && <p className="text-[14px] text-muted">Conectando…</p>}
      {sync.status === 'signed-out' && (
        <>
          <h3 className="font-display text-xl font-bold uppercase leading-tight">Conta do casal</h3>
          <p className="mt-1 text-[13px] leading-snug text-muted">
            Usem a <b>mesma conta</b> nos dois celulares. Na primeira vez, um de vocês toca em "Criar conta"; no outro celular, "Entrar" com o mesmo e-mail e senha. O que já estiver salvo neste aparelho é enviado para a nuvem.
          </p>
          <form
            className="mt-3 space-y-2"
            onSubmit={(e) => {
              e.preventDefault()
              void run(() => sync.signIn(email, pw))
            }}
          >
            <input type="email" autoComplete="username" placeholder="e-mail" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 w-full rounded-xl bg-surface-2 px-3 text-base outline-none" />
            <input type="password" autoComplete="current-password" placeholder="senha (mín. 6)" value={pw} onChange={(e) => setPw(e.target.value)} className="h-11 w-full rounded-xl bg-surface-2 px-3 text-base outline-none" />
            <div className="grid grid-cols-2 gap-2">
              <button type="submit" disabled={busy || !email || pw.length < 6} className="rounded-xl bg-ink py-3 font-display text-sm font-bold uppercase tracking-wider text-bg disabled:opacity-30">
                Entrar
              </button>
              <button
                type="button"
                disabled={busy || !email || pw.length < 6}
                onClick={() => run(() => sync.signUp(email, pw))}
                className="rounded-xl bg-surface-2 py-3 font-display text-sm font-bold uppercase tracking-wider disabled:opacity-30"
              >
                Criar conta
              </button>
            </div>
            <button
              type="button"
              disabled={busy || !email}
              onClick={() => run(() => sync.resetPassword(email), 'Enviamos um e-mail para redefinir a senha.')}
              className="w-full py-1 font-mono text-[11px] uppercase text-muted underline disabled:opacity-40"
            >
              esqueci a senha
            </button>
          </form>
        </>
      )}
      {(sync.status === 'synced' || sync.status === 'offline') && (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-display text-lg font-bold uppercase">
              <span className={`size-2.5 rounded-full ${sync.status === 'synced' ? 'bg-arthur' : 'bg-signal'}`} />
              {sync.status === 'synced' ? 'Sincronizado' : 'Offline — sincroniza ao voltar a internet'}
            </p>
            <p className="truncate text-[13px] text-muted">{sync.email}</p>
          </div>
          <button onClick={() => sync.signOut()} className="shrink-0 rounded-xl bg-surface-2 px-4 py-2.5 font-display text-sm font-bold uppercase tracking-wider">
            Sair
          </button>
        </div>
      )}
      {msg && <p className="mt-2 text-[13px]">{msg}</p>}
    </section>
  )
}
