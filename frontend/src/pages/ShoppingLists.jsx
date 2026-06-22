import { useState, useEffect } from 'react'
import {
  ShoppingCart, Plus, Trash2, X, Check, PackagePlus, Pencil, ListChecks, CheckCircle, Boxes,
} from 'lucide-react'
import api from '../services/api'

const UNITS = ['unité', 'kg', 'g', 'L', 'mL', 'paquet', 'boîte', 'botte']

function ShoppingLists() {
  const [lists, setLists] = useState([])
  const [locations, setLocations] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [showNewList, setShowNewList] = useState(false)
  const [newListName, setNewListName] = useState('')

  const [itemForm, setItemForm] = useState({ name: '', quantity: 1, unit: 'unité' })

  // Modale de renommage
  const [renameModal, setRenameModal] = useState(false)
  const [renameValue, setRenameValue] = useState('')

  // Modale de transfert
  const [transferModal, setTransferModal] = useState(false)
  const [transferLocationId, setTransferLocationId] = useState('')
  const [transferring, setTransferring] = useState(false)

  // Modale « ajouter depuis le stock »
  const [inventoryModal, setInventoryModal] = useState(false)
  const [inventory, setInventory] = useState([])
  const [invLoading, setInvLoading] = useState(false)
  const [invSearch, setInvSearch] = useState('')
  const [invLowOnly, setInvLowOnly] = useState(false)
  const [invSelected, setInvSelected] = useState({}) // { [productId]: quantité }
  const [addingFromInv, setAddingFromInv] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async (keepSelection = true) => {
    try {
      const [listsRes, locsRes] = await Promise.all([
        api.get('/shopping-lists'),
        api.get('/locations'),
      ])
      setLists(listsRes.data)
      setLocations(locsRes.data)
      setSelectedId((prev) => {
        if (keepSelection && prev && listsRes.data.some((l) => l.id === prev)) return prev
        return listsRes.data[0]?.id || null
      })
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  const flashSuccess = (msg) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 4000)
  }

  const selectedList = lists.find((l) => l.id === selectedId) || null
  const items = selectedList?.items || []
  const checkedCount = items.filter((i) => i.checked).length

  // Produits déjà liés à la liste (pour griser ceux déjà ajoutés depuis le stock)
  const existingProductIds = new Set(items.filter((i) => i.product_id != null).map((i) => i.product_id))
  const filteredInventory = inventory.filter((p) => {
    if (invSearch && !p.name.toLowerCase().includes(invSearch.toLowerCase())) return false
    if (invLowOnly && !(p.quantity_min > 0 && p.quantity <= p.quantity_min)) return false
    return true
  })
  const invSelectedCount = Object.keys(invSelected).length

  const handleCreateList = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const res = await api.post('/shopping-lists', { name: newListName.trim() || undefined })
      setNewListName('')
      setShowNewList(false)
      await fetchData(false)
      setSelectedId(res.data.id)
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la création')
    }
  }

  // ── Renommage (modale) ──
  const openRenameModal = () => {
    setRenameValue(selectedList?.name || '')
    setRenameModal(true)
  }

  const handleRename = async (e) => {
    e.preventDefault()
    if (!renameValue.trim()) return
    setError('')
    try {
      await api.put(`/shopping-lists/${selectedList.id}`, { name: renameValue.trim() })
      setRenameModal(false)
      await fetchData()
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors du renommage')
    }
  }

  const handleDeleteList = async (list) => {
    if (!confirm(`Supprimer la liste « ${list.name} » et tous ses articles ?`)) return
    setError('')
    try {
      await api.delete(`/shopping-lists/${list.id}`)
      await fetchData(false)
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la suppression')
    }
  }

  const handleAddItem = async (e) => {
    e.preventDefault()
    if (!itemForm.name.trim() || !selectedList) return
    setError('')
    try {
      await api.post(`/shopping-lists/${selectedList.id}/items`, {
        name: itemForm.name.trim(),
        quantity: parseFloat(itemForm.quantity) || 1,
        unit: itemForm.unit,
      })
      setItemForm({ name: '', quantity: 1, unit: 'unité' })
      await fetchData()
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de l\'ajout')
    }
  }

  const handleToggleItem = async (item) => {
    setError('')
    try {
      await api.put(`/shopping-lists/${selectedList.id}/items/${item.id}`, { checked: !item.checked })
      await fetchData()
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur')
    }
  }

  const handleDeleteItem = async (item) => {
    setError('')
    try {
      await api.delete(`/shopping-lists/${selectedList.id}/items/${item.id}`)
      await fetchData()
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur')
    }
  }

  // ── Transfert vers le stock (modale avec choix d'emplacement) ──
  const openTransferModal = () => {
    if (checkedCount === 0) return
    const def = locations.find((l) => l.is_default) || locations[0]
    setTransferLocationId(def ? String(def.id) : '')
    setTransferModal(true)
  }

  const handleConfirmTransfer = async () => {
    if (!selectedList || !transferLocationId) return
    setTransferring(true)
    setError('')
    try {
      const res = await api.post(`/shopping-lists/${selectedList.id}/transfer`, {
        location_id: parseInt(transferLocationId, 10),
      })
      setTransferModal(false)
      await fetchData()
      flashSuccess(res.data.message + (res.data.location ? ` → ${res.data.location}` : ''))
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors du transfert')
    } finally {
      setTransferring(false)
    }
  }

  // ── Ajout depuis le stock (modale de sélection dans l'inventaire) ──
  const openInventoryModal = async () => {
    if (!selectedList) return
    setInvSelected({})
    setInvSearch('')
    setInvLowOnly(false)
    setInventoryModal(true)
    setInvLoading(true)
    try {
      const res = await api.get('/products')
      setInventory(res.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur de chargement du stock')
    } finally {
      setInvLoading(false)
    }
  }

  const toggleInvProduct = (product) => {
    setInvSelected((prev) => {
      const next = { ...prev }
      if (next[product.id] !== undefined) delete next[product.id]
      else next[product.id] = product.quantity > 0 ? product.quantity : 1
      return next
    })
  }

  const setInvQuantity = (id, value) => {
    setInvSelected((prev) => ({ ...prev, [id]: value }))
  }

  const handleAddFromInventory = async () => {
    if (!selectedList || invSelectedCount === 0) return
    const items = Object.entries(invSelected).map(([product_id, quantity]) => ({
      product_id: parseInt(product_id, 10),
      quantity: parseFloat(quantity) || 1,
    }))
    setAddingFromInv(true)
    setError('')
    try {
      const res = await api.post(`/shopping-lists/${selectedList.id}/items/from-inventory`, { items })
      setInventoryModal(false)
      await fetchData()
      const skipped = res.data.skipped ? ` (${res.data.skipped} déjà présent·s, ignoré·s)` : ''
      flashSuccess(res.data.message + skipped)
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de l\'ajout depuis le stock')
    } finally {
      setAddingFromInv(false)
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
    <div className="space-y-6 max-w-3xl">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ShoppingCart className="h-6 w-6 text-primary-600" />
          Listes de courses
        </h1>
        {!showNewList && (
          <button
            onClick={() => setShowNewList(true)}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
          >
            <Plus className="h-5 w-5" />
            Nouvelle liste
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm flex items-center gap-2">
          {error}
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 text-green-700 p-4 rounded-lg text-sm flex items-center gap-2">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          {success}
          <button onClick={() => setSuccess('')} className="ml-auto text-green-400 hover:text-green-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Création de liste */}
      {showNewList && (
        <form onSubmit={handleCreateList} className="bg-white rounded-xl shadow p-4 flex gap-2">
          <input
            autoFocus
            type="text"
            placeholder="Nom de la liste (ex: Courses du weekend)"
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
          />
          <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm">
            Créer
          </button>
          <button
            type="button"
            onClick={() => { setShowNewList(false); setNewListName('') }}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
          >
            Annuler
          </button>
        </form>
      )}

      {lists.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-12 text-center">
          <ShoppingCart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune liste de courses</h3>
          <p className="text-gray-500">Créez une liste pour préparer vos prochaines courses.</p>
        </div>
      ) : (
        <>
          {/* Onglets des listes */}
          <div className="flex flex-wrap gap-2">
            {lists.map((l) => {
              const total = l.items?.length || 0
              const done = (l.items || []).filter((i) => i.checked).length
              return (
                <button
                  key={l.id}
                  onClick={() => setSelectedId(l.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    l.id === selectedId
                      ? 'bg-primary-50 border-primary-300 text-primary-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {l.name}
                  <span className="ml-2 text-xs text-gray-400">{done}/{total}</span>
                </button>
              )
            })}
          </div>

          {/* Détail de la liste sélectionnée */}
          {selectedList && (
            <div className="bg-white rounded-xl shadow">
              {/* En-tête */}
              <div className="flex items-center justify-between p-5 border-b border-gray-100">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{selectedList.name}</h2>
                  <p className="text-sm text-gray-500">
                    {items.length} article(s) • {checkedCount} coché(s)
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={openRenameModal}
                    className="p-2 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-gray-50"
                    title="Renommer"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteList(selectedList)}
                    className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                    title="Supprimer la liste"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Ajout d'article */}
              <div className="p-5 border-b border-gray-100 space-y-3">
                <form onSubmit={handleAddItem} className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="Ajouter un article..."
                    value={itemForm.name}
                    onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={itemForm.quantity}
                    onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  />
                  <select
                    value={itemForm.unit}
                    onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  >
                    {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm flex items-center justify-center gap-1">
                    <Plus className="h-4 w-4" /> Ajouter
                  </button>
                </form>
                <button
                  type="button"
                  onClick={openInventoryModal}
                  className="flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  <Boxes className="h-4 w-4" />
                  Ajouter depuis mon stock
                </button>
              </div>

              {/* Articles */}
              {items.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">Aucun article. Ajoutez-en un ci-dessus.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {items.map((item) => (
                    <li key={item.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50">
                      <button
                        onClick={() => handleToggleItem(item)}
                        className={`h-6 w-6 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors ${
                          item.checked
                            ? 'bg-primary-600 border-primary-600 text-white'
                            : 'border-gray-300 hover:border-primary-400'
                        }`}
                        title={item.checked ? 'Décocher' : 'Cocher'}
                      >
                        {item.checked && <Check className="h-4 w-4" />}
                      </button>
                      <div className={`flex-1 ${item.checked ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                        <span className="font-medium">{item.name}</span>
                        {item.product_id != null && (
                          <Boxes className="inline-block h-3.5 w-3.5 text-gray-400 ml-1.5 -mt-0.5" aria-label="Ajouté depuis le stock" />
                        )}
                        <span className="text-sm text-gray-500 ml-2">{item.quantity} {item.unit}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteItem(item)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                        title="Retirer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* Pied : transfert vers le stock */}
              <div className="p-5 border-t border-gray-100 flex items-center justify-between gap-4 flex-wrap">
                <p className="text-sm text-gray-500 flex items-center gap-1.5">
                  <ListChecks className="h-4 w-4" />
                  Cochez les articles achetés, puis transférez-les dans votre stock.
                </p>
                <button
                  onClick={openTransferModal}
                  disabled={checkedCount === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <PackagePlus className="h-4 w-4" />
                  Transférer en stock ({checkedCount})
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modale : renommer la liste */}
      {renameModal && selectedList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Renommer la liste</h2>
            <form onSubmit={handleRename} className="space-y-4">
              <input
                autoFocus
                type="text"
                required
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setRenameModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Renommer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale : transfert vers le stock avec choix de l'emplacement */}
      {transferModal && selectedList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
              <PackagePlus className="h-5 w-5 text-green-600" />
              Transférer en stock
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              {checkedCount} article(s) coché(s) seront ajoutés à votre stock dans l'emplacement choisi,
              puis retirés de la liste.
            </p>

            {locations.length === 0 ? (
              <p className="text-sm text-red-600 mb-4">
                Aucun emplacement disponible. Créez-en un dans l'onglet « Emplacements » avant de transférer.
              </p>
            ) : (
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-1">Emplacement de destination</label>
                <select
                  value={transferLocationId}
                  onChange={(e) => setTransferLocationId(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.icon} {loc.name}{loc.is_default ? ' (par défaut)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setTransferModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmTransfer}
                disabled={transferring || !transferLocationId || locations.length === 0}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <PackagePlus className="h-4 w-4" />
                {transferring ? 'Transfert...' : 'Transférer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale : ajouter des articles depuis le stock */}
      {inventoryModal && selectedList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[85vh] flex flex-col">
            {/* En-tête */}
            <div className="p-5 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Boxes className="h-5 w-5 text-primary-600" />
                  Ajouter depuis le stock
                </h2>
                <button
                  onClick={() => setInventoryModal(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Sélectionnez les produits de votre inventaire à ajouter à « {selectedList.name} ».
              </p>
              <div className="flex gap-2 mt-3">
                <input
                  type="text"
                  placeholder="Rechercher un produit..."
                  value={invSearch}
                  onChange={(e) => setInvSearch(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setInvLowOnly((v) => !v)}
                  title="N'afficher que les produits dont le stock atteint le minimum"
                  className={`px-3 py-2 rounded-lg text-sm border whitespace-nowrap ${
                    invLowOnly
                      ? 'bg-amber-50 border-amber-300 text-amber-700'
                      : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Stock bas
                </button>
              </div>
            </div>

            {/* Liste des produits */}
            <div className="flex-1 overflow-y-auto p-3">
              {invLoading ? (
                <div className="flex justify-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              ) : filteredInventory.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-10">
                  {inventory.length === 0
                    ? 'Votre inventaire est vide.'
                    : 'Aucun produit ne correspond à votre recherche.'}
                </p>
              ) : (
                <ul className="space-y-1">
                  {filteredInventory.map((p) => {
                    const already = existingProductIds.has(p.id)
                    const checked = invSelected[p.id] !== undefined
                    return (
                      <li
                        key={p.id}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
                          already ? 'opacity-50' : 'hover:bg-gray-50 cursor-pointer'
                        }`}
                        onClick={() => !already && toggleInvProduct(p)}
                      >
                        <span
                          className={`h-5 w-5 rounded border flex items-center justify-center flex-shrink-0 ${
                            checked || already
                              ? 'bg-primary-600 border-primary-600 text-white'
                              : 'border-gray-300'
                          }`}
                        >
                          {(checked || already) && <Check className="h-3.5 w-3.5" />}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                          <p className="text-xs text-gray-500">
                            En stock : {p.quantity} {p.unit}
                            {p.location ? ` • ${p.location.icon || ''} ${p.location.name}` : ''}
                            {already ? ' • déjà dans la liste' : ''}
                          </p>
                        </div>
                        {checked && !already && (
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={invSelected[p.id]}
                            onChange={(e) => setInvQuantity(p.id, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-20 px-2 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            {/* Pied */}
            <div className="p-5 border-t border-gray-100 flex items-center justify-between gap-3">
              <span className="text-sm text-gray-500">{invSelectedCount} sélectionné(s)</span>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setInventoryModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleAddFromInventory}
                  disabled={invSelectedCount === 0 || addingFromInv}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  {addingFromInv ? 'Ajout...' : `Ajouter (${invSelectedCount})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ShoppingLists
