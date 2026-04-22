import { useState, useEffect } from 'react'
import { AlertTriangle, CheckCircle } from 'lucide-react'
import api from '../services/api'

function Expiring() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(7)

  useEffect(() => {
    fetchProducts()
  }, [days])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const response = await api.get(`/products/expiring?days=${days}`)
      setProducts(response.data)
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  const getDaysUntilExpiry = (date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return Math.ceil((new Date(date) - today) / (1000 * 60 * 60 * 24))
  }

  const getExpiryColor = (daysLeft) => {
    if (daysLeft <= 1) return 'bg-red-100 text-red-800 border-red-200'
    if (daysLeft <= 3) return 'bg-orange-100 text-orange-800 border-orange-200'
    return 'bg-yellow-100 text-yellow-800 border-yellow-200'
  }

  const getExpiryText = (daysLeft) => {
    if (daysLeft <= 0) return "Expiré !"
    if (daysLeft === 1) return 'Expire demain'
    return `Expire dans ${daysLeft} jours`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Produits bientôt périmés</h1>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Afficher les</span>
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value={3}>3 prochains jours</option>
            <option value={7}>7 prochains jours</option>
            <option value={14}>14 prochains jours</option>
            <option value={30}>30 prochains jours</option>
          </select>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-green-800 mb-2">Tout est bon ! 🎉</h3>
          <p className="text-green-600">
            Aucun produit n'expire dans les {days} prochains jours
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {products.map((product) => {
            const daysLeft = getDaysUntilExpiry(product.expires_at)
            return (
              <div
                key={product.id}
                className={`border rounded-xl p-4 ${getExpiryColor(daysLeft)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold">{product.name}</h3>
                      <p className="text-sm opacity-75">
                        {product.quantity} {product.unit}
                        {product.location && ` • ${product.location.icon} ${product.location.name}`}
                        {product.category && ` • ${product.category.name}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="font-medium">{getExpiryText(daysLeft)}</p>
                    <p className="text-sm opacity-75">
                      {new Date(product.expires_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Expiring
