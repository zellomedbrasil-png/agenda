-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES TABLE
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  nome text not null,
  role text not null check (role in ('medico', 'secretaria'))
);
alter table profiles enable row level security;
create policy "Perfis visíveis para usuários autenticados" on profiles for select to authenticated using (true);
create policy "Apenas médico e o próprio usuário podem atualizar perfis" on profiles for update to authenticated using (
  auth.uid() = id or (select role from profiles where id = auth.uid()) = 'medico'
);

-- LOCAIS DE ATENDIMENTO
create table locais_atendimento (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  tipo text not null check (tipo in ('presencial', 'telemedicina')),
  endereco text
);
alter table locais_atendimento enable row level security;
create policy "Locais visíveis para autenticados" on locais_atendimento for select to authenticated using (true);
create policy "Apenas médico altera locais" on locais_atendimento for all to authenticated using (
  (select role from profiles where id = auth.uid()) = 'medico'
);

-- CONVENIOS
create table convenios (
  id uuid primary key default uuid_generate_v4(),
  nome text not null
);
alter table convenios enable row level security;
create policy "Convênios visíveis para autenticados" on convenios for select to authenticated using (true);
create policy "Apenas médico altera convênios" on convenios for all to authenticated using (
  (select role from profiles where id = auth.uid()) = 'medico'
);

-- PACIENTES
create table pacientes (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  telefone text not null,
  email text,
  convenio_id uuid references convenios(id),
  observacoes text,
  created_at timestamptz default now()
);
alter table pacientes enable row level security;
create policy "Todos os autenticados veem pacientes" on pacientes for select to authenticated using (true);
create policy "Todos os autenticados podem inserir pacientes" on pacientes for insert to authenticated with check (true);
create policy "Todos os autenticados podem atualizar pacientes" on pacientes for update to authenticated using (true);

-- DISPONIBILIDADES
create table disponibilidades (
  id uuid primary key default uuid_generate_v4(),
  dia_semana int not null check (dia_semana between 0 and 6),
  hora_inicio time not null,
  hora_fim time not null,
  local_id uuid references locais_atendimento(id) not null,
  duracao_consulta_min int not null,
  valido_de date,
  valido_ate date
);
alter table disponibilidades enable row level security;
create policy "Todos os autenticados veem disponibilidades" on disponibilidades for select to authenticated using (true);
create policy "Apenas médico altera disponibilidades" on disponibilidades for all to authenticated using (
  (select role from profiles where id = auth.uid()) = 'medico'
);

-- BLOQUEIOS
create table bloqueios (
  id uuid primary key default uuid_generate_v4(),
  data_inicio timestamptz not null,
  data_fim timestamptz not null,
  motivo text
);
alter table bloqueios enable row level security;
create policy "Todos os autenticados veem bloqueios" on bloqueios for select to authenticated using (true);
create policy "Apenas médico altera bloqueios" on bloqueios for all to authenticated using (
  (select role from profiles where id = auth.uid()) = 'medico'
);

-- AGENDAMENTOS
create table agendamentos (
  id uuid primary key default uuid_generate_v4(),
  paciente_id uuid references pacientes(id) not null,
  data_hora timestamptz not null,
  duracao_min int not null,
  local_id uuid references locais_atendimento(id) not null,
  tipo text not null check (tipo in ('presencial', 'telemedicina')),
  convenio_id uuid references convenios(id),
  status text not null check (status in ('agendado', 'confirmado', 'atendido', 'faltou', 'cancelado')),
  valor numeric,
  observacoes text,
  created_by uuid references auth.users not null,
  created_at timestamptz default now()
);
alter table agendamentos enable row level security;
create policy "Todos os autenticados veem agendamentos" on agendamentos for select to authenticated using (true);
create policy "Todos os autenticados criam agendamentos" on agendamentos for insert to authenticated with check (true);
create policy "Todos os autenticados atualizam agendamentos" on agendamentos for update to authenticated using (true);
create policy "Apenas médico exclui agendamentos" on agendamentos for delete to authenticated using (
  (select role from profiles where id = auth.uid()) = 'medico'
);

-- SEEDS INICIAIS
insert into locais_atendimento (nome, tipo, endereco) values 
('Clínica AllMed', 'presencial', 'Rua Exemplo, 123'),
('Telemedicina', 'telemedicina', null);

insert into convenios (nome) values 
('Amil'), ('Unimed'), ('ISSEC'), ('IPM'), ('Particular');

-- PRONTUÁRIOS ELETRÔNICOS
create table prontuarios (
  id uuid primary key default uuid_generate_v4(),
  agendamento_id uuid references agendamentos(id) on delete cascade unique not null,
  paciente_id uuid references pacientes(id) not null,
  queixa_principal text,
  historico text,
  exame_fisico text,
  conduta_prescricao text,
  sinais_vitais jsonb,
  antecedentes jsonb,
  diagnosticos jsonb,
  prescricao_medicamentos jsonb,
  exames_solicitados jsonb,
  atestado jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);


alter table prontuarios enable row level security;
-- Apenas médico tem acesso aos prontuários (Leitura e Escrita)
create policy "Apenas médico lê prontuários" on prontuarios for select to authenticated using (
  (select role from profiles where id = auth.uid()) = 'medico'
);
create policy "Apenas médico insere prontuários" on prontuarios for insert to authenticated with check (
  (select role from profiles where id = auth.uid()) = 'medico'
);
create policy "Apenas médico altera prontuários" on prontuarios for update to authenticated using (
  (select role from profiles where id = auth.uid()) = 'medico'
);
create policy "Apenas médico deleta prontuários" on prontuarios for delete to authenticated using (
  (select role from profiles where id = auth.uid()) = 'medico'
);
