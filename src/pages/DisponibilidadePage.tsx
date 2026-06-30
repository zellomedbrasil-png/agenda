import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Clock, Plus, Trash2, Loader2, Save } from 'lucide-react'

export type AgendaBlock = {
  id: string
  dayOfWeek: number
  startTime: string
  endTime: string
  title: string
  color: string
}

const DEFAULT_BLOCKS: AgendaBlock[] = [
  { id: '1', dayOfWeek: 0, startTime: '08:00', endTime: '17:00', title: 'Folga', color: '#f8cdd1' },
  { id: '2', dayOfWeek: 1, startTime: '08:00', endTime: '12:00', title: 'Messejana', color: '#fce4cf' },
  { id: '3', dayOfWeek: 1, startTime: '13:00', endTime: '17:00', title: 'Livre', color: '#e7e6e6' },
  { id: '4', dayOfWeek: 2, startTime: '08:00', endTime: '12:00', title: 'Aldeota', color: '#fef1cd' },
  { id: '5', dayOfWeek: 2, startTime: '13:00', endTime: '17:00', title: 'Aldeota', color: '#fef1cd' },
  { id: '6', dayOfWeek: 3, startTime: '08:00', endTime: '12:00', title: 'RioMar K.', color: '#d2eadd' },
  { id: '7', dayOfWeek: 3, startTime: '13:00', endTime: '17:00', title: 'N.Shopping', color: '#d2eadd' },
  { id: '8', dayOfWeek: 4, startTime: '08:00', endTime: '12:00', title: 'SIM Jóquei', color: '#bbf0c8' },
  { id: '9', dayOfWeek: 4, startTime: '13:00', endTime: '17:00', title: 'Mult Clinic', color: '#bbf0c8' },
  { id: '10', dayOfWeek: 5, startTime: '08:00', endTime: '12:00', title: 'Consultório', color: '#dcd0ef' },
  { id: '11', dayOfWeek: 5, startTime: '13:00', endTime: '17:00', title: 'Consultório', color: '#dcd0ef' },
  { id: '12', dayOfWeek: 6, startTime: '08:00', endTime: '12:00', title: 'Messejana', color: '#e7e6e6' },
  { id: '13', dayOfWeek: 6, startTime: '13:00', endTime: '17:00', title: 'Livre', color: '#e7e6e6' }
]

const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
  { value: 6, label: 'Sábado' },
]

export default function DisponibilidadePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [blocks, setBlocks] = useState<AgendaBlock[]>([])
  const { toast } = useToast()

  useEffect(() => {
    const saved = localStorage.getItem('agenda_blocos')
    if (saved) {
      try {
        setBlocks(JSON.parse(saved))
      } catch (e) {
        setBlocks(DEFAULT_BLOCKS)
      }
    } else {
      setBlocks(DEFAULT_BLOCKS)
    }
    setLoading(false)
  }, [])

  const handleAddBlock = () => {
    const newBlock: AgendaBlock = {
      id: Math.random().toString(36).substring(7),
      dayOfWeek: 1,
      startTime: '08:00',
      endTime: '12:00',
      title: 'Novo Local',
      color: '#e7e6e6'
    }
    setBlocks([...blocks, newBlock])
  }

  const handleRemoveBlock = (id: string) => {
    setBlocks(blocks.filter(b => b.id !== id))
  }

  const handleChange = (id: string, field: keyof AgendaBlock, value: string | number) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, [field]: value } : b))
  }

  const handleSave = () => {
    setSaving(true)
    setTimeout(() => {
      localStorage.setItem('agenda_blocos', JSON.stringify(blocks))
      setSaving(false)
      toast({ title: 'Configurações salvas', description: 'Sua agenda fixa foi atualizada com sucesso.' })
    }, 600)
  }

  return (
    <div className="space-y-6 max-w-5xl pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Agenda Fixa & Locais</h1>
          <p className="text-sm text-zinc-500">Configure os blocos de horário para as empresas onde você atende.</p>
        </div>
        <Button onClick={handleSave} disabled={saving || loading} className="bg-zinc-900 text-white hover:bg-zinc-800">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Salvar Agenda
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-4 py-3 min-w-[140px]">Dia da Semana</th>
                  <th className="px-4 py-3 min-w-[120px]">Início</th>
                  <th className="px-4 py-3 min-w-[120px]">Fim</th>
                  <th className="px-4 py-3 min-w-[200px]">Estabelecimento / Status</th>
                  <th className="px-4 py-3 min-w-[100px]">Cor</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {blocks.sort((a, b) => a.dayOfWeek - b.dayOfWeek).map(block => (
                  <tr key={block.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <Select 
                        value={block.dayOfWeek.toString()} 
                        onValueChange={(val) => handleChange(block.id, 'dayOfWeek', parseInt(val))}
                      >
                        <SelectTrigger className="bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DAYS_OF_WEEK.map(day => (
                            <SelectItem key={day.value} value={day.value.toString()}>{day.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      <Input 
                        type="time" 
                        value={block.startTime} 
                        onChange={(e) => handleChange(block.id, 'startTime', e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input 
                        type="time" 
                        value={block.endTime} 
                        onChange={(e) => handleChange(block.id, 'endTime', e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input 
                        type="text" 
                        value={block.title} 
                        onChange={(e) => handleChange(block.id, 'title', e.target.value)}
                        placeholder="Ex: Clínica João XXIII"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Input 
                          type="color" 
                          value={block.color} 
                          onChange={(e) => handleChange(block.id, 'color', e.target.value)}
                          className="w-10 h-10 p-1 cursor-pointer bg-white"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleRemoveBlock(block.id)}
                        className="text-zinc-400 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {blocks.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                      Nenhum bloco de agenda configurado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="p-4 bg-zinc-50/50 border-t border-zinc-200">
            <Button onClick={handleAddBlock} variant="outline" className="w-full sm:w-auto border-dashed border-zinc-300 text-zinc-600 hover:text-zinc-900">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Bloco de Horário
            </Button>
          </div>
        </div>
      )}

      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex gap-3 text-indigo-800 text-sm">
        <Clock className="w-5 h-5 shrink-0 text-indigo-600" />
        <p>
          <strong className="font-medium">Como Funciona:</strong> Estes blocos serão exibidos como "eventos de fundo" (background) coloridos na sua Agenda principal, permitindo que você marque as consultas dos pacientes visualmente em cima de cada local. Lembre-se de clicar em <b>Salvar Agenda</b> após fazer alterações.
        </p>
      </div>
    </div>
  )
}
