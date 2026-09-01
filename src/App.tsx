
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { AuthProvider } from '@/presentation/features/auth/context/AuthContext'
import { ProtectedRoute } from '@/presentation/features/auth/components/ProtectedRoute'
import { LoginPage } from '@/presentation/features/auth/pages/LoginPage'
import { HomePage } from '@/presentation/features/home/pages/HomePage'
import { GenerateTriviaPage } from '@/presentation/features/trivias/pages/GenerateTriviaPage'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/home" element={<HomePage />} />
            <Route path="/generate-trivia" element={<GenerateTriviaPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
