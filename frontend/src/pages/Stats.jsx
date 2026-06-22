import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, Download, Wallet, Trash2, Utensils, AlertTriangle, ArrowRight } from 'lucide-react'
import api from '../services/api'
import { useToast } from '../components/Toast'

const CAT_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#64748b']
const euro = (n) => `${(n ?? 0).toFixed(2).replace('.', ',')} €`

// ── Camembert (donut SVG) ──────────────────────────────────────────
function Donut({ data, total }) {
  const r = 70
  const c = 2 * Math.PI * r
  let offset = 0
  if (!total) {
    return <div className="w-44 h-44 flex items-center justify-center text-sm text-gray-400">Aucune donnée</div>
  }
  return (
    <svg viewBox="0 0 180 180" className="w-44 h-44">
      <g transform="rotate(-90 90 90)">
        {data.map((d, i) => {
          const len = (d.value / total) * c
          const seg = (
            <circle
              key={i}
              cx="90" cy="90" r={r} fill="none"
              stroke={d.color} strokeWidth="26"
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
            />
          )
          offset += len
          return seg
        })}
      </g>
      <text x="90" y="86" textAnchor="middle" fill="#111827" fontSize="26" fontWeight="700">{total}</text>
      <text x="90" y="106" textAnchor="middle" fill="#9ca3af" fontSize="12">produits</text>
    </svg>
  )
}

// ── Barres verticales ───────────────────────────────────────────────
function VBars({ items }) {
  const max = Math.max(1, ...items.map((i) => i.value))
  return (
    <div className="flex items-end gap-3 h-44 pt-4">
      {items.map((it, i) => (
        <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
          <span className="text-xs font-semibold text-gray-700 mb-1">{it.value}</span>
          <div
            className="w-full rounded-t-md transition-all"
            style={{ height: `${(it.value / max) * 100}%`, backgroundColor: it.color, minHeight: it.value > 0 ? '6px' : '0' }}
          />
          <span className="text-[11px] text-gray-500 mt-1.5 text-center leading-tight">{it.label}</span>
        </div>
      ))}
    </div>
  )
}

// ── Barres groupées par mois (consommé vs gaspillé) ─────────────────
function MonthBars({ months }) {
  const max = Math.max(1, ...months.flatMap((m) => [m.consumed, m.wasted]))
  return (
    <div className="flex items-end gap-2 h-44 pt-4">
      {months.map((m, i) => (
        <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
          <div className="flex items-end justify-center gap-1 w-full h-full">
            <div className="w-3 rounded-t bg-emerald-500" style={{ height: `${(m.consumed / max) * 100}%`, minHeight: m.consumed > 0 ? '4px' : '0' }} title={`${m.consumed} consommé(s)`} />
            <div className="w-3 rounded-t bg-red-400" style={{ height: `${(m.wasted / max) * 100}%`, minHeight: m.wasted > 0 ? '4px' : '0' }} title={`${m.wasted} gaspillé(s)`} />
          </div>
          <span className="text-[11px] text-gray-500 mt-1.5 capitalize">{m.label}</span>
        </div>
      ))}
    </div>
  )
}

function KpiCard({ icon: Icon, label, value, sub, accent, to, linkLabel }) {
  const inner = (
    <>
      <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
        <Icon className={`h-4 w-4 ${accent || 'text-primary-600'}`} />
        {label}
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
      {to && (
        <div className="mt-2 text-xs font-medium text-primary-600 flex items-center gap-1">
          {linkLabel || 'Voir'} <ArrowRight className="h-3 w-3" />
        </div>
      )}
    </>
  )
  if (to) {
    return (
      <Link
        to={to}
        className="block bg-white rounded-xl shadow p-5 hover:shadow-md hover:ring-1 hover:ring-primary-200 transition-all"
      >
        {inner}
      </Link>
    )
  }
  return <div className="bg-white rounded-xl shadow p-5">{inner}</div>
}

function Stats() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)
  const toast = useToast()

  useEffect(() => {
    api.get('/stats')
      .then((res) => setStats(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Erreur de chargement des statistiques'))
      .finally(() => setLoading(false))
  }, [])

  const handleExport = async () => {
    setExporting(true)
    setError('')
    try {
      const res = await api.get('/stats/export', { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = 'mysmartfridge-inventaire.csv'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success('Export CSV téléchargé')
    } catch (err) {
      setError('Erreur lors de l\'export CSV')
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error && !stats) {
    return <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm">{error}</div>
  }

  const categories = stats.byCategory.map((c, i) => ({ ...c, color: CAT_COLORS[i % CAT_COLORS.length] }))
  const expiryBars = [
    { label: 'Périmé', value: stats.byExpiry.expired, color: '#ef4444' },
    { label: '≤ 3 j', value: stats.byExpiry.soon3, color: '#f97316' },
    { label: '≤ 7 j', value: stats.byExpiry.soon7, color: '#eab308' },
    { label: '> 7 j', value: stats.byExpiry.later, color: '#10b981' },
    { label: 'Sans date', value: stats.byExpiry.none, color: '#94a3b8' },
  ]
  const wasteTracked = stats.consumption.count + stats.waste.logged_thrown + stats.waste.logged_expired

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary-600" />
          Statistiques
        </h1>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50"
        >
          <Download className="h-5 w-5" />
          {exporting ? 'Export...' : 'Exporter en CSV'}
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>}

      {/* Indicateurs clés */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Wallet} label="Valeur du stock" value={euro(stats.stock.value)} sub={`${stats.stock.count} produit(s)`} to="/products" linkLabel="Voir l'inventaire" />
        <KpiCard
          icon={AlertTriangle}
          label="Périmés en stock"
          value={stats.waste.expired_in_stock_count}
          sub={`${euro(stats.waste.expired_in_stock_value)} à risque`}
          accent="text-red-500"
          to="/expiring"
          linkLabel="Voir les péremptions"
        />
        <KpiCard
          icon={Trash2}
          label="Taux de gaspillage"
          value={stats.waste.rate === null ? '—' : `${stats.waste.rate} %`}
          sub={wasteTracked > 0 ? `${stats.waste.logged_thrown + stats.waste.logged_expired} jeté(s) / ${wasteTracked} suivi(s)` : 'aucune sortie enregistrée'}
          accent="text-orange-500"
        />
        <KpiCard icon={Utensils} label="Consommé" value={stats.consumption.count} sub="sorties enregistrées" accent="text-emerald-600" />
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Camembert : répartition par catégorie */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Répartition du stock par catégorie</h2>
          <div className="flex items-center gap-6 flex-wrap">
            <Donut data={categories.map((c) => ({ value: c.count, color: c.color }))} total={stats.stock.count} />
            <ul className="flex-1 min-w-[180px] space-y-1.5">
              {categories.map((c) => (
                <li key={c.category} className="flex items-center gap-2 text-sm">
                  <span className="h-3 w-3 rounded-sm flex-shrink-0" style={{ backgroundColor: c.color }} />
                  <span className="flex-1 text-gray-700 truncate">{c.icon} {c.category}</span>
                  <span className="text-gray-400">{c.count}</span>
                  <span className="text-gray-300 w-16 text-right">{euro(c.value)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Barres : état de péremption */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">État de péremption du stock</h2>
          <p className="text-xs text-gray-400 mb-2">Nombre de produits par échéance</p>
          <VBars items={expiryBars} />
        </div>
      </div>

      {/* Barres : activité par mois */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
          <h2 className="text-lg font-semibold text-gray-900">Activité des 6 derniers mois</h2>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-emerald-500" /> Consommé</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-red-400" /> Gaspillé</span>
          </div>
        </div>
        <MonthBars months={stats.byMonth} />
      </div>
    </div>
  )
}

export default Stats
