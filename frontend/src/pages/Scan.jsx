import { useState, useRef } from 'react'
import { Camera, Upload, FileText, Trash2, ChevronDown, ChevronUp, CheckCircle, Clock } from 'lucide-react'
import api from '../services/api'

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

  const handleFile = async (file) => {
    if (!file) return
    setError('')
    setResult(null)
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
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors du scan')
    } finally {
      setScanning(false)
    }
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

  const reset = () => { setResult(null); setPreview(null); setError('') }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Scanner un ticket</h1>
        <p className="text-sm text-gray-500 mt-1">Importez une photo de votre ticket pour extraire les produits automatiquement</p>
      </div>

      {!result && (
        <div className="bg-white rounded-xl shadow p-6 space-y-4">
          {preview && (
            <div className="relative">
              <img src={preview} alt="Aperçu" className="w-full max-h-64 object-contain rounded-lg border" />
              {scanning && (
                <div className="absolute inset-0 bg-white bg-opacity-80 flex flex-col items-center justify-center rounded-lg">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mb-3"></div>
                  <p className="text-sm text-gray-600 font-medium">Analyse OCR en cours...</p>
                  <p className="text-xs text-gray-400 mt-1">Cela peut prendre quelques secondes</p>
                </div>
              )}
            </div>
          )}

          {!scanning && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button onClick={() => fileInputRef.current.click()}
                className="flex items-center justify-center gap-3 p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition-colors group">
                <Upload className="h-6 w-6 text-gray-400 group-hover:text-primary-600" />
                <div className="text-left">
                  <p className="font-medium text-gray-700 group-hover:text-primary-700">Depuis la galerie</p>
                  <p className="text-xs text-gray-400">JPG, PNG, WEBP — 10MB max</p>
                </div>
              </button>
              <button onClick={() => cameraInputRef.current.click()}
                className="flex items-center justify-center gap-3 p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition-colors group">
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

      {result && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Ticket analysé</p>
                  <p className="text-xs text-gray-400">Confiance OCR : {Math.round(result.scan.ocr_confidence)}%</p>
                </div>
              </div>
              <button onClick={reset} className="text-sm text-gray-400 hover:text-gray-600">Nouveau scan</button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">Magasin</p>
                <p className="font-medium text-gray-900 text-sm">{result.scan.store_name || '—'}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">Total</p>
                <p className="font-medium text-gray-900 text-sm">{result.scan.total_amount ? `${result.scan.total_amount} €` : '—'}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">Date</p>
                <p className="font-medium text-gray-900 text-sm">
                  {result.scan.scanned_at ? new Date(result.scan.scanned_at).toLocaleDateString('fr-FR') : '—'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-5">
            <h2 className="font-semibold text-gray-900 mb-3">{result.scan.items?.length || 0} article(s) détecté(s)</h2>
            {result.scan.items?.length === 0 ? (
              <p className="text-gray-400 text-sm">Aucun article détecté. La qualité de l'image était peut-être insuffisante.</p>
            ) : (
              <div className="space-y-2">
                {result.scan.items?.map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-400">{item.quantity} {item.unit}</p>
                    </div>
                    {item.unit_price && <p className="text-sm font-medium text-gray-700">{item.unit_price} €</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <details className="bg-gray-50 rounded-xl p-4">
            <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">Voir le texte brut extrait</summary>
            <pre className="mt-3 text-xs text-gray-500 whitespace-pre-wrap font-mono">{result.rawText}</pre>
          </details>
        </div>
      )}

      <div className="bg-white rounded-xl shadow">
        <button onClick={loadHistory} className="w-full flex items-center justify-between p-5 text-left">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-gray-400" />
            <span className="font-medium text-gray-900">Historique des tickets</span>
          </div>
          {loadingHistory ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
          ) : showHistory ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
        </button>
        {showHistory && (
          <div className="border-t divide-y">
            {history.length === 0 ? (
              <p className="p-5 text-gray-400 text-sm">Aucun ticket scanné pour l'instant</p>
            ) : history.map((scan) => (
              <div key={scan.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{scan.store_name || 'Magasin inconnu'}</p>
                    <p className="text-xs text-gray-400">
                      {scan.items?.length || 0} article(s)
                      {scan.total_amount && ` • ${scan.total_amount} €`}
                      {' • '}{new Date(scan.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
                <button onClick={() => handleDelete(scan.id)} className="text-gray-300 hover:text-red-500 ml-2">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Scan