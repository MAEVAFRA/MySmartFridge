import { useState, useEffect } from 'react'
import { Target, Plus, Trash2, Edit2, AlertTriangle, X } from 'lucide-react'
import api from '../services/api'
import { EXPENSE_CATEGORIES, euro } from '../utils/expenses'

const emptyForm = () => ({ category: '', monthly_limit: '', alert_at_percent: 80 })

// Couleur de la barre de progression selon le statut renvoyé par l'API.
const barColor = (status) =>
  status === 'over' ? 'bg-red-500' : status === 'warning' ? 'bg-orange-400' : 'bg-primary-500'

// "2026-06" -> "juin 2026"
const formatMonth = (ym) => {
  if (!ym) return ''
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

function BudgetPanel() {
  const [data, setData] = useState({ items: [], total_spent: 0, total_budget: 0, month: '' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => {
    fetchBudgets()
  }, [])

  const fetchBudgets = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/budgets')
      setData(res.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur de chargement des budgets')
    } finally {
      setLoading(false)
    }
  }

  const openAdd = () => {
    setEditing(null)
    setForm(emptyForm())
    setError('')
    setShowModal(true)
  }

  const openEdit = (item) => {
    setEditing(item)
    setForm({ category: item.category, monthly_limit: item.monthly_limit, alert_at_percent: item.alert_at_percent })
    setError('')
    setShowModal(true)
  }

  const handleSubmit = async (ev) => {
    ev.preventDefault()
    if (!form.category) {
      setError('Choisissez une catégorie')
      return
    }
    const limit = parseFloat(form.monthly_limit)
    if (!Number.isFinite(limit) || limit <= 0) {
      setError('Le budget doit être un nombre positif')
      return
    }
    setSaving(true)
    setError('')
    try {
      await api.post('/budgets', form)
      setShowModal(false)
      fetchBudgets()
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de l\'enregistrement')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await api.delete(`/budgets/${deleteTarget.id}`)
      setDeleteTarget(null)
      fetchBudgets()
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la suppression')
      setDeleteTarget(null)
    }
  }

  const inputClass =
    'mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500'

  // Catégories encore sans budget (en ajout, on ne propose pas les doublons).
  const usedCategories = data.items.map((i) => i.category)
  const availableCategories = EXPENSE_CATEGORIES.filter((c) => !usedCategories.includes(c))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && !showModal && !deleteTarget && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          {error}
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Résumé du mois */}
      <div className="flex justify-between items-center flex-wrap gap-4 bg-white rounded-xl shadow p-4">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Budget de {formatMonth(data.month)}</p>
          <p className="text-2xl font-bold text-gray-900">
            {euro(data.total_spent)}
            <span className="text-base font-normal text-gray-400"> / {euro(data.total_budget)}</span>
          </p>
        </div>
        <button
          onClick={openAdd}
          disabled={availableCategories.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Définir un budget
        </button>
      </div>

      {data.items.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-12 text-center">
          <Target className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-1">Aucun budget défini</h3>
          <p className="text-gray-500 mb-4">
            Fixez une limite mensuelle par catégorie pour être alerté en cas de dépassement.
          </p>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" />
            Définir un budget
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {data.items.map((item) => (
            <div key={item.id} className="bg-white rounded-xl shadow p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{item.category}</span>
                  {item.status === 'over' && (
                    <span className="text-xs font-bold uppercase tracking-wide bg-red-100 text-red-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Dépassé
                    </span>
                  )}
                  {item.status === 'warning' && (
                    <span className="text-xs font-medium bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                      Proche de la limite
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEdit(item)}
                    className="text-gray-400 hover:text-primary-600"
                    title="Modifier"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(item)}
                    className="text-gray-400 hover:text-red-600"
                    title="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-2.5 rounded-full transition-all ${barColor(item.status)}`}
                  style={{ width: `${Math.min(item.percent, 100)}%` }}
                ></div>
              </div>

              <div className="flex justify-between mt-1.5 text-sm">
                <span className={item.status === 'over' ? 'text-red-600 font-medium' : 'text-gray-600'}>
                  {euro(item.spent)} / {euro(item.monthly_limit)}
                </span>
                <span className="text-gray-400">{item.percent}%</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modale définir / modifier un budget */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editing ? `Budget — ${editing.category}` : 'Définir un budget'}
            </h2>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2 mb-4">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!editing && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Catégorie *</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className={inputClass}
                    required
                  >
                    <option value="">— Choisir —</option>
                    {availableCategories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Limite / mois (€) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    autoFocus
                    value={form.monthly_limit}
                    onChange={(e) => setForm({ ...form, monthly_limit: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Alerte à (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={form.alert_at_percent}
                    onChange={(e) => setForm({ ...form, alert_at_percent: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale de confirmation de suppression */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Supprimer ce budget ?</h2>
            <p className="text-sm text-gray-500 mb-5">
              Le budget de la catégorie « {deleteTarget.category} » sera retiré du suivi.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BudgetPanel
