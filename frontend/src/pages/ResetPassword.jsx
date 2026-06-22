import { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { Refrigerator, CheckCircle, AlertTriangle } from 'lucide-react'
import api from '../services/api'

function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''

  const [checking, setChecking] = useState(true)
  const [validToken, setValidToken] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  // Vérifier la validité du token au chargement de la page
  useEffect(() => {
    if (!token) {
      setValidToken(false)
      setChecking(false)
      return
    }
    api
      .get(`/auth/reset-password/${token}`)
      .then(() => setValidToken(true))
      .catch(() => setValidToken(false))
      .finally(() => setChecking(false))
  }, [token])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas')
      return
    }
    if (password.length < 6) {
      setError('Le mot de passe doit faire au moins 6 caractères')
      return
    }

    setLoading(true)
    try {
      await api.post('/auth/reset-password', { token, password })
      setDone(true)
      setTimeout(() => navigate('/login'), 2500)
    } catch (err) {
      setError(err.response?.data?.message || 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  const Shell = ({ children }) => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Refrigerator className="mx-auto h-16 w-16 text-primary-600" />
          <h2 className="mt-4 text-3xl font-bold text-gray-900">Nouveau mot de passe</h2>
        </div>
        {children}
      </div>
    </div>
  )

  if (checking) {
    return (
      <Shell>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
        </div>
      </Shell>
    )
  }

  if (!validToken) {
    return (
      <Shell>
        <div className="bg-white p-8 rounded-xl shadow space-y-4 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-amber-500" />
          <p className="text-gray-700 text-sm">
            Ce lien de réinitialisation est invalide ou a expiré.
          </p>
          <Link
            to="/forgot-password"
            className="inline-block py-2 px-4 rounded-lg text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
          >
            Demander un nouveau lien
          </Link>
        </div>
      </Shell>
    )
  }

  if (done) {
    return (
      <Shell>
        <div className="bg-white p-8 rounded-xl shadow space-y-4 text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
          <p className="text-gray-700 text-sm">
            Votre mot de passe a été réinitialisé. Redirection vers la connexion...
          </p>
          <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium text-sm">
            Se connecter maintenant
          </Link>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <form className="mt-8 space-y-6 bg-white p-8 rounded-xl shadow" onSubmit={handleSubmit}>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>}

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Nouveau mot de passe
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <div>
          <label htmlFor="confirm" className="block text-sm font-medium text-gray-700">
            Confirmer le mot de passe
          </label>
          <input
            id="confirm"
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
        >
          {loading ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}
        </button>

        <p className="text-center text-sm text-gray-600">
          <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
            Retour à la connexion
          </Link>
        </p>
      </form>
    </Shell>
  )
}

export default ResetPassword
