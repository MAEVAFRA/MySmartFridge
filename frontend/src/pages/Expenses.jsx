import { useState, useEffect } from 'react'
import { Wallet, Plus, Trash2, Edit2, X, AlertTriangle, Receipt, Users, Tag } from 'lucide-react'
import api from '../services/api'
import { EXPENSE_CATEGORIES, PAYMENT_METHODS, euro } from '../utils/expenses'
import BudgetPanel from '../components/BudgetPanel'
import BalancesPanel from '../components/BalancesPanel'
import { useToast } from '../components/Toast'

const ymd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const todayYmd = () => ymd(new Date())

// Bornes (from, to) du mois décalé de `offset` par rapport au mois courant.
const monthRange = (offset) => {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0)
  return { from: ymd(start), to: ymd(end) }
}

const emptyForm = () => ({
  amount: '', label: '', category: '', store_name: '', payment_method: '', expense_date: todayYmd(),
})

function Expenses() {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [period, setPeriod] = useState('current') // current | previous | all
  const [view, setView] = useState('list') // list | budgets
  const [summary, setSummary] = useState(null)

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [members, setMembers] = useState([])
  const [splitEnabled, setSplitEnabled] = useState(false)
  const [splitShares, setSplitShares] = useState({})
  const toast = useToast()
  const currentUserId = JSON.parse(localStorage.getItem('user') || '{}').id

  useEffect(() => {
    fetchExpenses()
  }, [period])

  useEffect(() => {
    const hid = localStorage.getItem('selectedHouseholdId')
    if (!hid) return
    api.get(`/households/${hid}`)
      .then((res) => setMembers((res.data.members || []).map((m) => ({ user_id: m.id, name: m.name }))))
      .catch(() => {})
  }, [])

  const fetchExpenses = async () => {
    setLoading(true)
    setError('')
    try {
      let query = ''
      if (period === 'current') {
        const { from, to } = monthRange(0)
        query = `?from=${from}&to=${to}`
      } else if (period === 'previous') {
        const { from, to } = monthRange(-1)
        query = `?from=${from}&to=${to}`
      }
      const [listRes, summaryRes] = await Promise.all([
        api.get(`/expenses${query}`),
        api.get(`/expenses/summary${query}`),
      ])
      setExpenses(listRes.data)
      setSummary(summaryRes.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur de chargement des dépenses')
    } finally {
      setLoading(false)
    }
  }

  const total = expenses.reduce((sum, e) => sum + (e.amount || 0), 0)

  // ── Partage de la dépense entre membres ──
  const toggleSplit = (on) => {
    setSplitEnabled(on)
    if (on && members.length) {
      const amt = parseFloat(form.amount)
      const per = Number.isFinite(amt) && amt > 0 ? (amt / members.length).toFixed(2) : ''
      const shares = {}
      members.forEach((m) => { shares[m.user_id] = per })
      setSplitShares(shares)
    } else {
      setSplitShares({})
    }
  }

  const toggleSplitMember = (userId) => {
    setSplitShares((prev) => {
      const next = { ...prev }
      if (next[userId] !== undefined) delete next[userId]
      else next[userId] = ''
      return next
    })
  }

  const setSplitShare = (userId, value) =>
    setSplitShares((prev) => ({ ...prev, [userId]: value }))

  const splitEqually = () => {
    const ids = Object.keys(splitShares)
    const amt = parseFloat(form.amount)
    if (!ids.length || !Number.isFinite(amt) || amt <= 0) return
    const per = (amt / ids.length).toFixed(2)
    const next = {}
    ids.forEach((id) => { next[id] = per })
    setSplitShares(next)
  }

  const splitTotal = Object.values(splitShares).reduce((s, v) => s + (parseFloat(v) || 0), 0)

  const openAdd = () => {
    setEditing(null)
    setForm(emptyForm())
    setSplitEnabled(false)
    setSplitShares({})
    setError('')
    setShowModal(true)
  }

  const openEdit = (e) => {
    setEditing(e)
    setForm({
      amount: e.amount ?? '',
      label: e.label || '',
      category: e.category || '',
      store_name: e.store_name || '',
      payment_method: e.payment_method || '',
      expense_date: e.expense_date ? e.expense_date.slice(0, 10) : todayYmd(),
    })
    if (e.splits && e.splits.length) {
      setSplitEnabled(true)
      const shares = {}
      e.splits.forEach((s) => { shares[s.user_id] = String(s.share_amount) })
      setSplitShares(shares)
    } else {
      setSplitEnabled(false)
      setSplitShares({})
    }
    setError('')
    setShowModal(true)
  }

  const handleSubmit = async (ev) => {
    ev.preventDefault()
    const value = parseFloat(form.amount)
    if (!Number.isFinite(value) || value <= 0) {
      setError('Le montant doit être un nombre positif')
      return
    }
    setSaving(true)
    setError('')
    const payload = { ...form }
    if (splitEnabled) {
      payload.splits = Object.entries(splitShares)
        .filter(([, amt]) => amt !== '' && parseFloat(amt) > 0)
        .map(([user_id, amt]) => ({ user_id: parseInt(user_id, 10), share_amount: parseFloat(amt) }))
    } else if (editing) {
      payload.splits = []
    }
    try {
      if (editing) {
        await api.put(`/expenses/${editing.id}`, payload)
      } else {
        await api.post('/expenses', payload)
      }
      setShowModal(false)
      fetchExpenses()
      toast.success(editing ? 'Dépense modifiée' : 'Dépense ajoutée')
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de l\'enregistrement')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await api.delete(`/expenses/${deleteTarget.id}`)
      setDeleteTarget(null)
      fetchExpenses()
      toast.success('Dépense supprimée')
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la suppression')
      setDeleteTarget(null)
    }
  }

  const inputClass =
    'mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500'

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Wallet className="h-6 w-6 text-primary-600" />
          Dépenses
        </h1>
        {view === 'list' && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" />
            Ajouter une dépense
          </button>
        )}
      </div>

      {/* Onglets Dépenses / Budgets */}
      <div className="flex gap-1 border-b border-gray-200">
        {[
          { key: 'list', label: 'Dépenses' },
          { key: 'budgets', label: 'Budgets' },
          { key: 'balances', label: 'Soldes' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              view === key
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === 'budgets' && <BudgetPanel />}
      {view === 'balances' && <BalancesPanel />}

      {view === 'list' && (
      <>
      {error && !showModal && !deleteTarget && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          {error}
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Filtre de période + total */}
      <div className="flex justify-between items-center flex-wrap gap-4 bg-white rounded-xl shadow p-4">
        <div className="flex items-center gap-2">
          {[
            { key: 'current', label: 'Ce mois-ci' },
            { key: 'previous', label: 'Mois dernier' },
            { key: 'all', label: 'Tout' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                period === key
                  ? 'bg-primary-50 text-primary-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total</p>
          <p className="text-2xl font-bold text-gray-900">{euro(total)}</p>
        </div>
      </div>

      {/* Répartition par membre et par catégorie */}
      {summary && expenses.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-primary-600" /> Par membre
            </h3>
            <div className="space-y-2.5">
              {summary.by_member.map((m) => (
                <BreakdownRow key={m.user_id} label={m.name} value={m.total} total={summary.total} />
              ))}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Tag className="h-4 w-4 text-primary-600" /> Par catégorie
            </h3>
            <div className="space-y-2.5">
              {summary.by_category.map((c) => (
                <BreakdownRow key={c.category} label={c.category} value={c.total} total={summary.total} />
              ))}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : expenses.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-12 text-center">
          <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-1">Aucune dépense</h3>
          <p className="text-gray-500 mb-4">
            Enregistrez vos achats pour suivre le budget du foyer.
          </p>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" />
            Ajouter une dépense
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Libellé</th>
                <th className="px-6 py-3">Catégorie</th>
                <th className="px-6 py-3 hidden md:table-cell">Payé par</th>
                <th className="px-6 py-3 text-right">Montant</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {expenses.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                    {e.expense_date ? new Date(e.expense_date).toLocaleDateString('fr-FR') : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900 flex items-center gap-2">
                      {e.label || 'Dépense'}
                      {e.splits?.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary-50 text-primary-600">
                          <Users className="h-3 w-3" /> partagée
                        </span>
                      )}
                    </p>
                    {(e.store_name || e.payment_method) && (
                      <p className="text-xs text-gray-400">
                        {[e.store_name, e.payment_method].filter(Boolean).join(' • ')}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {e.category ? (
                      <span className="inline-block text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                        {e.category}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 hidden md:table-cell">
                    {e.paidBy?.name || '—'}
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-gray-900 whitespace-nowrap">
                    {euro(e.amount)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(e)}
                        className="text-gray-400 hover:text-primary-600"
                        title="Modifier"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(e)}
                        className="text-gray-400 hover:text-red-600"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modale ajout / édition */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editing ? 'Modifier la dépense' : 'Ajouter une dépense'}
            </h2>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2 mb-4">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Montant (€) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    autoFocus
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date</label>
                  <input
                    type="date"
                    value={form.expense_date}
                    onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Libellé</label>
                <input
                  type="text"
                  placeholder="Ex: Courses Carrefour"
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Catégorie</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className={inputClass}
                  >
                    <option value="">— Aucune —</option>
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Moyen de paiement</label>
                  <select
                    value={form.payment_method}
                    onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                    className={inputClass}
                  >
                    <option value="">— Non précisé —</option>
                    {PAYMENT_METHODS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Magasin / commerçant</label>
                <input
                  type="text"
                  placeholder="Ex: Lidl, Amazon..."
                  value={form.store_name}
                  onChange={(e) => setForm({ ...form, store_name: e.target.value })}
                  className={inputClass}
                />
              </div>

              {/* Partage entre membres */}
              <div className="border-t border-gray-100 pt-3">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={splitEnabled}
                    onChange={(e) => toggleSplit(e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <Users className="h-4 w-4 text-primary-600" /> Partager entre membres
                </label>

                {splitEnabled && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Qui participe et combien ?</span>
                      <button type="button" onClick={splitEqually} className="text-xs text-primary-600 hover:underline">
                        Répartir équitablement
                      </button>
                    </div>
                    {members.map((m) => {
                      const checked = splitShares[m.user_id] !== undefined
                      return (
                        <div key={m.user_id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSplitMember(m.user_id)}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="flex-1 text-sm text-gray-700">
                            {m.name}{m.user_id === currentUserId ? ' (toi)' : ''}
                          </span>
                          {checked && (
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="€"
                              value={splitShares[m.user_id]}
                              onChange={(e) => setSplitShare(m.user_id, e.target.value)}
                              className="w-24 px-2 py-1 border border-gray-300 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                          )}
                        </div>
                      )
                    })}
                    <p className={`text-xs ${Math.abs(splitTotal - (parseFloat(form.amount) || 0)) < 0.01 ? 'text-gray-400' : 'text-amber-600'}`}>
                      Tu as payé — les autres te rembourseront leur part. Total des parts : {euro(splitTotal)} / {euro(parseFloat(form.amount) || 0)}
                    </p>
                  </div>
                )}
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
                  {saving ? 'Enregistrement...' : editing ? 'Enregistrer' : 'Ajouter'}
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
            <h2 className="text-xl font-bold text-gray-900 mb-1">Supprimer cette dépense ?</h2>
            <p className="text-sm text-gray-500 mb-5">
              « {deleteTarget.label || 'Dépense'} » ({euro(deleteTarget.amount)}) sera définitivement retirée du suivi.
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
      </>
      )}
    </div>
  )
}

// Ligne de répartition avec barre de proportion
function BreakdownRow({ label, value, total }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div>
      <div className="flex justify-between items-baseline text-sm mb-1 gap-2">
        <span className="text-gray-700 truncate">{label}</span>
        <span className="text-gray-900 font-medium whitespace-nowrap">{euro(value)} · {pct}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-primary-500 rounded-full" style={{ width: `${pct}%` }}></div>
      </div>
    </div>
  )
}

export default Expenses
