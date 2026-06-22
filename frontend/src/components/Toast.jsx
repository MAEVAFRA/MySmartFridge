import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

let seq = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const remove = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const push = useCallback((type, message, duration) => {
    if (!message) return
    const id = ++seq
    const ttl = duration ?? (type === 'error' ? 5000 : 3000)
    setToasts((list) => [...list, { id, type, message }])
    if (ttl > 0) setTimeout(() => remove(id), ttl)
    return id
  }, [remove])

  // Affiche un éventuel toast « flash » déposé juste avant un rechargement de page
  useEffect(() => {
    const raw = sessionStorage.getItem('flash_toast')
    if (raw) {
      sessionStorage.removeItem('flash_toast')
      try {
        const f = JSON.parse(raw)
        push(f.type || 'success', f.message)
      } catch { /* ignore */ }
    }
  }, [push])

  const toast = {
    success: (m, d) => push('success', m, d),
    error: (m, d) => push('error', m, d),
    info: (m, d) => push('info', m, d),
    // Dépose un toast qui s'affichera après le prochain rechargement de page
    flash: (message, type = 'success') => {
      try {
        sessionStorage.setItem('flash_toast', JSON.stringify({ type, message }))
      } catch { /* ignore */ }
    },
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-xs sm:max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

const VARIANTS = {
  success: { Icon: CheckCircle, color: 'text-green-500' },
  error:   { Icon: AlertTriangle, color: 'text-red-500' },
  info:    { Icon: Info, color: 'text-blue-500' },
}

function ToastItem({ toast, onClose }) {
  const v = VARIANTS[toast.type] || VARIANTS.info
  const { Icon } = v
  return (
    <div
      className="toast-in pointer-events-auto flex items-start gap-3 bg-white border border-gray-100 shadow-lg rounded-xl p-4"
      role="status"
    >
      <Icon className={`h-5 w-5 flex-shrink-0 ${v.color}`} />
      <p className="text-sm text-gray-700 flex-1">{toast.message}</p>
      <button onClick={onClose} className="text-gray-300 hover:text-gray-500 flex-shrink-0" aria-label="Fermer">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast doit être utilisé à l\'intérieur de <ToastProvider>')
  return ctx
}
