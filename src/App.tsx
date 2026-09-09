
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { AuthProvider } from '@/presentation/features/auth/context/AuthContext'
import { ProtectedRoute } from '@/presentation/features/auth/components/ProtectedRoute'
import { LoginPage } from '@/presentation/features/auth/pages/LoginPage'
import { HomePage } from '@/presentation/features/home/pages/HomePage'
import { GenerateTriviaPage } from '@/presentation/features/trivias/pages/GenerateTriviaPage'
import { TriviasListPage } from '@/presentation/features/trivias/pages/TriviasListPage'
import { TriviaDetailPage } from '@/presentation/features/trivias/pages/TriviaDetailPage'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/home" element={<HomePage />} />
            <Route path="/generate-trivia" element={<GenerateTriviaPage />} />
            <Route path="/trivias" element={<TriviasListPage />} />
            <Route path="/trivias/:id" element={<TriviaDetailPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
