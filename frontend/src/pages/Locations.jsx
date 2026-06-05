import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2 } from 'lucide-react'
import api from '../services/api'

const LOCATION_TYPES = [
  { value: 'fridge',  label: 'Réfrigérateur', icon: '🧊', color: '#3b82f6' },
  { value: 'freezer', label: 'Congélateur',   icon: '❄️', color: '#06b6d4' },
  { value: 'pantry',  label: 'Placard',        icon: '🗄️', color: '#8b5cf6' },
  { value: 'cellar',  label: 'Cave',           icon: '🍷', color: '#dc2626' },
  { value: 'other',   label: 'Autre',          icon: '📦', color: '#6b7280' },
]

const COLORS = ['#3b82f6','#06b6d4','#8b5cf6','#dc2626','#22c55e','#f59e0b','#ec4899','#6b7280']
const emptyForm = { name: '', type: 'fridge', icon: '🧊', color: '#3b82f6' }

function Locations() {
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingLocation, setEditingLocation] = useState(null)
  const [formData, setFormData] = useState(emptyForm)
  const [error, setError] = useState('')

  useEffect(() => { fetchLocations() }, [])

  const fetchLocations = async () => {
    try {
      const res = await api.get('/locations')
      setLocations(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const openModal = (location = null) => {
    setError('')
    if (location) {
      setEditingLocation(location)
      setFormData({ name: location.name, type: location.type, icon: location.icon, color: location.color })
    } else {
      setEditingLocation(null)
      setFormData(emptyForm)
    }
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingLocation(null)
    setFormData(emptyForm)
    setError('')
  }

  const handleTypeChange = (type) => {
    const preset = LOCATION_TYPES.find(t => t.value === type)
    setFormData({ ...formData, type, icon: preset.icon, color: preset.color })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!formData.name.trim()) { setError('Le nom est obligatoire'); return }
    try {
      if (editingLocation) {
        await api.put(`/locations/${editingLocation.id}`, formData)
      } else {
        await api.post('/locations', formData)
      }
      fetchLocations()
      closeModal()
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur serveur')
    }
  }

  const handleDelete = async (location) => {
    if (!confirm(`Supprimer "${location.name}" ?`)) return
    try {
      await api.delete(`/locations/${location.id}`)
      fetchLocations()
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mes emplacements</h1>
          <p className="text-sm text-gray-500 mt-1">Gérez vos espaces de stockage</p>
        </div>
        <button onClick={() => openModal()} className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700">
          <Plus className="h-5 w-5" /> Ajouter
        </button>
      </div>

      {locations.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-12 text-center">
          <p className="text-gray-400 text-lg mb-4">Aucun emplacement</p>
          <button onClick={() => openModal()} className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700">
            Créer un emplacement
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {locations.map((loc) => (
            <div key={loc.id} className="bg-white rounded-xl shadow p-5 border-t-4" style={{ borderTopColor: loc.color }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-lg flex items-center justify-center text-xl" style={{ backgroundColor: loc.color + '22' }}>
                    {loc.icon}
                  </span>
                  <div>
                    <p className="font-semibold text-gray-900">{loc.name}</p>
                    <p className="text-xs text-gray-400">{LOCATION_TYPES.find(t => t.value === loc.type)?.label}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openModal(loc)} className="text-gray-400 hover:text-primary-600"><Edit2 className="h-4 w-4" /></button>
                  <button onClick={() => handleDelete(loc)} className="text-gray-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingLocation ? "Modifier l'emplacement" : 'Créer un emplacement'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                <input type="text" placeholder="Ex: Placard cuisine 2" value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {LOCATION_TYPES.map((t) => (
                    <button key={t.value} type="button" onClick={() => handleTypeChange(t.value)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 text-xs font-medium transition-all ${
                        formData.type === t.value ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}>
                      <span className="text-lg">{t.icon}</span>{t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Couleur</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map((color) => (
                    <button key={color} type="button" onClick={() => setFormData({ ...formData, color })}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${formData.color === color ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: color }} />
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-3">
                <span className="w-10 h-10 rounded-lg flex items-center justify-center text-xl" style={{ backgroundColor: formData.color + '22' }}>
                  {formData.icon}
                </span>
                <div>
                  <p className="font-medium text-gray-900">{formData.name || "Nom de l'emplacement"}</p>
                  <p className="text-xs text-gray-400">{LOCATION_TYPES.find(t => t.value === formData.type)?.label}</p>
                </div>
              </div>

              {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Annuler</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                  {editingLocation ? 'Modifier' : 'Créer'}
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