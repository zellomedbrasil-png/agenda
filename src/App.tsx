
import { Toaster } from '@/components/ui/toaster'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import Layout from '@/components/Layout'
import Login from '@/pages/Login'
import CalendarPage from '@/pages/CalendarPage'
import PacientesPage from '@/pages/PacientesPage'
import DisponibilidadePage from '@/pages/DisponibilidadePage'
import AnalisesPage from '@/pages/AnalisesPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<CalendarPage />} />
          <Route path="pacientes" element={<PacientesPage />} />
          <Route path="disponibilidade" element={<DisponibilidadePage />} />
          <Route path="analises" element={<AnalisesPage />} />
        </Route>
      </Routes>
      <Toaster />
    </BrowserRouter>
  )
}
