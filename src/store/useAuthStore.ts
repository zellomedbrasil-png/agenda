import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@supabase/supabase-js'

interface Profile {
  id: string
  nome: string
  role: 'medico' | 'secretaria'
}

interface AuthState {
  user: User | null
  profile: Profile | null
  isLoading: boolean
  setUser: (user: User | null) => void
  setProfile: (profile: Profile | null) => void
  setIsLoading: (isLoading: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      profile: null,
      isLoading: false,
      setUser: (user) => set({ user }),
      setProfile: (profile) => set({ profile }),
      setIsLoading: (isLoading) => set({ isLoading }),
      logout: () => set({ user: null, profile: null })
    }),
    {
      name: 'auth-storage', // nome no localStorage
    }
  )
)
