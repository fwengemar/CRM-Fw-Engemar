import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL || 'https://goautzfgguqcltjqteoi.supabase.co'
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_pACJNg4FvwOtbL4B2Md9Ow_DpwkTFtq'

export const supabase = createClient(url, key)

export const FASES = [
  'Oportunidade',
  'Em licitação',
  'Homologado',
  'Contrato assinado',
  'Em execução',
  'Encerrado',
  'Não prosseguir',
]

export const CORES_FASE = {
  'Oportunidade': '#579bfc',
  'Em licitação': '#fdab3d',
  'Homologado': '#a25ddc',
  'Contrato assinado': '#0086c0',
  'Em execução': '#00c875',
  'Encerrado': '#7e8fa5',
  'Não prosseguir': '#e2445c',
}

export const SAUDES = ['Em dia', 'Atenção', 'Crítico', 'Concluído']
export const CORES_SAUDE = {
  'Em dia': '#00c875',
  'Atenção': '#fdab3d',
  'Crítico': '#e2445c',
  'Concluído': '#579bfc',
}

export const PRIORIDADES = ['Baixa', 'Média', 'Alta', 'Urgente']
export const CORES_PRIORIDADE = {
  'Baixa': '#c3c6d4',
  'Média': '#579bfc',
  'Alta': '#fdab3d',
  'Urgente': '#e2445c',
}

export const MODALIDADES = [
  'Pregão Eletrônico', 'Concorrência', 'Dispensa', 'Inexigibilidade',
  'Tomada de Preços', 'Contrato', 'Contrato Privado', 'Outro',
]

export const STATUS_MEDICAO = ['Prevista', 'Executada', 'Faturada', 'Recebida', 'Glosada']
export const CORES_MEDICAO = {
  'Prevista': '#c3c6d4', 'Executada': '#579bfc', 'Faturada': '#fdab3d',
  'Recebida': '#00c875', 'Glosada': '#e2445c',
}
export const TIPOS_ADITIVO = ['Prazo', 'Valor', 'Prazo e Valor', 'Reajuste', 'Apostilamento', 'Outro']

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
export const money = (v) => (v === null || v === undefined || v === '' ? '—' : brl.format(Number(v)))
export const moneyShort = (v) => {
  const n = Number(v || 0)
  if (n >= 1e6) return 'R$ ' + (n / 1e6).toFixed(1).replace('.', ',') + ' mi'
  if (n >= 1e3) return 'R$ ' + (n / 1e3).toFixed(0) + ' mil'
  return brl.format(n)
}
export const dt = (d) => {
  if (!d) return '—'
  const [y, m, day] = String(d).slice(0, 10).split('-')
  return `${day}/${m}/${y}`
}
export const hoje = () => new Date().toISOString().slice(0, 10)
export const diasAte = (d) => {
  if (!d) return null
  const alvo = new Date(String(d).slice(0, 10) + 'T00:00:00')
  const agora = new Date(hoje() + 'T00:00:00')
  return Math.round((alvo - agora) / 86400000)
}
export const iniciais = (nome) =>
  (nome || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase()

export const CORES_AVATAR = ['#0073ea', '#00c875', '#a25ddc', '#fdab3d', '#e2445c', '#0086c0']

// valor que vale hoje: o contratado quando existe, senao o estimado
export const valorVigente = (c) => (c.valor_contratado ?? c.valor_total)

/* ===================== TAREFAS ===================== */
export const STATUS_TAREFA = ['A fazer', 'Em andamento', 'Em revisão', 'Concluído', 'Cancelado']
export const CORES_STATUS = {
  'A fazer': '#9aa3b2',
  'Em andamento': '#7b68ee',
  'Em revisão': '#fdab3d',
  'Concluído': '#00c875',
  'Cancelado': '#c3c6d4',
}
export const PRIO_TAREFA = ['Baixa', 'Normal', 'Alta', 'Urgente']
export const CORES_PRIO = { 'Baixa': '#b5bbc8', 'Normal': '#579bfc', 'Alta': '#fdab3d', 'Urgente': '#e2445c' }
export const RECORRENCIAS = ['Nenhuma', 'Diária', 'Semanal', 'Quinzenal', 'Mensal', 'Trimestral']

export const CONCLUIDA = (t) => t.status === 'Concluído' || t.status === 'Cancelado'
export const grupoPrazo = (t) => {
  if (CONCLUIDA(t)) return 'Concluídas'
  const d = diasAte(t.prazo)
  if (d === null) return 'Sem prazo'
  if (d < 0) return 'Atrasadas'
  if (d === 0) return 'Hoje'
  if (d <= 7) return 'Esta semana'
  return 'Depois'
}
export const GRUPOS_PRAZO = ['Atrasadas', 'Hoje', 'Esta semana', 'Depois', 'Sem prazo', 'Concluídas']
export const CORES_GRUPO = {
  'Atrasadas': '#e2445c', 'Hoje': '#fdab3d', 'Esta semana': '#7b68ee',
  'Depois': '#579bfc', 'Sem prazo': '#9aa3b2', 'Concluídas': '#00c875',
}
