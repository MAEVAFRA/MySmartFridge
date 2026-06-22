import { useState, useEffect } from 'react'
import { ShieldCheck, Trash2, RefreshCw } from 'lucide-react'
import api from '../services/api'
import { euro } from '../utils/expenses'

function AuditLogPanel() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => { fetchLogs() }, [])

  const fetchLogs = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/expenses/audit-log')
      setLogs(res.data)
    } catch (err) {
      setError(err.response?.data?.message || "Erreur de chargement de l'historique")
    } finally {
      setLoading(false)
    }
  }

  const describe = (log) => {
    try {
      if (log.action === 'delete_expense') {
        const old = JSON.parse(log.old_values || '{}')
        return {
          icon: Trash2,
          color: 'text-red-500',
          text: `a supprimé la dépense « ${old.label || 'Dépense'} » (${euro(old.amount)})`,
        }
      }
      if (log.action === 'settle_debt') {
        const data = JSON.parse(log.new_values || '{}')
        return {
          icon: RefreshCw,
          color: 'text-green-600',
          text: `a marqué un remboursement de ${euro(data.amount)} (${data.from || '?'} → ${data.to || '?'})`,
        }
      }
    } catch {
      // ignore parse errors
    }
    return { icon: ShieldCheck, color: 'text-gray-400', text: log.action }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error) return <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm">{error}</div>

  return (
    <div className="bg-white rounded-xl shadow p-5">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4" />
        Historique des actions sensibles
      </h3>
      <p className="text-xs text-gray-400 mb-4">
        Chaque suppression de dépense et chaque règlement de dette est enregistré ici, de façon permanente.
      </p>

      {logs.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">Aucune action enregistrée pour le moment.</p>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => {
            const { icon: Icon, color, text } = describe(log)
            return (
              <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50">
                <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${color}`} />
                <div className="flex-1 text-sm">
                  <p className="text-gray-700">
                    <strong>{log.user?.name || 'Un membre'}</strong> {text}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(log.created_at).toLocaleString('fr-FR')}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default AuditLogPanel