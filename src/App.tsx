import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import ApiPlaygroundPage from './pages/ApiPlaygroundPage'
import AuthCallbackPage from './pages/AuthCallbackPage'
import HomePage from './pages/HomePage'
import NotificationsPage from './pages/NotificationsPage'
import SettingsPage from './pages/SettingsPage'
import './App.css'

type ThemeMode = 'light' | 'dark'

function App() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const savedMode = localStorage.getItem('themeMode')
    return savedMode === 'dark' ? 'dark' : 'light'
  })

  useEffect(() => {
    localStorage.setItem('themeMode', themeMode)
    document.documentElement.classList.toggle('theme-dark', themeMode === 'dark')
  }, [themeMode])

  function handleToggleThemeMode() {
    setThemeMode(prevMode => (prevMode === 'light' ? 'dark' : 'light'))
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout themeMode={themeMode} onToggleThemeMode={handleToggleThemeMode} />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/api-playground" element={<ApiPlaygroundPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
