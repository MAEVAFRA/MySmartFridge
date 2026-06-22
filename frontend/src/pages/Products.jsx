import { useState, useEffect, useRef, Fragment } from 'react'
import { Plus, Search, Trash2, Edit2, ChevronUp, ChevronDown, ChevronsUpDown, Utensils, Upload, Package, Image as ImageIcon, Clock, ScanLine, Camera, CheckCircle } from 'lucide-react'
import api from '../services/api'
import { fileToResizedDataUrl } from '../utils/image'

const toYmd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function Products() {
  const [products, setProducts] = useState([])
  const [locations, setLocations] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showScanModal, setShowScanModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [search, setSearch] = useState('')
  const [filterLocation, setFilterLocation] = useState('')
  const [sort, setSort] = useState({ key: 'expires_at', dir: 'asc' })
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [shelfModal, setShelfModal] = useState(false)
  const [shelfDrafts, setShelfDrafts] = useState({})
  const [savingShelf, setSavingShelf] = useState(false)

  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState(null)
  const [scanItems, setScanItems] = useState([])
  const [scanLocationId, setScanLocationId] = useState('')
  const [scanPreview, setScanPreview] = useState(null)
  const [scanError, setScanError] = useState('')
  const fileInputRef = useRef()
  const cameraInputRef = useRef()

  const [formData, setFormData] = useState({
    name: '',
    quantity: 1,
    unit: 'unité',
    expires_at: '',
    location_id: '',
    category_id: '',
    notes: '',
    image_url: '',
  })

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      const [productsRes, locationsRes, categoriesRes] = await Promise.all([
        api.get('/products'), api.get('/locations'), api.get('/categories'),
      ])
      setProducts(productsRes.data)
      setLocations(locationsRes.data)
      setCategories(categoriesRes.data)
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = { ...formData, image_url: formData.image_url || null }
    try {
      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, payload)
      } else {
        await api.post('/products', payload)
      }
      fetchData()
      closeModal()
    } catch (error) {
      console.error('Erreur:', error)
    }
  }

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const dataUrl = await fileToResizedDataUrl(file)
      setFormData((f) => ({ ...f, image_url: dataUrl }))
    } catch {
      console.error('Erreur de lecture de l\'image')
    }
  }

  const confirmDelete = async (reason) => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/products/${deleteTarget.id}`, reason ? { data: { reason } } : undefined)
      setDeleteTarget(null)
      fetchData()
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setDeleting(false)
    }
  }

  const openShelfModal = () => {
    const drafts = {}
    categories.forEach((c) => {
      drafts[c.id] = {
        avg_shelf_days: c.avg_shelf_days ?? '',
        avg_shelf_days_freezer: c.avg_shelf_days_freezer ?? '',
      }
    })
    setShelfDrafts(drafts)
    setShelfModal(true)
  }

  const setDraft = (id, key, value) =>
    setShelfDrafts((d) => ({ ...d, [id]: { ...d[id], [key]: value } }))

  const saveShelf = async () => {
    setSavingShelf(true)
    try {
      const calls = categories
        .filter((c) => {
          const d = shelfDrafts[c.id]
          return (
            String(d.avg_shelf_days) !== String(c.avg_shelf_days ?? '') ||
            String(d.avg_shelf_days_freezer) !== String(c.avg_shelf_days_freezer ?? '')
          )
        })
        .map((c) =>
          api.put(`/categories/${c.id}`, {
            avg_shelf_days: shelfDrafts[c.id].avg_shelf_days === '' ? null : shelfDrafts[c.id].avg_shelf_days,
            avg_shelf_days_freezer: shelfDrafts[c.id].avg_shelf_days_freezer === '' ? null : shelfDrafts[c.id].avg_shelf_days_freezer,
          })
        )
      await Promise.all(calls)
      setShelfModal(false)
      fetchData()
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setSavingShelf(false)
    }
  }

  const openModal = (product = null) => {
    if (product) {
      setEditingProduct(product)
      setFormData({
        name: product.name, quantity: product.quantity,
        unit: product.unit || 'unité',
        expires_at: product.expires_at ? product.expires_at.slice(0, 10) : '',
        location_id: product.location_id || '',
        category_id: product.category_id || '',
        notes: product.notes || '',
        image_url: product.image_url || '',
      })
    } else {
      setEditingProduct(null)
      setFormData({
        name: '', quantity: 1, unit: 'unité', expires_at: '',
        location_id: locations[0]?.id || '', category_id: '', notes: '', image_url: '',
      })
    }
    setShowModal(true)
  }

  const closeModal = () => { setShowModal(false); setEditingProduct(null) }

  const openScanModal = () => {
    setScanResult(null)
    setScanItems([])
    setScanPreview(null)
    setScanError('')
    setScanLocationId(locations[0]?.id || '')
    setShowScanModal(true)
  }

  const closeScanModal = () => {
    setShowScanModal(false)
    setScanResult(null)
    setScanItems([])
    setScanPreview(null)
  }

  const handleScanFile = async (file) => {
    if (!file) return
    setScanError('')
    setScanResult(null)
    const reader = new FileReader()
    reader.onload = (e) => setScanPreview(e.target.result)
    reader.readAsDataURL(file)
    setScanning(true)
    try {
      const form = new FormData()
      form.append('image', file)
      const res = await api.post('/receipts/scan', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setScanResult(res.data.scan)
      setScanItems(res.data.scan.items?.map(item => ({
        ...item,
        selected: true,
        quantity: item.quantity || 1,
        unit: item.unit || 'unité',
      })) || [])
    } catch (err) {
      setScanError(err.response?.data?.message || 'Erreur lors du scan')
    } finally {
      setScanning(false)
    }
  }

  const handleConfirmScan = async () => {
    const selectedItems = scanItems.filter(i => i.selected)
    if (selectedItems.length === 0) return
    if (!scanLocationId) { setScanError('Choisissez un emplacement'); return }
    try {
      await Promise.all(selectedItems.map(item =>
        api.post('/products', {
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          location_id: scanLocationId,
          price: item.unit_price,
        })
      ))
      fetchData()
      closeScanModal()
    } catch (err) {
      setScanError('Erreur lors de l\'ajout des produits')
    }
  }

  const getExpiryColor = (expires_at) => {
    if (!expires_at) return ''
    const daysLeft = Math.ceil((new Date(expires_at) - new Date()) / (1000 * 60 * 60 * 24))
    if (daysLeft <= 1) return 'text-red-600 font-semibold'
    if (daysLeft <= 3) return 'text-orange-500 font-semibold'
    if (daysLeft <= 7) return 'text-yellow-600'
    return 'text-gray-600'
  }

  const isExpired = (expires_at) => {
    if (!expires_at) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return new Date(expires_at) < today
  }

  const filteredProducts = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchLocation = !filterLocation || p.location_id === parseInt(filterLocation)
    return matchSearch && matchLocation
  })

  const selectedCat = categories.find((c) => String(c.id) === String(formData.category_id))
  const selectedLoc = locations.find((l) => String(l.id) === String(formData.location_id))
  const estDays = selectedCat
    ? (selectedLoc?.type === 'freezer' && selectedCat.avg_shelf_days_freezer
        ? selectedCat.avg_shelf_days_freezer
        : selectedCat.avg_shelf_days)
    : null
  const estDate = estDays != null ? new Date(Date.now() + estDays * 86400000) : null

  const toggleSort = (key) => {
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }
    )
  }

  const sortValue = (p, key) => {
    switch (key) {
      case 'name':       return p.name.toLowerCase()
      case 'quantity':   return p.quantity ?? 0
      case 'location':   return p.location?.name ? p.location.name.toLowerCase() : null
      case 'expires_at': return p.expires_at ? new Date(p.expires_at).getTime() : null
      default:           return null
    }
  }

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const va = sortValue(a, sort.key)
    const vb = sortValue(b, sort.key)
    if (va === null && vb === null) return 0
    if (va === null) return 1
    if (vb === null) return -1
    const cmp =
      typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va).localeCompare(String(vb), 'fr')
    return sort.dir === 'asc' ? cmp : -cmp
  })

  const sortIcon = (key) => {
    if (sort.key !== key) return <ChevronsUpDown className="inline h-3.5 w-3.5 text-gray-300 ml-1" />
    return sort.dir === 'asc'
      ? <ChevronUp className="inline h-3.5 w-3.5 text-gray-600 ml-1" />
      : <ChevronDown className="inline h-3.5 w-3.5 text-gray-600 ml-1" />
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
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-900">Mes produits</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={openShelfModal}
            className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
            title="Configurer les durées de conservation utilisées pour l'estimation auto"
          >
            <Clock className="h-5 w-5" />
            <span className="hidden sm:inline">Durées de conservation</span>
          </button>
          <button
            onClick={openScanModal}
            className="flex items-center gap-2 border border-primary-600 text-primary-600 px-4 py-2 rounded-lg hover:bg-primary-50"
          >
            <ScanLine className="h-5 w-5" />
            Scanner un ticket
          </button>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
          >
            <Plus className="h-5 w-5" />
            Ajouter
          </button>
        </div>
      </div>

      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input type="text" placeholder="Rechercher..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        <select value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
          <option value="">Tous les emplacements</option>
          {locations.map((loc) => <option key={loc.id} value={loc.id}>{loc.icon} {loc.name}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        {filteredProducts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Aucun produit trouvé</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th onClick={() => toggleSort('name')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer select-none hover:text-gray-700">
                  Produit {sortIcon('name')}
                </th>
                <th onClick={() => toggleSort('quantity')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer select-none hover:text-gray-700">
                  Quantité {sortIcon('quantity')}
                </th>
                <th onClick={() => toggleSort('location')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer select-none hover:text-gray-700">
                  Emplacement {sortIcon('location')}
                </th>
                <th onClick={() => toggleSort('expires_at')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer select-none hover:text-gray-700">
                  Péremption {sortIcon('expires_at')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name}
                          className="h-10 w-10 rounded-lg object-cover flex-shrink-0 border border-gray-100" />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0 text-lg">
                          {product.category?.icon || <Package className="h-5 w-5 text-gray-300" />}
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-gray-900">{product.name}</div>
                        {product.category && <div className="text-sm text-gray-500">{product.category.name}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{product.quantity} {product.unit}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                      {product.location?.icon} {product.location?.name}
                    </span>
                  </td>
                  <td className={`px-6 py-4 ${getExpiryColor(product.expires_at)}`}>
                    {product.expires_at ? (
                      <span className="inline-flex items-center gap-2">
                        {new Date(product.expires_at).toLocaleDateString('fr-FR')}
                        {isExpired(product.expires_at) && (
                          <span className="text-xs font-bold uppercase bg-red-600 text-white px-2 py-0.5 rounded-full">
                            Périmé
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button onClick={() => openModal(product)} className="text-gray-400 hover:text-primary-600">
                      <Edit2 className="h-5 w-5" />
                    </button>
                    <button onClick={() => setDeleteTarget(product)} className="text-gray-400 hover:text-red-600">
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingProduct ? 'Modifier le produit' : 'Ajouter un produit'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nom *</label>
                <input type="text" required value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Photo</label>
                <div className="flex items-center gap-3">
                  <div className="h-16 w-16 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {formData.image_url ? (
                      <img src={formData.image_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <ImageIcon className="h-6 w-6 text-gray-300" />
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="cursor-pointer text-sm px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 inline-flex items-center gap-1.5 w-fit">
                      <Upload className="h-4 w-4" />
                      {formData.image_url ? 'Changer la photo' : 'Choisir une photo'}
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                    </label>
                    {formData.image_url && (
                      <button type="button" onClick={() => setFormData({ ...formData, image_url: '' })}
                        className="text-xs text-red-500 hover:text-red-600 w-fit">
                        Retirer la photo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Quantité</label>
                  <input type="number" min="0" step="0.1" value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Unité</label>
                  <select value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500">
                    {['unité','kg','g','L','mL','c.à.s','tête','botte'].map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Emplacement *</label>
                <select required value={formData.location_id}
                  onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500">
                  <option value="">Sélectionner...</option>
                  {locations.map((loc) => <option key={loc.id} value={loc.id}>{loc.icon} {loc.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Catégorie</label>
                <select value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500">
                  <option value="">Aucune</option>
                  {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Date de péremption</label>
                <input type="date" value={formData.expires_at}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                {!formData.expires_at && estDays != null && (
                  <p className="mt-1 text-xs text-gray-500">
                    Laissée vide → estimée à{' '}
                    <span className="font-medium text-gray-700">{estDate.toLocaleDateString('fr-FR')}</span>{' '}
                    ({selectedCat.icon} {selectedCat.name}, {estDays} j
                    {selectedLoc?.type === 'freezer' && selectedCat.avg_shelf_days_freezer ? ' au congélateur' : ''})
                    <button type="button"
                      onClick={() => setFormData((f) => ({ ...f, expires_at: toYmd(estDate) }))}
                      className="ml-1 text-primary-600 hover:underline">
                      Appliquer
                    </button>
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Annuler</button>
                <button type="submit"
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                  {editingProduct ? 'Modifier' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Retirer « {deleteTarget.name} »</h2>
            <p className="text-sm text-gray-500 mb-5">
              Pourquoi retirez-vous ce produit ? Cela alimente vos statistiques de gaspillage.
            </p>
            <div className="space-y-2">
              <button onClick={() => confirmDelete('consumed')} disabled={deleting}
                className="w-full flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                <Utensils className="h-4 w-4" /> Je l'ai consommé
              </button>
              <button onClick={() => confirmDelete('thrown')} disabled={deleting}
                className="w-full flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                <Trash2 className="h-4 w-4" /> Je l'ai jeté / il est périmé
              </button>
            </div>
            <div className="flex items-center justify-between mt-4">
              <button onClick={() => confirmDelete(null)} disabled={deleting}
                className="text-xs text-gray-400 hover:text-gray-600 underline">
                Juste le retirer (sans compter)
              </button>
              <button onClick={() => setDeleteTarget(null)} disabled={deleting}
                className="text-sm text-gray-600 hover:text-gray-800">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {shelfModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[85vh] flex flex-col">
            <div className="p-5 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary-600" />
                Durées de conservation
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Servent à estimer automatiquement la péremption d'un produit ajouté sans date (en jours).
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="grid grid-cols-[1fr_5rem_5rem] gap-x-3 gap-y-2 items-center">
                <span></span>
                <span className="text-[11px] font-medium text-gray-500 text-center uppercase">Frigo / placard</span>
                <span className="text-[11px] font-medium text-gray-500 text-center uppercase">Congélateur</span>
                {categories.map((c) => (
                  <Fragment key={c.id}>
                    <span className="text-sm text-gray-700 truncate">{c.icon} {c.name}</span>
                    <input type="number" min="0" value={shelfDrafts[c.id]?.avg_shelf_days ?? ''}
                      onChange={(e) => setDraft(c.id, 'avg_shelf_days', e.target.value)}
                      className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary-500" />
                    <input type="number" min="0" value={shelfDrafts[c.id]?.avg_shelf_days_freezer ?? ''}
                      onChange={(e) => setDraft(c.id, 'avg_shelf_days_freezer', e.target.value)}
                      className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  </Fragment>
                ))}
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShelfModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm">
                Annuler
              </button>
              <button onClick={saveShelf} disabled={savingShelf}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm disabled:opacity-50">
                {savingShelf ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showScanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            {!scanResult && (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Scanner un ticket</h2>
                  <button onClick={closeScanModal} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>

                {scanPreview && (
                  <div className="relative mb-4">
                    <img src={scanPreview} alt="Aperçu" className="w-full max-h-48 object-contain rounded-lg border" />
                    {scanning && (
                      <div className="absolute inset-0 bg-white bg-opacity-80 flex flex-col items-center justify-center rounded-lg">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-2"></div>
                        <p className="text-sm font-medium text-gray-600">Analyse en cours...</p>
                      </div>
                    )}
                  </div>
                )}

                {!scanning && (
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => fileInputRef.current.click()}
                      className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition-colors">
                      <Upload className="h-5 w-5 text-gray-400" />
                      <span className="text-sm font-medium text-gray-600">Galerie</span>
                    </button>
                    <button onClick={() => cameraInputRef.current.click()}
                      className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition-colors">
                      <Camera className="h-5 w-5 text-gray-400" />
                      <span className="text-sm font-medium text-gray-600">Caméra</span>
                    </button>
                  </div>
                )}

                <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => handleScanFile(e.target.files[0])} />
                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
                  onChange={(e) => handleScanFile(e.target.files[0])} />

                {scanError && <div className="mt-3 bg-red-50 text-red-600 p-3 rounded-lg text-sm">{scanError}</div>}
              </>
            )}

            {scanResult && (
              <>
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <h2 className="text-xl font-bold text-gray-900">Confirmer les produits</h2>
                  </div>
                  <button onClick={() => setScanResult(null)} className="text-sm text-gray-400 hover:text-gray-600">← Retour</button>
                </div>

                <div className="bg-gray-50 rounded-lg p-3 mb-4 flex gap-4 text-sm text-gray-600">
                  <span>🏪 {scanResult.store_name || '—'}</span>
                  <span>💰 {scanResult.total_amount ? `${scanResult.total_amount} €` : '—'}</span>
                  <span>📊 {Math.round(scanResult.ocr_confidence)}% confiance</span>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ajouter dans *</label>
                  <select value={scanLocationId} onChange={(e) => setScanLocationId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-primary-500">
                    <option value="">Sélectionner un emplacement...</option>
                    {locations.map((loc) => <option key={loc.id} value={loc.id}>{loc.icon} {loc.name}</option>)}
                  </select>
                </div>

                <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                  {scanItems.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-4">Aucun article détecté</p>
                  ) : scanItems.map((item, i) => (
                    <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border ${item.selected ? 'border-primary-200 bg-primary-50' : 'border-gray-200 bg-gray-50 opacity-50'}`}>
                      <input type="checkbox" checked={item.selected}
                        onChange={(e) => setScanItems(scanItems.map((it, j) => j === i ? { ...it, selected: e.target.checked } : it))}
                        className="rounded" />
                      <input type="text" value={item.name}
                        onChange={(e) => setScanItems(scanItems.map((it, j) => j === i ? { ...it, name: e.target.value } : it))}
                        className="flex-1 text-sm bg-transparent border-none outline-none font-medium" />
                      <div className="flex items-center gap-1">
                        <input type="number" value={item.quantity} min="0.1" step="0.1"
                          onChange={(e) => setScanItems(scanItems.map((it, j) => j === i ? { ...it, quantity: parseFloat(e.target.value) } : it))}
                          className="w-14 text-sm text-center border border-gray-300 rounded px-1 py-0.5" />
                        <select value={item.unit}
                          onChange={(e) => setScanItems(scanItems.map((it, j) => j === i ? { ...it, unit: e.target.value } : it))}
                          className="text-xs border border-gray-300 rounded px-1 py-0.5">
                          {['unité','kg','g','L','mL'].map(u => <option key={u}>{u}</option>)}
                        </select>
                      </div>
                      {item.unit_price && <span className="text-xs text-gray-400 whitespace-nowrap">{item.unit_price} €</span>}
                    </div>
                  ))}
                </div>

                {scanError && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-3">{scanError}</div>}

                <div className="flex gap-3">
                  <button onClick={closeScanModal}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Annuler</button>
                  <button onClick={handleConfirmScan}
                    disabled={scanItems.filter(i => i.selected).length === 0 || !scanLocationId}
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
                    Ajouter {scanItems.filter(i => i.selected).length} produit(s)
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Products