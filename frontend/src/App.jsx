import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Layout from './components/Layout'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Products from './pages/Products'
import Expiring from './pages/Expiring'
import Locations from './pages/Locations'
import Household from './pages/Household'

function App() {
  const [user, setUser] = useState(null)
  const [selectedHouseholdId, setSelectedHouseholdId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')
    const savedHouseholdId = localStorage.getItem('selectedHouseholdId')

    if (token && savedUser) {
      const parsedUser = JSON.parse(savedUser)
      setUser(parsedUser)

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

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
    </div>
  )

  return (
    <Routes>
      <Route path="/login"    element={user ? <Navigate to="/" /> : <Login onLogin={login} />} />
      <Route path="/register" element={user ? <Navigate to="/" /> : <Register onLogin={login} />} />

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
        <Route path="products"  element={<Products />} />
        <Route path="expiring"  element={<Expiring />} />
        <Route path="locations" element={<Locations />} />
        <Route path="household" element={<Household />} />
      </Route>
    </Routes>
  )
}

export default App