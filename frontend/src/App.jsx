import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Layout from './components/Layout'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Products from './pages/Products'
import Expiring from './pages/Expiring'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Vérifier si l'utilisateur est connecté
    const token = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')
    
    if (token && savedUser) {
      setUser(JSON.parse(savedUser))
    }
    setLoading(false)
  }, [])

  const login = (userData, token) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
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
        element={user ? <Layout user={user} onLogout={logout} /> : <Navigate to="/login" />}
      >
        <Route index element={<Home />} />
        <Route path="products" element={<Products />} />
        <Route path="expiring" element={<Expiring />} />
      </Route>
    </Routes>
  )
}

export default App
