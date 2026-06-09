import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Layout from './components/Layout'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Products from './pages/Products'
import Locations from './pages/Locations'
import ShoppingLists from './pages/ShoppingLists'
import Recipes from './pages/Recipes'
import Stats from './pages/Stats'
import Expiring from './pages/Expiring'
import Household from './pages/Household'
import Profile from './pages/Profile'

function App() {
  const [user, setUser] = useState(null)
  const [selectedHouseholdId, setSelectedHouseholdId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Vérifier si l'utilisateur est connecté
    const token = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')
    const savedHouseholdId = localStorage.getItem('selectedHouseholdId')

    if (token && savedUser) {
      const parsedUser = JSON.parse(savedUser)
      setUser(parsedUser)

      // Si un householdId est déjà stocké, on le garde
      // Sinon, on prend le premier foyer disponible
      if (savedHouseholdId) {
        setSelectedHouseholdId(parseInt(savedHouseholdId, 10))
      } else if (parsedUser.households?.length > 0) {
        const firstId = parsedUser.households[0].id
        setSelectedHouseholdId(firstId)
        localStorage.setItem('selectedHouseholdId', firstId)
      }
    }
    setLoading(false)
  }, [])

  const login = (userData, token) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)

    // Sélectionner automatiquement le premier foyer
    if (userData.households?.length > 0) {
      const firstId = userData.households[0].id
      setSelectedHouseholdId(firstId)
      localStorage.setItem('selectedHouseholdId', firstId)
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('selectedHouseholdId')
    setUser(null)
    setSelectedHouseholdId(null)
  }

  const handleSelectHousehold = (householdId) => {
    setSelectedHouseholdId(householdId)
    localStorage.setItem('selectedHouseholdId', householdId)
    window.location.reload()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <Routes>
      {/* Routes publiques */}
      <Route
        path="/login"
        element={user ? <Navigate to="/" /> : <Login onLogin={login} />}
      />
      <Route
        path="/register"
        element={user ? <Navigate to="/" /> : <Register onLogin={login} />}
      />

      {/* Routes protégées */}
      <Route
        path="/"
        element={user ? (
          <Layout
            user={user}
            households={user?.households || []}
            selectedHouseholdId={selectedHouseholdId}
            onSelectHousehold={handleSelectHousehold}
            onLogout={logout}
          />
        ) : <Navigate to="/login" />}
      >
        <Route index element={<Home />} />
        <Route path="products" element={<Products />} />
        <Route path="locations" element={<Locations />} />
        <Route path="shopping" element={<ShoppingLists />} />
        <Route path="recipes" element={<Recipes />} />
        <Route path="stats" element={<Stats />} />
        <Route path="expiring" element={<Expiring />} />
        <Route path="household" element={<Household />} />
        <Route path="profile" element={<Profile />} />
      </Route>
    </Routes>
  )
}

export default App
