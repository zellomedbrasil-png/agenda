import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const { setUser, setProfile } = useAuthStore()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    // Login Simples Hardcoded
    setTimeout(() => {
      const userLower = username.toLowerCase().trim()
      const passLower = password.toLowerCase().trim()

      if (userLower === 'sara' && passLower === 'sara') {
        setUser({ id: 'secretaria-id', email: 'sara@arcanjo' } as any)
        setProfile({ id: 'secretaria-id', nome: 'Sara (Secretária)', role: 'secretaria' })
        navigate('/')
      } else if (userLower === 'roberto' && passLower === 'roberto') {
        setUser({ id: 'medico-id', email: 'roberto@arcanjo' } as any)
        setProfile({ id: 'medico-id', nome: 'Dr. Roberto (Médico)', role: 'medico' })
        navigate('/')
      } else {
        setError('Usuário ou senha incorretos! Use "roberto" ou "sara".')
      }
      setLoading(false)
    }, 500)
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
              <Label htmlFor="username">Usuário</Label>
              <Input 
                id="username" 
                type="text" 
                placeholder="sara ou roberto" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
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
