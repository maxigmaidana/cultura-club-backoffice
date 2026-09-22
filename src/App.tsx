
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { AuthProvider } from '@/presentation/features/auth/context/AuthContext'
import { ProtectedRoute } from '@/presentation/features/auth/components/ProtectedRoute'
import { LoginPage } from '@/presentation/features/auth/pages/LoginPage'
import { HomePage } from '@/presentation/features/home/pages/HomePage'
import { GenerateTriviaPage } from '@/presentation/features/trivias/pages/GenerateTriviaPage'
import { TriviasListPage } from '@/presentation/features/trivias/pages/TriviasListPage'
import { TriviaDetailPage } from '@/presentation/features/trivias/pages/TriviaDetailPage'
import { AvailabilityDashboardPage } from '@/presentation/features/availability/pages/AvailabilityDashboardPage'
import { PlayerAvailabilityDetailPage } from '@/presentation/features/availability/pages/PlayerAvailabilityDetailPage'
import { CreateInjuryPage } from '@/presentation/features/availability/pages/CreateInjuryPage'
import { InjuryDetailPage } from '@/presentation/features/availability/pages/InjuryDetailPage'

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
            <Route path="/availability" element={<AvailabilityDashboardPage />} />
            <Route path="/availability/players/:playerId" element={<PlayerAvailabilityDetailPage />} />
            <Route path="/availability/injuries/new" element={<CreateInjuryPage />} />
            <Route path="/availability/injuries/:injuryId" element={<InjuryDetailPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
