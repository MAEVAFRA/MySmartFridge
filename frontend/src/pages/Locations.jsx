import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, MapPin, AlertTriangle, X } from 'lucide-react'
import api from '../services/api'
import { useToast } from '../components/Toast'
import { useConfirm } from '../components/ConfirmDialog'

const TYPE_OPTIONS = [
  { value: 'fridge',  label: 'Réfrigérateur', icon: '🧊' },
  { value: 'freezer', label: 'Congélateur',   icon: '❄️' },
  { value: 'pantry',  label: 'Placard',       icon: '🗄️' },
  { value: 'cellar',  label: 'Cave',          icon: '🍷' },
  { value: 'other',   label: 'Autre',         icon: '📦' },
]

const ICON_PRESETS = ['🧊', '❄️', '🗄️', '🍷', '📦', '🧺', '🥫', '🧂', '🍽️', '🚪']
const COLOR_PRESETS = ['#3b82f6', '#06b6d4', '#8b5cf6', '#ef4444', '#f59e0b', '#10b981', '#ec4899', '#6366f1']

function Locations() {
  const [locations, setLocations] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  const emptyForm = {
    name: '',
    type: 'other',
    icon: '🗄️',
    color: '#6366f1',
    temperature_celsius: '',
  }
  const [formData, setFormData] = useState(emptyForm)

  const toast = useToast()
  const confirm = useConfirm()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [locationsRes, productsRes] = await Promise.all([
        api.get('/locations'),
        api.get('/products'),
      ])
      setLocations(locationsRes.data)
      setProducts(productsRes.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  const countProducts = (locationId) =>
    products.filter((p) => p.location_id === locationId).length

  const openModal = (location = null) => {
    setError('')
    if (location) {
      setEditing(location)
      setFormData({
        name: location.name || '',
        type: location.type || 'other',
        icon: location.icon || '🗄️',
        color: location.color || '#6366f1',
        temperature_celsius: location.temperature_celsius ?? '',
      })
    } else {
      setEditing(null)
      setFormData(emptyForm)
    }
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditing(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    setSaving(true)
    setError('')
    const payload = {
      name: formData.name.trim(),
      type: formData.type,
      icon: formData.icon,
      color: formData.color,
      temperature_celsius:
        formData.temperature_celsius === '' ? null : parseFloat(formData.temperature_celsius),
    }

    try {
      if (editing) {
        await api.put(`/locations/${editing.id}`, payload)
      } else {
        await api.post('/locations', payload)
      }
      await fetchData()
      closeModal()
      toast.success(editing ? 'Emplacement modifié' : 'Emplacement créé')
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de l\'enregistrement')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (location) => {
    const count = countProducts(location.id)
    const message = count > 0
      ? `${count} produit(s) seront détaché(s) de cet emplacement (ils ne seront pas supprimés).`
      : 'Cet emplacement sera définitivement supprimé.'
    const ok = await confirm({
      title: `Supprimer « ${location.name} » ?`,
      message,
      confirmLabel: 'Supprimer',
    })
    if (!ok) return

    setError('')
    try {
      await api.delete(`/locations/${location.id}`)
      await fetchData()
      toast.success('Emplacement supprimé')
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la suppression')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Mes emplacements</h1>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
        >
          <Plus className="h-5 w-5" />
          Ajouter
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          {error}
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {locations.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-12 text-center">
          <MapPin className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun emplacement</h3>
          <p className="text-gray-500 mb-4">Créez votre premier emplacement pour ranger vos produits.</p>
          <button
            onClick={() => openModal()}
            className="inline-flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700"
          >
            <Plus className="h-5 w-5" />
            Ajouter un emplacement
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {locations.map((loc) => (
            <div key={loc.id} className="bg-white rounded-xl shadow p-5 flex flex-col">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="h-12 w-12 rounded-lg flex items-center justify-center text-2xl"
                    style={{ backgroundColor: `${loc.color}22` }}
                  >
                    {loc.icon}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{loc.name}</p>
                    <p className="text-xs text-gray-500">
                      {TYPE_OPTIONS.find((t) => t.value === loc.type)?.label || 'Autre'}
                      {loc.temperature_celsius != null && ` • ${loc.temperature_celsius}°C`}
                    </p>
                  </div>
                </div>
                <span
                  className="h-3 w-3 rounded-full mt-1 flex-shrink-0"
                  style={{ backgroundColor: loc.color }}
                  title={loc.color}
                ></span>
              </div>

              <p className="text-sm text-gray-500 mt-4">
                {countProducts(loc.id)} produit(s)
                {loc.is_default && (
                  <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-primary-50 text-primary-700">
                    Par défaut
                  </span>
                )}
              </p>

              <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                <button
                  onClick={() => openModal(loc)}
                  className="flex-1 flex items-center justify-center gap-1.5 text-sm text-gray-600 hover:text-primary-600 hover:bg-gray-50 py-2 rounded-lg transition-colors"
                >
                  <Edit2 className="h-4 w-4" />
                  Modifier
                </button>
                <button
                  onClick={() => handleDelete(loc)}
                  className="flex-1 flex items-center justify-center gap-1.5 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 py-2 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal ajout / édition */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editing ? 'Modifier l\'emplacement' : 'Ajouter un emplacement'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nom *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Placard épices"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  {TYPE_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Icône</label>
                <div className="flex flex-wrap gap-2">
                  {ICON_PRESETS.map((ic) => (
                    <button
                      type="button"
                      key={ic}
                      onClick={() => setFormData({ ...formData, icon: ic })}
                      className={`h-9 w-9 rounded-lg text-lg flex items-center justify-center border transition-colors ${
                        formData.icon === ic
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Couleur</label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setFormData({ ...formData, color: c })}
                      className={`h-8 w-8 rounded-full border-2 transition-transform ${
                        formData.color === c ? 'border-gray-800 scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                      title={c}
                    ></button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Température (°C) <span className="text-gray-400 font-normal">— optionnel</span>
                </label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="Ex: 4"
                  value={formData.temperature_celsius}
                  onChange={(e) => setFormData({ ...formData, temperature_celsius: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {saving ? 'Enregistrement...' : editing ? 'Modifier' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Locations
