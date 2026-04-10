import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('dh_token'))
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(!!localStorage.getItem('dh_token'))

  const fetchMe = useCallback(async () => {
    try {
      const { data } = await api.get('/api/auth/me')
      setAdmin(data)
    } catch {
      logout()
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (token) fetchMe()
  }, [token, fetchMe])

  const login = async (email, password) => {
    const { data } = await api.post('/api/auth/login', { email, password })
    localStorage.setItem('dh_token', data.access_token)
    setToken(data.access_token)
    await fetchMe()
    return data
  }

  const logout = () => {
    localStorage.removeItem('dh_token')
    setToken(null)
    setAdmin(null)
  }

  return (
    <AuthContext.Provider value={{ token, admin, loading, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
