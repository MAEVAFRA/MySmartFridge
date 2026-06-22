import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { AlertTriangle } from 'lucide-react'

const ConfirmContext = createContext(null)

// Fournit une fonction confirm({ title, message, confirmLabel, variant }) -> Promise<boolean>
// pour remplacer window.confirm par une vraie modale, sur les actions importantes.
export function ConfirmProvider({ children }) {
  const [opts, setOpts] = useState(null)
  const resolver = useRef(null)

  const confirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      resolver.current = resolve
      setOpts({
        title: options.title || 'Confirmer l\'action',
        message: options.message || '',
        confirmLabel: options.confirmLabel || 'Confirmer',
        cancelLabel: options.cancelLabel || 'Annuler',
        variant: options.variant || 'danger',
      })
    })
  }, [])

  const settle = (result) => {
    if (resolver.current) {
      resolver.current(result)
      resolver.current = null
    }
    setOpts(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {opts && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[110]"
          onClick={() => settle(false)}
        >
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-full flex-shrink-0 ${opts.variant === 'danger' ? 'bg-red-100' : 'bg-primary-100'}`}>
                <AlertTriangle className={`h-5 w-5 ${opts.variant === 'danger' ? 'text-red-600' : 'text-primary-600'}`} />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-gray-900">{opts.title}</h2>
                {opts.message && <p className="text-sm text-gray-500 mt-1">{opts.message}</p>}
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => settle(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                {opts.cancelLabel}
              </button>
              <button
                onClick={() => settle(true)}
                className={`px-4 py-2 text-white rounded-lg ${opts.variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-primary-600 hover:bg-primary-700'}`}
              >
                {opts.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm doit être utilisé à l\'intérieur de <ConfirmProvider>')
  return ctx
}
