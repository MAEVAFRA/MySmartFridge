import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Refrigerator, Snowflake, Archive, AlertTriangle, Plus } from 'lucide-react'
import api from '../services/api'

function Home() {
  const [stats, setStats] = useState({
    total: 0,
    fridge: 0,
    freezer: 0,
    pantry: 0,
    expiringSoon: 0,
  })
  const [expiringProducts, setExpiringProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [productsRes, expiringRes] = await Promise.all([
        api.get('/products'),
        api.get('/products/expiring?days=7'),
      ])

      const products = productsRes.data
      
      setStats({
        total: products.length,
        fridge: products.filter(p => p.location?.name === 'Frigo').length,
        freezer: products.filter(p => p.location?.name === 'Congélateur').length,
        pantry: products.filter(p => p.location?.name === 'Placard').length,
        expiringSoon: expiringRes.data.length,
      })

      setExpiringProducts(expiringRes.data.slice(0, 5))
    } catch (error) {
      console.error('Erreur chargement données:', error)
    } finally {
      setLoading(false)
    }
  }

  const locations = [
    { name: 'Frigo', count: stats.fridge, icon: Refrigerator, color: 'bg-blue-500' },
    { name: 'Congélateur', count: stats.freezer, icon: Snowflake, color: 'bg-cyan-500' },
    { name: 'Placard', count: stats.pantry, icon: Archive, color: 'bg-amber-500' },
  ]

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {locations.map(({ name, count, icon: Icon, color }) => (
          <div key={name} className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center gap-4">
              <div className={`${color} p-3 rounded-lg`}>
                <Icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{name}</p>
                <p className="text-2xl font-bold text-gray-900">{count} produits</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Alerte péremptions */}
      {stats.expiringSoon > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="h-6 w-6 text-orange-500" />
            <h2 className="text-lg font-semibold text-orange-800">
              {stats.expiringSoon} produit(s) bientôt périmé(s)
            </h2>
          </div>
          
          <div className="space-y-2">
            {expiringProducts.map((product) => (
              <div
                key={product.id}
                className="flex justify-between items-center bg-white p-3 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900">{product.name}</p>
                  <p className="text-sm text-gray-500">{product.location?.name}</p>
                </div>
                <div className="text-sm text-orange-600 font-medium">
                  {new Date(product.expiryDate).toLocaleDateString('fr-FR')}
                </div>
              </div>
            ))}
          </div>

          <Link
            to="/expiring"
            className="inline-block mt-4 text-orange-600 hover:text-orange-700 font-medium"
          >
            Voir tous les produits →
          </Link>
        </div>
      )}

      {/* Message si vide */}
      {stats.total === 0 && (
        <div className="bg-white rounded-xl shadow p-12 text-center">
          <Refrigerator className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Votre frigo est vide !
          </h3>
          <p className="text-gray-500 mb-4">
            Commencez par ajouter vos premiers produits
          </p>
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
