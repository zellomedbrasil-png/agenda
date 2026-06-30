import { useEffect } from 'react'
import { Toaster } from '@/components/ui/toaster'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import Layout from '@/components/Layout'
import Login from '@/pages/Login'
import CalendarPage from '@/pages/CalendarPage'
import PacientesPage from '@/pages/PacientesPage'
import DisponibilidadePage from '@/pages/DisponibilidadePage'
import AnalisesPage from '@/pages/AnalisesPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore()

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Carregando...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default function App() {
  const { setUser, setProfile, setIsLoading } = useAuthStore()

  useEffect(() => {
    if (import.meta.env.VITE_SUPABASE_URL.includes('your-project-url')) {
      setIsLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setIsLoading(false)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setIsLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (data) {
      setProfile(data)
    }
    setIsLoading(false)
  }

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
