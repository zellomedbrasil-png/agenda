import { useState, useEffect } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { supabase } from '@/lib/supabase'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useAuthStore } from '@/store/useAuthStore'
import { Loader2, Save, CheckCircle2, Printer, Clock, Settings, Trash2 } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import TextareaAutosize from 'react-textarea-autosize'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'

type Event = {
  id: string
  title: string
  start: string
  end: string
  paciente_id?: string
  tipo?: string
  status?: string
  valor?: number | null
  observacoes?: string | null
}

type Paciente = {
  id: string
  nome: string
}

const CIDS_COMUNS = [
  { codigo: 'I10', descricao: 'Hipertensão essencial (primária)' },
  { codigo: 'E11', descricao: 'Diabetes mellitus não-insulino-dependente' },
  { codigo: 'J00', descricao: 'Nasofaringite aguda (resfriado comum)' },
  { codigo: 'J03', descricao: 'Amigdalite aguda' },
  { codigo: 'M54.5', descricao: 'Dor lombar baixa (Lombalgia)' },
  { codigo: 'K21', descricao: 'Doença de refluxo gastroesofágico' },
  { codigo: 'N39.0', descricao: 'Infecção do trato urinário de localização não especificada' },
  { codigo: 'F41.1', descricao: 'Ansiedade generalizada' },
  { codigo: 'F32.9', descricao: 'Episódio depressivo não especificado' },
  { codigo: 'R51', descricao: 'Cefaleia' },
  { codigo: 'G43', descricao: 'Enxaqueca' },
  { codigo: 'H10', descricao: 'Conjuntivite' },
  { codigo: 'J06.9', descricao: 'Infecção aguda das vias aéreas superiores não especificada' },
  { codigo: 'E78.5', descricao: 'Hiperlipidemia não especificada' },
  { codigo: 'E03.9', descricao: 'Hipotireoidismo não especificado' },
  { codigo: 'I25.9', descricao: 'Doença isquêmica crônica do coração não especificada' },
  { codigo: 'J45', descricao: 'Asma' },
  { codigo: 'J44.9', descricao: 'Doença pulmonar obstrutiva crônica não especificada' }
]

const calcularIMC = (pesoStr: string, alturaStr: string) => {
  const peso = parseFloat(pesoStr)
  const altura = parseFloat(alturaStr) / 100 // cm to m
  if (isNaN(peso) || isNaN(altura) || altura <= 0) return { imc: '', class: '' }
  const imcVal = peso / (altura * altura)
  let imcClass = ''
  if (imcVal < 18.5) imcClass = 'Abaixo do peso'
  else if (imcVal < 24.9) imcClass = 'Saudável'
  else if (imcVal < 29.9) imcClass = 'Sobrepeso'
  else if (imcVal < 34.9) imcClass = 'Obesidade Grau I'
  else if (imcVal < 39.9) imcClass = 'Obesidade Grau II'
  else imcClass = 'Obesidade Grau III'
  return { imc: imcVal.toFixed(1), class: imcClass }
}

export default function CalendarPage() {
  const { profile } = useAuthStore()
  const [events, setEvents] = useState<Event[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [loading, setLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [agendaBlocks, setAgendaBlocks] = useState<any[]>([])

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    const defaultBlocks = [
      { daysOfWeek: [0], startTime: '08:00', endTime: '17:00', display: 'background', color: '#f8cdd1', title: 'Folga' },
      { daysOfWeek: [1], startTime: '08:00', endTime: '12:00', display: 'background', color: '#fce4cf', title: 'Messejana' },
      { daysOfWeek: [1], startTime: '13:00', endTime: '17:00', display: 'background', color: '#e7e6e6', title: 'Livre' },
      { daysOfWeek: [2], startTime: '08:00', endTime: '12:00', display: 'background', color: '#fef1cd', title: 'Aldeota' },
      { daysOfWeek: [2], startTime: '13:00', endTime: '17:00', display: 'background', color: '#fef1cd', title: 'Aldeota' },
      { daysOfWeek: [3], startTime: '08:00', endTime: '12:00', display: 'background', color: '#d2eadd', title: 'RioMar K.' },
      { daysOfWeek: [3], startTime: '13:00', endTime: '17:00', display: 'background', color: '#d2eadd', title: 'N.Shopping' },
      { daysOfWeek: [4], startTime: '08:00', endTime: '12:00', display: 'background', color: '#bbf0c8', title: 'SIM Jóquei' },
      { daysOfWeek: [4], startTime: '13:00', endTime: '17:00', display: 'background', color: '#bbf0c8', title: 'Mult Clinic' },
      { daysOfWeek: [5], startTime: '08:00', endTime: '12:00', display: 'background', color: '#dcd0ef', title: 'Consultório' },
      { daysOfWeek: [5], startTime: '13:00', endTime: '17:00', display: 'background', color: '#dcd0ef', title: 'Consultório' },
      { daysOfWeek: [6], startTime: '08:00', endTime: '12:00', display: 'background', color: '#e7e6e6', title: 'Messejana' },
      { daysOfWeek: [6], startTime: '13:00', endTime: '17:00', display: 'background', color: '#e7e6e6', title: 'Livre' }
    ]
    
    const saved = localStorage.getItem('agenda_blocos')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const blocks = parsed.map((b: any) => ({
            daysOfWeek: [b.dayOfWeek],
            startTime: b.startTime,
            endTime: b.endTime,
            display: 'background',
            color: b.color,
            title: b.title
          }))
          setAgendaBlocks(blocks)
        } else {
          setAgendaBlocks([]) // if user explicitly cleared it all
        }
      } catch (e) {
        setAgendaBlocks(defaultBlocks)
      }
    } else {
      setAgendaBlocks(defaultBlocks)
    }
  }, [])

  // Edit Appointment Modal state
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editAgendamentoId, setEditAgendamentoId] = useState('')
  const [editPacienteId, setEditPacienteId] = useState('')
  const [editTipo, setEditTipo] = useState('Consulta')
  const [editHorario, setEditHorario] = useState('')
  const [editDateStr, setEditDateStr] = useState('')
  const [editStatus, setEditStatus] = useState('agendado')
  const [editValor, setEditValor] = useState('')
  const [editObs, setEditObs] = useState('')
  
  // New Appointment Modal state
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedDateStr, setSelectedDateStr] = useState('')
  const [pacienteId, setPacienteId] = useState('')
  const [tipo, setTipo] = useState('Consulta')
  const [horario, setHorario] = useState('')
  
  // Prontuário Sheet state
  const [sheetOpen, setSheetOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [prontuarioId, setProntuarioId] = useState<string | null>(null)
  const [prontLoading, setProntLoading] = useState(false)
  const [prontSaving, setProntSaving] = useState(false)
  
  const [queixa, setQueixa] = useState('')
  const [historico, setHistorico] = useState('')
  const [exame, setExame] = useState('')
  const [conduta, setConduta] = useState('')
  const [statusAtendimento, setStatusAtendimento] = useState('agendado')
  const [lastSaved, setLastSaved] = useState<string | null>(null)

  // Estados de Prontuário Avançado (SOAP)
  const [sinaisVitais, setSinaisVitais] = useState({
    pa: '', fc: '', fr: '', temp: '', sat: '', peso: '', altura: '', imc: '', imcClass: ''
  })
  const [antecedentes, setAntecedentes] = useState({
    alergias: '', usoContinuo: '', cronicas: '', familiares: ''
  })
  const [diagnosticos, setDiagnosticos] = useState<{ codigo: string, descricao: string }[]>([])
  const [prescricaoMedicamentos, setPrescricaoMedicamentos] = useState<{
    medicamento: string, dose: string, via: string, frequencia: string, duracao: string
  }[]>([])
  const [examesSolicitados, setExamesSolicitados] = useState<string[]>([])
  const [atestado, setAtestado] = useState({
    dias: '', finalidade: '', incluirCid: false, dataAtestado: ''
  })

  // Estados para formulários temporários (dentro das abas)
  const [cidBusca, setCidBusca] = useState('')
  const [cidTempCodigo, setCidTempCodigo] = useState('')
  const [cidTempDesc, setCidTempDesc] = useState('')
  
  const [prescTempMedicamento, setPrescTempMedicamento] = useState('')
  const [prescTempDose, setPrescTempDose] = useState('')
  const [prescTempVia, setPrescTempVia] = useState('Oral')
  const [prescTempFrequencia, setPrescTempFrequencia] = useState('')
  const [prescTempDuracao, setPrescTempDuracao] = useState('')
  
  const [exameTempNome, setExameTempNome] = useState('')
  const [atestadoAtivo, setAtestadoAtivo] = useState(false)

  
  // UX Improvements
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showUnsavedAlert, setShowUnsavedAlert] = useState(false)

  const { toast } = useToast()

  // Funções para manipulação dos dados do Prontuário Avançado
  const handleVitalChange = (field: string, value: string) => {
    const updated = { ...sinaisVitais, [field]: value }
    if (field === 'peso' || field === 'altura') {
      const { imc, class: imcClass } = calcularIMC(
        field === 'peso' ? value : sinaisVitais.peso,
        field === 'altura' ? value : sinaisVitais.altura
      )
      updated.imc = imc
      updated.imcClass = imcClass
    }
    setSinaisVitais(updated)
    setHasUnsavedChanges(true)
  }

  const handleAntecedenteChange = (field: string, value: string) => {
    setAntecedentes({ ...antecedentes, [field]: value })
    setHasUnsavedChanges(true)
  }

  const handleAddCid = (codigo: string, descricao: string) => {
    if (!codigo || !descricao) return
    if (diagnosticos.some(d => d.codigo === codigo)) {
      toast({ variant: 'destructive', title: 'Código duplicado', description: 'Este CID já foi adicionado.' })
      return
    }
    setDiagnosticos([...diagnosticos, { codigo, descricao }])
    setCidTempCodigo('')
    setCidTempDesc('')
    setCidBusca('')
    setHasUnsavedChanges(true)
  }

  const handleRemoveCid = (codigo: string) => {
    setDiagnosticos(diagnosticos.filter(d => d.codigo !== codigo))
    setHasUnsavedChanges(true)
  }

  const handleAddMedicamento = () => {
    if (!prescTempMedicamento) {
      toast({ variant: 'destructive', title: 'Nome do medicamento', description: 'Preencha o nome do medicamento.' })
      return
    }
    setPrescricaoMedicamentos([...prescricaoMedicamentos, {
      medicamento: prescTempMedicamento,
      dose: prescTempDose || 'Conforme orientação',
      via: prescTempVia,
      frequencia: prescTempFrequencia || 'Conforme orientação',
      duracao: prescTempDuracao || 'Uso contínuo'
    }])
    setPrescTempMedicamento('')
    setPrescTempDose('')
    setPrescTempVia('Oral')
    setPrescTempFrequencia('')
    setPrescTempDuracao('')
    setHasUnsavedChanges(true)
  }

  const handleRemoveMedicamento = (index: number) => {
    setPrescricaoMedicamentos(prescricaoMedicamentos.filter((_, i) => i !== index))
    setHasUnsavedChanges(true)
  }

  const handleAddExame = () => {
    if (!exameTempNome) return
    if (examesSolicitados.includes(exameTempNome)) {
      toast({ variant: 'destructive', title: 'Exame duplicado', description: 'Este exame já foi solicitado.' })
      return
    }
    setExamesSolicitados([...examesSolicitados, exameTempNome])
    setExameTempNome('')
    setHasUnsavedChanges(true)
  }

  const handleRemoveExame = (index: number) => {
    setExamesSolicitados(examesSolicitados.filter((_, i) => i !== index))
    setHasUnsavedChanges(true)
  }

  const handleAtestadoChange = (field: string, value: any) => {
    setAtestado({ ...atestado, [field]: value })
    setHasUnsavedChanges(true)
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Alert before unloading if unsaved changes exist
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  const fetchData = async () => {
    setLoading(true)
    
    if (import.meta.env.VITE_SUPABASE_URL.includes('your-project-url')) {
      // Mock data
      setPacientes([
        { id: '1', nome: 'João da Silva' },
        { id: '2', nome: 'Maria Oliveira' }
      ])
      setEvents([
        { 
          id: 'ev1', 
          title: 'Consulta - João da Silva', 
          start: new Date().toISOString().split('T')[0] + 'T10:00:00', 
          end: new Date().toISOString().split('T')[0] + 'T11:00:00', 
          tipo: 'Consulta', 
          paciente_id: '1',
          status: 'agendado',
          valor: null,
          observacoes: 'Paciente com queixas de dores de cabeça persistentes'
        },
      ])
      setLoading(false)
      return
    }

    // Fetch real data
    const [pacientesRes, agendamentosRes] = await Promise.all([
      supabase.from('pacientes').select('id, nome').order('nome'),
      supabase.from('agendamentos').select('*, pacientes(nome)')
    ])

    if (pacientesRes.data) setPacientes(pacientesRes.data)
    if (agendamentosRes.data) {
      const formattedEvents = agendamentosRes.data
        .filter((ag: any) => ag.status !== 'cancelado')
        .map((ag: any) => {
        const pacienteObj = (pacientesRes.data || []).find((p: any) => p.id === ag.paciente_id)
        const pacienteNome = pacienteObj?.nome || ag.pacientes?.nome || ag.paciente?.nome || 'Paciente'
        const startDate = new Date(ag.data_hora)
        const yyyy = startDate.getFullYear()
        const mm = String(startDate.getMonth() + 1).padStart(2, '0')
        const dd = String(startDate.getDate()).padStart(2, '0')
        const hh = String(startDate.getHours()).padStart(2, '0')
        const min = String(startDate.getMinutes()).padStart(2, '0')
        const localStart = `${yyyy}-${mm}-${dd}T${hh}:${min}:00`

        const duracaoMin = ag.duracao_min || 60
        const endDate = new Date(startDate.getTime() + duracaoMin * 60 * 1000)
        const endYyyy = endDate.getFullYear()
        const endMm = String(endDate.getMonth() + 1).padStart(2, '0')
        const endDd = String(endDate.getDate()).padStart(2, '0')
        const endHh = String(endDate.getHours()).padStart(2, '0')
        const endMin = String(endDate.getMinutes()).padStart(2, '0')
        const localEnd = `${endYyyy}-${endMm}-${endDd}T${endHh}:${endMin}:00`

        return {
          id: ag.id,
          title: `${ag.tipo || 'Consulta'} - ${pacienteNome}`,
          start: localStart,
          end: localEnd,
          paciente_id: ag.paciente_id,
          tipo: ag.tipo,
          status: ag.status,
          valor: ag.valor,
          observacoes: ag.observacoes
        }
      })
      setEvents(formattedEvents)
    }
    setLoading(false)
  }

  const handleDateClick = (info: any) => {
    setSelectedDateStr(info.dateStr.split('T')[0])
    if (info.dateStr.includes('T')) {
      const timePart = info.dateStr.split('T')[1].substring(0, 5)
      setHorario(timePart)
    } else {
      setHorario('09:00')
    }
    setPacienteId('')
    setTipo('Consulta')
    setOpen(true)
  }

  const handleEventClick = async (info: any) => {
    const ev = events.find(e => e.id === info.event.id)
    if (!ev) return
    setSelectedEvent(ev)

    // Se for secretária, abre a edição do agendamento direto e não a sheet de prontuário
    if (profile?.role === 'secretaria') {
      setEditAgendamentoId(ev.id)
      setEditPacienteId(ev.paciente_id || '')
      setEditTipo(ev.tipo || 'Consulta')
      
      const dateObj = new Date(ev.start)
      const yyyy = dateObj.getFullYear()
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0')
      const dd = String(dateObj.getDate()).padStart(2, '0')
      setEditDateStr(`${yyyy}-${mm}-${dd}`)
      
      const hh = String(dateObj.getHours()).padStart(2, '0')
      const min = String(dateObj.getMinutes()).padStart(2, '0')
      setEditHorario(`${hh}:${min}`)
      
      setEditStatus(ev.status || 'agendado')
      setEditValor(ev.valor?.toString() || '')
      setEditObs(ev.observacoes || '')
      setEditModalOpen(true)
      return
    }
    
    setSheetOpen(true)
    
    // Reset prontuario fields
    setQueixa('')
    setHistorico('')
    setExame('')
    setConduta('')
    setProntuarioId(null)
    setStatusAtendimento('agendado')
    setLastSaved(null)
    setHasUnsavedChanges(false)
    setProntLoading(true)

    // Reset novos campos avançados
    setSinaisVitais({ pa: '', fc: '', fr: '', temp: '', sat: '', peso: '', altura: '', imc: '', imcClass: '' })
    setAntecedentes({ alergias: '', usoContinuo: '', cronicas: '', familiares: '' })
    setDiagnosticos([])
    setPrescricaoMedicamentos([])
    setExamesSolicitados([])
    setAtestado({ dias: '', finalidade: '', incluirCid: false, dataAtestado: new Date().toISOString().split('T')[0] })
    setAtestadoAtivo(false)

    if (import.meta.env.VITE_SUPABASE_URL.includes('your-project-url')) {
      // Mock data com dados SOAP reais e simulados
      setTimeout(() => {
        setQueixa('Dor de cabeça latejante de forte intensidade há 3 dias.')
        setHistorico('Paciente relata que a dor iniciou de forma súbita no trabalho, com fotofobia associada. Automedicou-se com dipirona 1g sem melhora. Nega outros sintomas.')
        setExame('Paciente vigil, orientado. PA 130/80 mmHg, FC 76 bpm, FR 16 ipm, Temp 36.5 °C, Sat O2 98%.')
        setConduta('1. Repouso domiciliar hoje.\n2. Iniciar medicação profilática se crises recorrerem.\n3. Retorno em caso de sinais de alerta (cefaleia súbita de intensidade máxima).')
        
        setSinaisVitais({
          pa: '130/80',
          fc: '76',
          fr: '16',
          temp: '36.5',
          sat: '98',
          peso: '75',
          altura: '175',
          imc: '24.5',
          imcClass: 'Saudável'
        })
        setAntecedentes({
          alergias: 'Dipirona sódica (desenvolve erupções cutâneas)',
          usoContinuo: 'Nenhum',
          cronicas: 'Enxaqueca episódica diagn. há 2 anos',
          familiares: 'Mãe tem enxaqueca crônica e hipertensão'
        })
        setDiagnosticos([{ codigo: 'G43.9', descricao: 'Enxaqueca, não especificada' }])
        setPrescricaoMedicamentos([
          { medicamento: 'Paracetamol 750mg', dose: '1 comprimido', via: 'Oral', frequencia: 'De 6 em 6 horas em caso de dor', duracao: '3 dias' },
          { medicamento: 'Sumatriptana 50mg', dose: '1 comprimido', via: 'Oral', frequencia: 'Ao iniciar a crise de enxaqueca', duracao: 'Uso se necessário' }
        ])
        setExamesSolicitados(['Hemograma completo', 'Glicemia em jejum'])
        setAtestado({
          dias: '1',
          finalidade: 'Repouso domiciliar por cefaleia intensa',
          incluirCid: true,
          dataAtestado: new Date().toISOString().split('T')[0]
        })
        setAtestadoAtivo(true)
        setStatusAtendimento('atendido')
        setLastSaved(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
        setProntLoading(false)
      }, 300)
      return
    }

    // Fetch existing prontuario and agendamento status
    const [prontRes, agendRes] = await Promise.all([
      supabase.from('prontuarios').select('*').eq('agendamento_id', ev.id).maybeSingle(),
      supabase.from('agendamentos').select('status').eq('id', ev.id).single()
    ])

    if (agendRes.data) {
      setStatusAtendimento(agendRes.data.status)
    }

    if (prontRes.data) {
      setProntuarioId(prontRes.data.id)
      setQueixa(prontRes.data.queixa_principal || '')
      setHistorico(prontRes.data.historico || '')
      setExame(prontRes.data.exame_fisico || '')
      setConduta(prontRes.data.conduta_prescricao || '')
      
      // Carregar os campos estruturados com fallback
      setSinaisVitais(prontRes.data.sinais_vitais || { pa: '', fc: '', fr: '', temp: '', sat: '', peso: '', altura: '', imc: '', imcClass: '' })
      setAntecedentes(prontRes.data.antecedentes || { alergias: '', usoContinuo: '', cronicas: '', familiares: '' })
      setDiagnosticos(prontRes.data.diagnosticos || [])
      setPrescricaoMedicamentos(prontRes.data.prescricao_medicamentos || [])
      setExamesSolicitados(prontRes.data.exames_solicitados || [])
      
      const savedAtestado = prontRes.data.atestado || { dias: '', finalidade: '', incluirCid: false, dataAtestado: new Date().toISOString().split('T')[0] }
      setAtestado(savedAtestado)
      if (savedAtestado.dias || savedAtestado.finalidade) {
        setAtestadoAtivo(true)
      }
      
      if (prontRes.data.updated_at) {
        setLastSaved(new Date(prontRes.data.updated_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
      }
    }
    
    setProntLoading(false)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pacienteId || !horario || !selectedDateStr) {
      toast({ variant: 'destructive', title: 'Campos obrigatórios', description: 'Preencha todos os campos.' })
      return
    }

    setSaving(true)
    const localDate = new Date(`${selectedDateStr}T${horario}:00`)
    const dateTime = localDate.toISOString()
    
    if (import.meta.env.VITE_SUPABASE_URL.includes('your-project-url')) {
      setTimeout(() => {
        const paciente = pacientes.find(p => p.id === pacienteId)
        const newEv = {
          id: Math.random().toString(),
          title: `${tipo} - ${paciente?.nome}`,
          start: dateTime,
          end: new Date(new Date(dateTime).getTime() + 60*60*1000).toISOString(),
          tipo,
          paciente_id: pacienteId
        }
        setEvents([...events, newEv])
        toast({ title: 'Agendado com sucesso' })
        setSaving(false)
        setOpen(false)
      }, 500)
      return
    }

    let localId = 'cb6b7e67-8e6d-47be-93cb-3f82522eb185'
    const { data: locais } = await supabase.from('locais_atendimento').select('id').limit(1)
    if (locais && locais.length > 0) {
      localId = locais[0].id
    }

    const { error } = await supabase.from('agendamentos').insert([{
      paciente_id: pacienteId,
      data_hora: dateTime,
      duracao_min: 60,
      local_id: localId,
      tipo,
      status: 'agendado',
      created_by: (await supabase.auth.getUser()).data.user?.id
    }])

    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao agendar', description: error.message })
    } else {
      toast({ title: 'Sucesso!', description: 'Agendamento confirmado.' })
      fetchData()
      setOpen(false)
    }
    setSaving(false)
  }

  const handleOpenEditAgendamentoFromSheet = () => {
    if (!selectedEvent) return
    setEditAgendamentoId(selectedEvent.id)
    setEditPacienteId(selectedEvent.paciente_id || '')
    setEditTipo(selectedEvent.tipo || 'Consulta')
    
    const dateObj = new Date(selectedEvent.start)
    const yyyy = dateObj.getFullYear()
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0')
    const dd = String(dateObj.getDate()).padStart(2, '0')
    setEditDateStr(`${yyyy}-${mm}-${dd}`)
    
    const hh = String(dateObj.getHours()).padStart(2, '0')
    const min = String(dateObj.getMinutes()).padStart(2, '0')
    setEditHorario(`${hh}:${min}`)
    
    setEditStatus(statusAtendimento)
    setEditValor(selectedEvent.valor?.toString() || '')
    setEditObs(selectedEvent.observacoes || '')
    setEditModalOpen(true)
  }

  const handleSaveEditAgendamento = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editPacienteId || !editHorario || !editDateStr) {
      toast({ variant: 'destructive', title: 'Campos obrigatórios', description: 'Preencha todos os campos obrigatórios.' })
      return
    }

    setSaving(true)
    const localDate = new Date(`${editDateStr}T${editHorario}:00`)
    const dateTime = localDate.toISOString()

    const data = {
      paciente_id: editPacienteId,
      data_hora: dateTime,
      tipo: editTipo,
      status: editStatus,
      valor: editValor ? parseFloat(editValor) : null,
      observacoes: editObs || null
    }

    if (import.meta.env.VITE_SUPABASE_URL.includes('your-project-url')) {
      setTimeout(() => {
        const paciente = pacientes.find(p => p.id === editPacienteId)
        setEvents(events.map(ev => 
          ev.id === editAgendamentoId 
            ? { 
                ...ev, 
                title: `${editTipo} - ${paciente?.nome}`, 
                start: dateTime, 
                end: new Date(new Date(dateTime).getTime() + 60*60*1000).toISOString(),
                tipo: editTipo,
                paciente_id: editPacienteId,
                status: editStatus,
                valor: editValor ? parseFloat(editValor) : null,
                observacoes: editObs
              }
            : ev
        ))
        if (selectedEvent && selectedEvent.id === editAgendamentoId) {
          setStatusAtendimento(editStatus)
          setSelectedEvent({
            ...selectedEvent,
            title: `${editTipo} - ${paciente?.nome}`,
            start: dateTime,
            end: new Date(new Date(dateTime).getTime() + 60*60*1000).toISOString(),
            tipo: editTipo,
            paciente_id: editPacienteId,
            status: editStatus,
            valor: editValor ? parseFloat(editValor) : null,
            observacoes: editObs
          })
        }
        toast({ title: 'Agendamento atualizado com sucesso' })
        setSaving(false)
        setEditModalOpen(false)
      }, 500)
      return
    }

    const { error } = await supabase
      .from('agendamentos')
      .update(data)
      .eq('id', editAgendamentoId)

    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao atualizar agendamento', description: error.message })
    } else {
      toast({ title: 'Sucesso!', description: 'Agendamento atualizado.' })
      fetchData()
      if (selectedEvent && selectedEvent.id === editAgendamentoId) {
        setStatusAtendimento(editStatus)
        const paciente = pacientes.find(p => p.id === editPacienteId)
        setSelectedEvent({
          ...selectedEvent,
          title: `${editTipo} - ${paciente?.nome}`,
          start: dateTime,
          tipo: editTipo,
          paciente_id: editPacienteId,
          status: editStatus,
          valor: editValor ? parseFloat(editValor) : null,
          observacoes: editObs
        })
      }
      setEditModalOpen(false)
    }
    setSaving(false)
  }

  const handleDeleteAgendamento = async () => {
    if (!editAgendamentoId) return
    if (!confirm('Deseja realmente excluir este agendamento?')) return
    
    setSaving(true)

    if (import.meta.env.VITE_SUPABASE_URL.includes('your-project-url')) {
      setTimeout(() => {
        setEvents(events.filter(ev => ev.id !== editAgendamentoId))
        toast({ title: 'Agendamento excluído' })
        setSaving(false)
        setEditModalOpen(false)
        setSheetOpen(false)
      }, 500)
      return
    }

    const { error } = await supabase
      .from('agendamentos')
      .delete()
      .eq('id', editAgendamentoId)

    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao excluir agendamento', description: error.message })
    } else {
      toast({ title: 'Sucesso!', description: 'Agendamento excluído.' })
      fetchData()
      setEditModalOpen(false)
      setSheetOpen(false)
    }
    setSaving(false)
  }

  const handleSaveProntuario = async () => {
    if (!selectedEvent || !selectedEvent.paciente_id) return
    setProntSaving(true)

    if (import.meta.env.VITE_SUPABASE_URL.includes('your-project-url')) {
      setTimeout(() => {
        setProntSaving(false)
        setStatusAtendimento('atendido')
        setHasUnsavedChanges(false)
        setLastSaved(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
        toast({ title: 'Prontuário salvo', description: 'Atendimento registrado com sucesso.' })
      }, 500)
      return
    }

    const data = {
      agendamento_id: selectedEvent.id,
      paciente_id: selectedEvent.paciente_id,
      queixa_principal: queixa,
      historico,
      exame_fisico: exame,
      conduta_prescricao: conduta,
      sinais_vitais: sinaisVitais,
      antecedentes: antecedentes,
      diagnosticos: diagnosticos,
      prescricao_medicamentos: prescricaoMedicamentos,
      exames_solicitados: examesSolicitados,
      atestado: atestado,
      updated_at: new Date().toISOString()
    }

    let error;
    if (prontuarioId) {
      const res = await supabase.from('prontuarios').update(data).eq('id', prontuarioId).select('id, updated_at').single()
      error = res.error
      if (res.data) setLastSaved(new Date(res.data.updated_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
    } else {
      const res = await supabase.from('prontuarios').insert([data]).select('id, updated_at').single()
      error = res.error
      if (res.data) {
        setProntuarioId(res.data.id)
        setLastSaved(new Date(res.data.updated_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
      }
    }

    if (!error) {
      if (statusAtendimento !== 'atendido') {
        await supabase.from('agendamentos').update({ status: 'atendido' }).eq('id', selectedEvent.id)
        setStatusAtendimento('atendido')
      }
      setHasUnsavedChanges(false)
      toast({ title: 'Prontuário salvo com sucesso!' })
    } else {
      toast({ variant: 'destructive', title: 'Erro ao salvar prontuário', description: error.message })
    }
    setProntSaving(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      handleSaveProntuario()
    }
  }

  const handleChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setter(e.target.value)
    setHasUnsavedChanges(true)
  }

  const handleCloseSheet = (isOpen: boolean) => {
    if (!isOpen) {
      if (hasUnsavedChanges) {
        setShowUnsavedAlert(true)
      } else {
        setSheetOpen(false)
      }
    } else {
      setSheetOpen(true)
    }
  }

  const confirmCloseSheet = () => {
    setShowUnsavedAlert(false)
    setSheetOpen(false)
    setHasUnsavedChanges(false)
  }

  const handlePrint = (docType: 'prontuario' | 'receita' | 'exames' | 'atestado') => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    
    const pacienteNome = selectedEvent?.title.split(' - ')[1] || 'Paciente'
    const dataHora = selectedEvent ? `${new Date(selectedEvent.start).toLocaleDateString('pt-BR')} às ${new Date(selectedEvent.start).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}` : ''
    
    const medicoNome = "Dr. Roberto Medeiros"
    const medicoCrm = "CRM 12345/CE"
    const clinicaNome = "Clínica Arcanjo Saúde"

    let contentHtml = ''
    let title = ''

    if (docType === 'prontuario') {
      title = `Prontuário - ${pacienteNome}`
      contentHtml = `
        <div class="clinic-header">
          <div class="clinic-title">${clinicaNome}</div>
          <div class="clinic-subtitle">Atendimento Clínico SOAP</div>
        </div>
        <div class="document-title">Prontuário Eletrônico do Paciente</div>
        <div class="patient-card">
          <div class="grid-2">
            <div><strong>Paciente:</strong> ${pacienteNome}</div>
            <div><strong>Data da Consulta:</strong> ${dataHora}</div>
          </div>
        </div>
        
        <h2>1. Subjetivo (S)</h2>
        <div class="section-box">
          <div style="margin-bottom: 10px;"><strong>Queixa Principal (QP):</strong></div>
          <p>${queixa || 'Não registrada.'}</p>
          
          <div style="margin-bottom: 10px;"><strong>Histórico da Doença Atual (HDA):</strong></div>
          <p>${historico || 'Não registrado.'}</p>
          
          <div style="margin-bottom: 10px;"><strong>Antecedentes Clínicos:</strong></div>
          <div class="bullet-list">
            <div><strong>Alergias:</strong> ${antecedentes.alergias || 'Nenhuma declarada.'}</div>
            <div><strong>Uso Contínuo:</strong> ${antecedentes.usoContinuo || 'Nenhum declarado.'}</div>
            <div><strong>Doenças Crônicas:</strong> ${antecedentes.cronicas || 'Nenhuma declarada.'}</div>
            <div><strong>Histórico Familiar:</strong> ${antecedentes.familiares || 'Nenhum declarado.'}</div>
          </div>
        </div>

        <h2>2. Objetivo (O)</h2>
        <div class="section-box">
          <div style="margin-bottom: 10px;"><strong>Sinais Vitais:</strong></div>
          <div class="vitals-grid">
            <div class="vital-item">PA: <span>${sinaisVitais.pa || '-'} mmHg</span></div>
            <div class="vital-item">FC: <span>${sinaisVitais.fc || '-'} bpm</span></div>
            <div class="vital-item">FR: <span>${sinaisVitais.fr || '-'} ipm</span></div>
            <div class="vital-item">Temp: <span>${sinaisVitais.temp || '-'} °C</span></div>
            <div class="vital-item">Sat O2: <span>${sinaisVitais.sat || '-'}%</span></div>
            <div class="vital-item">Peso: <span>${sinaisVitais.peso || '-'} kg</span></div>
            <div class="vital-item">Altura: <span>${sinaisVitais.altura || '-'} cm</span></div>
            <div class="vital-item">IMC: <span>${sinaisVitais.imc || '-'} (${sinaisVitais.imcClass || '-'})</span></div>
          </div>
          
          <div style="margin-top: 15px; margin-bottom: 10px;">
            <strong>Exame Físico Geral:</strong>
          </div>
          <p>${exame || 'Não registrado.'}</p>
        </div>

        <h2>3. Avaliação (A)</h2>
        <div class="section-box">
          <div style="margin-bottom: 10px;"><strong>Diagnósticos e CID-10:</strong></div>
          ${diagnosticos.length > 0 ? `
            <ul class="cid-list">
              ${diagnosticos.map(d => `<li><strong>${d.codigo}</strong> - ${d.descricao}</li>`).join('')}
            </ul>
          ` : '<p>Nenhum CID associado.</p>'}
        </div>

        <h2>4. Plano (P)</h2>
        <div class="section-box">
          <div style="margin-bottom: 10px;"><strong>Conduta Geral:</strong></div>
          <p>${conduta || 'Não registrada.'}</p>
          
          ${prescricaoMedicamentos.length > 0 ? `
            <div style="margin-top: 15px; margin-bottom: 10px;"><strong>Medicamentos Prescritos:</strong></div>
            <ul class="med-list">
              ${prescricaoMedicamentos.map(m => `
                <li>
                  <strong>${m.medicamento}</strong> - ${m.dose} por via ${m.via}<br>
                  <small>Frequência: ${m.frequencia} | Duração: ${m.duracao}</small>
                </li>
              `).join('')}
            </ul>
          ` : ''}

          ${examesSolicitados.length > 0 ? `
            <div style="margin-top: 15px; margin-bottom: 10px;"><strong>Exames Solicitados:</strong></div>
            <ul class="exam-list">
              ${examesSolicitados.map(e => `<li>${e}</li>`).join('')}
            </ul>
          ` : ''}
        </div>
      `
    } else if (docType === 'receita') {
      title = `Receituário - ${pacienteNome}`
      contentHtml = `
        <div class="clinic-header">
          <div class="clinic-title">${medicoNome}</div>
          <div class="clinic-subtitle">${medicoCrm} • Clínica Geral</div>
          <div class="clinic-address">Av. Dom Luís, 1200 - Aldeota, Fortaleza - CE | Contato: (85) 3000-0000</div>
        </div>
        <hr class="header-divider" />
        <div class="document-title prescription-title">RECEITUÁRIO MÉDICO</div>
        
        <div class="patient-line">
          Para: <strong>${pacienteNome}</strong>
        </div>

        <div class="prescription-body">
          <ol class="prescribed-meds">
            ${prescricaoMedicamentos.map((m, index) => `
              <li>
                <div class="med-name">${index + 1}. ${m.medicamento} ---------- ${m.duracao}</div>
                <div class="med-use">Uso: ${m.via}</div>
                <div class="med-instructions">Tomar ${m.dose}, ${m.frequencia}.</div>
              </li>
            `).join('')}
          </ol>
          
          ${conduta ? `
            <div class="prescription-recommendations">
              <strong>Orientações Gerais:</strong>
              <p>${conduta}</p>
            </div>
          ` : ''}
        </div>

        <div class="signature-area">
          <div class="date-line">Fortaleza, ${new Date().toLocaleDateString('pt-BR')}</div>
          <div class="sig-box">
            <div class="sig-line"></div>
            <div class="sig-name">${medicoNome}</div>
            <div class="sig-crm">${medicoCrm}</div>
          </div>
        </div>
      `
    } else if (docType === 'exames') {
      title = `Solicitação de Exames - ${pacienteNome}`
      contentHtml = `
        <div class="clinic-header">
          <div class="clinic-title">${medicoNome}</div>
          <div class="clinic-subtitle">${medicoCrm} • Clínica Geral</div>
          <div class="clinic-address">Av. Dom Luís, 1200 - Aldeota, Fortaleza - CE | Contato: (85) 3000-0000</div>
        </div>
        <hr class="header-divider" />
        <div class="document-title prescription-title">SOLICITAÇÃO DE EXAMES</div>
        
        <div class="patient-line">
          Paciente: <strong>${pacienteNome}</strong>
        </div>

        <div class="prescription-body">
          <p>Solicito para fins de esclarecimento clínico os seguintes exames complementares:</p>
          <ul class="exam-request-list">
            ${examesSolicitados.map(e => `<li>${e}</li>`).join('')}
          </ul>
        </div>

        <div class="signature-area" style="margin-top: 100px;">
          <div class="date-line">Fortaleza, ${new Date().toLocaleDateString('pt-BR')}</div>
          <div class="sig-box">
            <div class="sig-line"></div>
            <div class="sig-name">${medicoNome}</div>
            <div class="sig-crm">${medicoCrm}</div>
          </div>
        </div>
      `
    } else if (docType === 'atestado') {
      title = `Atestado Médico - ${pacienteNome}`
      contentHtml = `
        <div class="clinic-header">
          <div class="clinic-title">${medicoNome}</div>
          <div class="clinic-subtitle">${medicoCrm} • Clínica Geral</div>
          <div class="clinic-address">Av. Dom Luís, 1200 - Aldeota, Fortaleza - CE | Contato: (85) 3000-0000</div>
        </div>
        <hr class="header-divider" />
        <div class="document-title prescription-title">ATESTADO MÉDICO</div>
        
        <div class="atestado-text">
          Atesto, para os devidos fins de direito, que o(a) Sr(a). <strong>${pacienteNome}</strong> foi atendido(a) sob meus cuidados nesta data e necessita de <strong>${atestado.dias || '0'} dia(s)</strong> de afastamento de suas atividades profissionais/escolares a partir desta data, por motivo de saúde (finalidade: <em>${atestado.finalidade || 'Tratamento médico'}</em>).
          
          ${atestado.incluirCid && diagnosticos.length > 0 ? `
            <div class="atestado-cid-box">
              Diagnóstico codificado (CID-10): <strong>${diagnosticos.map(d => d.codigo).join(', ')}</strong>
            </div>
          ` : ''}
        </div>

        <div class="signature-area" style="margin-top: 150px;">
          <div class="date-line">Fortaleza, ${new Date(atestado.dataAtestado || new Date()).toLocaleDateString('pt-BR')}</div>
          <div class="sig-box">
            <div class="sig-line"></div>
            <div class="sig-name">${medicoNome}</div>
            <div class="sig-crm">${medicoCrm}</div>
          </div>
        </div>
      `
    }

    const html = `
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              line-height: 1.6; 
              color: #27272a; 
              padding: 40px; 
              max-width: 800px; 
              margin: 0 auto; 
              background-color: #fff;
            }
            .clinic-header { 
              text-align: center; 
              margin-bottom: 25px; 
            }
            .clinic-title { 
              font-size: 26px; 
              font-weight: 700; 
              color: #18181b; 
              letter-spacing: -0.02em;
            }
            .clinic-subtitle { 
              font-size: 14px; 
              color: #71717a; 
              font-weight: 500;
              margin-top: 2px;
            }
            .clinic-address {
              font-size: 11px;
              color: #a1a1aa;
              margin-top: 6px;
            }
            .header-divider {
              border: 0;
              height: 1px;
              background-image: linear-gradient(to right, rgba(0, 0, 0, 0), rgba(113, 113, 122, 0.4), rgba(0, 0, 0, 0));
              margin-bottom: 30px;
            }
            .document-title { 
              font-size: 18px; 
              font-weight: 700; 
              text-align: center; 
              color: #09090b; 
              margin-bottom: 30px; 
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            .prescription-title {
              font-size: 20px;
              color: #18181b;
              margin-top: 20px;
              margin-bottom: 40px;
            }
            .patient-card { 
              background: #f4f4f5; 
              padding: 16px 20px; 
              border-radius: 10px; 
              margin-bottom: 30px; 
              font-size: 14px; 
              border: 1px solid #e4e4e7;
            }
            .patient-line {
              font-size: 16px;
              margin-bottom: 30px;
              border-bottom: 1px dashed #e4e4e7;
              padding-bottom: 10px;
            }
            .grid-2 { 
              display: grid; 
              grid-template-cols: 1fr 1fr; 
              gap: 10px; 
            }
            h2 { 
              font-size: 15px; 
              color: #27272a; 
              text-transform: uppercase; 
              letter-spacing: 0.08em; 
              margin-top: 30px; 
              margin-bottom: 12px; 
              border-left: 3px solid #18181b;
              padding-left: 10px;
              font-weight: 700;
            }
            .section-box {
              background: #fff;
              border: 1px solid #f4f4f5;
              padding: 5px 10px;
              margin-bottom: 15px;
            }
            p { 
              margin-top: 5px;
              margin-bottom: 15px;
              white-space: pre-wrap; 
              font-size: 14px; 
              color: #3f3f46;
            }
            .bullet-list, .cid-list, .med-list, .exam-list, .exam-request-list {
              font-size: 14px;
              color: #3f3f46;
              padding-left: 20px;
              margin-bottom: 15px;
            }
            .bullet-list div {
              margin-bottom: 5px;
            }
            .cid-list li, .exam-list li, .exam-request-list li {
              margin-bottom: 6px;
            }
            .med-list li {
              margin-bottom: 12px;
            }
            .vitals-grid {
              display: grid;
              grid-template-cols: repeat(4, 1fr);
              gap: 12px;
              margin-bottom: 15px;
            }
            .vital-item {
              background: #fafafa;
              border: 1px solid #f4f4f5;
              border-radius: 8px;
              padding: 8px;
              text-align: center;
              font-size: 12px;
              color: #71717a;
              font-weight: 500;
            }
            .vital-item span {
              display: block;
              font-size: 14px;
              color: #18181b;
              font-weight: 700;
              margin-top: 2px;
            }
            .prescription-body {
              font-size: 15px;
              min-height: 250px;
            }
            .prescribed-meds {
              padding-left: 0;
              list-style: none;
            }
            .prescribed-meds li {
              margin-bottom: 25px;
            }
            .med-name {
              font-weight: 700;
              font-size: 16px;
              color: #18181b;
            }
            .med-use {
              font-size: 12px;
              color: #71717a;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              margin-top: 2px;
            }
            .med-instructions {
              font-style: italic;
              margin-top: 4px;
              color: #3f3f46;
            }
            .prescription-recommendations {
              margin-top: 40px;
              border-top: 1px solid #f4f4f5;
              padding-top: 20px;
              font-size: 13px;
            }
            .exam-request-list {
              list-style-type: square;
              font-size: 15px;
              line-height: 2;
            }
            .atestado-text {
              font-size: 16px;
              line-height: 1.8;
              text-align: justify;
              margin-top: 40px;
            }
            .atestado-cid-box {
              margin-top: 30px;
              font-size: 13px;
              color: #71717a;
              border-left: 2px solid #e4e4e7;
              padding-left: 10px;
            }
            .signature-area {
              margin-top: 80px;
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            .date-line {
              font-size: 14px;
              color: #71717a;
              margin-bottom: 40px;
            }
            .sig-box {
              text-align: center;
            }
            .sig-line {
              width: 250px;
              border-top: 1px solid #71717a;
              margin-bottom: 6px;
            }
            .sig-name {
              font-weight: 700;
              font-size: 14px;
              color: #18181b;
            }
            .sig-crm {
              font-size: 12px;
              color: #71717a;
            }
            @media print {
              body { padding: 20px; font-size: 12pt; }
              .section-box { border: none; }
              .vital-item { background: none; border: 1px solid #e4e4e7; }
              .patient-card { background: none; border: 1px solid #ccc; }
              .clinic-address { color: #52525b; }
            }
          </style>
        </head>
        <body>
          ${contentHtml}
          <script>
            window.onload = () => window.print();
          </script>
        </body>
      </html>
    `
    printWindow.document.write(html)
    printWindow.document.close()
  }

  const TextareaClassName = "flex w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[150px] resize-none"

  return (
    <div className="space-y-6 relative">
      {loading && (
        <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center rounded-xl">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-900" />
        </div>
      )}
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Agenda</h1>
          <p className="text-sm text-zinc-500">Clique em um horário vago para adicionar um agendamento ou em uma consulta para atender.</p>
        </div>
      </div>
      
      <div className="bg-white rounded-xl border border-zinc-200 p-2 sm:p-4 shadow-sm overflow-x-auto">
        <div className="min-w-[600px] sm:min-w-0">
          <FullCalendar
            plugins={[ dayGridPlugin, timeGridPlugin, interactionPlugin ]}
            initialView={isMobile ? "timeGridDay" : "timeGridWeek"}
            headerToolbar={isMobile ? {
              left: 'prev,next',
              center: 'title',
              right: 'timeGridDay,timeGridWeek'
            } : {
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay'
            }}
            locale="pt-br"
            buttonText={{
              today: 'Hoje',
              month: 'Mês',
              week: 'Semana',
              day: 'Dia'
            }}
            allDaySlot={false}
            slotMinTime="07:00:00"
            slotMaxTime="20:00:00"
            events={[
              ...events,
              ...agendaBlocks
            ]}
            height="auto"
            eventColor="#18181b" 
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            eventContent={(arg) => {
              if (arg.event.display === 'background') {
                return (
                  <div className="w-full h-full flex flex-col items-center justify-center p-1 sm:p-2 opacity-75">
                    <span className="text-zinc-700 font-medium text-[10px] sm:text-xs leading-tight text-center drop-shadow-sm">
                      {arg.event.title}
                    </span>
                  </div>
                )
              }
              return (
                <div className="flex flex-col p-1 overflow-hidden h-full">
                  <span className="font-semibold text-xs whitespace-nowrap overflow-hidden text-ellipsis">{arg.event.title}</span>
                  {arg.timeText && <span className="text-[10px] opacity-80">{arg.timeText}</span>}
                </div>
              )
            }}
          />
        </div>
      </div>

      {/* NOVO AGENDAMENTO MODAL */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>Novo Agendamento</DialogTitle>
              <DialogDescription>
                Selecione o paciente e os detalhes para o dia {selectedDateStr.split('-').reverse().join('/')}.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="paciente">Paciente *</Label>
                <Select value={pacienteId} onValueChange={setPacienteId} required>
                  <SelectTrigger id="paciente">
                    <SelectValue placeholder="Selecione um paciente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {pacientes.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                    ))}
                    {pacientes.length === 0 && (
                      <div className="p-2 text-sm text-zinc-500">Nenhum paciente. Cadastre primeiro.</div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="horario">Horário *</Label>
                  <Input id="horario" type="time" value={horario} onChange={e => setHorario(e.target.value)} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="tipo">Tipo da Consulta *</Label>
                  <Select value={tipo} onValueChange={setTipo}>
                    <SelectTrigger id="tipo"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Consulta">Consulta Presencial</SelectItem>
                      <SelectItem value="Retorno">Retorno</SelectItem>
                      <SelectItem value="Telemedicina">Telemedicina</SelectItem>
                      <SelectItem value="Exame">Exame</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDITAR AGENDAMENTO MODAL */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleSaveEditAgendamento}>
            <DialogHeader>
              <DialogTitle>Editar Agendamento</DialogTitle>
              <DialogDescription>
                Altere os detalhes do agendamento conforme necessário.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-paciente">Paciente *</Label>
                <Select value={editPacienteId} onValueChange={setEditPacienteId} required>
                  <SelectTrigger id="edit-paciente">
                    <SelectValue placeholder="Selecione um paciente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {pacientes.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-horario">Horário *</Label>
                  <Input id="edit-horario" type="time" value={editHorario} onChange={e => setEditHorario(e.target.value)} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-tipo">Tipo *</Label>
                  <Select value={editTipo} onValueChange={setEditTipo}>
                    <SelectTrigger id="edit-tipo"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Consulta">Consulta Presencial</SelectItem>
                      <SelectItem value="Retorno">Retorno</SelectItem>
                      <SelectItem value="Telemedicina">Telemedicina</SelectItem>
                      <SelectItem value="Exame">Exame</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
 
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-status">Status *</Label>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger id="edit-status"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agendado">Agendado</SelectItem>
                      <SelectItem value="confirmado">Confirmado</SelectItem>
                      <SelectItem value="atendido">Atendido</SelectItem>
                      <SelectItem value="faltou">Faltou</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-valor">Valor (Particular)</Label>
                  <Input id="edit-valor" type="number" value={editValor} onChange={e => setEditValor(e.target.value)} placeholder="0.00" />
                </div>
              </div>
 
              <div className="grid gap-2">
                <Label htmlFor="edit-obs">Observações do Agendamento</Label>
                <Input id="edit-obs" value={editObs} onChange={e => setEditObs(e.target.value)} placeholder="Ex: Paciente solicitou urgência" />
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-zinc-150 pt-4 mt-6">
              <div>
                <Button type="button" variant="destructive" onClick={handleDeleteAgendamento} disabled={saving} className="h-9 px-3 gap-1.5 bg-red-50 text-red-650 hover:bg-red-100 hover:text-red-700 border border-red-200">
                  <Trash2 className="w-3.5 h-3.5" />
                  Excluir
                </Button>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setEditModalOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* UNSAVED CHANGES ALERT */}
      <AlertDialog open={showUnsavedAlert} onOpenChange={setShowUnsavedAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem alterações não salvas</AlertDialogTitle>
            <AlertDialogDescription>
              Se você sair agora, os dados digitados neste prontuário serão perdidos. Deseja realmente sair sem salvar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar e Salvar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCloseSheet} className="bg-red-600 hover:bg-red-700 text-white">
              Sair sem salvar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PRONTUÁRIO SHEET */}
      <Sheet open={sheetOpen} onOpenChange={handleCloseSheet}>
        <SheetContent className="sm:max-w-2xl w-full flex flex-col gap-0 p-0">
          <SheetHeader className="p-6 pb-4 text-left border-b border-zinc-200 bg-zinc-50/50">
            <div className="flex justify-between items-start">
              <div>
                <SheetTitle className="text-xl flex items-center gap-3">
                  Atendimento Clínico (SOAP)
                  {statusAtendimento === 'atendido' && (
                    <span className="flex items-center text-emerald-700 text-xs font-semibold bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      Atendido
                    </span>
                  )}
                  {hasUnsavedChanges && (
                    <span className="text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      Não salvo
                    </span>
                  )}
                </SheetTitle>
                <SheetDescription className="text-zinc-500 mt-1">
                  {selectedEvent?.title} • {selectedEvent ? new Date(selectedEvent.start).toLocaleDateString('pt-BR') : ''} às {selectedEvent ? new Date(selectedEvent.start).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}) : ''}
                </SheetDescription>
              </div>
              <div className="flex gap-2">
                <Button 
                  type="button"
                  variant="destructive" 
                  size="sm" 
                  onClick={async () => {
                    if (selectedEvent) {
                      setEditAgendamentoId(selectedEvent.id)
                      // Pequena pausa para garantir a atualização do estado
                      setTimeout(async () => {
                        await handleDeleteAgendamento()
                      }, 50)
                    }
                  }} 
                  className="h-8 gap-1.5 bg-red-50 text-red-650 hover:bg-red-100 hover:text-red-700 border border-red-200" 
                  title="Excluir este agendamento definitivamente"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Excluir Consulta</span>
                </Button>
                <Button variant="outline" size="sm" onClick={handleOpenEditAgendamentoFromSheet} className="h-8 gap-1.5 text-zinc-700 hover:bg-zinc-50" title="Editar dados do agendamento (hora, status, tipo)">
                  <Settings className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Editar Consulta</span>
                </Button>
                <Button variant="outline" size="sm" onClick={() => handlePrint('prontuario')} className="h-8 gap-1.5" title="Imprimir Prontuário Completo">
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Imprimir Prontuário</span>
                </Button>
              </div>
            </div>
          </SheetHeader>
          
          <ScrollArea className="flex-1 px-6">
            {prontLoading ? (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
              </div>
            ) : (
              <Tabs defaultValue="subjetivo" className="mt-6">
                <TabsList className="grid w-full grid-cols-4 h-auto p-1 bg-zinc-100/80 border border-zinc-200/50">
                  <TabsTrigger value="subjetivo" className="text-xs sm:text-sm py-2">1. Subjetivo (S)</TabsTrigger>
                  <TabsTrigger value="objetivo" className="text-xs sm:text-sm py-2">2. Objetivo (O)</TabsTrigger>
                  <TabsTrigger value="avaliacao" className="text-xs sm:text-sm py-2">3. Avaliação (A)</TabsTrigger>
                  <TabsTrigger value="plano" className="text-xs sm:text-sm py-2">4. Plano (P)</TabsTrigger>
                </TabsList>
                
                <div className="mt-6 mb-8">
                  {/* SUBJETIVO (S) */}
                  <TabsContent value="subjetivo" className="m-0 focus-visible:outline-none space-y-6">
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-zinc-800">Queixa Principal (QP)</Label>
                      <TextareaAutosize
                        minRows={3}
                        className={TextareaClassName}
                        placeholder="Motivo da consulta e sintomas principais reportados pelo paciente..." 
                        value={queixa}
                        onChange={handleChange(setQueixa)}
                        onKeyDown={handleKeyDown}
                      />
                    </div>
                    
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-zinc-800">Histórico da Doença Atual (HDA)</Label>
                      <TextareaAutosize
                        minRows={5}
                        className={TextareaClassName}
                        placeholder="Detalhes sobre o início dos sintomas, evolução temporal, fatores de melhora/piora, medicações testadas..." 
                        value={historico}
                        onChange={handleChange(setHistorico)}
                        onKeyDown={handleKeyDown}
                      />
                    </div>
                    
                    <div className="border-t border-zinc-100 pt-6">
                      <h3 className="text-sm font-semibold text-zinc-900 mb-4">Antecedentes Clínicos</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label htmlFor="ant-alergias" className="text-xs text-zinc-500">Alergias / Reações Adversas</Label>
                          <Input id="ant-alergias" value={antecedentes.alergias} onChange={e => handleAntecedenteChange('alergias', e.target.value)} placeholder="Ex: Dipirona, Corantes, Lactose..." className="text-sm" />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="ant-uso" className="text-xs text-zinc-500">Medicamentos de Uso Contínuo</Label>
                          <Input id="ant-uso" value={antecedentes.usoContinuo} onChange={e => handleAntecedenteChange('usoContinuo', e.target.value)} placeholder="Ex: Losartana 50mg, AAS..." className="text-sm" />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="ant-cronicas" className="text-xs text-zinc-500">Doenças Crônicas / Pessoais</Label>
                          <Input id="ant-cronicas" value={antecedentes.cronicas} onChange={e => handleAntecedenteChange('cronicas', e.target.value)} placeholder="Ex: Hipertensão, Asma..." className="text-sm" />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="ant-fam" className="text-xs text-zinc-500">Histórico Familiar</Label>
                          <Input id="ant-fam" value={antecedentes.familiares} onChange={e => handleAntecedenteChange('familiares', e.target.value)} placeholder="Ex: Pai cardíaco, Mãe diabética..." className="text-sm" />
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  {/* OBJETIVO (O) */}
                  <TabsContent value="objetivo" className="m-0 focus-visible:outline-none space-y-6">
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-900 mb-4">Sinais Vitais & Antropometria</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <Label className="text-xs text-zinc-500">PA (mmHg)</Label>
                            <Input value={sinaisVitais.pa} onChange={e => handleVitalChange('pa', e.target.value)} placeholder="120/80" className="h-9" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-zinc-500">FC (bpm)</Label>
                            <Input value={sinaisVitais.fc} onChange={e => handleVitalChange('fc', e.target.value)} placeholder="80" className="h-9" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-zinc-500">FR (ipm)</Label>
                            <Input value={sinaisVitais.fr} onChange={e => handleVitalChange('fr', e.target.value)} placeholder="16" className="h-9" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-zinc-500">Temp (°C)</Label>
                            <Input value={sinaisVitais.temp} onChange={e => handleVitalChange('temp', e.target.value)} placeholder="36.5" className="h-9" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-zinc-500">Sat O₂ (%)</Label>
                            <Input value={sinaisVitais.sat} onChange={e => handleVitalChange('sat', e.target.value)} placeholder="98" className="h-9" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-zinc-500">Peso (kg)</Label>
                            <Input value={sinaisVitais.peso} onChange={e => handleVitalChange('peso', e.target.value)} placeholder="70" className="h-9" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-zinc-500">Altura (cm)</Label>
                            <Input value={sinaisVitais.altura} onChange={e => handleVitalChange('altura', e.target.value)} placeholder="170" className="h-9" />
                          </div>
                        </div>
                        
                        <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 flex flex-col justify-center items-center text-center shadow-sm">
                          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">IMC Calculado</span>
                          {sinaisVitais.imc ? (
                            <>
                              <span className="text-3xl font-extrabold text-zinc-900 mt-2">{sinaisVitais.imc}</span>
                              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border mt-2 ${
                                sinaisVitais.imcClass === 'Saudável' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                sinaisVitais.imcClass === 'Abaixo do peso' || sinaisVitais.imcClass === 'Sobrepeso' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                'bg-red-50 text-red-700 border-red-200'
                              }`}>
                                {sinaisVitais.imcClass}
                              </span>
                            </>
                          ) : (
                            <span className="text-xs text-zinc-400 mt-2">Informe Peso e Altura</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3 pt-4 border-t border-zinc-100">
                      <Label className="text-sm font-semibold text-zinc-800">Exame Físico Geral</Label>
                      <TextareaAutosize
                        minRows={5}
                        className={TextareaClassName}
                        placeholder="Inspeção, palpação, ausculta cardíaca e respiratória, estado geral do paciente..." 
                        value={exame}
                        onChange={handleChange(setExame)}
                        onKeyDown={handleKeyDown}
                      />
                    </div>
                  </TabsContent>
                  
                  {/* AVALIAÇÃO (A) */}
                  <TabsContent value="avaliacao" className="m-0 focus-visible:outline-none space-y-6">
                    <div className="space-y-4">
                      <Label className="text-sm font-semibold text-zinc-800">Diagnósticos & CID-10</Label>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="sm:col-span-2 relative">
                          <Input 
                            value={cidBusca}
                            onChange={e => {
                              setCidBusca(e.target.value)
                              const matched = CIDS_COMUNS.find(c => c.codigo.toLowerCase() === e.target.value.toLowerCase() || c.descricao.toLowerCase().includes(e.target.value.toLowerCase()))
                              if (matched) {
                                setCidTempCodigo(matched.codigo)
                                setCidTempDesc(matched.descricao)
                              } else {
                                setCidTempCodigo(e.target.value.toUpperCase())
                              }
                            }}
                            placeholder="Busque CID-10 (Ex: I10, Cefaleia)..." 
                            className="text-sm"
                          />
                          {cidBusca && CIDS_COMUNS.filter(c => c.codigo.toLowerCase().includes(cidBusca.toLowerCase()) || c.descricao.toLowerCase().includes(cidBusca.toLowerCase())).length > 0 && (
                            <div className="absolute left-0 right-0 bg-white border border-zinc-200 rounded-lg mt-1 shadow-lg max-h-48 overflow-y-auto z-50">
                              {CIDS_COMUNS.filter(c => c.codigo.toLowerCase().includes(cidBusca.toLowerCase()) || c.descricao.toLowerCase().includes(cidBusca.toLowerCase()))
                                .map(c => (
                                  <button
                                    type="button"
                                    key={c.codigo}
                                    onClick={() => handleAddCid(c.codigo, c.descricao)}
                                    className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-50 border-b border-zinc-100 last:border-0 block"
                                  >
                                    <span className="font-bold text-zinc-850 mr-2">{c.codigo}</span>
                                    <span className="text-zinc-600">{c.descricao}</span>
                                  </button>
                                ))
                              }
                            </div>
                          )}
                        </div>
                        
                        <Button 
                          type="button"
                          variant="outline" 
                          onClick={() => {
                            if (!cidTempCodigo) return
                            handleAddCid(cidTempCodigo, cidTempDesc || 'Diagnóstico manual')
                          }}
                          disabled={!cidTempCodigo}
                          className="text-xs h-10"
                        >
                          Adicionar
                        </Button>
                      </div>

                      {cidTempCodigo && !CIDS_COMUNS.some(c => c.codigo === cidTempCodigo) && (
                        <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg space-y-2">
                          <Label className="text-[10px] text-zinc-500 uppercase">Descrição livre para {cidTempCodigo}</Label>
                          <div className="flex gap-2">
                            <Input 
                              value={cidTempDesc} 
                              onChange={e => setCidTempDesc(e.target.value)} 
                              placeholder="Digite a descrição da doença..." 
                              className="h-8 text-xs bg-white" 
                            />
                            <Button 
                              type="button" 
                              size="sm" 
                              onClick={() => handleAddCid(cidTempCodigo, cidTempDesc || 'Diagnóstico manual')}
                              className="h-8 text-xs"
                            >
                              Confirmar
                            </Button>
                          </div>
                        </div>
                      )}

                      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
                        <Table>
                          <TableHeader className="bg-zinc-50/50">
                            <TableRow>
                              <TableHead className="w-[100px] text-xs">Código</TableHead>
                              <TableHead className="text-xs">Descrição</TableHead>
                              <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {diagnosticos.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={3} className="text-center py-4 text-xs text-zinc-400 italic">
                                  Nenhum diagnóstico associado.
                                </TableCell>
                              </TableRow>
                            ) : (
                              diagnosticos.map(d => (
                                <TableRow key={d.codigo}>
                                  <TableCell className="font-bold text-zinc-900 text-xs">{d.codigo}</TableCell>
                                  <TableCell className="text-zinc-600 text-xs">{d.descricao}</TableCell>
                                  <TableCell>
                                    <Button 
                                      type="button"
                                      variant="ghost" 
                                      onClick={() => handleRemoveCid(d.codigo)}
                                      className="text-red-500 hover:text-red-700 h-6 w-6 p-0 flex items-center justify-center text-sm font-bold"
                                    >
                                      ×
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </TabsContent>
                  
                  {/* PLANO (P) */}
                  <TabsContent value="plano" className="m-0 focus-visible:outline-none space-y-6">
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-zinc-800">Conduta Geral & Orientações</Label>
                      <TextareaAutosize
                        minRows={4}
                        className={TextareaClassName}
                        placeholder="Plano terapêutico geral, mudanças de estilo de vida, orientações de retorno..." 
                        value={conduta}
                        onChange={handleChange(setConduta)}
                        onKeyDown={handleKeyDown}
                      />
                    </div>
                    
                    {/* Prescrição de Medicamentos */}
                    <div className="border-t border-zinc-100 pt-6 space-y-4">
                      <div className="flex justify-between items-center">
                        <Label className="text-sm font-semibold text-zinc-800">Prescrição Médica</Label>
                        {prescricaoMedicamentos.length > 0 && (
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handlePrint('receita')} 
                            className="h-8 text-xs gap-1.5"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Imprimir Receituário
                          </Button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        <div className="space-y-1 md:col-span-2">
                          <Label className="text-[10px] text-zinc-500 uppercase">Medicamento</Label>
                          <Input value={prescTempMedicamento} onChange={e => setPrescTempMedicamento(e.target.value)} placeholder="Ex: Losartana 50mg, Dipirona 1g" className="h-8 text-xs" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-zinc-500 uppercase">Dose / Posologia</Label>
                          <Input value={prescTempDose} onChange={e => setPrescTempDose(e.target.value)} placeholder="Ex: 1 comp, 30 gotas" className="h-8 text-xs" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-zinc-500 uppercase">Via</Label>
                          <Select value={prescTempVia} onValueChange={setPrescTempVia}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Oral">Oral</SelectItem>
                              <SelectItem value="Sublingual">Sublingual</SelectItem>
                              <SelectItem value="Uso Tópico">Uso Tópico</SelectItem>
                              <SelectItem value="Inalatória">Inalatória</SelectItem>
                              <SelectItem value="Oftálmica">Oftálmica</SelectItem>
                              <SelectItem value="Intramuscular">Intramuscular</SelectItem>
                              <SelectItem value="Endovenosa">Endovenosa</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-zinc-500 uppercase">Frequência</Label>
                          <Input value={prescTempFrequencia} onChange={e => setPrescTempFrequencia(e.target.value)} placeholder="Ex: De 12 em 12 horas" className="h-8 text-xs" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-zinc-500 uppercase">Duração</Label>
                          <Input value={prescTempDuracao} onChange={e => setPrescTempDuracao(e.target.value)} placeholder="Ex: 7 dias, Uso contínuo" className="h-8 text-xs" />
                        </div>
                      </div>
                      <Button type="button" variant="secondary" onClick={handleAddMedicamento} className="w-full text-xs h-8">
                        Adicionar Medicamento
                      </Button>

                      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
                        <Table>
                          <TableHeader className="bg-zinc-50/50">
                            <TableRow>
                              <TableHead className="text-xs">Medicamento</TableHead>
                              <TableHead className="text-xs">Uso</TableHead>
                              <TableHead className="text-xs">Frequência / Posologia</TableHead>
                              <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {prescricaoMedicamentos.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center py-4 text-xs text-zinc-400 italic">
                                  Nenhum medicamento na prescrição.
                                </TableCell>
                              </TableRow>
                            ) : (
                              prescricaoMedicamentos.map((m, index) => (
                                <TableRow key={index}>
                                  <TableCell className="text-xs">
                                    <div className="font-bold text-zinc-900">{m.medicamento}</div>
                                    <div className="text-[10px] text-zinc-400">{m.dose} • {m.duracao}</div>
                                  </TableCell>
                                  <TableCell className="text-zinc-650 text-xs">{m.via}</TableCell>
                                  <TableCell className="text-zinc-650 text-xs">{m.frequencia}</TableCell>
                                  <TableCell>
                                    <Button 
                                      type="button"
                                      variant="ghost" 
                                      onClick={() => handleRemoveMedicamento(index)}
                                      className="text-red-500 hover:text-red-700 h-6 w-6 p-0 flex items-center justify-center text-sm font-bold"
                                    >
                                      ×
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                    {/* Solicitação de Exames */}
                    <div className="border-t border-zinc-100 pt-6 space-y-4">
                      <div className="flex justify-between items-center">
                        <Label className="text-sm font-semibold text-zinc-800">Solicitação de Exames</Label>
                        {examesSolicitados.length > 0 && (
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handlePrint('exames')} 
                            className="h-8 text-xs gap-1.5"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Imprimir Solicitação
                          </Button>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <Input value={exameTempNome} onChange={e => setExameTempNome(e.target.value)} placeholder="Ex: Hemograma completo, Ultrassonografia renal..." className="text-sm" />
                        <Button type="button" variant="outline" onClick={handleAddExame} className="text-xs">
                          Adicionar
                        </Button>
                      </div>

                      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
                        <Table>
                          <TableHeader className="bg-zinc-50/50">
                            <TableRow>
                              <TableHead className="text-xs">Exame Solicitado</TableHead>
                              <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {examesSolicitados.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={2} className="text-center py-4 text-xs text-zinc-400 italic">
                                  Nenhum exame solicitado.
                                </TableCell>
                              </TableRow>
                            ) : (
                              examesSolicitados.map((ex, index) => (
                                <TableRow key={index}>
                                  <TableCell className="text-zinc-800 text-xs font-semibold">{ex}</TableCell>
                                  <TableCell>
                                    <Button 
                                      type="button"
                                      variant="ghost" 
                                      onClick={() => handleRemoveExame(index)}
                                      className="text-red-500 hover:text-red-700 h-6 w-6 p-0 flex items-center justify-center text-sm font-bold"
                                    >
                                      ×
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                    {/* Atestado Médico */}
                    <div className="border-t border-zinc-100 pt-6 space-y-4">
                      <div className="flex justify-between items-center">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-semibold text-zinc-800">Atestado Médico</Label>
                          <p className="text-xs text-zinc-450">Gerar atestado médico de afastamento.</p>
                        </div>
                        <Switch checked={atestadoAtivo} onCheckedChange={setAtestadoAtivo} />
                      </div>

                      {atestadoAtivo && (
                        <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-1">
                              <Label className="text-xs text-zinc-500">Dias de Afastamento</Label>
                              <Input 
                                type="number" 
                                value={atestado.dias} 
                                onChange={e => handleAtestadoChange('dias', e.target.value)} 
                                placeholder="Dias" 
                                className="h-8 text-xs bg-white" 
                              />
                            </div>
                            <div className="space-y-1 sm:col-span-2">
                              <Label className="text-xs text-zinc-500">Finalidade</Label>
                              <Input 
                                value={atestado.finalidade} 
                                onChange={e => handleAtestadoChange('finalidade', e.target.value)} 
                                placeholder="Ex: Repouso domiciliar" 
                                className="h-8 text-xs bg-white" 
                              />
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                            <div className="flex items-center space-x-2">
                              <Switch 
                                id="incluir-cid"
                                checked={atestado.incluirCid} 
                                onCheckedChange={(val: boolean) => handleAtestadoChange('incluirCid', val)} 
                              />
                              <Label htmlFor="incluir-cid" className="text-xs text-zinc-600 cursor-pointer">Incluir CID-10</Label>
                            </div>
                            
                            <div className="space-y-1">
                              <Label className="text-[10px] text-zinc-500">Data do Atestado</Label>
                              <Input 
                                type="date" 
                                value={atestado.dataAtestado || new Date().toISOString().split('T')[0]} 
                                onChange={e => handleAtestadoChange('dataAtestado', e.target.value)} 
                                className="h-8 text-xs bg-white animate-none" 
                              />
                            </div>
                          </div>
                          
                          <Button 
                            type="button" 
                            onClick={() => handlePrint('atestado')}
                            className="w-full text-xs h-8 bg-zinc-900 text-white hover:bg-zinc-800 gap-1.5"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Imprimir Atestado
                          </Button>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            )}
          </ScrollArea>
          
          <div className="p-4 border-t border-zinc-200 bg-white flex items-center justify-between">
            <div className="text-xs text-zinc-500 flex items-center gap-1.5">
              {lastSaved && !hasUnsavedChanges && (
                <>
                  <Clock className="w-3.5 h-3.5" />
                  Salvo às {lastSaved}
                </>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => handleCloseSheet(false)}>Cancelar</Button>
              <Button onClick={handleSaveProntuario} disabled={prontLoading || prontSaving} className="bg-zinc-900 text-white min-w-[140px]">
                {prontSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {hasUnsavedChanges ? 'Salvar alterações' : 'Salvo'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
