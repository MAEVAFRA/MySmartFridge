import { useState, useEffect, useRef } from 'react'
import {
  Camera, Upload, FileText, Trash2, ChevronDown, ChevronUp,
  CheckCircle, Clock, AlertTriangle, Info, ShoppingCart, Smartphone, XCircle, RotateCcw, Edit2
} from 'lucide-react'
import api from '../services/api'

// ─── Seuils de qualité OCR ──────────────────────────────────────────
const getQuality = (confidence) => {
  if (confidence == null) return { label: 'Inconnue', color: 'gray', icon: Info }
  if (confidence >= 80) return { label: 'Bonne', color: 'green', icon: CheckCircle }
  if (confidence >= 55) return { label: 'Moyenne', color: 'orange', icon: AlertTriangle }
  return { label: 'Faible', color: 'red', icon: XCircle }
}

// ─── Devinette d'emplacement par mot-clé (pour pré-remplir intelligemment) ──
const LOCATION_TYPE_HINTS = {
  freezer: ['surgelé', 'surgelee', 'glace', 'glaces', 'congel'],
  fridge: ['yaourt', 'lait', 'beurre', 'fromage', 'crème', 'creme', 'viande', 'poulet',
    'poisson', 'jambon', 'charcuterie', 'œuf', 'oeuf', 'salade', 'légume', 'legume',
    'fruit', 'mozzarella', 'jus', 'lardon', 'saucisson', 'thon', 'olive'],
  pantry: ['pâtes', 'pates', 'riz', 'conserve', 'café', 'cafe', 'chocolat', 'biscuit',
    'farine', 'sucre', 'sel', 'huile', 'épice', 'epice', 'savon', 'eau', 'pain',
    'céréale', 'cereale', 'confiture', 'thé', 'the', 'pack'],
}

const guessLocationType = (name) => {
  const lower = name.toLowerCase()
  for (const [type, keywords] of Object.entries(LOCATION_TYPE_HINTS)) {
    if (keywords.some((k) => lower.includes(k))) return type
  }
  return null
}

const guessDefaultLocationId = (name, locations) => {
  const type = guessLocationType(name)
  if (type) {
    const match = locations.find((l) => l.type === type)
    if (match) return match.id
  }
  return locations[0]?.id || ''
}

// ─── Devinette de catégorie par mot-clé (pour estimer la péremption) ──
const CATEGORY_HINTS = {
  'Légumes': ['légume', 'legume', 'salade', 'tomate', 'carotte', 'poireau', 'pomme de terre', 'oignon', 'maïs', 'mais'],
  'Fruits': ['fruit', 'pomme', 'banane', 'orange', 'fraise', 'raisin'],
  'Viande': ['viande', 'poulet', 'bœuf', 'boeuf', 'porc', 'jambon', 'saucisson', 'lardon', 'steak', 'chaussette'],
  'Poisson': ['poisson', 'thon', 'saumon', 'crevette', 'surimi'],
  'Produits laitiers': ['lait', 'yaourt', 'fromage', 'beurre', 'crème', 'creme', 'mozzarella', 'œuf', 'oeuf'],
  'Boissons': ['eau', 'jus', 'soda', 'cola', 'limonade', 'rosé', 'rose', 'vin', 'pastis', 'bière', 'biere', 'café espresso'],
  'Épicerie': ['pâtes', 'pates', 'riz', 'conserve', 'farine', 'sucre', 'café', 'cafe', 'chocolat', 'confiture', 'biscuit', 'huile', 'spaghetti'],
  'Condiments': ['sel', 'poivre', 'épice', 'epice', 'sauce', 'moutarde', 'vinaigre', 'savon', 'démaquillant', 'demaquillant'],
  'Surgelés': ['surgelé', 'surgelee', 'glace', 'glaces'],
  'Boulangerie': ['pain', 'baguette', 'croissant', 'brioche'],
}

const guessCategoryId = (name, categories) => {
  const lower = name.toLowerCase()
  for (const [catName, keywords] of Object.entries(CATEGORY_HINTS)) {
    if (keywords.some((k) => lower.includes(k))) {
      const match = categories.find((c) => c.name === catName)
      if (match) return match.id
    }
  }
  return null
}

const toYmd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const estimateExpiry = (categoryId, locationId, categories, locations) => {
  const cat = categories.find((c) => c.id === categoryId)
  if (!cat) return ''
  const loc = locations.find((l) => l.id === locationId || l.id === Number(locationId))
  const days = (loc?.type === 'freezer' && cat.avg_shelf_days_freezer)
    ? cat.avg_shelf_days_freezer
    : cat.avg_shelf_days
  if (days == null) return ''
  return toYmd(new Date(Date.now() + days * 86400000))
}

const QUALITY_STYLES = {
  green:  { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700',  bar: 'bg-green-500' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', bar: 'bg-orange-500' },
  red:    { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-700',    bar: 'bg-red-500' },
  gray:   { bg: 'bg-gray-50',   border: 'border-gray-200',   text: 'text-gray-600',   bar: 'bg-gray-400' },
}

function Scan() {
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(null)
  const fileInputRef = useRef()
  const cameraInputRef = useRef()

  // Édition / validation des articles
  const [locations, setLocations] = useState([])
  const [categories, setCategories] = useState([])
  const [editableItems, setEditableItems] = useState([])
  const [confirming, setConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState('')
  const [confirmSuccess, setConfirmSuccess] = useState(false)

  useEffect(() => {
    Promise.all([api.get('/locations'), api.get('/categories')])
      .then(([locRes, catRes]) => {
        setLocations(locRes.data)
        setCategories(catRes.data)
      })
      .catch((err) => console.error(err))
  }, [])

  const handleFile = async (file) => {
    if (!file) return
    setError('')
    setResult(null)
    setConfirmSuccess(false)
    setConfirmError('')

    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target.result)
    reader.readAsDataURL(file)

    setScanning(true)
    try {
      const form = new FormData()
      form.append('image', file)
      const res = await api.post('/receipts/scan', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setResult(res.data)
      setEditableItems(
        (res.data.scan.items || []).map((item) => {
          const location_id = guessDefaultLocationId(item.name, locations)
          const category_id = guessCategoryId(item.name, categories)
          return {
            ...item,
            selected: true,
            quantity: item.quantity || 1,
            unit: item.unit || 'unité',
            location_id,
            category_id,
            expires_at: estimateExpiry(category_id, location_id, categories, locations),
          }
        })
      )
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors du scan')
    } finally {
      setScanning(false)
    }
  }

  const updateItem = (index, changes) => {
    setEditableItems((items) => items.map((it, i) => (i === index ? { ...it, ...changes } : it)))
  }

  const removeItem = (index) => {
    setEditableItems((items) => items.filter((_, i) => i !== index))
  }

  const handleConfirmAdd = async () => {
    const selected = editableItems.filter((i) => i.selected)
    if (selected.length === 0) return
    const missingLocation = selected.find((i) => !i.location_id)
    if (missingLocation) {
      setConfirmError(`Choisissez un emplacement pour "${missingLocation.name}"`)
      return
    }

    setConfirming(true)
    setConfirmError('')
    try {
      await Promise.all(selected.map((item) =>
        api.post('/products', {
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          location_id: item.location_id,
          category_id: item.category_id || null,
          expires_at: item.expires_at || null,
          price: item.unit_price,
        })
      ))
      setConfirmSuccess(true)
    } catch (err) {
      setConfirmError(err.response?.data?.message || "Erreur lors de l'ajout au stock")
    } finally {
      setConfirming(false)
    }
  }

  const applyLocationToAll = (locationId) => {
    setEditableItems((items) => items.map((it) => ({ ...it, location_id: locationId })))
  }

  const loadHistory = async () => {
    if (showHistory) { setShowHistory(false); return }
    setLoadingHistory(true)
    try {
      const res = await api.get('/receipts')
      setHistory(res.data)
      setShowHistory(true)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce ticket ?')) return
    try {
      await api.delete(`/receipts/${id}`)
      setHistory(history.filter(h => h.id !== id))
    } catch (err) {
      console.error(err)
    }
  }

  const reset = () => {
    setResult(null)
    setPreview(null)
    setError('')
    setEditableItems([])
    setConfirmSuccess(false)
    setConfirmError('')
  }

  const quality = result ? getQuality(result.scan.ocr_confidence) : null
  const qs = quality ? QUALITY_STYLES[quality.color] : null
  const itemCount = editableItems.length
  const looksLikeNonGrocery = result && itemCount === 0

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Scanner un ticket</h1>
        <p className="text-sm text-gray-500 mt-1">
          Importez une photo de votre ticket de caisse pour extraire les produits automatiquement
        </p>
      </div>

      {/* Bandeau d'information — avant le premier scan */}
      {!result && !scanning && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
          <ShoppingCart className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Pour de meilleurs résultats</p>
            <ul className="space-y-1 text-blue-700 list-disc list-inside">
              <li>Utilisez un <strong>ticket de supermarché</strong> (Carrefour, Leclerc, Lidl...) — les tickets de restaurant ou de service sont moins bien reconnus</li>
              <li>Photographiez le ticket à plat, avec un bon éclairage et sans reflet</li>
              <li>Évitez les tickets froissés, pliés ou décolorés</li>
            </ul>
          </div>
        </div>
      )}

      {/* Zone d'import */}
      {!result && (
        <div className="bg-white rounded-xl shadow p-6 space-y-4">
          {preview && (
            <div className="relative">
              <img src={preview} alt="Aperçu ticket" className="w-full max-h-64 object-contain rounded-lg border" />
              {scanning && (
                <div className="absolute inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center rounded-lg">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mb-3"></div>
                  <p className="text-sm text-gray-600 font-medium">Analyse en cours...</p>
                  <p className="text-xs text-gray-400 mt-1">Cela peut prendre quelques secondes</p>
                </div>
              )}
            </div>
          )}

          {!scanning && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => fileInputRef.current.click()}
                className="flex items-center justify-center gap-3 p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition-colors group"
              >
                <Upload className="h-6 w-6 text-gray-400 group-hover:text-primary-600" />
                <div className="text-left">
                  <p className="font-medium text-gray-700 group-hover:text-primary-700">Depuis la galerie</p>
                  <p className="text-xs text-gray-400">JPG, PNG, WEBP — 10MB max</p>
                </div>
              </button>

              <button
                onClick={() => cameraInputRef.current.click()}
                className="flex items-center justify-center gap-3 p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition-colors group"
              >
                <Camera className="h-6 w-6 text-gray-400 group-hover:text-primary-600" />
                <div className="text-left">
                  <p className="font-medium text-gray-700 group-hover:text-primary-700">Prendre une photo</p>
                  <p className="text-xs text-gray-400">Ouvre la caméra</p>
                </div>
              </button>
            </div>
          )}

          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />

          {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>}
        </div>
      )}

      {/* Résultats OCR */}
      {result && (
        <div className="space-y-4">

          {/* Carte qualité de lecture — mise en avant */}
          <div className={`rounded-xl border p-5 ${qs.bg} ${qs.border}`}>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <quality.icon className={`h-6 w-6 ${qs.text} flex-shrink-0`} />
                <div>
                  <p className={`font-semibold ${qs.text}`}>Qualité de lecture : {quality.label}</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Taux de fiabilité estimé du texte extrait par l'OCR
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-2xl font-bold ${qs.text}`}>
                  {result.scan.ocr_confidence != null ? `${Math.round(result.scan.ocr_confidence)}%` : '—'}
                </p>
                <p className="text-xs text-gray-400">de confiance</p>
              </div>
            </div>

            {/* Barre de progression */}
            <div className="mt-3 h-2 bg-white rounded-full overflow-hidden border border-gray-100">
              <div
                className={`h-full rounded-full transition-all ${qs.bar}`}
                style={{ width: `${Math.min(100, result.scan.ocr_confidence || 0)}%` }}
              />
            </div>

            <p className="text-xs text-gray-500 mt-3">
              La reconnaissance optique de caractères (OCR) n'est jamais parfaite à 100%. Vérifiez toujours
              les informations ci-dessous avant de les ajouter à votre stock.
            </p>
          </div>

          {/* Alerte si ticket probablement non-supermarché */}
          {looksLikeNonGrocery && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800 flex-1">
                <p className="font-medium mb-1">Aucun produit détecté</p>
                <p className="text-amber-700 mb-3">
                  Ce ticket ne semble pas être un ticket de supermarché classique (peut-être un restaurant,
                  un service, ou une facture). L'extraction automatique fonctionne mieux avec des tickets
                  de courses alimentaires comportant une ligne par article.
                </p>
                <button
                  onClick={reset}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-sm text-amber-800 hover:bg-amber-100 transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Essayer avec un autre ticket
                </button>
              </div>
            </div>
          )}

          {/* Infos ticket */}
          <div className="bg-white rounded-xl shadow p-5">
            <div className="flex items-start justify-between mb-4 gap-3">
              <p className="font-semibold text-gray-900">Informations détectées</p>
              <button
                onClick={reset}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors flex-shrink-0"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Nouveau scan
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">Magasin</p>
                <p className="font-medium text-gray-900 text-sm truncate">{result.scan.store_name || '—'}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">Total</p>
                <p className="font-medium text-gray-900 text-sm">
                  {result.scan.total_amount ? `${result.scan.total_amount} €` : '—'}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">Date</p>
                <p className="font-medium text-gray-900 text-sm">
                  {result.scan.scanned_at
                    ? new Date(result.scan.scanned_at).toLocaleDateString('fr-FR')
                    : '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Confirmation déjà effectuée */}
          {confirmSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div className="text-sm text-green-800">
                <p className="font-medium">Produits ajoutés à votre stock !</p>
                <p className="text-green-700">Retrouvez-les dans la page Produits.</p>
              </div>
              <button
                onClick={reset}
                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-white border border-green-300 rounded-lg text-sm text-green-800 hover:bg-green-100 transition-colors flex-shrink-0"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Scanner un autre ticket
              </button>
            </div>
          )}

          {/* Édition + validation des articles */}
          {!confirmSuccess && (
            <div className="bg-white rounded-xl shadow p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-900">
                  {editableItems.length} article{editableItems.length !== 1 ? 's' : ''} — sélectionnez et corrigez avant ajout
                </h2>
              </div>

              {editableItems.length === 0 ? (
                <p className="text-gray-400 text-sm">Aucun article n'a pu être extrait de cette image.</p>
              ) : (
                <>
                  {/* Raccourci : assigner le même emplacement à tous */}
                  {locations.length > 1 && (
                    <div className="flex items-center gap-2 mb-3 text-sm">
                      <span className="text-gray-400">Tout assigner à</span>
                      <select
                        onChange={(e) => e.target.value && applyLocationToAll(e.target.value)}
                        defaultValue=""
                        className="border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="" disabled>Choisir...</option>
                        {locations.map((loc) => (
                          <option key={loc.id} value={loc.id}>{loc.icon} {loc.name}</option>
                        ))}
                      </select>
                      <span className="text-xs text-gray-400">
                        (les emplacements sont pré-remplis automatiquement selon le produit)
                      </span>
                    </div>
                  )}

                  <div className="space-y-2 mb-4">
                    {editableItems.map((item, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-lg border transition-colors ${
                          item.selected ? 'border-primary-200 bg-primary-50' : 'border-gray-200 bg-gray-50 opacity-50'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={(e) => updateItem(i, { selected: e.target.checked })}
                            className="rounded flex-shrink-0"
                          />
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => updateItem(i, { name: e.target.value })}
                            className="flex-1 min-w-0 text-sm font-medium bg-white border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                          <button
                            onClick={() => removeItem(i)}
                            className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="flex items-center gap-2 pl-6 flex-wrap">
                          <input
                            type="number"
                            min="0.1"
                            step="0.1"
                            value={item.quantity}
                            onChange={(e) => updateItem(i, { quantity: parseFloat(e.target.value) || 1 })}
                            className="w-16 text-sm text-center bg-white border border-gray-200 rounded px-1 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                          <select
                            value={item.unit}
                            onChange={(e) => updateItem(i, { unit: e.target.value })}
                            className="text-xs bg-white border border-gray-200 rounded px-1 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
                          >
                            {['unité', 'kg', 'g', 'L', 'mL'].map((u) => <option key={u}>{u}</option>)}
                          </select>

                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unit_price ?? ''}
                              onChange={(e) => updateItem(i, { unit_price: e.target.value === '' ? null : parseFloat(e.target.value) })}
                              placeholder="—"
                              className="w-20 text-sm text-right bg-white border border-gray-200 rounded pl-2 pr-5 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">€</span>
                          </div>

                          <select
                            value={item.location_id || ''}
                            onChange={(e) => {
                              const newLocationId = e.target.value
                              updateItem(i, {
                                location_id: newLocationId,
                                expires_at: item.expires_at || estimateExpiry(item.category_id, newLocationId, categories, locations),
                              })
                            }}
                            className={`flex-1 min-w-[140px] text-xs border rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                              item.location_id ? 'bg-white border-gray-200' : 'bg-amber-50 border-amber-300'
                            }`}
                          >
                            <option value="" disabled>Choisir un emplacement...</option>
                            {locations.map((loc) => (
                              <option key={loc.id} value={loc.id}>{loc.icon} {loc.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center gap-2 pl-6 mt-2">
                          <span className="text-xs text-gray-400 whitespace-nowrap">📅 Péremption</span>
                          <input
                            type="date"
                            value={item.expires_at || ''}
                            onChange={(e) => updateItem(i, { expires_at: e.target.value })}
                            className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                          {item.expires_at && (
                            <span className="text-xs text-gray-400">
                              (estimée — modifiable)
                            </span>
                          )}
                          {!item.expires_at && (
                            <span className="text-xs text-amber-500">aucune estimation disponible pour ce produit</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4 flex justify-end">
                    <button
                      onClick={handleConfirmAdd}
                      disabled={confirming || editableItems.filter((i) => i.selected).length === 0}
                      className="flex items-center justify-center gap-2 px-5 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm font-medium whitespace-nowrap"
                    >
                      <CheckCircle className="h-4 w-4" />
                      {confirming
                        ? 'Ajout en cours...'
                        : `Ajouter ${editableItems.filter((i) => i.selected).length} produit(s) au stock`}
                    </button>
                  </div>

                  {confirmError && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mt-3">{confirmError}</div>
                  )}
                </>
              )}

              {quality.label !== 'Bonne' && editableItems.length > 0 && (
                <p className="text-xs text-amber-600 mt-3 flex items-start gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                  Vérifiez attentivement les noms et prix ci-dessus avant validation — la fiabilité de lecture
                  est {quality.label.toLowerCase()}.
                </p>
              )}
            </div>
          )}

          {/* Texte brut OCR (debug) */}
          <details className="bg-gray-50 rounded-xl p-4">
            <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
              Voir le texte brut extrait
            </summary>
            <pre className="mt-3 text-xs text-gray-500 whitespace-pre-wrap font-mono">
              {result.rawText}
            </pre>
          </details>

          {/* Suggestion alternative */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex gap-3">
            <Smartphone className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-gray-600">
              <p className="font-medium text-gray-700 mb-1">Pour une précision optimale</p>
              <p>
                Si votre enseigne propose un reçu numérique ou un export de ticket depuis son application
                mobile, privilégiez cette option : les données structurées exportées numériquement sont
                toujours plus fiables qu'une reconnaissance d'image.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Historique */}
      <div className="bg-white rounded-xl shadow">
        <button
          onClick={loadHistory}
          className="w-full flex items-center justify-between p-5 text-left"
        >
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-gray-400" />
            <span className="font-medium text-gray-900">Historique des tickets</span>
          </div>
          {loadingHistory ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
          ) : showHistory ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </button>

        {showHistory && (
          <div className="border-t divide-y">
            {history.length === 0 ? (
              <p className="p-5 text-gray-400 text-sm">Aucun ticket scanné pour l'instant</p>
            ) : (
              history.map((scan) => {
                const hq = getQuality(scan.ocr_confidence)
                return (
                  <div key={scan.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{scan.store_name || 'Magasin inconnu'}</p>
                        <p className="text-xs text-gray-400 flex items-center gap-1.5 flex-wrap">
                          <span>{scan.items?.length || 0} article(s)</span>
                          {scan.total_amount && <span>• {scan.total_amount} €</span>}
                          <span>• {new Date(scan.created_at).toLocaleDateString('fr-FR')}</span>
                          <span className={`inline-flex items-center gap-1 ${QUALITY_STYLES[hq.color].text}`}>
                            • {scan.ocr_confidence != null ? `${Math.round(scan.ocr_confidence)}%` : '—'}
                          </span>
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(scan.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors ml-2 flex-shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Scan