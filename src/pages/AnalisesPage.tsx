import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, CalendarCheck, TrendingUp, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function AnalisesPage() {
  const [metrics, setMetrics] = useState({
    totalPacientes: 0,
    agendamentosMes: 0,
    taxaComparecimento: '0%',
    proximaConsulta: '-'
  })
  const [distribuicao, setDistribuicao] = useState({
    consulta: 50,
    retorno: 30,
    telemedicina: 20
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMetrics()
  }, [])

  const fetchMetrics = async () => {
    setLoading(true)

    if (import.meta.env.VITE_SUPABASE_URL.includes('your-project-url')) {
      // Mock metrics
      setTimeout(() => {
        setMetrics({
          totalPacientes: 124,
          agendamentosMes: 48,
          taxaComparecimento: '92%',
          proximaConsulta: 'Hoje, 14:30'
        })
        setDistribuicao({
          consulta: 45,
          retorno: 35,
          telemedicina: 20
        })
        setLoading(false)
      }, 500)
      return
    }

    try {
      const [pacientesRes, agendamentosRes] = await Promise.all([
        supabase.from('pacientes').select('id', { count: 'exact', head: true }),
        supabase.from('agendamentos').select('id, data_hora, status, tipo')
      ])

      const totalPacientes = pacientesRes.count || 0
      const agendamentos = agendamentosRes.data || []
      const totalAgendamentos = agendamentos.length
      
      // Cálculo da taxa de comparecimento real
      const atendidos = agendamentos.filter(a => a.status === 'atendido').length
      const faltou = agendamentos.filter(a => a.status === 'faltou').length
      const totalFinalizados = atendidos + faltou
      
      let taxaComparecimento = '100%'
      if (totalFinalizados > 0) {
        taxaComparecimento = `${Math.round((atendidos / totalFinalizados) * 100)}%`
      } else if (totalAgendamentos > 0) {
        taxaComparecimento = '100%'
      } else {
        taxaComparecimento = '-'
      }

      // Cálculo de distribuição de tipos de consulta
      if (totalAgendamentos > 0) {
        const consultas = agendamentos.filter(a => a.tipo === 'Consulta' || a.tipo === 'Consulta Presencial').length
        const retornos = agendamentos.filter(a => a.tipo === 'Retorno').length
        const telemedicina = agendamentos.filter(a => a.tipo === 'Telemedicina').length
        
        const sum = consultas + retornos + telemedicina
        if (sum > 0) {
          setDistribuicao({
            consulta: Math.round((consultas / sum) * 100),
            retorno: Math.round((retornos / sum) * 100),
            telemedicina: Math.round((telemedicina / sum) * 100)
          })
        }
      }

      // Encontrar próxima consulta
      const now = new Date()
      const futureAgendamentos = agendamentos
        .filter(a => new Date(a.data_hora) > now)
        .sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime())

      let proxima = '-'
      if (futureAgendamentos.length > 0) {
        const next = new Date(futureAgendamentos[0].data_hora)
        const isToday = next.getDate() === now.getDate() && next.getMonth() === now.getMonth()
        const timeStr = next.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        proxima = isToday ? `Hoje, ${timeStr}` : `${next.toLocaleDateString('pt-BR')} às ${timeStr}`
      }

      setMetrics({
        totalPacientes,
        agendamentosMes: totalAgendamentos,
        taxaComparecimento,
        proximaConsulta: proxima
      })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Visão Geral</h1>
        <p className="text-sm text-zinc-500">Acompanhe as métricas e o desempenho da clínica.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm border-zinc-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">Total de Pacientes</CardTitle>
            <Users className="w-4 h-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-zinc-900">
              {loading ? '-' : metrics.totalPacientes}
            </div>
            <p className="text-xs text-zinc-500 mt-1">+4 este mês</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-zinc-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">Agendamentos no Mês</CardTitle>
            <CalendarCheck className="w-4 h-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-zinc-900">
              {loading ? '-' : metrics.agendamentosMes}
            </div>
            <p className="text-xs text-emerald-600 font-medium mt-1">12% acima da média</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-zinc-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">Comparecimento</CardTitle>
            <TrendingUp className="w-4 h-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-zinc-900">
              {loading ? '-' : metrics.taxaComparecimento}
            </div>
            <p className="text-xs text-zinc-500 mt-1">Dos últimos 30 dias</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-zinc-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">Próxima Consulta</CardTitle>
            <Clock className="w-4 h-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-zinc-900 mt-1">
              {loading ? '-' : metrics.proximaConsulta}
            </div>
            <p className="text-xs text-zinc-500 mt-2">Horário local</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mt-6">
        <Card className="col-span-4 shadow-sm border-zinc-200">
          <CardHeader>
            <CardTitle className="text-lg font-medium">Consultas por Dia da Semana</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {/* Sleek CSS mock chart */}
            <div className="flex items-end justify-between h-[200px] mt-4 gap-2 px-2">
              {[
                { label: 'Seg', height: '60%' },
                { label: 'Ter', height: '80%' },
                { label: 'Qua', height: '50%' },
                { label: 'Qui', height: '90%' },
                { label: 'Sex', height: '70%' },
              ].map((bar) => (
                <div key={bar.label} className="w-full flex flex-col items-center gap-2 group cursor-pointer">
                  <div className="w-full bg-zinc-100 rounded-t-sm relative flex-1 flex items-end">
                    <div 
                      className="w-full bg-zinc-900 rounded-t-sm transition-all duration-500 group-hover:bg-zinc-700"
                      style={{ height: bar.height }}
                    ></div>
                  </div>
                  <span className="text-xs text-zinc-500 font-medium">{bar.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3 shadow-sm border-zinc-200">
          <CardHeader>
            <CardTitle className="text-lg font-medium">Distribuição</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6 pt-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-zinc-700">Consulta Presencial</span>
                  <span className="text-zinc-500">{distribuicao.consulta}%</span>
                </div>
                <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
                  <div className="h-full bg-zinc-900 transition-all duration-500" style={{ width: `${distribuicao.consulta}%` }}></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-zinc-700">Retorno</span>
                  <span className="text-zinc-500">{distribuicao.retorno}%</span>
                </div>
                <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
                  <div className="h-full bg-zinc-650 transition-all duration-500" style={{ width: `${distribuicao.retorno}%` }}></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-zinc-700">Telemedicina</span>
                  <span className="text-zinc-500">{distribuicao.telemedicina}%</span>
                </div>
                <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
                  <div className="h-full bg-zinc-350 transition-all duration-500" style={{ width: `${distribuicao.telemedicina}%` }}></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
