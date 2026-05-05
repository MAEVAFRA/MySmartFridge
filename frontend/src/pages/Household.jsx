import { useState, useEffect } from 'react'
import {
  Users, Mail, Copy, Check, X, LogOut, Crown, Shield, Eye, Edit3, User,
  RefreshCw, Home, Plus, Trash2, AlertTriangle, CheckCircle, Clock
} from 'lucide-react'
import api from '../services/api'

function Household() {
  const [households, setHouseholds] = useState([])
  const [household, setHousehold] = useState(null)
  const [pendingReceived, setPendingReceived] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Invitation form
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchInitialData()
  }, [])

  const fetchInitialData = async () => {
    try {
      setLoading(true)
      const [householdsRes, invitesRes] = await Promise.all([
        api.get('/households'),
        api.get('/households/invitations/pending'),
      ])
      setHouseholds(householdsRes.data)
      setPendingReceived(invitesRes.data)

      if (householdsRes.data.length > 0) {
        await fetchHouseholdDetail(householdsRes.data[0].id)
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  const fetchHouseholdDetail = async (id) => {
    try {
      const res = await api.get(`/households/${id}`)
      setHousehold(res.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur de chargement du foyer')
    }
  }

  const handleInvite = async (e) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return

    setInviteLoading(true)
    setError('')
    try {
      await api.post(`/households/${household.id}/invite`, {
        email: inviteEmail,
        role: inviteRole,
      })
      setInviteEmail('')
      setInviteRole('member')
      await fetchHouseholdDetail(household.id)
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de l\'invitation')
    } finally {
      setInviteLoading(false)
    }
  }

  const handleCopyLink = () => {
    if (!household?.invite_token) return
    const link = `${window.location.origin}/register?invite=${household.invite_token}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleAcceptInvite = async (token) => {
    try {
      await api.post('/households/invite/accept', { token })
      await fetchInitialData()
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de l\'acceptation')
    }
  }

  const handleDeclineInvite = async (token) => {
    try {
      await api.post('/households/invite/decline', { token })
      setPendingReceived((prev) => prev.filter((i) => i.token !== token))
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors du refus')
    }
  }

  const handleLeave = async () => {
    if (!confirm('Voulez-vous vraiment quitter ce foyer ?')) return
    try {
      await api.post(`/households/${household.id}/leave`)
      await fetchInitialData()
      setHousehold(null)
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors du départ')
    }
  }

  const handleRemoveMember = async (userId) => {
    if (!confirm('Retirer ce membre du foyer ?')) return
    try {
      await api.delete(`/households/${household.id}/members/${userId}`)
      await fetchHouseholdDetail(household.id)
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors du retrait')
    }
  }

  const handleRefreshToken = async () => {
    try {
      await api.post(`/households/${household.id}/refresh-token`)
      await fetchHouseholdDetail(household.id)
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la régénération')
    }
  }

  const getRoleIcon = (role) => {
    if (role === 'owner') return <Crown className="h-4 w-4 text-amber-500" />
    if (role === 'admin') return <Shield className="h-4 w-4 text-blue-500" />
    if (role === 'editor') return <Edit3 className="h-4 w-4 text-green-500" />
    return <Eye className="h-4 w-4 text-gray-400" />
  }

  const getRoleLabel = (role) => {
    const labels = { owner: 'Propriétaire', admin: 'Administrateur', editor: 'Éditeur', viewer: 'Lecteur' }
    return labels[role] || role
  }

  const getRoleBadgeClass = (role) => {
    if (role === 'owner') return 'bg-amber-100 text-amber-800'
    if (role === 'admin') return 'bg-blue-100 text-blue-800'
    if (role === 'editor') return 'bg-green-100 text-green-800'
    return 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Titre */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Mon foyer</h1>
        {household?.my_role === 'owner' && (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800">
            <Crown className="h-4 w-4" />
            Propriétaire
          </span>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          {error}
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Invitations reçues */}
      {pendingReceived.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-blue-900">Invitations en attente</h2>
          </div>
          <div className="space-y-3">
            {pendingReceived.map((inv) => (
              <div key={inv.id} className="bg-white rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    Invitation à rejoindre <span className="text-primary-700">{inv.household?.name}</span>
                  </p>
                  <p className="text-sm text-gray-500">
                    Envoyée par {inv.invited_by?.name || 'un membre'} • Expire le {new Date(inv.expires_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDeclineInvite(inv.token)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
                  >
                    Refuser
                  </button>
                  <button
                    onClick={() => handleAcceptInvite(inv.token)}
                    className="px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm flex items-center gap-1"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Accepter
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!household ? (
        <div className="bg-white rounded-xl shadow p-12 text-center">
          <Home className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun foyer</h3>
          <p className="text-gray-500 mb-4">Vous n'appartenez à aucun foyer pour le moment.</p>
        </div>
      ) : (
        <>
          {/* Carte foyer */}
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{household.name}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {household.members?.length || 0} membre(s) • Budget : {household.monthly_budget || '—'} {household.currency}
                </p>
              </div>
              {household.my_role !== 'viewer' && (
                <button
                  onClick={handleRefreshToken}
                  className="p-2 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-gray-50"
                  title="Régénérer le lien d'invitation"
                >
                  <RefreshCw className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Lien d'invitation */}
            <div className="bg-gray-50 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Lien d'invitation</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/register?invite=${household.invite_token}`}
                  className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-600"
                />
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copié' : 'Copier'}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Partagez ce lien pour inviter directement. Le lien expire le {household.invite_token_expires_at ? new Date(household.invite_token_expires_at).toLocaleDateString('fr-FR') : '—'}.
              </p>
            </div>
          </div>

          {/* Membres */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-primary-600" />
              Membres
            </h3>
            <div className="space-y-3">
              {household.members?.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-full flex items-center justify-center text-white font-medium text-sm"
                      style={{ backgroundColor: member.color || '#6366f1' }}
                    >
                      {member.name?.charAt(0).toUpperCase() || <User className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{member.name}</p>
                      <p className="text-sm text-gray-500">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getRoleBadgeClass(member.role)}`}>
                      {getRoleIcon(member.role)}
                      {getRoleLabel(member.role)}
                    </span>
                    {household.my_role !== 'viewer' && member.id !== JSON.parse(localStorage.getItem('user') || '{}').id && (
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                        title="Retirer du foyer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Invitations envoyées en attente */}
          {household.pending_invitations?.length > 0 && (
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-500" />
                Invitations envoyées en attente
              </h3>
              <div className="space-y-2">
                {household.pending_invitations.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-orange-500" />
                      <span className="text-sm text-gray-700">{inv.email}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeClass(inv.role)}`}>
                        {getRoleLabel(inv.role)}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      Expire le {new Date(inv.expires_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Formulaire d'invitation par email */}
          {canManageMembers(household.my_role) && (
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary-600" />
                Inviter un membre
              </h3>
              <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <input
                    type="email"
                    required
                    placeholder="email@exemple.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  />
                </div>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                >
                  <option value="member">Membre</option>
                  <option value="editor">Éditeur</option>
                  <option value="admin">Administrateur</option>
                  <option value="viewer">Lecteur</option>
                </select>
                <button
                  type="submit"
                  disabled={inviteLoading}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm disabled:opacity-50"
                >
                  <Mail className="h-4 w-4" />
                  {inviteLoading ? 'Envoi...' : 'Inviter'}
                </button>
              </form>
            </div>
          )}

          {/* Quitter le foyer */}
          <div className="flex justify-end">
            <button
              onClick={handleLeave}
              className="flex items-center gap-2 text-red-600 hover:text-red-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Quitter ce foyer
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// Helper côté frontend pour vérifier les permissions
function canManageMembers(role) {
  return role === 'owner' || role === 'admin'
}

export default Household
