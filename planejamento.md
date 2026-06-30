# Planejamento — Sistema de Agendamento Médico
**Dr. Roberto Willamy Arcanjo Rego Filho — CRM-CE 26.155**
Documento para construção do app com Claude Code.

---

## 1. Objetivo

App web simples para o Dr. Roberto **organizar a própria agenda de atendimentos** (presencial na Clínica AllMed e telemedicina) e permitir que **a secretária acesse e gerencie os agendamentos**, com um **calendário** para definir dias/horários de atendimento e **abas de análise** (relatórios) que possam ser salvas e exportadas.

### Premissas (ajuste se necessário)
- Dois perfis de acesso: **Médico** (você, controle total) e **Secretária** (agenda e pacientes, sem dados financeiros sensíveis).
- Tipos de consulta: **Presencial** (Clínica AllMed) e **Telemedicina**.
- Pagamento: **convênio** (Amil, Unimed, ISSEC, IPM…) ou **particular**.
- O agendamento é feito **por você ou pela secretária** — não há auto-agendamento de paciente nesta primeira versão (pode entrar na v2).
- Dados de paciente são **mínimos** (nome, contato, convênio) — não é prontuário. Isso simplifica o app e reduz exposição sob a LGPD.

---

## 2. Stack recomendada

Alinhada ao que você já usa, para o Claude Code andar rápido:

| Camada | Tecnologia | Por quê |
|---|---|---|
| Frontend | **React + TypeScript + Vite** | Você já domina |
| UI | **Tailwind CSS + shadcn/ui** | Componentes prontos e bonitos |
| Calendário | **FullCalendar** (ou react-big-calendar) | Visões dia/semana/mês prontas |
| Backend/DB | **Supabase** (Postgres + Auth + RLS + Realtime) | Auth e controle de acesso por perfil sem backend próprio |
| Deploy | **Vercel** | Você já tem conector Vercel |
| Notificações (opcional, v2) | **Evolution API / n8n** (que você já roda no VPS) | Confirmação/lembrete por WhatsApp |

> **Segurança da API key:** nada de chave da Anthropic ou service_role do Supabase no front com prefixo `VITE_`. Use a **anon key** no cliente (protegida por RLS) e segredos só em Edge Functions.

---

## 3. Perfis e permissões (RLS)

| Ação | Médico | Secretária |
|---|---|---|
| Ver agenda/calendário | ✅ | ✅ |
| Criar/editar/cancelar agendamento | ✅ | ✅ |
| Cadastrar/editar paciente | ✅ | ✅ |
| Definir disponibilidade e bloqueios | ✅ | ⛔ (só visualiza) |
| Ver aba Financeiro | ✅ | ⛔ |
| Excluir registros / exportar tudo | ✅ | ⛔ |

Implementar com **Row Level Security** no Supabase: a coluna `role` em `profiles` decide o que cada usuário enxerga e altera.

---

## 4. Modelo de dados (Postgres / Supabase)

```text
profiles
  id (uuid, = auth.users.id)
  nome (text)
  role (text)  -- 'medico' | 'secretaria'

locais_atendimento
  id (uuid)
  nome (text)            -- "Clínica AllMed", "Telemedicina"
  tipo (text)            -- 'presencial' | 'telemedicina'
  endereco (text, null)

convenios
  id (uuid)
  nome (text)            -- "Amil", "Unimed", "ISSEC", "IPM", "Particular"

pacientes
  id (uuid)
  nome (text)
  telefone (text)        -- WhatsApp
  email (text, null)
  convenio_id (uuid, null)
  observacoes (text, null)
  created_at (timestamptz)

disponibilidades            -- horários recorrentes de atendimento
  id (uuid)
  dia_semana (int)          -- 0=domingo … 6=sábado
  hora_inicio (time)
  hora_fim (time)
  local_id (uuid)
  duracao_consulta_min (int)  -- ex.: 20, 30
  valido_de (date, null)
  valido_ate (date, null)

bloqueios                   -- férias, feriados, compromissos
  id (uuid)
  data_inicio (timestamptz)
  data_fim (timestamptz)
  motivo (text)

agendamentos
  id (uuid)
  paciente_id (uuid)
  data_hora (timestamptz)
  duracao_min (int)
  local_id (uuid)
  tipo (text)             -- 'presencial' | 'telemedicina'
  convenio_id (uuid, null)
  status (text)           -- 'agendado' | 'confirmado' | 'atendido' | 'faltou' | 'cancelado'
  valor (numeric, null)   -- particular
  observacoes (text, null)
  created_by (uuid)       -- quem agendou
  created_at (timestamptz)
```

---

## 5. Telas / funcionalidades

### 5.1 Login
Tela única de login (Supabase Auth, e-mail+senha). Após login, redireciona conforme o perfil.

### 5.2 Calendário (tela principal)
- Visões **dia / semana / mês** (FullCalendar).
- Mostra agendamentos coloridos por **status** e por **tipo** (presencial vs telemedicina).
- Faixas de **disponibilidade** aparecem como fundo; **bloqueios** ficam cinza.
- Clicar num horário vago → abre modal "Novo agendamento".
- Clicar num agendamento → ver/editar/mudar status.

### 5.3 Novo/Editar agendamento (modal)
Campos: paciente (busca ou cadastro rápido), data/hora, duração, local, tipo, convênio/particular, valor (se particular), observações, status.
Validações: não permitir choque de horário; não agendar em bloqueio.

### 5.4 Disponibilidade (só Médico)
- Definir, por dia da semana, faixas de atendimento, local e duração padrão da consulta.
- Cadastrar **bloqueios** (férias, congressos, feriados).

### 5.5 Pacientes
Lista pesquisável + cadastro/edição. Mínimo de dados (LGPD).

### 5.6 Análise (abas de relatório)
Aba com sub-abas, cada uma com gráficos + tabela e botão **Exportar (CSV/PDF)**:

1. **Visão Geral** — nº de consultas no período, por dia/semana/mês.
2. **Comparecimento** — taxa de comparecimento × faltas (no-show) × cancelamentos.
3. **Por Convênio** — volume por Amil, Unimed, ISSEC, IPM, particular.
4. **Por Tipo** — presencial × telemedicina.
5. **Financeiro** (só Médico) — receita estimada de particulares no período.

Filtro de período (data início/fim) em todas as abas. "Salvar" = os dados já ficam persistidos no Supabase; exportação gera o arquivo para download.

---

## 6. Fases de construção (passe ao Claude Code nesta ordem)

- **Fase 0 — Setup:** criar projeto Vite + React + TS, Tailwind, shadcn/ui; criar projeto Supabase; conectar; deploy inicial na Vercel.
- **Fase 1 — Auth e perfis:** login, tabela `profiles`, RLS por `role`, redirecionamento.
- **Fase 2 — Modelo de dados:** criar todas as tabelas e policies; seeds de `locais_atendimento` e `convenios`.
- **Fase 3 — Calendário + agendamentos:** FullCalendar, CRUD de agendamento, validação de conflito.
- **Fase 4 — Disponibilidade e bloqueios:** telas do Médico; refletir no calendário.
- **Fase 5 — Pacientes:** lista + cadastro.
- **Fase 6 — Abas de análise:** dashboards + exportação CSV/PDF.
- **Fase 7 (opcional) — WhatsApp:** lembrete/confirmação via Evolution API + n8n.

Construir e testar **fase por fase** evita que o app fique grande demais e quebre.

---

## 7. Como passar isto pro Claude Code

1. Salve este arquivo na raiz do projeto como `PLANEJAMENTO.md`.
2. Abra o Claude Code na pasta e diga algo como:
   *"Leia o `PLANEJAMENTO.md`. Vamos construir este app na ordem das fases. Comece pela **Fase 0** e só avance quando eu confirmar. Use React+TS+Vite, Tailwind, shadcn/ui e Supabase."*
3. A cada fase, peça para ele rodar/testar antes de seguir.
4. Mantenha os segredos (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) num `.env` fora do versionamento.

---

## 8. Observações de compliance

- **LGPD:** colete o mínimo de dados do paciente; controle de acesso por perfil (RLS); não armazene conteúdo clínico aqui — isto é agenda, não prontuário.
- **Acesso da secretária:** registre `created_by` em cada agendamento para rastreabilidade.
- **Backup:** o Supabase faz backup, mas exporte periodicamente os agendamentos.

---

## 9. Possíveis evoluções (v2)
- Auto-agendamento pelo paciente via link público.
- Confirmação automática por WhatsApp (Evolution API/n8n).
- Sincronização com Google Calendar.
- Fila de telemedicina / link de videochamada por agendamento.
