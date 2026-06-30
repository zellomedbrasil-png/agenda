import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useToast } from '@/hooks/use-toast'
import { useAuthStore } from '@/store/useAuthStore'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import TextareaAutosize from 'react-textarea-autosize'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Plus, Loader2, FileText, Calendar as CalendarIcon, Printer, Edit, PlusCircle, Trash2 } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'

type Paciente = {
  id: string
  nome: string
  telefone: string
  email: string | null
  observacoes: string | null
  created_at: string
}

type ProntuarioMini = {
  id: string
  created_at: string
  queixa_principal?: string | null
  conduta_prescricao?: string | null
  historico?: string | null
  exame_fisico?: string | null
  sinais_vitais?: any | null
  antecedentes?: any | null
  diagnosticos?: any | null
  prescricao_medicamentos?: any | null
  exames_solicitados?: any | null
  atestado?: any | null
  agendamentos: {
    data_hora: string
    tipo: string
  }
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
  const altura = parseFloat(alturaStr) / 100
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

export default function PacientesPage() {
  const { profile } = useAuthStore()
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Edição de Prontuário Histórico
  const [editProntuarioOpen, setEditProntuarioOpen] = useState(false)
  const [editingProntuario, setEditingProntuario] = useState<ProntuarioMini | null>(null)
  
  const [editQueixa, setEditQueixa] = useState('')
  const [editHistorico, setEditHistorico] = useState('')
  const [editExameFisico, setEditExameFisico] = useState('')
  const [editConduta, setEditConduta] = useState('')
  
  const [editSinaisVitais, setEditSinaisVitais] = useState({
    pa: '', fc: '', fr: '', temp: '', sat: '', peso: '', altura: '', imc: '', imcClass: ''
  })
  const [editAntecedentes, setEditAntecedentes] = useState({
    alergias: '', usoContinuo: '', cronicas: '', familiares: ''
  })
  const [editDiagnosticos, setEditDiagnosticos] = useState<{ codigo: string, descricao: string }[]>([])
  const [editPrescricaoMedicamentos, setEditPrescricaoMedicamentos] = useState<{
    medicamento: string, dose: string, via: string, frequencia: string, duracao: string
  }[]>([])
  const [editExamesSolicitados, setEditExamesSolicitados] = useState<string[]>([])
  const [editAtestado, setEditAtestado] = useState({
    dias: '', finalidade: '', incluirCid: false, dataAtestado: ''
  })
  const [editAtestadoAtivo, setEditAtestadoAtivo] = useState(false)

  // Estados temporários para formulários internos
  const [editCidBusca, setEditCidBusca] = useState('')
  const [editCidTempCodigo, setEditCidTempCodigo] = useState('')
  const [editCidTempDesc, setEditCidTempDesc] = useState('')
  const [editPrescTempMedicamento, setEditPrescTempMedicamento] = useState('')
  const [editPrescTempDose, setEditPrescTempDose] = useState('')
  const [editPrescTempVia, setEditPrescTempVia] = useState('Oral')
  const [editPrescTempFrequencia, setEditPrescTempFrequencia] = useState('')
  const [editPrescTempDuracao, setEditPrescTempDuracao] = useState('')
  const [editExameTempNome, setEditExameTempNome] = useState('')
  
  // Modal de Novo Paciente
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // Sheet de Histórico do Paciente
  const [sheetOpen, setSheetOpen] = useState(false)
  const [selectedPaciente, setSelectedPaciente] = useState<Paciente | null>(null)
  const [historicoLoading, setHistoricoLoading] = useState(false)
  const [historicoProntuarios, setHistoricoProntuarios] = useState<ProntuarioMini[]>([])
  
  // Form state
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [observacoes, setObservacoes] = useState('')
  
  const { toast } = useToast()

  useEffect(() => {
    fetchPacientes()
  }, [])

  const fetchPacientes = async () => {
    setLoading(true)
    if (import.meta.env.VITE_SUPABASE_URL.includes('your-project-url')) {
      setTimeout(() => {
        setPacientes([
          { id: '1', nome: 'João da Silva', telefone: '(85) 99999-1111', email: 'joao@email.com', observacoes: '', created_at: new Date().toISOString() },
          { id: '2', nome: 'Maria Oliveira', telefone: '(85) 98888-2222', email: 'maria@email.com', observacoes: 'Alérgica a dipirona', created_at: new Date().toISOString() }
        ])
        setLoading(false)
      }, 500)
      return
    }

    const { data, error } = await supabase
      .from('pacientes')
      .select('*')
      .order('nome', { ascending: true })
      
    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao buscar pacientes', description: error.message })
    } else if (data) {
      setPacientes(data)
    }
    setLoading(false)
  }

  const handleRowClick = async (paciente: Paciente) => {
    setSelectedPaciente(paciente)
    setSheetOpen(true)
    setHistoricoLoading(true)

    if (import.meta.env.VITE_SUPABASE_URL.includes('your-project-url')) {
      setTimeout(() => {
        setHistoricoProntuarios([
          {
            id: 'mock-1',
            created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            queixa_principal: 'Dor de cabeça tensional e estresse devido ao trabalho.',
            conduta_prescricao: 'Evitar telas antes de dormir. Prescrito analgésico e repouso.',
            sinais_vitais: { pa: '130/80', fc: '76', fr: '16', temp: '36.5', sat: '98', peso: '75', altura: '175', imc: '24.5', imcClass: 'Saudável' },
            diagnosticos: [{ codigo: 'R51', descricao: 'Cefaleia' }],
            prescricao_medicamentos: [{ medicamento: 'Paracetamol 750mg', dose: '1 comp', via: 'Oral', frequencia: 'De 8 em 8 horas se dor', duracao: '3 dias' }],
            exames_solicitados: ['TSH / T4 Livre'],
            atestado: { dias: '1', finalidade: 'Repouso', incluirCid: true },
            agendamentos: { data_hora: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), tipo: 'Consulta' }
          },
          {
            id: 'mock-2',
            created_at: new Date().toISOString(),
            queixa_principal: 'Retorno para avaliação de cefaleia. Relata melhora significativa.',
            conduta_prescricao: 'Paciente relata boa evolução clínica após o tratamento. Mantida conduta não farmacológica.',
            sinais_vitais: { pa: '120/80', fc: '72', fr: '14', temp: '36.2', sat: '99', peso: '74.5', altura: '175', imc: '24.3', imcClass: 'Saudável' },
            diagnosticos: [{ codigo: 'G43.9', descricao: 'Enxaqueca, não especificada' }],
            prescricao_medicamentos: [],
            exames_solicitados: [],
            atestado: null,
            agendamentos: { data_hora: new Date().toISOString(), tipo: 'Retorno' }
          }
        ])
        setHistoricoLoading(false)
      }, 500)
      return
    }

    const { data, error } = await supabase
      .from('prontuarios')
      .select(`
        id, created_at, queixa_principal, conduta_prescricao,
        sinais_vitais, diagnosticos, prescricao_medicamentos,
        exames_solicitados, atestado,
        agendamentos (data_hora, tipo)
      `)
      .eq('paciente_id', paciente.id)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setHistoricoProntuarios(data as unknown as ProntuarioMini[])
    }
    setHistoricoLoading(false)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    
    if (import.meta.env.VITE_SUPABASE_URL.includes('your-project-url')) {
      setTimeout(() => {
        setPacientes([{
          id: Math.random().toString(),
          nome, telefone, email, observacoes, created_at: new Date().toISOString()
        }, ...pacientes])
        
        toast({ title: 'Paciente salvo', description: 'Paciente cadastrado com sucesso.' })
        setSaving(false)
        setOpen(false)
        resetForm()
      }, 500)
      return
    }

    const { error } = await supabase.from('pacientes').insert([{
      nome, telefone, email: email || null, observacoes: observacoes || null
    }])

    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: error.message })
    } else {
      toast({ title: 'Sucesso!', description: 'O paciente foi cadastrado.' })
      fetchPacientes()
      setOpen(false)
      resetForm()
    }
    setSaving(false)
  }
  
  const resetForm = () => {
    setNome('')
    setTelefone('')
    setEmail('')
    setObservacoes('')
  }

  const handlePrintProntuario = (pront: ProntuarioMini) => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    
    const pacienteNome = selectedPaciente?.nome || 'Paciente'
    const dataHora = `${new Date(pront.agendamentos.data_hora).toLocaleDateString('pt-BR')} - ${pront.agendamentos.tipo}`
    
    const medicoNome = "Dr. Roberto Medeiros"
    const medicoCrm = "CRM 12345/CE"
    const clinicaNome = "Clínica Arcanjo Saúde"

    const sinais = pront.sinais_vitais || {}
    const cids = pront.diagnosticos || []
    const meds = pront.prescricao_medicamentos || []
    const exames = pront.exames_solicitados || []
    const ant = pront.antecedentes || {}

    const html = `
      <html>
        <head>
          <title>Prontuário - ${pacienteNome}</title>
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
            .patient-card { 
              background: #f4f4f5; 
              padding: 16px 20px; 
              border-radius: 10px; 
              margin-bottom: 30px; 
              font-size: 14px; 
              border: 1px solid #e4e4e7;
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
            .bullet-list, .cid-list, .med-list, .exam-list {
              font-size: 14px;
              color: #3f3f46;
              padding-left: 20px;
              margin-bottom: 15px;
            }
            .bullet-list div {
              margin-bottom: 5px;
            }
            .cid-list li, .exam-list li {
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
            .signature-area {
              margin-top: 85px;
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
            <p>${pront.queixa_principal || 'Não registrada.'}</p>
            
            <div style="margin-bottom: 10px;"><strong>Histórico da Doença Atual (HDA):</strong></div>
            <p>${pront.historico || 'Não registrado.'}</p>
            
            <div style="margin-bottom: 10px;"><strong>Antecedentes Clínicos:</strong></div>
            <div class="bullet-list">
              <div><strong>Alergias:</strong> ${ant.alergias || 'Nenhuma declarada.'}</div>
              <div><strong>Uso Contínuo:</strong> ${ant.usoContinuo || 'Nenhum declarado.'}</div>
              <div><strong>Doenças Crônicas:</strong> ${ant.cronicas || 'Nenhuma declarada.'}</div>
              <div><strong>Histórico Familiar:</strong> ${ant.familiares || 'Nenhum declarado.'}</div>
            </div>
          </div>

          <h2>2. Objetivo (O)</h2>
          <div class="section-box">
            <div style="margin-bottom: 10px;"><strong>Sinais Vitais:</strong></div>
            <div class="vitals-grid">
              <div class="vital-item">PA: <span>${sinais.pa || '-'} mmHg</span></div>
              <div class="vital-item">FC: <span>${sinais.fc || '-'} bpm</span></div>
              <div class="vital-item">FR: <span>${sinais.fr || '-'} ipm</span></div>
              <div class="vital-item">Temp: <span>${sinais.temp || '-'} °C</span></div>
              <div class="vital-item">Sat O2: <span>${sinais.sat || '-'}%</span></div>
              <div class="vital-item">Peso: <span>${sinais.peso || '-'} kg</span></div>
              <div class="vital-item">Altura: <span>${sinais.altura || '-'} cm</span></div>
              <div class="vital-item">IMC: <span>${sinais.imc || '-'} (${sinais.imcClass || '-'})</span></div>
            </div>
            
            <div style="margin-top: 15px; margin-bottom: 10px;">
              <strong>Exame Físico Geral:</strong>
            </div>
            <p>${pront.exame_fisico || 'Não registrado.'}</p>
          </div>

          <h2>3. Avaliação (A)</h2>
          <div class="section-box">
            <div style="margin-bottom: 10px;"><strong>Diagnósticos e CID-10:</strong></div>
            ${cids.length > 0 ? `
              <ul class="cid-list">
                ${cids.map((d: any) => `<li><strong>${d.codigo}</strong> - ${d.descricao}</li>`).join('')}
              </ul>
            ` : '<p>Nenhum CID associado.</p>'}
          </div>

          <h2>4. Plano (P)</h2>
          <div class="section-box">
            <div style="margin-bottom: 10px;"><strong>Conduta Geral:</strong></div>
            <p>${pront.conduta_prescricao || 'Não registrada.'}</p>
            
            ${meds.length > 0 ? `
              <div style="margin-top: 15px; margin-bottom: 10px;"><strong>Medicamentos Prescritos:</strong></div>
              <ul class="med-list">
                ${meds.map((m: any) => `
                  <li>
                    <strong>${m.medicamento}</strong> - ${m.dose} por via ${m.via}<br>
                    <small>Frequência: ${m.frequencia} | Duração: ${m.duracao}</small>
                  </li>
                `).join('')}
              </ul>
            ` : ''}

            ${exames.length > 0 ? `
              <div style="margin-top: 15px; margin-bottom: 10px;"><strong>Exames Solicitados:</strong></div>
              <ul class="exam-list">
                ${exames.map((e: any) => `<li>${e}</li>`).join('')}
              </ul>
            ` : ''}
          </div>
          
          <div class="signature-area">
            <div class="date-line">Fortaleza, ${new Date(pront.created_at).toLocaleDateString('pt-BR')}</div>
            <div class="sig-box">
              <div class="sig-line"></div>
              <div class="sig-name">${medicoNome}</div>
              <div class="sig-crm">${medicoCrm}</div>
            </div>
          </div>
          
          <script>
            window.onload = () => window.print();
          </script>
        </body>
      </html>
    `
    printWindow.document.write(html)
    printWindow.document.close()
  }

  const handleOpenEditProntuario = (pront: ProntuarioMini) => {
    setEditingProntuario(pront)
    setEditQueixa(pront.queixa_principal || '')
    setEditHistorico(pront.historico || '')
    setEditExameFisico(pront.exame_fisico || '')
    setEditConduta(pront.conduta_prescricao || '')
    setEditSinaisVitais(pront.sinais_vitais || { pa: '', fc: '', fr: '', temp: '', sat: '', peso: '', altura: '', imc: '', imcClass: '' })
    setEditAntecedentes(pront.antecedentes || { alergias: '', usoContinuo: '', cronicas: '', familiares: '' })
    setEditDiagnosticos(pront.diagnosticos || [])
    setEditPrescricaoMedicamentos(pront.prescricao_medicamentos || [])
    setEditExamesSolicitados(pront.exames_solicitados || [])
    
    const savedAtestado = pront.atestado || { dias: '', finalidade: '', incluirCid: false, dataAtestado: new Date().toISOString().split('T')[0] }
    setEditAtestado(savedAtestado)
    setEditAtestadoAtivo(!!(savedAtestado.dias || savedAtestado.finalidade))
    setEditProntuarioOpen(true)
  }

  const handleEditVitalChange = (field: string, value: string) => {
    const updated = { ...editSinaisVitais, [field]: value }
    if (field === 'peso' || field === 'altura') {
      const { imc, class: imcClass } = calcularIMC(
        field === 'peso' ? value : editSinaisVitais.peso,
        field === 'altura' ? value : editSinaisVitais.altura
      )
      updated.imc = imc
      updated.imcClass = imcClass
    }
    setEditSinaisVitais(updated)
  }

  const handleEditAntecedenteChange = (field: string, value: string) => {
    setEditAntecedentes({ ...editAntecedentes, [field]: value })
  }

  const handleEditAddCid = (codigo: string, descricao: string) => {
    if (!codigo || !descricao) return
    if (editDiagnosticos.some(d => d.codigo === codigo)) {
      toast({ variant: 'destructive', title: 'Código duplicado', description: 'Este CID já foi adicionado.' })
      return
    }
    setEditDiagnosticos([...editDiagnosticos, { codigo, descricao }])
    setEditCidTempCodigo('')
    setEditCidTempDesc('')
    setEditCidBusca('')
  }

  const handleEditRemoveCid = (codigo: string) => {
    setEditDiagnosticos(editDiagnosticos.filter(d => d.codigo !== codigo))
  }

  const handleEditAddMedicamento = () => {
    if (!editPrescTempMedicamento) {
      toast({ variant: 'destructive', title: 'Nome do medicamento', description: 'Preencha o nome do medicamento.' })
      return
    }
    setEditPrescricaoMedicamentos([...editPrescricaoMedicamentos, {
      medicamento: editPrescTempMedicamento,
      dose: editPrescTempDose || 'Conforme orientação',
      via: editPrescTempVia,
      frequencia: editPrescTempFrequencia || 'Conforme orientação',
      duracao: editPrescTempDuracao || 'Uso contínuo'
    }])
    setEditPrescTempMedicamento('')
    setEditPrescTempDose('')
    setEditPrescTempVia('Oral')
    setEditPrescTempFrequencia('')
    setEditPrescTempDuracao('')
  }

  const handleEditRemoveMedicamento = (index: number) => {
    setEditPrescricaoMedicamentos(editPrescricaoMedicamentos.filter((_, i) => i !== index))
  }

  const handleEditAddExame = () => {
    if (!editExameTempNome) return
    if (editExamesSolicitados.includes(editExameTempNome)) {
      toast({ variant: 'destructive', title: 'Exame duplicado', description: 'Este exame já foi solicitado.' })
      return
    }
    setEditExamesSolicitados([...editExamesSolicitados, editExameTempNome])
    setEditExameTempNome('')
  }

  const handleEditRemoveExame = (index: number) => {
    setEditExamesSolicitados(editExamesSolicitados.filter((_, i) => i !== index))
  }

  const handleEditAtestadoChange = (field: string, value: any) => {
    setEditAtestado({ ...editAtestado, [field]: value })
  }

  const handleSaveProntuarioHistorico = async () => {
    if (!editingProntuario) return
    setSaving(true)

    const data = {
      queixa_principal: editQueixa,
      historico: editHistorico,
      exame_fisico: editExameFisico,
      conduta_prescricao: editConduta,
      sinais_vitais: editSinaisVitais,
      antecedentes: editAntecedentes,
      diagnosticos: editDiagnosticos,
      prescricao_medicamentos: editPrescricaoMedicamentos,
      exames_solicitados: editExamesSolicitados,
      atestado: editAtestadoAtivo ? editAtestado : null,
      updated_at: new Date().toISOString()
    }

    if (import.meta.env.VITE_SUPABASE_URL.includes('your-project-url')) {
      setTimeout(() => {
        setHistoricoProntuarios(historicoProntuarios.map(p => 
          p.id === editingProntuario.id ? { ...p, ...data } : p
        ))
        toast({ title: 'Prontuário atualizado', description: 'Alterações salvas com sucesso (Modo Teste).' })
        setEditProntuarioOpen(false)
        setSaving(false)
      }, 500)
      return
    }

    const { error } = await supabase
      .from('prontuarios')
      .update(data)
      .eq('id', editingProntuario.id)

    if (!error) {
      toast({ title: 'Sucesso!', description: 'O prontuário foi atualizado.' })
      if (selectedPaciente) {
        const { data: refreshedData } = await supabase
          .from('prontuarios')
          .select(`
            id, created_at, queixa_principal, conduta_prescricao,
            historico, exame_fisico, sinais_vitais, diagnosticos,
            prescricao_medicamentos, exames_solicitados, atestado,
            agendamentos (data_hora, tipo)
          `)
          .eq('paciente_id', selectedPaciente.id)
          .order('created_at', { ascending: false })
        if (refreshedData) {
          setHistoricoProntuarios(refreshedData as unknown as ProntuarioMini[])
        }
      }
      setEditProntuarioOpen(false)
    } else {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: error.message })
    }
    setSaving(false)
  }

  const filtered = pacientes.filter(p => p.nome.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Pacientes</h1>
          <p className="text-sm text-zinc-500">Gerencie o cadastro de pacientes da clínica.</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-zinc-900 hover:bg-zinc-800 text-white gap-2">
              <Plus size={16} /> Novo Paciente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleSave}>
              <DialogHeader>
                <DialogTitle>Adicionar Paciente</DialogTitle>
                <DialogDescription>
                  Preencha os dados básicos do paciente. Clique em salvar ao terminar.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="nome">Nome completo *</Label>
                  <Input id="nome" value={nome} onChange={e => setNome(e.target.value)} required placeholder="Ex: João da Silva" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="telefone">WhatsApp / Telefone *</Label>
                  <Input id="telefone" value={telefone} onChange={e => setTelefone(e.target.value)} required placeholder="(00) 00000-0000" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">E-mail (opcional)</Label>
                  <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemplo.com" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="obs">Observações</Label>
                  <Textarea id="obs" value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Alergias, histórico relevante..." />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center px-3 py-2 bg-white border border-zinc-200 rounded-lg max-w-sm focus-within:ring-2 focus-within:ring-zinc-900 focus-within:border-transparent transition-all">
        <Search className="w-4 h-4 text-zinc-400 mr-2" />
        <input 
          className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-zinc-400"
          placeholder="Buscar pacientes..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-zinc-50/50">
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Data Cadastro</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-zinc-500">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  Carregando pacientes...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12 text-zinc-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mb-2">
                      <Search className="h-6 w-6 text-zinc-400" />
                    </div>
                    <p className="font-medium text-zinc-900">Nenhum paciente encontrado</p>
                    <p className="text-sm">Tente buscar por outro termo ou cadastre um novo paciente.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((paciente) => (
                <TableRow 
                  key={paciente.id} 
                  onClick={() => {
                    if (profile?.role === 'medico') {
                      handleRowClick(paciente)
                    }
                  }}
                  className={profile?.role === 'medico' ? "cursor-pointer hover:bg-zinc-50 transition-colors" : "cursor-default"}
                >
                  <TableCell className="font-medium">{paciente.nome}</TableCell>
                  <TableCell>{paciente.telefone}</TableCell>
                  <TableCell className="text-zinc-500">{paciente.email || '-'}</TableCell>
                  <TableCell className="text-zinc-500">
                    {new Date(paciente.created_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-md w-full flex flex-col gap-0 p-0">
          <SheetHeader className="p-6 pb-4 border-b border-zinc-200 bg-zinc-50">
            <SheetTitle className="text-xl">{selectedPaciente?.nome}</SheetTitle>
            <SheetDescription className="flex flex-col gap-1 mt-2">
              <span>{selectedPaciente?.telefone}</span>
              {selectedPaciente?.email && <span>{selectedPaciente?.email}</span>}
            </SheetDescription>
          </SheetHeader>
          
          <ScrollArea className="flex-1 p-6">
            <h3 className="font-medium text-zinc-900 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-zinc-500" />
              Histórico de Prontuários
            </h3>

            {historicoLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
              </div>
            ) : historicoProntuarios.length === 0 ? (
              <div className="text-center py-8 px-4 border border-dashed border-zinc-200 rounded-lg text-sm text-zinc-500">
                Nenhum prontuário registrado para este paciente ainda.
              </div>
            ) : (
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent pl-6 md:pl-0">
                {historicoProntuarios.map((pront) => (
                  <div key={pront.id} className="relative mb-6">
                    <div className="absolute -left-8 bg-zinc-100 h-5 w-5 rounded-full border border-zinc-300 flex items-center justify-center">
                      <div className="h-2 w-2 bg-zinc-600 rounded-full"></div>
                    </div>
                    
                    <div className="bg-white border border-zinc-200 p-4 rounded-xl shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-700">
                          <CalendarIcon className="w-3.5 h-3.5 text-zinc-500" />
                          {new Date(pront.agendamentos.data_hora).toLocaleDateString('pt-BR')} 
                          {' • '}
                          <span className="text-zinc-500">{pront.agendamentos.tipo}</span>
                        </div>
                        <div className="flex gap-1.5">
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleOpenEditProntuario(pront)}
                            className="h-7 text-[11px] gap-1 px-2 border border-zinc-200/50 hover:bg-zinc-50 text-zinc-700"
                          >
                            <Edit className="w-3 h-3" />
                            Editar
                          </Button>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handlePrintProntuario(pront)}
                            className="h-7 text-[11px] gap-1 px-2 border border-zinc-200/50 hover:bg-zinc-50 text-zinc-600"
                          >
                            <Printer className="w-3 h-3" />
                            Imprimir
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        {pront.queixa_principal && (
                          <div>
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Queixa Principal (QP)</span>
                            <p className="text-xs text-zinc-700 mt-0.5 whitespace-pre-wrap">{pront.queixa_principal}</p>
                          </div>
                        )}

                        {/* Sinais Vitais em linha condensada */}
                        {pront.sinais_vitais && (pront.sinais_vitais.pa || pront.sinais_vitais.peso) && (
                          <div className="bg-zinc-50/50 border border-zinc-150 rounded-lg p-2 text-[11px] grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {pront.sinais_vitais.pa && <div><span className="text-zinc-400 font-medium">PA:</span> <strong className="text-zinc-800">{pront.sinais_vitais.pa}</strong></div>}
                            {pront.sinais_vitais.fc && <div><span className="text-zinc-400 font-medium">FC:</span> <strong className="text-zinc-800">{pront.sinais_vitais.fc} bpm</strong></div>}
                            {pront.sinais_vitais.peso && <div><span className="text-zinc-400 font-medium">Peso:</span> <strong className="text-zinc-800">{pront.sinais_vitais.peso} kg</strong></div>}
                            {pront.sinais_vitais.imc && <div><span className="text-zinc-400 font-medium">IMC:</span> <strong className="text-zinc-800">{pront.sinais_vitais.imc}</strong></div>}
                          </div>
                        )}

                        {/* Diagnósticos (CIDs) */}
                        {pront.diagnosticos && pront.diagnosticos.length > 0 && (
                          <div>
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Diagnósticos</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {pront.diagnosticos.map((d: any) => (
                                <span key={d.codigo} className="inline-block text-[10px] font-semibold text-zinc-800 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-full" title={d.descricao}>
                                  {d.codigo} - {d.descricao}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Prescrição médica */}
                        {pront.prescricao_medicamentos && pront.prescricao_medicamentos.length > 0 && (
                          <div>
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Prescrição Médica</span>
                            <ul className="list-disc pl-4 text-xs text-zinc-650 space-y-0.5 mt-0.5">
                              {pront.prescricao_medicamentos.map((m: any, idx: number) => (
                                <li key={idx}>
                                  <strong>{m.medicamento}</strong> - {m.dose} ({m.via})
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {pront.conduta_prescricao && (
                          <div>
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Conduta / Plano</span>
                            <p className="text-xs text-zinc-700 mt-0.5 whitespace-pre-wrap">{pront.conduta_prescricao}</p>
                          </div>
                        )}
                        
                        {!pront.queixa_principal && !pront.conduta_prescricao && !pront.diagnosticos && (
                          <p className="text-xs text-zinc-400 italic">Prontuário sem anotações registradas.</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* EDITAR PRONTUÁRIO HISTÓRICO SHEET */}
      <Sheet open={editProntuarioOpen} onOpenChange={setEditProntuarioOpen}>
        <SheetContent className="sm:max-w-2xl w-full flex flex-col gap-0 p-0">
          <SheetHeader className="p-6 pb-4 text-left border-b border-zinc-200 bg-zinc-50/50">
            <div>
              <SheetTitle className="text-xl flex items-center gap-3">
                Editar Prontuário Clínico (SOAP)
              </SheetTitle>
              <SheetDescription className="text-zinc-500 mt-1">
                Paciente: {selectedPaciente?.nome} • Atendimento de {editingProntuario ? new Date(editingProntuario.agendamentos.data_hora).toLocaleDateString('pt-BR') : ''}
              </SheetDescription>
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1 px-6">
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
                      className="flex w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 min-h-[80px] resize-none"
                      placeholder="Motivo da consulta e sintomas principais..." 
                      value={editQueixa}
                      onChange={e => setEditQueixa(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-zinc-800">Histórico da Doença Atual (HDA)</Label>
                    <TextareaAutosize
                      minRows={5}
                      className="flex w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 min-h-[120px] resize-none"
                      placeholder="Detalhes sobre a evolução dos sintomas..." 
                      value={editHistorico}
                      onChange={e => setEditHistorico(e.target.value)}
                    />
                  </div>
                  
                  <div className="border-t border-zinc-100 pt-6">
                    <h3 className="text-sm font-semibold text-zinc-900 mb-4">Antecedentes Clínicos</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="edit-ant-alergias" className="text-xs text-zinc-500">Alergias</Label>
                        <Input id="edit-ant-alergias" value={editAntecedentes.alergias} onChange={e => handleEditAntecedenteChange('alergias', e.target.value)} placeholder="Ex: Dipirona, Corantes..." className="text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="edit-ant-uso" className="text-xs text-zinc-500">Medicamentos Contínuos</Label>
                        <Input id="edit-ant-uso" value={editAntecedentes.usoContinuo} onChange={e => handleEditAntecedenteChange('usoContinuo', e.target.value)} placeholder="Ex: Losartana 50mg..." className="text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="edit-ant-cronicas" className="text-xs text-zinc-500">Doenças Crônicas</Label>
                        <Input id="edit-ant-cronicas" value={editAntecedentes.cronicas} onChange={e => handleEditAntecedenteChange('cronicas', e.target.value)} placeholder="Ex: Hipertensão..." className="text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="edit-ant-fam" className="text-xs text-zinc-500">Histórico Familiar</Label>
                        <Input id="edit-ant-fam" value={editAntecedentes.familiares} onChange={e => handleEditAntecedenteChange('familiares', e.target.value)} placeholder="Ex: Pai cardíaco..." className="text-sm" />
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
                          <Input value={editSinaisVitais.pa} onChange={e => handleEditVitalChange('pa', e.target.value)} placeholder="120/80" className="h-8 text-xs" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-zinc-500">FC (bpm)</Label>
                          <Input value={editSinaisVitais.fc} onChange={e => handleEditVitalChange('fc', e.target.value)} placeholder="80" className="h-8 text-xs" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-zinc-500">FR (ipm)</Label>
                          <Input value={editSinaisVitais.fr} onChange={e => handleEditVitalChange('fr', e.target.value)} placeholder="16" className="h-8 text-xs" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-zinc-500">Temp (°C)</Label>
                          <Input value={editSinaisVitais.temp} onChange={e => handleEditVitalChange('temp', e.target.value)} placeholder="36.5" className="h-8 text-xs" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-zinc-500">Sat O2 (%)</Label>
                          <Input value={editSinaisVitais.sat} onChange={e => handleEditVitalChange('sat', e.target.value)} placeholder="98" className="h-8 text-xs" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-zinc-500">Peso (kg)</Label>
                          <Input value={editSinaisVitais.peso} onChange={e => handleEditVitalChange('peso', e.target.value)} placeholder="70" className="h-8 text-xs" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-zinc-500">Altura (cm)</Label>
                          <Input value={editSinaisVitais.altura} onChange={e => handleEditVitalChange('altura', e.target.value)} placeholder="170" className="h-8 text-xs" />
                        </div>
                      </div>

                      {/* IMC Card */}
                      <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 flex flex-col justify-center items-center text-center">
                        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Índice de Massa Corporal</span>
                        <div className="text-3xl font-extrabold text-zinc-800 my-2">
                          {editSinaisVitais.imc || '--'}
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          editSinaisVitais.imcClass === 'Saudável' ? 'bg-emerald-100 text-emerald-800' :
                          editSinaisVitais.imcClass === 'Sobrepeso' ? 'bg-amber-100 text-amber-800' :
                          editSinaisVitais.imcClass.includes('Obesidade') ? 'bg-rose-100 text-rose-800' : 'bg-zinc-200 text-zinc-650'
                        }`}>
                          {editSinaisVitais.imcClass || 'Medidas incompletas'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-zinc-800">Exame Físico Geral / Segmentar</Label>
                    <TextareaAutosize
                      minRows={4}
                      className="flex w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 min-h-[100px] resize-none"
                      placeholder="Descrição detalhada do exame físico por sistemas..." 
                      value={editExameFisico}
                      onChange={e => setEditExameFisico(e.target.value)}
                    />
                  </div>
                </TabsContent>

                {/* AVALIAÇÃO (A) */}
                <TabsContent value="avaliacao" className="m-0 focus-visible:outline-none space-y-6">
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-zinc-800">Hipóteses Diagnósticas & CID-10</Label>
                    
                    <div className="relative">
                      <div className="flex gap-2">
                        <Input 
                          placeholder="Pesquise por CID ou descrição (ex: Hipertensão, Lombalgia...)" 
                          value={editCidBusca} 
                          onChange={e => {
                            setEditCidBusca(e.target.value)
                            const match = CIDS_COMUNS.find(c => c.descricao.toLowerCase().includes(e.target.value.toLowerCase()) || c.codigo.toLowerCase().includes(e.target.value.toLowerCase()))
                            if (match && e.target.value.length > 2) {
                              setEditCidTempCodigo(match.codigo)
                              setEditCidTempDesc(match.descricao)
                            }
                          }}
                          className="h-9 text-xs"
                        />
                      </div>
                      
                      {editCidBusca && editCidTempCodigo && (
                        <div className="absolute z-10 w-full bg-white border border-zinc-200 rounded-lg mt-1 p-2 shadow-lg text-xs space-y-2">
                          <div className="flex justify-between items-center bg-zinc-50 p-2 rounded border">
                            <div>
                              <strong className="text-zinc-800">{editCidTempCodigo}</strong> - {editCidTempDesc}
                            </div>
                            <Button 
                              type="button" 
                              size="sm" 
                              onClick={() => handleEditAddCid(editCidTempCodigo, editCidTempDesc)}
                              className="h-6 text-[10px] bg-zinc-900 text-white"
                            >
                              Adicionar
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="border border-zinc-150 rounded-xl p-4 bg-white space-y-2">
                      <span className="text-xs font-semibold text-zinc-500 block mb-1">Diagnósticos Selecionados</span>
                      {editDiagnosticos.length === 0 ? (
                        <p className="text-xs text-zinc-400 italic">Nenhum diagnóstico associado a este atendimento.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {editDiagnosticos.map(d => (
                            <div key={d.codigo} className="flex items-center gap-1.5 bg-zinc-100 border border-zinc-200 rounded-full px-2.5 py-1 text-xs text-zinc-700">
                              <strong>{d.codigo}</strong>: {d.descricao}
                              <button type="button" onClick={() => handleEditRemoveCid(d.codigo)} className="text-zinc-400 hover:text-red-600 ml-1">
                                &times;
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* PLANO (P) */}
                <TabsContent value="plano" className="m-0 focus-visible:outline-none space-y-6">
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-zinc-800">Conduta Clínica & Plano de Cuidados</Label>
                    <TextareaAutosize
                      minRows={4}
                      className="flex w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 min-h-[100px] resize-none"
                      placeholder="Orientações gerais, conduta médica, retornos, hábitos de vida..." 
                      value={editConduta}
                      onChange={e => setEditConduta(e.target.value)}
                    />
                  </div>

                  <div className="border-t border-zinc-100 pt-6 space-y-4">
                    <h3 className="text-sm font-semibold text-zinc-900">Prescrição de Medicamentos</h3>
                    
                    <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                      <div className="space-y-1">
                        <Label className="text-[10px] text-zinc-500">Medicamento</Label>
                        <Input value={editPrescTempMedicamento} onChange={e => setEditPrescTempMedicamento(e.target.value)} placeholder="Ex: Dipirona 500mg" className="h-8 text-xs bg-white" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-zinc-500">Dose / Posologia</Label>
                        <Input value={editPrescTempDose} onChange={e => setEditPrescTempDose(e.target.value)} placeholder="Ex: 1 comprimido" className="h-8 text-xs bg-white" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-zinc-500">Via de Administração</Label>
                        <Select value={editPrescTempVia} onValueChange={setEditPrescTempVia}>
                          <SelectTrigger className="h-8 text-xs bg-white"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Oral">Oral</SelectItem>
                            <SelectItem value="Inalatória">Inalatória</SelectItem>
                            <SelectItem value="Tópica">Tópica</SelectItem>
                            <SelectItem value="Injetável">Injetável</SelectItem>
                            <SelectItem value="Oftálmica">Oftálmica</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-zinc-500">Frequência</Label>
                        <Input value={editPrescTempFrequencia} onChange={e => setEditPrescTempFrequencia(e.target.value)} placeholder="Ex: De 6 em 6 horas se dor" className="h-8 text-xs bg-white" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-zinc-500">Duração</Label>
                        <Input value={editPrescTempDuracao} onChange={e => setEditPrescTempDuracao(e.target.value)} placeholder="Ex: 5 dias" className="h-8 text-xs bg-white" />
                      </div>
                      <div className="flex items-end">
                        <Button type="button" onClick={handleEditAddMedicamento} className="h-8 text-xs bg-zinc-900 text-white w-full gap-1">
                          <PlusCircle className="w-3.5 h-3.5" /> Adicionar Item
                        </Button>
                      </div>
                    </div>

                    <div className="border border-zinc-150 rounded-xl overflow-hidden bg-white">
                      <Table>
                        <TableHeader className="bg-zinc-50/50">
                          <TableRow className="h-8">
                            <TableHead className="text-[10px] font-bold py-1">Medicamento</TableHead>
                            <TableHead className="text-[10px] font-bold py-1">Dose</TableHead>
                            <TableHead className="text-[10px] font-bold py-1">Frequência</TableHead>
                            <TableHead className="text-[10px] font-bold py-1 text-right"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {editPrescricaoMedicamentos.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center py-4 text-xs text-zinc-400 italic">Nenhum medicamento adicionado.</TableCell>
                            </TableRow>
                          ) : (
                            editPrescricaoMedicamentos.map((m, idx) => (
                              <TableRow key={idx} className="h-8 text-xs">
                                <TableCell className="font-semibold py-1">{m.medicamento}</TableCell>
                                <TableCell className="py-1">{m.dose} ({m.via})</TableCell>
                                <TableCell className="py-1">{m.frequencia} - {m.duracao}</TableCell>
                                <TableCell className="text-right py-1">
                                  <Button type="button" variant="ghost" size="sm" onClick={() => handleEditRemoveMedicamento(idx)} className="h-6 w-6 p-0 text-zinc-400 hover:text-red-600">
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  <div className="border-t border-zinc-100 pt-6 space-y-4">
                    <h3 className="text-sm font-semibold text-zinc-900">Solicitação de Exames</h3>
                    
                    <div className="flex gap-2">
                      <Input value={editExameTempNome} onChange={e => setEditExameTempNome(e.target.value)} placeholder="Ex: Hemograma completo..." className="h-9 text-xs" />
                      <Button type="button" onClick={handleEditAddExame} className="h-9 text-xs bg-zinc-900 text-white gap-1">
                        <PlusCircle className="w-3.5 h-3.5" /> Adicionar
                      </Button>
                    </div>

                    <div className="border border-zinc-150 rounded-xl overflow-hidden bg-white">
                      <Table>
                        <TableBody>
                          {editExamesSolicitados.length === 0 ? (
                            <TableRow>
                              <TableCell className="text-center py-4 text-xs text-zinc-400 italic">Nenhum exame solicitado.</TableCell>
                            </TableRow>
                          ) : (
                            editExamesSolicitados.map((exam, idx) => (
                              <TableRow key={idx} className="h-8 text-xs">
                                <TableCell className="py-1">{exam}</TableCell>
                                <TableCell className="text-right py-1">
                                  <Button type="button" variant="ghost" size="sm" onClick={() => handleEditRemoveExame(idx)} className="h-6 w-6 p-0 text-zinc-400 hover:text-red-600">
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  <div className="border-t border-zinc-100 pt-6 space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-sm font-semibold text-zinc-900">Atestado Médico</h3>
                        <p className="text-xs text-zinc-450">Gerar atestado médico de afastamento.</p>
                      </div>
                      <Switch checked={editAtestadoAtivo} onCheckedChange={setEditAtestadoAtivo} />
                    </div>

                    {editAtestadoAtivo && (
                      <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <Label className="text-xs text-zinc-500">Dias de Afastamento</Label>
                            <Input 
                              type="number" 
                              value={editAtestado.dias} 
                              onChange={e => handleEditAtestadoChange('dias', e.target.value)} 
                              placeholder="Dias" 
                              className="h-8 text-xs bg-white" 
                            />
                          </div>
                          <div className="space-y-1 sm:col-span-2">
                            <Label className="text-xs text-zinc-500">Finalidade</Label>
                            <Input 
                              value={editAtestado.finalidade} 
                              onChange={e => handleEditAtestadoChange('finalidade', e.target.value)} 
                              placeholder="Ex: Repouso domiciliar" 
                              className="h-8 text-xs bg-white" 
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                          <div className="flex items-center space-x-2">
                            <Switch 
                              id="edit-incluir-cid"
                              checked={editAtestado.incluirCid} 
                              onCheckedChange={(val: boolean) => handleEditAtestadoChange('incluirCid', val)} 
                            />
                            <Label htmlFor="edit-incluir-cid" className="text-xs text-zinc-600 cursor-pointer">Incluir CID-10</Label>
                          </div>
                          
                          <div className="space-y-1">
                            <Label className="text-[10px] text-zinc-500">Data do Atestado</Label>
                            <Input 
                              type="date" 
                              value={editAtestado.dataAtestado || new Date().toISOString().split('T')[0]} 
                              onChange={e => handleEditAtestadoChange('dataAtestado', e.target.value)} 
                              className="h-8 text-xs bg-white" 
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </ScrollArea>

          <div className="p-4 border-t border-zinc-200 bg-white flex items-center justify-between">
            <Button variant="ghost" onClick={() => setEditProntuarioOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSaveProntuarioHistorico} disabled={saving} className="bg-zinc-900 hover:bg-zinc-800 text-white">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Alterações
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
