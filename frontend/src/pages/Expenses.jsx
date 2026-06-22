import { useState, useEffect } from 'react'
import { Wallet, Plus, Trash2, Edit2, X, AlertTriangle, Receipt, Users, Scale, ShieldCheck } from 'lucide-react'
import api from '../services/api'
import { EXPENSE_CATEGORIES, PAYMENT_METHODS, euro } from '../utils/expenses'
import BudgetPanel from '../components/BudgetPanel'
import BalancesPanel from '../components/BalancesPanel'
import AuditLogPanel from '../components/AuditLogPanel'

const ymd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const todayYmd = () => ymd(new Date())

const monthRange = (offset) => {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0)
  return { from: ymd(start), to: ymd(end) }
}

const emptyForm = (defaultPaidBy) => ({
  amount: '', label: '', category: '', store_name: '', payment_method: '', expense_date: todayYmd(),
  split_type: 'none', participants: [], custom_shares: {}, paid_by: defaultPaidBy || '',
})

const currentUser = JSON.parse(localStorage.getItem('user') || '{}')

function Expenses() {
  const [expenses, setExpenses] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [period, setPeriod] = useState('current')
  const [view, setView] = useState('list') // list | balances | budgets

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm(currentUser.id))
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => {
    fetchExpenses()
  }, [period])

  useEffect(() => {
    fetchMembers()
  }, [])

  const fetchMembers = async () => {
    try {
      const householdId = localStorage.getItem('selectedHouseholdId')
      if (!householdId) return
      const res = await api.get(`/households/${householdId}`)
      setMembers(res.data.members || [])
    } catch (err) {
      console.error(err)
    }
  }

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
      const res = await api.get(`/expenses${query}`)
      setExpenses(res.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur de chargement des dépenses')
    } finally {
      setLoading(false)
    }
  }

  const total = expenses
    .filter((e) => e.category !== 'Remboursement')
    .reduce((sum, e) => sum + (e.amount || 0), 0)

  const openAdd = () => {
    setEditing(null)
    setForm({ ...emptyForm(currentUser.id), participants: members.map((m) => m.id) })
    setError('')
    setShowModal(true)
  }

  const openEdit = (e) => {
    setEditing(e)
    const hasSplits = e.splits && e.splits.length > 0
    setForm({
      amount: e.amount ?? '',
      label: e.label || '',
      category: e.category || '',
      store_name: e.store_name || '',
      payment_method: e.payment_method || '',
      expense_date: e.expense_date ? e.expense_date.slice(0, 10) : todayYmd(),
      paid_by: e.paid_by || currentUser.id,
      split_type: hasSplits ? 'custom' : 'none',
      participants: hasSplits ? e.splits.map((s) => s.user_id) : members.map((m) => m.id),
      custom_shares: hasSplits
        ? Object.fromEntries(e.splits.map((s) => [s.user_id, s.share_amount]))
        : {},
    })
    setError('')
    setShowModal(true)
  }

  const toggleParticipant = (userId) => {
    setForm((f) => ({
      ...f,
      participants: f.participants.includes(userId)
        ? f.participants.filter((id) => id !== userId)
        : [...f.participants, userId],
    }))
  }

  const handleSubmit = async (ev) => {
    ev.preventDefault()
    const value = parseFloat(form.amount)
    if (!Number.isFinite(value) || value <= 0) {
      setError('Le montant doit être un nombre positif')
      return
    }
    if (form.split_type !== 'none' && form.participants.length === 0) {
      setError('Sélectionnez au moins une personne pour le partage')
      return
    }

    let payload = { ...form }
    if (form.split_type === 'custom') {
      const customShares = {}
      form.participants.forEach((id) => {
        customShares[id] = parseFloat(form.custom_shares[id]) || 0
      })
      const sum = Object.values(customShares).reduce((s, v) => s + v, 0)
      if (Math.abs(sum - value) > 0.02) {
        setError(`La somme des parts (${sum.toFixed(2)} €) doit être égale au montant total (${value.toFixed(2)} €)`)
        return
      }
      payload.custom_shares = customShares
    }

    setSaving(true)
    setError('')
    try {
      if (editing) {
        await api.put(`/expenses/${editing.id}`, payload)
      } else {
        await api.post('/expenses', payload)
      }
      setShowModal(false)
      fetchExpenses()
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de l'enregistrement")
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
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la suppression')
      setDeleteTarget(null)
    }
  }

  const inputClass =
    'mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500'

  // Répartition égale en aperçu live (pour le mode "equal")
  const equalSharePreview = form.participants.length > 0 && form.amount
    ? (parseFloat(form.amount) / form.participants.length).toFixed(2)
    : null

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

      {/* Onglets */}
      <div className="flex gap-1 border-b border-gray-200">
        {[
          { key: 'list', label: 'Dépenses', icon: Receipt },
          { key: 'balances', label: 'Balances', icon: Scale },
          { key: 'budgets', label: 'Budgets', icon: Wallet },
          { key: 'audit', label: 'Historique', icon: ShieldCheck },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              view === key
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {view === 'budgets' && <BudgetPanel />}
      {view === 'balances' && <BalancesPanel onSettled={fetchExpenses} />}
      {view === 'audit' && <AuditLogPanel />}

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

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : expenses.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-12 text-center">
          <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-1">Aucune dépense</h3>
          <p className="text-gray-500 mb-4">Enregistrez vos achats pour suivre le budget du foyer.</p>
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
                <th className="px-6 py-3 hidden md:table-cell">Partage</th>
                <th className="px-6 py-3 text-right">Montant</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {expenses.map((e) => (
                <tr key={e.id} className={e.category === 'Remboursement' ? 'bg-green-50/50 hover:bg-green-50' : 'hover:bg-gray-50'}>
                  <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                    {e.expense_date ? new Date(e.expense_date).toLocaleDateString('fr-FR') : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">{e.label || 'Dépense'}</p>
                    {(e.store_name || e.payment_method) && (
                      <p className="text-xs text-gray-400">
                        {[e.store_name, e.payment_method].filter(Boolean).join(' • ')}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {e.category ? (
                      <span className={`inline-block text-xs px-2 py-1 rounded-full ${
                        e.category === 'Remboursement' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {e.category}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 hidden md:table-cell">
                    {e.paidBy?.name || '—'}
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    {e.splits?.length > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-primary-50 text-primary-700">
                        <Users className="h-3 w-3" />
                        {e.splits.length} pers.
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">Personnelle</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-gray-900 whitespace-nowrap">
                    {euro(e.amount)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(e)} className="text-gray-400 hover:text-primary-600" title="Modifier">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button onClick={() => setDeleteTarget(e)} className="text-gray-400 hover:text-red-600" title="Supprimer">
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
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
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
                    type="number" step="0.01" min="0" required autoFocus
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
                <label className="block text-sm font-medium text-gray-700">Payé par *</label>
                <select
                  required
                  value={form.paid_by}
                  onChange={(e) => setForm({ ...form, paid_by: e.target.value })}
                  className={inputClass}
                >
                  {members.length === 0 && <option value={currentUser.id}>{currentUser.name} (moi)</option>}
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}{m.id === currentUser.id ? ' (moi)' : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  La personne qui a réellement avancé l'argent pour cet achat.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Libellé</label>
                <input
                  type="text" placeholder="Ex: Courses Carrefour"
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
                    {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
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
                    {PAYMENT_METHODS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Magasin / commerçant</label>
                <input
                  type="text" placeholder="Ex: Lidl, Amazon..."
                  value={form.store_name}
                  onChange={(e) => setForm({ ...form, store_name: e.target.value })}
                  className={inputClass}
                />
              </div>

              {/* ─── Partage de la dépense ─────────────────────────── */}
              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Pour qui est cette dépense ?</label>
                <p className="text-xs text-gray-400 mb-2">
                  Définit qui doit rembourser sa part à la personne qui a payé.
                </p>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    { key: 'none', label: 'Personnelle' },
                    { key: 'equal', label: 'Partage égal' },
                    { key: 'custom', label: 'Personnalisé' },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setForm({ ...form, split_type: opt.key })}
                      className={`px-3 py-2 rounded-lg text-sm border-2 transition-all ${
                        form.split_type === opt.key
                          ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {form.split_type !== 'none' && members.length === 0 && (
                  <p className="text-xs text-amber-600">
                    Aucun membre trouvé dans le foyer — impossible de partager cette dépense.
                  </p>
                )}

                {form.split_type === 'equal' && members.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-400">Sélectionnez qui participe :</p>
                    {members.map((m) => (
                      <label key={m.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={form.participants.includes(m.id)}
                          onChange={() => toggleParticipant(m.id)}
                          className="rounded"
                        />
                        <span className="text-gray-700">{m.name}</span>
                        {form.participants.includes(m.id) && equalSharePreview && (
                          <span className="text-xs text-gray-400 ml-auto">{equalSharePreview} €</span>
                        )}
                      </label>
                    ))}
                  </div>
                )}

                {form.split_type === 'custom' && members.length > 0 && (
                  <div className="space-y-2">
                    {members.map((m) => (
                      <div key={m.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={form.participants.includes(m.id)}
                          onChange={() => toggleParticipant(m.id)}
                          className="rounded flex-shrink-0"
                        />
                        <span className="text-sm text-gray-700 flex-1">{m.name}</span>
                        <div className="relative w-24">
                          <input
                            type="number" min="0" step="0.01"
                            disabled={!form.participants.includes(m.id)}
                            value={form.custom_shares[m.id] ?? ''}
                            onChange={(e) => setForm({
                              ...form,
                              custom_shares: { ...form.custom_shares, [m.id]: e.target.value },
                            })}
                            className="w-full pl-2 pr-5 py-1 text-sm border border-gray-300 rounded text-right focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">€</span>
                        </div>
                      </div>
                    ))}
                    <p className="text-xs text-gray-400 pt-1">
                      Somme actuelle :{' '}
                      <strong>
                        {Object.entries(form.custom_shares)
                          .filter(([id]) => form.participants.includes(Number(id)))
                          .reduce((s, [, v]) => s + (parseFloat(v) || 0), 0)
                          .toFixed(2)} €
                      </strong>{' '}
                      / {parseFloat(form.amount || 0).toFixed(2)} €
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
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
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                Annuler
              </button>
              <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
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

export default Expenses