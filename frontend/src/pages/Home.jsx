import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Refrigerator, Snowflake, Archive, AlertTriangle, Plus } from 'lucide-react'
import api from '../services/api'

function Home() {
  const [locations, setLocations] = useState([])
  const [expiringProducts, setExpiringProducts] = useState([])
  const [totalProducts, setTotalProducts] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [productsRes, expiringRes, locationsRes] = await Promise.all([
        api.get('/products'),
        api.get('/products/expiring?days=7'),
        api.get('/locations'),
      ])

      const products = productsRes.data
      const locs = locationsRes.data

      // Compter les produits par emplacement dynamiquement
      const locsWithCount = locs.map((loc) => ({
        ...loc,
        count: products.filter((p) => p.location_id === loc.id).length,
      }))

      setLocations(locsWithCount)
      setTotalProducts(products.length)
      setExpiringProducts(expiringRes.data.slice(0, 5))
    } catch (error) {
      console.error('Erreur chargement données:', error)
    } finally {
      setLoading(false)
    }
  }

  const getLocationIcon = (type) => {
    if (type === 'fridge')  return Refrigerator
    if (type === 'freezer') return Snowflake
    return Archive
  }

  const getLocationColor = (type) => {
    if (type === 'fridge')  return 'bg-blue-500'
    if (type === 'freezer') return 'bg-cyan-500'
    return 'bg-amber-500'
  }

  const getDaysLeft = (date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return Math.ceil((new Date(date) - today) / (1000 * 60 * 60 * 24))
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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <Link
          to="/products"
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Ajouter un produit
        </Link>
      </div>

      {/* Stats par emplacement */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {locations.map((loc) => {
          const Icon = getLocationIcon(loc.type)
          const color = getLocationColor(loc.type)
          return (
            <div key={loc.id} className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center gap-4">
                <div className={`${color} p-3 rounded-lg`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{loc.name}</p>
                  <p className="text-2xl font-bold text-gray-900">{loc.count} produits</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Alerte péremptions */}
      {expiringProducts.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="h-6 w-6 text-orange-500" />
            <h2 className="text-lg font-semibold text-orange-800">
              {expiringProducts.length} produit(s) bientôt périmé(s)
            </h2>
          </div>

          <div className="space-y-2">
            {expiringProducts.map((product) => {
              const daysLeft = getDaysLeft(product.expires_at)
              return (
                <div key={product.id} className="flex justify-between items-center bg-white p-3 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-500">{product.location?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${daysLeft <= 1 ? 'text-red-600' : daysLeft <= 3 ? 'text-orange-600' : 'text-yellow-600'}`}>
                      {daysLeft === 0 ? "Expire aujourd'hui !" : daysLeft === 1 ? 'Demain' : `Dans ${daysLeft} jours`}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(product.expires_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          <Link to="/expiring" className="inline-block mt-4 text-orange-600 hover:text-orange-700 font-medium">
            Voir tous les produits →
          </Link>
        </div>
      )}

      {/* Message si vide */}
      {totalProducts === 0 && (
        <div className="bg-white rounded-xl shadow p-12 text-center">
          <Refrigerator className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Votre frigo est vide !</h3>
          <p className="text-gray-500 mb-4">Commencez par ajouter vos premiers produits</p>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Ajouter un produit
          </Link>
        </div>
      )}
    </div>
  )
}

export default Home
