import { useEffect, useRef, type ReactNode } from 'react'
import { IconX } from './icons'

/** Painel que sobe de baixo (bottom sheet), com foco e Esc. */
export function Sheet({ title, kicker, onClose, children }: { title: string; kicker?: ReactNode; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    ref.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <div className="anim-fade absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={ref}
        tabIndex={-1}
        className="anim-sheet relative flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-[28px] border border-line bg-surface outline-none sm:rounded-[28px]"
      >
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-line sm:hidden" />
        <header className="flex items-start gap-3 px-5 pb-3 pt-3 sm:pt-5">
          <div className="min-w-0 flex-1">
            {kicker && <div className="mb-1 font-mono text-[11px] uppercase tracking-wider text-muted">{kicker}</div>}
            <h2 className="font-display text-[28px] font-bold uppercase leading-[0.95] tracking-tight">{title}</h2>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-muted active:scale-95">
            <IconX />
          </button>
        </header>
        <div className="no-scrollbar overflow-y-auto overscroll-contain px-5 pb-[calc(env(safe-area-inset-bottom)+24px)]">{children}</div>
      </div>
    </div>
  )
}
