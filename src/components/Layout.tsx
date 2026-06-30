import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Calendar, Users, BarChart3, LogOut, Clock } from 'lucide-react'

export default function Layout() {
  const { profile, setUser, setProfile } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    navigate('/login')
  }

  const navItems = [
    { name: 'Calendário', path: '/', icon: Calendar, show: true },
    { name: 'Pacientes', path: '/pacientes', icon: Users, show: true },
    { name: 'Disponibilidade', path: '/disponibilidade', icon: Clock, show: true },
    { name: 'Análises', path: '/analises', icon: BarChart3, show: true }, // The planning says secretary can see some tabs
  ]

  return (
    <div className="flex flex-col md:flex-row h-screen bg-white text-zinc-900 font-sans overflow-hidden">
      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex w-[240px] border-r border-zinc-200 bg-zinc-50/50 flex-col shrink-0">
        <div className="p-6 pb-4">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded bg-zinc-900 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-sm font-semibold text-zinc-900 tracking-tight">Arcanjo Agenda</h2>
          </div>
          <p className="text-sm font-medium text-zinc-900">
            {profile?.nome || 'Carregando...'}
          </p>
          <span className="text-[11px] uppercase tracking-wider font-semibold text-zinc-500">
            {profile?.role}
          </span>
        </div>
        
        <nav className="flex-1 px-4 space-y-1 mt-4">
          {navItems.filter(item => item.show).map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link 
                key={item.path} 
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  isActive 
                    ? 'bg-zinc-200/60 text-zinc-900' 
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                }`}
              >
                <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-4">
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100" 
            onClick={handleLogout}
          >
            <LogOut size={16} />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 md:p-8 lg:p-12 bg-white pb-24 md:pb-12">
        <div className="max-w-5xl mx-auto">
          <Outlet />
        </div>
      </main>

      {/* Bottom Navigation (Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 flex items-center justify-around pb-safe pt-1 px-2 z-50 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
        {navItems.filter(item => item.show).map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          return (
            <Link 
              key={item.path} 
              to={item.path}
              className={`flex flex-col items-center justify-center w-[60px] h-14 rounded-xl transition-all duration-200 ${
                isActive 
                  ? 'text-zinc-900' 
                  : 'text-zinc-400 hover:text-zinc-600'
              }`}
            >
              <div className={`flex items-center justify-center w-8 h-8 rounded-full mb-0.5 ${isActive ? 'bg-zinc-100' : ''}`}>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`text-[10px] font-medium leading-none ${isActive ? 'font-semibold' : ''}`}>{item.name}</span>
            </Link>
          )
        })}
        <button 
          className="flex flex-col items-center justify-center w-[60px] h-14 rounded-xl text-zinc-400 hover:text-zinc-600 transition-all duration-200" 
          onClick={handleLogout}
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-full mb-0.5">
            <LogOut size={20} />
          </div>
          <span className="text-[10px] font-medium leading-none">Sair</span>
        </button>
      </nav>
    </div>
  )
}
