import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const { setUser, setProfile } = useAuthStore()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    // MOCK LOGIN PARA EXEMPLO LOCAL
    if (import.meta.env.VITE_SUPABASE_URL.includes('your-project-url')) {
      setTimeout(() => {
        if (password !== '123456') {
          setError('Senha incorreta!')
          setLoading(false)
          return
        }

        const isSecretaria = email.toLowerCase().includes('sara')
        const isMedico = email.toLowerCase().includes('roberto')

        if (!isSecretaria && !isMedico) {
          setError('Usuário não cadastrado! Use os logins sara ou roberto.')
          setLoading(false)
          return
        }

        if (isSecretaria) {
          setUser({ id: 'fake-secretaria-id', email } as any)
          setProfile({ id: 'fake-secretaria-id', nome: 'Sara (Secretária)', role: 'secretaria' })
        } else {
          setUser({ id: 'fake-medico-id', email } as any)
          setProfile({ id: 'fake-medico-id', nome: 'Dr. Roberto (Médico)', role: 'medico' })
        }

        navigate('/')
        setLoading(false)
      }, 500)
      return
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
    }
    setLoading(false)
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Login</CardTitle>
          <CardDescription>
            Acesse o sistema de agendamento
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-white bg-destructive rounded-md">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="nome@exemplo.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input 
                id="password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
