import { Outlet, NavLink } from 'react-router-dom'
import { Refrigerator, Package, AlertTriangle, LogOut } from 'lucide-react'

function Layout({ user, onLogout }) {
  const navItems = [
    { to: '/', icon: Refrigerator, label: 'Accueil' },
    { to: '/products', icon: Package, label: 'Produits' },
    { to: '/expiring', icon: AlertTriangle, label: 'Péremptions' },
  ]

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
            <span className="text-sm text-gray-600">
              Bonjour, {user.firstName || user.email}
            </span>
            <button
              onClick={onLogout}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <LogOut className="h-4 w-4" />
              Déconnexion
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
