import { useState, useEffect } from 'react'
import { ArrowRight, CheckCircle, Scale, PartyPopper } from 'lucide-react'
import api from '../services/api'
import { euro } from '../utils/expenses'

function Avatar({ user }) {
  const initial = user?.name?.charAt(0)?.toUpperCase() || '?'
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-medium text-sm flex-shrink-0"
      style={{ backgroundColor: '#6366f1', width: '36px', height: '36px' }}
    >
      {initial}
    </div>
  )
}

function BalancesPanel({ onSettled }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [settling, setSettling] = useState(null) // clé "fromId-toId" en cours de règlement

  useEffect(() => { fetchBalances() }, [])

  const fetchBalances = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/expenses/balances')
      setData(res.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur de chargement des balances')
    } finally {
      setLoading(false)
    }
  }

  const handleSettle = async (transaction) => {
    const key = `${transaction.from.id}-${transaction.to.id}`
    setSettling(key)
    try {
      await api.post('/expenses/settle', { user_a: transaction.from.id, user_b: transaction.to.id })
      await fetchBalances()
      onSettled?.()
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors du règlement')
    } finally {
      setSettling(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error) {
    return <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm">{error}</div>
  }

  const balances = data?.balances || []
  const transactions = data?.transactions || []
  const allSettled = transactions.length === 0

  return (
    <div className="space-y-6">

      {/* Balance par personne */}
      <div className="bg-white rounded-xl shadow p-5">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
          <Scale className="h-4 w-4" />
          Balance de chacun
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {balances.map(({ user, amount }) => (
            <div key={user.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
              <Avatar user={user} />
              <div className="flex-1">
                <p className="font-medium text-gray-900 text-sm">{user.name}</p>
                <p className={`text-sm font-semibold ${amount > 0.01 ? 'text-green-600' : amount < -0.01 ? 'text-red-500' : 'text-gray-400'}`}>
                  {amount > 0.01 && `Doit recevoir ${euro(amount)}`}
                  {amount < -0.01 && `Doit ${euro(-amount)}`}
                  {Math.abs(amount) <= 0.01 && 'À jour'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Transactions suggérées */}
      <div className="bg-white rounded-xl shadow p-5">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Pour équilibrer les comptes
        </h3>

        {allSettled ? (
          <div className="text-center py-8">
            <PartyPopper className="h-10 w-10 text-green-400 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">Tout est équilibré !</p>
            <p className="text-sm text-gray-400 mt-1">Personne ne doit rien à personne pour le moment.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((t, i) => {
              const key = `${t.from.id}-${t.to.id}`
              return (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                  <div className="flex items-center gap-2 text-sm flex-wrap">
                    <span className="font-medium text-gray-900">{t.from.name}</span>
                    <span className="text-gray-400">doit</span>
                    <span className="font-semibold text-primary-700">{euro(t.amount)}</span>
                    <span className="text-gray-400">à</span>
                    <ArrowRight className="h-3.5 w-3.5 text-gray-300" />
                    <span className="font-medium text-gray-900">{t.to.name}</span>
                  </div>
                  <button
                    onClick={() => handleSettle(t)}
                    disabled={settling === key}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-lg text-sm hover:bg-primary-100 disabled:opacity-50 flex-shrink-0"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    {settling === key ? 'En cours...' : 'Marquer remboursé'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default BalancesPanel