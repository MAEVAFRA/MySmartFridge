import { useState, useEffect } from 'react'
import { History as HistoryIcon, Plus, Pencil, Trash2 } from 'lucide-react'
import api from '../services/api'

const FILTERS = [
  { key: '', label: 'Tout' },
  { key: 'household', label: 'Foyer' },
  { key: 'household_member', label: 'Membres' },
  { key: 'product', label: 'Produits' },
  { key: 'recipe', label: 'Recettes' },
]

const ACTION_CONFIG = {
  create: { label: 'a ajouté', icon: Plus, color: 'text-green-600 bg-green-50' },
  update: { label: 'a modifié', icon: Pencil, color: 'text-amber-600 bg-amber-50' },
  delete: { label: 'a supprimé', icon: Trash2, color: 'text-red-600 bg-red-50' },
}

const describeEntity = (log) => {
  const values = log.new_values || log.old_values || {}
  return values.name || values.title || values.email || `#${log.entity_id}`
}

function History() {
  const [logs, setLogs] = useState([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchLogs()
  }, [filter])

  const fetchLogs = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/history', { params: filter ? { entity_type: filter } : {} })
      setLogs(res.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (iso) =>
    new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
        <HistoryIcon className="h-6 w-6 text-primary-600" />
        Historique
      </h1>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm">{error}</div>
      )}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              filter === f.key
                ? 'bg-primary-50 border-primary-300 text-primary-700'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
        </div>
      ) : logs.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-12">Aucun évènement enregistré.</p>
      ) : (
        <ul className="bg-white rounded-xl shadow divide-y divide-gray-100">
          {logs.map((log) => {
            const config = ACTION_CONFIG[log.action] || ACTION_CONFIG.update
            const Icon = config.icon
            return (
              <li key={log.id} className="flex items-start gap-3 px-5 py-3">
                <span className={`p-2 rounded-lg flex-shrink-0 ${config.color}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">{log.user?.name || log.user?.email || 'Quelqu\'un'}</span>
                    {' '}{config.label}{' '}
                    <span className="text-gray-500">{log.entity_label.toLowerCase()}</span>
                    {' '}<span className="font-medium">{describeEntity(log)}</span>
                  </p>
                  <p className="text-xs text-gray-400">{formatDate(log.created_at)}</p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default History
