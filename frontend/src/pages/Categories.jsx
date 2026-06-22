import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, Sparkles, Lock } from 'lucide-react'
import api from '../services/api'

const EMOJI_PRESETS = [
  '🥦', '🍎', '🥩', '🐟', '🥛', '🥤', '🫙', '🧂', '❄️', '🍞',
  '🧀', '🍇', '🍌', '🥚', '🍫', '🍪', '🌭', '🍕', '🍷', '🧃',
  '🥕', '🍋', '🍓', '🥨', '🍯', '🌶️', '🥫', '🧈', '🍬', '📦',
]

const COLOR_PRESETS = [
  '#22c55e', '#f97316', '#ef4444', '#3b82f6', '#e2e8f0', '#06b6d4',
  '#8b5cf6', '#f59e0b', '#67e8f9', '#d97706', '#ec4899', '#6b7280',
]

// ─── Profils de conservation : on choisit un type, les durées sont déduites ──
const CONSERVATION_PROFILES = {
  fresh: {
    label: 'Frais', icon: '🥬',
    description: 'Produit périssable (légumes, viande, produits laitiers...)',
    avg_shelf_days: 5, avg_shelf_days_freezer: 60,
  },
  dry: {
    label: 'Sec', icon: '🫙',
    description: 'Longue conservation à température ambiante (pâtes, conserves, épicerie...)',
    avg_shelf_days: 180, avg_shelf_days_freezer: null,
  },
  frozen: {
    label: 'Congelé', icon: '❄️',
    description: 'Déjà surgelé, à conserver au congélateur (à consommer rapidement une fois décongelé)',
    avg_shelf_days: 2, avg_shelf_days_freezer: 90,
  },
}

// Retrouve quel profil correspond le mieux à des valeurs existantes (pour l'édition)
const matchProfile = (days, daysFreezer) => {
  for (const [key, p] of Object.entries(CONSERVATION_PROFILES)) {
    if (p.avg_shelf_days === days && p.avg_shelf_days_freezer === daysFreezer) return key
  }
  return null
}

const emptyForm = {
  name: '', icon: '📦', color: '#6b7280',
  avg_shelf_days: '', avg_shelf_days_opened: '', avg_shelf_days_freezer: '',
}

function Categories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [formData, setFormData] = useState(emptyForm)
  const [error, setError] = useState('')
  const [customEmoji, setCustomEmoji] = useState('')
  const [conservationProfile, setConservationProfile] = useState(null)

  useEffect(() => { fetchCategories() }, [])

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories')
      setCategories(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const openModal = (category = null) => {
    setError('')
    setCustomEmoji('')
    if (category) {
      setEditingCategory(category)
      setFormData({
        name: category.name,
        icon: category.icon || '📦',
        color: category.color || '#6b7280',
        avg_shelf_days: category.avg_shelf_days ?? '',
        avg_shelf_days_opened: category.avg_shelf_days_opened ?? '',
        avg_shelf_days_freezer: category.avg_shelf_days_freezer ?? '',
      })
      setConservationProfile(matchProfile(category.avg_shelf_days, category.avg_shelf_days_freezer))
    } else {
      setEditingCategory(null)
      setFormData(emptyForm)
      setConservationProfile(null)
    }
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingCategory(null)
    setFormData(emptyForm)
    setError('')
  }

  const handleCustomEmojiChange = (value) => {
    setCustomEmoji(value)
    // On prend le premier "caractère" (en tenant compte des emojis multi-octets)
    const firstChar = Array.from(value)[0]
    if (firstChar) setFormData((f) => ({ ...f, icon: firstChar }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!formData.name.trim()) { setError('Le nom est obligatoire'); return }

    const payload = {
      name: formData.name,
      icon: formData.icon,
      color: formData.color,
      avg_shelf_days: formData.avg_shelf_days === '' ? null : Number(formData.avg_shelf_days),
      avg_shelf_days_opened: formData.avg_shelf_days_opened === '' ? null : Number(formData.avg_shelf_days_opened),
      avg_shelf_days_freezer: formData.avg_shelf_days_freezer === '' ? null : Number(formData.avg_shelf_days_freezer),
    }

    try {
      if (editingCategory) {
        await api.put(`/categories/${editingCategory.id}`, payload)
      } else {
        await api.post('/categories', payload)
      }
      fetchCategories()
      closeModal()
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur serveur')
    }
  }

  const handleDelete = async (category) => {
    const msg = category.is_system
      ? `"${category.name}" est une catégorie par défaut. La supprimer retirera la catégorie des produits qui l'utilisent (sans les supprimer). Continuer ?`
      : `Supprimer la catégorie "${category.name}" ?`
    if (!confirm(msg)) return
    try {
      await api.delete(`/categories/${category.id}`)
      fetchCategories()
    } catch (err) {
      console.error(err)
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
    <div className="space-y-6">

      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mes catégories</h1>
          <p className="text-sm text-gray-500 mt-1">
            Des catégories par défaut sont proposées, mais vous pouvez tout personnaliser : emoji, couleur,
            durées de conservation — ou en créer de nouvelles.
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors flex-shrink-0"
        >
          <Plus className="h-5 w-5" />
          Nouvelle catégorie
        </button>
      </div>

      {/* Liste */}
      {categories.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-12 text-center">
          <p className="text-gray-400 text-lg mb-4">Aucune catégorie</p>
          <button onClick={() => openModal()} className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700">
            Créer une catégorie
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="bg-white rounded-xl shadow p-5 border-t-4 flex flex-col gap-3"
              style={{ borderTopColor: cat.color }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
                    style={{ backgroundColor: (cat.color || '#6b7280') + '22' }}
                  >
                    {cat.icon}
                  </span>
                  <div>
                    <p className="font-semibold text-gray-900">{cat.name}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      {cat.is_system ? (
                        <>
                          <Lock className="h-3 w-3" /> Par défaut
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3 w-3" /> Personnalisée
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => openModal(cat)} className="text-gray-400 hover:text-primary-600 transition-colors">
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDelete(cat)} className="text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="text-xs text-gray-500 border-t pt-2 mt-1">
                {(() => {
                  const profileKey = matchProfile(cat.avg_shelf_days, cat.avg_shelf_days_freezer)
                  if (profileKey) {
                    const p = CONSERVATION_PROFILES[profileKey]
                    return <span>{p.icon} Conservation : <strong>{p.label}</strong></span>
                  }
                  if (cat.avg_shelf_days != null || cat.avg_shelf_days_freezer != null) {
                    return <span>Conservation personnalisée</span>
                  }
                  return <span className="text-gray-400">Pas d'estimation de péremption</span>
                })()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              {editingCategory ? 'Modifier la catégorie' : 'Créer une catégorie'}
            </h2>
            {editingCategory?.is_system && (
              <p className="text-xs text-amber-600 mb-4 flex items-center gap-1">
                <Lock className="h-3 w-3" /> Catégorie par défaut — modifiable et supprimable comme les autres
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 mt-3">

              {/* Nom */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                <input
                  type="text"
                  placeholder="Ex: Apéritif"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Emoji */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Emoji</label>
                <div className="grid grid-cols-10 gap-1.5 mb-2">
                  {EMOJI_PRESETS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => { setFormData({ ...formData, icon: emoji }); setCustomEmoji('') }}
                      className={`text-lg p-1.5 rounded-lg border-2 transition-all hover:bg-gray-50 ${
                        formData.icon === emoji && !customEmoji ? 'border-primary-500 bg-primary-50' : 'border-transparent'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Ou collez/tapez n'importe quel autre emoji ici"
                  value={customEmoji}
                  onChange={(e) => handleCustomEmojiChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Couleur */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Couleur</label>
                <div className="flex gap-2 flex-wrap">
                  {COLOR_PRESETS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        formData.color === color ? 'border-gray-800 scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Aperçu */}
              <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-3">
                <span
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                  style={{ backgroundColor: formData.color + '22' }}
                >
                  {formData.icon}
                </span>
                <p className="font-medium text-gray-900">{formData.name || 'Nom de la catégorie'}</p>
              </div>

              {/* Durées de conservation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type de conservation
                </label>
                <p className="text-xs text-gray-400 mb-3">
                  Choisissez comment se conservent les produits de cette catégorie. Quand vous ajouterez
                  un produit, l'app utilisera ce choix (et l'emplacement choisi) pour estimer automatiquement
                  sa date de péremption.
                </p>

                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(CONSERVATION_PROFILES).map(([key, profile]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setConservationProfile(key)
                        setFormData((f) => ({
                          ...f,
                          avg_shelf_days: profile.avg_shelf_days,
                          avg_shelf_days_freezer: profile.avg_shelf_days_freezer ?? '',
                        }))
                      }}
                      className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 text-center transition-all ${
                        conservationProfile === key
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-xl">{profile.icon}</span>
                      <span className="text-sm font-medium text-gray-800">{profile.label}</span>
                    </button>
                  ))}
                </div>

                {conservationProfile && (
                  <p className="text-xs text-gray-500 mt-3 bg-gray-50 rounded-lg p-2.5">
                    {CONSERVATION_PROFILES[conservationProfile].description}
                  </p>
                )}

                {!conservationProfile && (
                  <p className="text-xs text-gray-400 mt-2">
                    Aucun type sélectionné — pas d'estimation automatique pour cette catégorie.
                  </p>
                )}
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  {editingCategory ? 'Modifier' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Categories