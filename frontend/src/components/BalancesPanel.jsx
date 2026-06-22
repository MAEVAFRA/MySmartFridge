import { useState, useEffect } from 'react'
import { Scale, ArrowRight, Check } from 'lucide-react'
import api from '../services/api'
import { euro } from '../utils/expenses'
import { useToast } from './Toast'
import { useConfirm } from './ConfirmDialog'

// Onglet « Soldes » : qui doit combien à qui, à partir des parts non réglées.
function BalancesPanel() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const toast = useToast()
  const confirm = useConfirm()
  const currentUserId = JSON.parse(localStorage.getItem('user') || '{}').id

  useEffect(() => { fetchBalances() }, [])

  const fetchBalances = async () => {
    setLoading(true)
    try {
      const res = await api.get('/expenses/balances')
      setData(res.data)
    } catch {
      toast.error('Erreur de chargement des soldes')
    } finally {
      setLoading(false)
    }
  }

  const handleSettle = async (debt) => {
    const ok = await confirm({
      title: `${debt.debtor_name} a remboursé ${debt.creditor_name} ?`,
      message: `${euro(debt.amount)} seront marqués comme réglés.`,
      confirmLabel: 'Marquer réglé',
      variant: 'primary',
    })
    if (!ok) return
    try {
      await api.post('/expenses/settle', { user_a: debt.debtor_id, user_b: debt.creditor_id })
      toast.success('Dette réglée')
      fetchBalances()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors du règlement')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const balances = data?.balances || []
  const debts = data?.debts || []
  const me = (id) => (id === currentUserId ? ' (toi)' : '')

  return (
    <div className="space-y-4">
      {/* Soldes par membre */}
      <div className="bg-white rounded-xl shadow p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Scale className="h-4 w-4 text-primary-600" /> Soldes du foyer
        </h3>
        {balances.length === 0 ? (
          <p className="text-sm text-gray-500">Aucun membre.</p>
        ) : (
          <div className="space-y-1.5">
            {balances.map((b) => (
              <div key={b.user_id} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{b.name}{me(b.user_id)}</span>
                <span className={b.net > 0 ? 'text-green-600 font-medium' : b.net < 0 ? 'text-red-600 font-medium' : 'text-gray-400'}>
                  {b.net > 0 ? `on lui doit ${euro(b.net)}` : b.net < 0 ? `doit ${euro(-b.net)}` : 'à jour'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Remboursements (qui doit qui) */}
      <div className="bg-white rounded-xl shadow p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Remboursements</h3>
        {debts.length === 0 ? (
          <div className="text-center py-6">
            <Check className="h-10 w-10 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Tout est réglé — aucune dette en cours.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {debts.map((d, i) => (
              <div key={i} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-gray-50">
                <div className="flex items-center gap-2 text-sm flex-wrap">
                  <span className="font-medium text-gray-900">{d.debtor_name}{me(d.debtor_id)}</span>
                  <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span className="font-semibold text-primary-700">{euro(d.amount)}</span>
                  <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span className="font-medium text-gray-900">{d.creditor_name}{me(d.creditor_id)}</span>
                </div>
                <button
                  onClick={() => handleSettle(d)}
                  className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm whitespace-nowrap"
                >
                  Régler
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default BalancesPanel
