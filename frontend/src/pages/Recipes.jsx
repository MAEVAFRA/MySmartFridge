import { useState, useEffect } from 'react'
import {
  ChefHat, Clock, Users, Heart, Sparkles, History, Search, X, Check,
  Flame, Star, AlertTriangle, Utensils, CheckCircle, Leaf,
} from 'lucide-react'
import api from '../services/api'

const DIET_LABELS = { vegetarian: 'Végétarien', vegan: 'Vegan', gluten_free: 'Sans gluten' }
const DIFFICULTY_LABELS = { facile: 'Facile', moyen: 'Moyen', difficile: 'Difficile' }

const dietBadges = (tags) =>
  (tags || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => DIET_LABELS[t] || t)

const formatTime = (min) => {
  if (!min) return '—'
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} h ${m}` : `${h} h`
}

const formatDate = (d) =>
  new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

const TABS = [
  { key: 'suggestions', label: 'Suggestions', icon: Sparkles },
  { key: 'all', label: 'Toutes les recettes', icon: ChefHat },
  { key: 'favorites', label: 'Favoris', icon: Heart },
  { key: 'history', label: 'Historique', icon: History },
]

function MatchBar({ available, required }) {
  const ratio = required ? available / required : 0
  const color = ratio === 1 ? 'bg-green-500' : ratio >= 0.5 ? 'bg-amber-500' : 'bg-gray-300'
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
        <span>Ingrédients disponibles</span>
        <span className="font-medium">{available}/{required}</span>
      </div>
      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${ratio * 100}%` }} />
      </div>
    </div>
  )
}

function RecipeCard({ recipe, onOpen, onToggleFavorite }) {
  const diets = dietBadges(recipe.diet_tags)
  return (
    <div className="bg-white rounded-xl shadow hover:shadow-md transition-shadow overflow-hidden flex flex-col">
      <div className="relative h-40 bg-gray-100">
        {recipe.image_url ? (
          <img src={recipe.image_url} alt={recipe.title} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-gray-300">
            <ChefHat className="h-12 w-12" />
          </div>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(recipe) }}
          className="absolute top-2 right-2 p-2 bg-white/90 rounded-full hover:bg-white shadow-sm"
          title={recipe.is_favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          <Heart className={`h-4 w-4 ${recipe.is_favorite ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
        </button>
        {recipe.uses_expiring && (
          <span className="absolute top-2 left-2 flex items-center gap-1 bg-orange-500 text-white text-xs font-medium px-2 py-1 rounded-full shadow-sm">
            <Leaf className="h-3 w-3" /> Anti-gaspi
          </span>
        )}
      </div>

      <div className="p-4 flex flex-col gap-3 flex-1">
        <div>
          <h3 className="font-semibold text-gray-900 leading-tight">{recipe.title}</h3>
          {recipe.description && (
            <p className="text-sm text-gray-500 line-clamp-2 mt-1">{recipe.description}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {formatTime(recipe.ready_in_minutes)}</span>
          <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {recipe.servings} pers.</span>
          {recipe.difficulty && (
            <span className="px-2 py-0.5 bg-gray-100 rounded-full">{DIFFICULTY_LABELS[recipe.difficulty] || recipe.difficulty}</span>
          )}
          {diets.map((d) => (
            <span key={d} className="px-2 py-0.5 bg-green-50 text-green-700 rounded-full">{d}</span>
          ))}
        </div>

        <MatchBar available={recipe.available_count} required={recipe.required_count} />

        <button
          onClick={() => onOpen(recipe)}
          className="mt-auto w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm flex items-center justify-center gap-2"
        >
          <Utensils className="h-4 w-4" /> Voir la recette
        </button>
      </div>
    </div>
  )
}

function Recipes() {
  const [activeTab, setActiveTab] = useState('suggestions')
  const [recipes, setRecipes] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [filters, setFilters] = useState({ search: '', diet: '', maxTime: '', sort: 'match' })

  const [selected, setSelected] = useState(null)   // recette ouverte (modale détail)
  const [cookModal, setCookModal] = useState(false)
  const [cookForm, setCookForm] = useState({ servings_made: '', rating: 0, notes: '', rows: [] })
  const [cooking, setCooking] = useState(false)

  const flashSuccess = (msg) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 4000)
  }

  useEffect(() => { fetchData() }, [activeTab])

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      if (activeTab === 'history') {
        const res = await api.get('/recipes/history')
        setHistory(res.data)
      } else if (activeTab === 'suggestions') {
        const res = await api.get('/recipes/suggestions')
        setRecipes(res.data)
      } else {
        const params = {}
        if (activeTab === 'favorites') params.favorites = 'true'
        if (filters.search) params.search = filters.search
        if (filters.diet) params.diet = filters.diet
        if (filters.maxTime) params.maxTime = filters.maxTime
        if (filters.sort) params.sort = filters.sort
        const res = await api.get('/recipes', { params })
        setRecipes(res.data)
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  // Recharge "Toutes" quand les filtres changent (debounce léger sur la recherche)
  useEffect(() => {
    if (activeTab !== 'all') return
    const t = setTimeout(fetchData, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  const patchRecipeFavorite = (id, value) => {
    setRecipes((prev) => prev.map((r) => (r.id === id ? { ...r, is_favorite: value } : r)))
    setSelected((prev) => (prev && prev.id === id ? { ...prev, is_favorite: value } : prev))
  }

  const handleToggleFavorite = async (recipe) => {
    const next = !recipe.is_favorite
    patchRecipeFavorite(recipe.id, next)
    try {
      if (next) await api.post(`/recipes/${recipe.id}/favorite`)
      else await api.delete(`/recipes/${recipe.id}/favorite`)
      if (activeTab === 'favorites' && !next) {
        setRecipes((prev) => prev.filter((r) => r.id !== recipe.id))
      }
    } catch (err) {
      patchRecipeFavorite(recipe.id, !next) // rollback
      setError(err.response?.data?.message || 'Erreur favori')
    }
  }

  // ── Modale détail ──
  const openDetail = (recipe) => {
    setSelected(recipe)
  }

  // ── Modale cuisson ──
  const openCookModal = () => {
    if (!selected) return
    const rows = (selected.ingredients || [])
      .filter((i) => i.available && i.matched_product)
      .map((i) => ({
        product_id: i.matched_product.id,
        product_name: i.matched_product.name,
        available_qty: i.matched_product.quantity,
        ingredient_name: i.name,
        quantity_used: i.amount && i.unit === i.matched_product.unit ? i.amount : i.matched_product.quantity,
        unit: i.matched_product.unit,
        include: true,
      }))
    setCookForm({ servings_made: selected.servings || '', rating: 0, notes: '', rows })
    setCookModal(true)
  }

  const updateRow = (idx, patch) => {
    setCookForm((f) => ({ ...f, rows: f.rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)) }))
  }

  const handleConfirmCook = async () => {
    if (!selected) return
    setCooking(true)
    setError('')
    try {
      const consumed = cookForm.rows
        .filter((r) => r.include && parseFloat(r.quantity_used) > 0)
        .map((r) => ({ product_id: r.product_id, quantity_used: parseFloat(r.quantity_used), unit: r.unit }))

      const res = await api.post(`/recipes/${selected.id}/cook`, {
        servings_made: cookForm.servings_made ? parseInt(cookForm.servings_made, 10) : undefined,
        rating: cookForm.rating || undefined,
        notes: cookForm.notes || undefined,
        consumed,
      })
      setCookModal(false)
      setSelected(null)
      flashSuccess(
        `${res.data.message} — ${res.data.consumed_count} produit(s) décrémenté(s)` +
        (res.data.depleted_count ? `, ${res.data.depleted_count} épuisé(s)` : '')
      )
      fetchData()
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de l\'enregistrement')
    } finally {
      setCooking(false)
    }
  }

  const showCards = activeTab !== 'history'

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ChefHat className="h-6 w-6 text-primary-600" />
        <h1 className="text-2xl font-bold text-gray-900">Recettes</h1>
      </div>

      {/* Onglets */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === key
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm flex items-center gap-2">
          {error}
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600"><X className="h-4 w-4" /></button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 text-green-700 p-4 rounded-lg text-sm flex items-center gap-2">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          {success}
          <button onClick={() => setSuccess('')} className="ml-auto text-green-400 hover:text-green-600"><X className="h-4 w-4" /></button>
        </div>
      )}

      {activeTab === 'suggestions' && (
        <p className="text-sm text-gray-500 flex items-center gap-2">
          <Leaf className="h-4 w-4 text-orange-500" />
          Recettes réalisables avec votre stock — celles qui utilisent vos produits bientôt périmés sont priorisées.
        </p>
      )}

      {/* Filtres (onglet Toutes) */}
      {activeTab === 'all' && (
        <div className="bg-white rounded-xl shadow p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher une recette..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            />
          </div>
          <select
            value={filters.diet}
            onChange={(e) => setFilters({ ...filters, diet: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
          >
            <option value="">Tous régimes</option>
            <option value="vegetarian">Végétarien</option>
            <option value="vegan">Vegan</option>
            <option value="gluten_free">Sans gluten</option>
          </select>
          <select
            value={filters.maxTime}
            onChange={(e) => setFilters({ ...filters, maxTime: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
          >
            <option value="">Toute durée</option>
            <option value="15">≤ 15 min</option>
            <option value="30">≤ 30 min</option>
            <option value="60">≤ 1 h</option>
          </select>
          <select
            value={filters.sort}
            onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
          >
            <option value="match">Tri : pertinence</option>
            <option value="time">Tri : temps</option>
            <option value="title">Tri : titre</option>
          </select>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : showCards ? (
        recipes.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-12 text-center">
            <ChefHat className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {activeTab === 'favorites' ? 'Aucune recette en favori' : 'Aucune recette'}
            </h3>
            <p className="text-gray-500">
              {activeTab === 'favorites'
                ? 'Cliquez sur le cœur d\'une recette pour l\'ajouter ici.'
                : activeTab === 'suggestions'
                ? 'Ajoutez des produits à votre stock pour obtenir des suggestions.'
                : 'Aucune recette ne correspond à vos filtres.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {recipes.map((r) => (
              <RecipeCard key={r.id} recipe={r} onOpen={openDetail} onToggleFavorite={handleToggleFavorite} />
            ))}
          </div>
        )
      ) : (
        // Historique
        history.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-12 text-center">
            <History className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune recette cuisinée</h3>
            <p className="text-gray-500">Marquez une recette comme « cuisinée » pour la retrouver ici.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow divide-y divide-gray-100">
            {history.map((h) => (
              <div key={h.id} className="flex items-center gap-4 p-4">
                <div className="h-14 w-14 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                  {h.Recipe?.image_url ? (
                    <img src={h.Recipe.image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-gray-300"><ChefHat className="h-6 w-6" /></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{h.Recipe?.title || 'Recette supprimée'}</p>
                  <p className="text-sm text-gray-500">
                    {formatDate(h.cooked_at)}
                    {h.User?.name ? ` • par ${h.User.name}` : ''}
                    {h.servings_made ? ` • ${h.servings_made} pers.` : ''}
                    {h.items?.length ? ` • ${h.items.length} produit(s) utilisé(s)` : ''}
                  </p>
                </div>
                {h.rating ? (
                  <div className="flex items-center gap-0.5 text-amber-400">
                    {Array.from({ length: h.rating }).map((_, i) => <Star key={i} className="h-4 w-4 fill-amber-400" />)}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )
      )}

      {/* ── Modale détail ── */}
      {selected && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full my-8 max-h-[90vh] flex flex-col">
            {/* Image + fermeture */}
            <div className="relative h-48 bg-gray-100 rounded-t-xl overflow-hidden flex-shrink-0">
              {selected.image_url ? (
                <img src={selected.image_url} alt={selected.title} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-gray-300"><ChefHat className="h-16 w-16" /></div>
              )}
              <button
                onClick={() => setSelected(null)}
                className="absolute top-3 right-3 p-2 bg-white/90 rounded-full hover:bg-white shadow"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
              <button
                onClick={() => handleToggleFavorite(selected)}
                className="absolute top-3 left-3 p-2 bg-white/90 rounded-full hover:bg-white shadow"
              >
                <Heart className={`h-5 w-5 ${selected.is_favorite ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <h2 className="text-2xl font-bold text-gray-900">{selected.title}</h2>
              {selected.description && <p className="text-gray-500 mt-1">{selected.description}</p>}

              <div className="flex flex-wrap items-center gap-3 mt-4 text-sm text-gray-600">
                <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {formatTime(selected.ready_in_minutes)}</span>
                <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {selected.servings} pers.</span>
                {selected.difficulty && (
                  <span className="px-2 py-0.5 bg-gray-100 rounded-full">{DIFFICULTY_LABELS[selected.difficulty] || selected.difficulty}</span>
                )}
                {dietBadges(selected.diet_tags).map((d) => (
                  <span key={d} className="px-2 py-0.5 bg-green-50 text-green-700 rounded-full">{d}</span>
                ))}
              </div>

              {selected.uses_expiring && selected.expiring_products?.length > 0 && (
                <div className="mt-4 flex items-start gap-2 bg-orange-50 text-orange-700 p-3 rounded-lg text-sm">
                  <Leaf className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Anti-gaspi : utilise vos produits bientôt périmés ({selected.expiring_products.join(', ')}).</span>
                </div>
              )}

              {/* Ingrédients */}
              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">
                Ingrédients <span className="text-sm font-normal text-gray-500">({selected.available_count}/{selected.required_count} en stock)</span>
              </h3>
              <ul className="space-y-1.5">
                {(selected.ingredients || []).map((ing) => (
                  <li key={ing.id} className="flex items-center gap-2 text-sm">
                    {ing.available ? (
                      <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                    ) : (
                      <X className="h-4 w-4 text-orange-400 flex-shrink-0" />
                    )}
                    <span className={ing.available ? 'text-gray-900' : 'text-gray-500'}>
                      {ing.amount ? `${ing.amount} ${ing.unit || ''} ` : ''}{ing.name}
                      {ing.is_optional ? ' (optionnel)' : ''}
                    </span>
                    {ing.available && ing.near_expiry && (
                      <span className="flex items-center gap-1 text-xs text-orange-600 ml-1">
                        <AlertTriangle className="h-3 w-3" /> à consommer vite
                      </span>
                    )}
                  </li>
                ))}
              </ul>

              {selected.missing_count > 0 && (
                <p className="text-sm text-gray-500 mt-2">
                  Manquant : {selected.missing_names.join(', ')}.
                </p>
              )}

              {/* Étapes */}
              {selected.steps?.length > 0 && (
                <>
                  <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Préparation</h3>
                  <ol className="space-y-4">
                    {selected.steps.map((step) => (
                      <li key={step.id} className="flex gap-3">
                        <span className="flex-shrink-0 h-7 w-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-semibold">
                          {step.step_number}
                        </span>
                        <div>
                          {step.title && <p className="font-medium text-gray-900">{step.title}</p>}
                          <p className="text-sm text-gray-600">{step.description}</p>
                          {step.duration_minutes && (
                            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {step.duration_minutes} min
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                </>
              )}
            </div>

            {/* Pied : cuisiner */}
            <div className="p-4 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0">
              <button
                onClick={() => setSelected(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Fermer
              </button>
              <button
                onClick={openCookModal}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
              >
                <Flame className="h-4 w-4" /> J'ai cuisiné cette recette
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modale cuisson ── */}
      {cookModal && selected && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60] overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full my-8 max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex-shrink-0">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Flame className="h-5 w-5 text-primary-600" /> Cuisiner « {selected.title} »
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Ajustez les quantités à retirer du stock. Les produits épuisés seront retirés automatiquement.
              </p>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              {/* Portions + note */}
              <div className="flex gap-4">
                <div className="w-28">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Portions</label>
                  <input
                    type="number"
                    min="1"
                    value={cookForm.servings_made}
                    onChange={(e) => setCookForm({ ...cookForm, servings_made: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                  <div className="flex items-center gap-1 py-1.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setCookForm({ ...cookForm, rating: cookForm.rating === n ? 0 : n })}
                      >
                        <Star className={`h-6 w-6 ${n <= cookForm.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Produits à décrémenter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Produits utilisés</label>
                {cookForm.rows.length === 0 ? (
                  <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
                    Aucun ingrédient de cette recette n'est en stock. La recette sera juste enregistrée dans l'historique.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {cookForm.rows.map((row, idx) => (
                      <li key={row.product_id} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2.5">
                        <input
                          type="checkbox"
                          checked={row.include}
                          onChange={(e) => updateRow(idx, { include: e.target.checked })}
                          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{row.product_name}</p>
                          <p className="text-xs text-gray-400">en stock : {row.available_qty} {row.unit}</p>
                        </div>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          disabled={!row.include}
                          value={row.quantity_used}
                          onChange={(e) => updateRow(idx, { quantity_used: e.target.value })}
                          className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        <span className="text-xs text-gray-500 w-12">{row.unit}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Commentaire (optionnel)</label>
                <textarea
                  rows="2"
                  value={cookForm.notes}
                  onChange={(e) => setCookForm({ ...cookForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  placeholder="Une variante, un retour..."
                />
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
              <button
                onClick={() => setCookModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmCook}
                disabled={cooking}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Check className="h-4 w-4" />
                {cooking ? 'Enregistrement...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Recipes
