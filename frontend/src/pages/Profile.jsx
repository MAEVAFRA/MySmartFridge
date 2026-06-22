import { useState, useEffect } from 'react'
import { User, Save, Lock, AlertTriangle, CheckCircle, X, Upload } from 'lucide-react'
import api from '../services/api'
import { fileToResizedDataUrl } from '../utils/image'
import { useToast } from '../components/Toast'

function Profile() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState('')
  const [savingPw, setSavingPw] = useState(false)

  const [profile, setProfile] = useState({
    name: '', email: '', avatar_url: '', dietary_preferences: '', allergies: '',
  })
  const [pw, setPw] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const toast = useToast()

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const res = await api.get('/auth/me')
      const u = res.data.user
      setProfile({
        name: u.name || '',
        email: u.email || '',
        avatar_url: u.avatar_url || '',
        dietary_preferences: u.dietary_preferences || '',
        allergies: u.allergies || '',
      })
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    if (!profile.name.trim() || !profile.email.trim()) return
    setSavingProfile(true)
    setError('')
    try {
      const res = await api.put('/auth/profile', profile)
      const u = res.data.user
      // Met à jour le user stocké pour rafraîchir l'en-tête
      const stored = JSON.parse(localStorage.getItem('user') || '{}')
      localStorage.setItem('user', JSON.stringify({ ...stored, name: u.name, email: u.email }))
      toast.flash('Profil mis à jour')
      window.location.reload()
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de l\'enregistrement')
      setSavingProfile(false)
    }
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // autorise la re-sélection du même fichier
    if (!file) return
    setError('')
    try {
      const dataUrl = await fileToResizedDataUrl(file, 400, 0.8)
      setProfile((p) => ({ ...p, avatar_url: dataUrl }))
    } catch {
      setError('Impossible de lire cette image')
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPwError('')
    setPwSuccess('')
    if (pw.new_password !== pw.confirm_password) {
      setPwError('Les deux mots de passe ne correspondent pas')
      return
    }
    if (pw.new_password.length < 6) {
      setPwError('Le nouveau mot de passe doit faire au moins 6 caractères')
      return
    }
    setSavingPw(true)
    try {
      await api.put('/auth/password', {
        current_password: pw.current_password,
        new_password: pw.new_password,
      })
      setPwSuccess('Mot de passe modifié avec succès')
      toast.success('Mot de passe modifié')
      setPw({ current_password: '', new_password: '', confirm_password: '' })
    } catch (err) {
      setPwError(err.response?.data?.message || 'Erreur lors du changement de mot de passe')
    } finally {
      setSavingPw(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const inputClass =
    'mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500'

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
        <User className="h-6 w-6 text-primary-600" />
        Mon profil
      </h1>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          {error}
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Informations personnelles */}
      <form onSubmit={handleSaveProfile} className="bg-white rounded-xl shadow p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Informations</h2>

        <div className="flex items-center gap-4">
          <div
            className="h-20 w-20 rounded-full flex items-center justify-center text-white font-semibold text-2xl flex-shrink-0 bg-primary-600 bg-cover bg-center"
            style={profile.avatar_url ? { backgroundImage: `url(${profile.avatar_url})` } : {}}
          >
            {!profile.avatar_url && (profile.name?.charAt(0).toUpperCase() || '?')}
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="block text-sm font-medium text-gray-700">Photo de profil</span>
            <label className="cursor-pointer text-sm px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 inline-flex items-center gap-1.5 w-fit">
              <Upload className="h-4 w-4" />
              {profile.avatar_url ? 'Changer la photo' : 'Choisir une photo'}
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </label>
            {profile.avatar_url && (
              <button
                type="button"
                onClick={() => setProfile({ ...profile, avatar_url: '' })}
                className="text-xs text-red-500 hover:text-red-600 w-fit"
              >
                Retirer la photo
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nom *</label>
            <input
              type="text"
              required
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email *</label>
            <input
              type="email"
              required
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Préférences alimentaires</label>
            <input
              type="text"
              placeholder="Ex: végétarien, sans gluten"
              value={profile.dietary_preferences}
              onChange={(e) => setProfile({ ...profile, dietary_preferences: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Allergies</label>
            <input
              type="text"
              placeholder="Ex: arachides, lactose"
              value={profile.allergies}
              onChange={(e) => setProfile({ ...profile, allergies: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={savingProfile}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {savingProfile ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </form>

      {/* Changement de mot de passe */}
      <form onSubmit={handleChangePassword} className="bg-white rounded-xl shadow p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Lock className="h-5 w-5 text-gray-500" />
          Mot de passe
        </h2>

        {pwError && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            {pwError}
          </div>
        )}
        {pwSuccess && (
          <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm flex items-center gap-2">
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
            {pwSuccess}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700">Mot de passe actuel</label>
          <input
            type="password"
            required
            value={pw.current_password}
            onChange={(e) => setPw({ ...pw, current_password: e.target.value })}
            className={inputClass}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nouveau mot de passe</label>
            <input
              type="password"
              required
              value={pw.new_password}
              onChange={(e) => setPw({ ...pw, new_password: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Confirmer</label>
            <input
              type="password"
              required
              value={pw.confirm_password}
              onChange={(e) => setPw({ ...pw, confirm_password: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={savingPw}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:opacity-50"
          >
            <Lock className="h-4 w-4" />
            {savingPw ? 'Modification...' : 'Changer le mot de passe'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default Profile
