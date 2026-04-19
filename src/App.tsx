import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import AdminLibraryPage from './pages/AdminLibraryPage'
import AuthCallbackPage from './pages/AuthCallbackPage'
import ComplianceDashboardPage from './pages/ComplianceDashboardPage'
import DocumentDetailPage from './pages/DocumentDetailPage'
import HomePage from './pages/HomePage'
import NotificationsPage from './pages/NotificationsPage'
import RecentlyViewedPage from './pages/RecentlyViewedPage'
import SettingsPage from './pages/SettingsPage'
import UploadEditPage from './pages/UploadEditPage'
import { getThemeConfig, getThemeMode, setThemeMode } from './services/documentStore'

type ThemeMode = 'light' | 'dark'

function App() {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light')
  const [themeConfig, setThemeConfigState] = useState(() => ({
    light: {
      appBg: '#f4f7fb',
      headerBg: '#ffffff',
      menuBg: '#e8eef5',
      cardBg: '#ffffff',
      buttonBg: '#004a7c',
      accent: '#0078d4',
    },
    dark: {
      appBg: '#0f172a',
      headerBg: '#111827',
      menuBg: '#0b1324',
      cardBg: '#111827',
      buttonBg: '#004a7c',
      accent: '#38bdf8',
    },
  }))

  useEffect(() => {
    let mounted = true

    async function loadThemeSettings() {
      const [mode, config] = await Promise.all([getThemeMode(), getThemeConfig()])
      if (!mounted) return
      setThemeModeState(mode)
      setThemeConfigState(config)
    }

    void loadThemeSettings()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    void setThemeMode(themeMode)

    const palette = themeConfig[themeMode]
    const root = document.documentElement
    root.classList.toggle('theme-dark', themeMode === 'dark')
    root.style.setProperty('--app-bg', palette.appBg)
    root.style.setProperty('--header-bg', palette.headerBg)
    root.style.setProperty('--menu-bg', palette.menuBg)
    root.style.setProperty('--card-bg', palette.cardBg)
    root.style.setProperty('--button-bg', palette.buttonBg)
    root.style.setProperty('--accent-bg', palette.accent)
  }, [themeMode, themeConfig])

  function handleToggleThemeMode() {
    setThemeModeState(prevMode => (prevMode === 'light' ? 'dark' : 'light'))
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout themeMode={themeMode} onToggleThemeMode={handleToggleThemeMode} />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/documents/:id" element={<DocumentDetailPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/recent" element={<RecentlyViewedPage />} />
          <Route path="/admin/library" element={<AdminLibraryPage />} />
          <Route path="/admin/upload" element={<UploadEditPage mode="create" />} />
          <Route path="/admin/edit/:id" element={<UploadEditPage mode="edit" />} />
          <Route path="/admin/compliance" element={<ComplianceDashboardPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/auth/signed-in" element={<AuthCallbackPage />} />
        <Route path="/.auth/login/:provider/callback" element={<AuthCallbackPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
