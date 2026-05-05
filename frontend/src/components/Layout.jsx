import { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { Refrigerator, Package, AlertTriangle, LogOut, Users, ChevronDown, Home } from 'lucide-react'

function Layout({ user, households, selectedHouseholdId, onSelectHousehold, onLogout }) {
  const [showDropdown, setShowDropdown] = useState(false)

  const navItems = [
    { to: '/', icon: Refrigerator, label: 'Accueil' },
    { to: '/products', icon: Package, label: 'Produits' },
    { to: '/expiring', icon: AlertTriangle, label: 'Péremptions' },
    { to: '/household', icon: Users, label: 'Mon foyer' },
  ]

  const activeHousehold = households.find((h) => h.id === selectedHouseholdId)

  const handleSwitch = (householdId) => {
    setShowDropdown(false)
    onSelectHousehold(householdId)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Refrigerator className="h-8 w-8 text-primary-600" />
            <h1 className="text-xl font-bold text-gray-900">MySmartFridge</h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Sélecteur de foyer */}
            {households.length > 1 && (
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm text-gray-700 transition-colors"
                >
                  <Home className="h-4 w-4 text-primary-600" />
                  <span className="max-w-[150px] truncate">
                    {activeHousehold?.name || 'Choisir un foyer'}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)}></div>
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border z-20 py-1">
                      <p className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Mes foyers</p>
                      {households.map((h) => (
                        <button
                          key={h.id}
                          onClick={() => handleSwitch(h.id)}
                          className={`w-full text-left px-3 py-2.5 text-sm flex items-center justify-between hover:bg-gray-50 transition-colors ${
                            h.id === selectedHouseholdId ? 'bg-primary-50 text-primary-700' : 'text-gray-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="h-6 w-6 rounded-full flex items-center justify-center text-white text-xs font-medium"
                              style={{ backgroundColor: h.color || '#6366f1' }}
                            >
                              {h.name?.charAt(0).toUpperCase()}
                            </div>
                            <span className="truncate">{h.name}</span>
                          </div>
                          {h.id === selectedHouseholdId && (
                            <span className="text-xs font-medium text-primary-600">Actif</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Nom utilisateur */}
            <span className="text-sm text-gray-600 hidden sm:inline">
              Bonjour, {user.name || user.email}
            </span>

            {/* Déconnexion */}
            <button
              onClick={onLogout}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </header>

      {/* Navigation mobile */}
      <nav className="bg-white border-b md:hidden">
        <div className="flex justify-around">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center py-3 px-4 text-xs ${
                  isActive
                    ? 'text-primary-600 border-b-2 border-primary-600'
                    : 'text-gray-500'
                }`
              }
            >
              <Icon className="h-5 w-5 mb-1" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="max-w-7xl mx-auto flex">
        {/* Sidebar desktop */}
        <aside className="hidden md:block w-64 bg-white border-r min-h-[calc(100vh-73px)] p-4">
          <nav className="space-y-2">
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`
                }
              >
                <Icon className="h-5 w-5" />
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Contenu principal */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default Layout
