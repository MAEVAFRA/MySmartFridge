import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Refrigerator, ArrowLeft } from 'lucide-react'
import api from '../services/api'

function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [devUrl, setDevUrl] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await api.post('/auth/forgot-password', { email })
      setSent(true)
      if (response.data?.dev_reset_url) setDevUrl(response.data.dev_reset_url)
    } catch (err) {
      setError(err.response?.data?.message || 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  // En dev, transformer l'URL absolue en chemin interne pour la navigation SPA
  const devPath = devUrl.replace(/^https?:\/\/[^/]+/, '')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Refrigerator className="mx-auto h-16 w-16 text-primary-600" />
          <h2 className="mt-4 text-3xl font-bold text-gray-900">Mot de passe oublié</h2>
          <p className="mt-2 text-gray-600">
            Entrez votre email pour recevoir un lien de réinitialisation
          </p>
        </div>

        {sent ? (
          <div className="bg-white p-8 rounded-xl shadow space-y-4">
            <div className="bg-green-50 text-green-700 p-4 rounded-lg text-sm">
              Si un compte est associé à cet email, un lien de réinitialisation vient
              d'être envoyé. Pensez à vérifier vos spams.
            </div>

            {devPath && (
              <div className="bg-amber-50 text-amber-800 p-3 rounded-lg text-xs break-all">
                <p className="font-medium mb-1">🔧 Mode dev — lien direct&nbsp;:</p>
                <Link to={devPath} className="underline text-amber-900 hover:text-amber-950">
                  {devUrl}
                </Link>
              </div>
            )}

            <Link
              to="/login"
              className="flex items-center justify-center gap-2 text-primary-600 hover:text-primary-700 font-medium text-sm"
            >
              <ArrowLeft className="h-4 w-4" /> Retour à la connexion
            </Link>
          </div>
        ) : (
          <form className="mt-8 space-y-6 bg-white p-8 rounded-xl shadow" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {loading ? 'Envoi...' : 'Envoyer le lien'}
            </button>

            <p className="text-center text-sm text-gray-600">
              <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                Retour à la connexion
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}

export default ForgotPassword
