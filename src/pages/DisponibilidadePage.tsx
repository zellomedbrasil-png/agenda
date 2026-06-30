import { useState, useEffect } from 'react'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Clock, Loader2 } from 'lucide-react'

type DiaSemana = {
  id: number
  nome: string
  ativo: boolean
  horaInicio: string
  horaFim: string
}

export default function DisponibilidadePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const [dias, setDias] = useState<DiaSemana[]>([
    { id: 1, nome: 'Segunda-feira', ativo: true, horaInicio: '08:00', horaFim: '18:00' },
    { id: 2, nome: 'Terça-feira', ativo: true, horaInicio: '08:00', horaFim: '18:00' },
    { id: 3, nome: 'Quarta-feira', ativo: true, horaInicio: '08:00', horaFim: '18:00' },
    { id: 4, nome: 'Quinta-feira', ativo: true, horaInicio: '08:00', horaFim: '18:00' },
    { id: 5, nome: 'Sexta-feira', ativo: true, horaInicio: '08:00', horaFim: '17:00' },
    { id: 6, nome: 'Sábado', ativo: false, horaInicio: '09:00', horaFim: '12:00' },
    { id: 0, nome: 'Domingo', ativo: false, horaInicio: '09:00', horaFim: '12:00' },
  ])

  useEffect(() => {
    // In a real scenario, fetch from Supabase `disponibilidade` table
    setTimeout(() => setLoading(false), 500)
  }, [])

  const handleToggle = (id: number) => {
    setDias(dias.map(d => d.id === id ? { ...d, ativo: !d.ativo } : d))
  }

  const handleChangeTime = (id: number, field: 'horaInicio'|'horaFim', value: string) => {
    setDias(dias.map(d => d.id === id ? { ...d, [field]: value } : d))
  }

  const handleSave = async () => {
    setSaving(true)
    // Simulate API call
    setTimeout(() => {
      setSaving(false)
      toast({ title: 'Configurações salvas', description: 'Sua disponibilidade foi atualizada com sucesso.' })
    }, 600)
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Disponibilidade</h1>
        <p className="text-sm text-zinc-500">Configure seus dias e horários de atendimento padrão.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-xl shadow-sm divide-y divide-zinc-100">
          {dias.map((dia) => (
            <div key={dia.id} className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${dia.ativo ? 'bg-white' : 'bg-zinc-50'}`}>
              <div className="flex items-center gap-3 min-w-[160px]">
                <Switch 
                  checked={dia.ativo} 
                  onCheckedChange={() => handleToggle(dia.id)}
                />
                <span className={`font-medium ${dia.ativo ? 'text-zinc-900' : 'text-zinc-400'}`}>
                  {dia.nome}
                </span>
              </div>
              
              <div className={`flex items-center gap-2 transition-opacity ${dia.ativo ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                <div className="relative">
                  <Input 
                    type="time" 
                    value={dia.horaInicio} 
                    onChange={e => handleChangeTime(dia.id, 'horaInicio', e.target.value)}
                    className="w-[120px] bg-transparent" 
                  />
                </div>
                <span className="text-zinc-400">-</span>
                <div className="relative">
                  <Input 
                    type="time" 
                    value={dia.horaFim} 
                    onChange={e => handleChangeTime(dia.id, 'horaFim', e.target.value)}
                    className="w-[120px] bg-transparent" 
                  />
                </div>
              </div>
            </div>
          ))}
          
          <div className="p-4 bg-zinc-50/50 flex justify-end rounded-b-xl border-t border-zinc-200">
            <Button onClick={handleSave} disabled={saving} className="bg-zinc-900 text-white hover:bg-zinc-800">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar Alterações
            </Button>
          </div>
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-amber-800 text-sm">
        <Clock className="w-5 h-5 shrink-0 text-amber-600" />
        <p>
          <strong className="font-medium">Dica de Produtividade:</strong> Bloqueios específicos (férias, feriados ou plantões esporádicos) podem ser adicionados diretamente no Calendário clicando no horário e marcando como "Bloqueio".
        </p>
      </div>
    </div>
  )
}
