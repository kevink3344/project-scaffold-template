import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import AdminLibraryPage from './pages/AdminLibraryPage'
import AuthCallbackPage from './pages/AuthCallbackPage'
import ComplianceDashboardPage from './pages/ComplianceDashboardPage'
import DocumentDetailPage from './pages/DocumentDetailPage'
import HomePage from './pages/HomePage'
import RecentlyViewedPage from './pages/RecentlyViewedPage'
import SettingsPage from './pages/SettingsPage'
import UploadEditPage from './pages/UploadEditPage'
import { getThemeConfig, getThemeMode, setThemeMode } from './services/documentStore'

type ThemeMode = 'light' | 'dark'

function App() {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => getThemeMode())

  useEffect(() => {
    setThemeMode(themeMode)

    const palette = getThemeConfig()[themeMode]
    const root = document.documentElement
    root.classList.toggle('theme-dark', themeMode === 'dark')
    root.style.setProperty('--app-bg', palette.appBg)
    root.style.setProperty('--header-bg', palette.headerBg)
    root.style.setProperty('--menu-bg', palette.menuBg)
    root.style.setProperty('--card-bg', palette.cardBg)
    root.style.setProperty('--button-bg', palette.buttonBg)
    root.style.setProperty('--accent-bg', palette.accent)
  }, [themeMode])

  function handleToggleThemeMode() {
    setThemeModeState(prevMode => (prevMode === 'light' ? 'dark' : 'light'))
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout themeMode={themeMode} onToggleThemeMode={handleToggleThemeMode} />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/documents/:id" element={<DocumentDetailPage />} />
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
