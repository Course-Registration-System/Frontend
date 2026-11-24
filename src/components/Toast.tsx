import { createContext, useCallback, useContext, useState } from 'react'
import type { ReactNode } from 'react'

type Kind = 'ok' | 'error'
interface Item {
  id: number
  kind: Kind
  text: string
}

const ToastContext = createContext<(text: string, kind?: Kind) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([])
  const push = useCallback((text: string, kind: Kind = 'ok') => {
    const id = Date.now() + Math.random()
    setItems((xs) => [...xs, { id, kind, text }])
    setTimeout(
      () => setItems((xs) => xs.filter((x) => x.id !== id)),
      kind === 'error' ? 5000 : 2500,
    )
  }, [])
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`}>
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react/only-export-components
export const useToast = () => useContext(ToastContext)
