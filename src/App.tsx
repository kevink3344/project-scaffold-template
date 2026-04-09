import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import ApiPlaygroundPage from './pages/ApiPlaygroundPage'
import HomePage from './pages/HomePage'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/api-playground" element={<ApiPlaygroundPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
