import React, { useState } from 'react'
import { supabase, FASES, CORES_FASE, SAUDES, CORES_SAUDE, STATUS_TAREFA, CORES_STATUS, PRIO_TAREFA, CORES_PRIO } from './lib'
import { lumText } from './ui'

export const FILTRO_VAZIO = { fases: [], saudes: [], statusT: [], prioT: [], janela: '' }
export const AGRUPAMENTOS = [
  ['fase', 'Fase'], ['orgao', 'Órgão'], ['responsavel', 'Responsável'], ['saude', 'Status'],
]
export const JANELAS = [['', 'qualquer data'], ['7', 'nos próximos 7 dias'], ['15', 'nos próximos 15 dias'], ['30', 'nos próximos 30 dias']]

export const filtroLimpo = (f) =>
  !f.fases.length && !f.saudes.length && !f.statusT.length && !f.prioT.length && !f.janela

// aplica a janela de dias sobre uma data (sessão do contrato, prazo da tarefa)
export function dentroDaJanela(data, dias) {
  if (!dias) return true
  if (!data) return false
  const alvo = new Date(String(data).slice(0, 10) + 'T00:00:00')
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  const limite = new Date(hoje); limite.setDate(limite.getDate() + Number(dias))
  return alvo >= hoje && alvo <= limite
}

function Grupo({ titulo, opcoes, cores, escolhidos, onMudar }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-[11px] uppercase font-bold text-slate-400">{titulo}</span>
      {opcoes.map((o) => {
        const on = escolhidos.includes(o)
        return (
          <button key={o} onClick={() => onMudar(on ? escolhidos.filter((x) => x !== o) : [...escolhidos, o])}
            className={'px-2 py-0.5 rounded-full text-[12px] font-semibold border transition ' + (on ? '' : 'border-slate-200 text-slate-500 hover:bg-slate-50')}
            style={on ? { background: cores[o], color: lumText(cores[o]), borderColor: cores[o] } : {}}>
            {o}
          </button>
        )
      })}
    </div>
  )
}

export function BarraFiltros({
  ehTarefa, filtros, setFiltros, agrupamento, setAgrupamento,
  visoes, user, telaAtual, contexto, onRecarregarVisoes, onAplicarVisao,
}) {
  const [aberta, setAberta] = useState(false)
  const [menuVisoes, setMenuVisoes] = useState(false)
  const minhas = visoes.filter((v) => v.tela === (ehTarefa ? 'tarefas' : 'contratos'))

  async function salvarVisao() {
    const nome = window.prompt('Nome da visão (ex.: Licitações com sessão em 15 dias)', '')
    if (nome === null || !nome.trim()) return
    const { error } = await supabase.from('visoes').insert({
      perfil_id: user.id, nome: nome.trim(), tela: ehTarefa ? 'tarefas' : 'contratos',
      filtros: { ...filtros, ...contexto }, agrupamento, compartilhada: true,
    })
    if (error) return alert('Erro ao salvar a visão: ' + error.message)
    setMenuVisoes(false); onRecarregarVisoes()
  }

  async function apagarVisao(v) {
    if (!confirm(`Apagar a visão "${v.nome}"?`)) return
    const { error } = await supabase.from('visoes').delete().eq('id', v.id)
    if (error) return alert(error.message)
    onRecarregarVisoes()
  }

  const limpo = filtroLimpo(filtros)

  return (
    <div className="nao-imprimir px-5 py-2 border-b border-slate-200 bg-white flex items-center gap-3 flex-wrap text-[13px]">
      <button onClick={() => setAberta(!aberta)}
        className={'rounded-lg border px-2.5 py-1 font-semibold ' + (limpo ? 'border-slate-200 text-slate-500 hover:bg-slate-50' : 'border-[#0073ea] text-[#0073ea]')}>
        Filtros{limpo ? '' : ' ·'}
      </button>
      {!limpo && (
        <button onClick={() => setFiltros(FILTRO_VAZIO)} className="text-slate-400 hover:text-slate-600">limpar</button>
      )}

      <div className="relative">
        <button onClick={() => setMenuVisoes(!menuVisoes)}
          className="rounded-lg border border-slate-200 px-2.5 py-1 font-semibold text-slate-500 hover:bg-slate-50">
          Visões {minhas.length > 0 && <span className="text-slate-400">({minhas.length})</span>}
        </button>
        {menuVisoes && (
          <>
            <div className="fixed inset-0 z-20" onMouseDown={() => setMenuVisoes(false)} />
            <div className="absolute left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-100 z-30 p-2">
              {minhas.length === 0 && (
                <div className="px-2 py-3 text-[12px] text-slate-400">
                  Nenhuma visão salva nesta tela. Monte os filtros e salve — fica disponível para a equipe.
                </div>
              )}
              {minhas.map((v) => (
                <div key={v.id} className="flex items-center gap-1">
                  <button onClick={() => { setMenuVisoes(false); onAplicarVisao(v) }}
                    className="flex-1 text-left px-2 py-1.5 rounded hover:bg-slate-50 text-[13px] text-slate-600">{v.nome}</button>
                  {v.perfil_id === user.id && (
                    <button onClick={() => apagarVisao(v)} className="text-slate-300 hover:text-[#e2445c] px-1">✕</button>
                  )}
                </div>
              ))}
              <button onClick={salvarVisao}
                className="w-full text-left px-2 py-1.5 mt-1 border-t border-slate-100 text-[13px] font-semibold text-[#0073ea] hover:bg-slate-50">
                Salvar a visão atual
              </button>
            </div>
          </>
        )}
      </div>

      {!ehTarefa && (
        <label className="flex items-center gap-1 text-slate-500">
          Agrupar por
          <select value={agrupamento} onChange={(e) => setAgrupamento(e.target.value)}
            className="rounded-lg border border-slate-200 px-2 py-1 outline-none focus:border-[#0073ea]">
            {AGRUPAMENTOS.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
          </select>
        </label>
      )}

      <label className="flex items-center gap-1 text-slate-500 ml-auto">
        {ehTarefa ? 'Prazo' : 'Sessão'}
        <select value={filtros.janela} onChange={(e) => setFiltros({ ...filtros, janela: e.target.value })}
          className="rounded-lg border border-slate-200 px-2 py-1 outline-none focus:border-[#0073ea]">
          {JANELAS.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
        </select>
      </label>

      {aberta && (
        <div className="w-full flex flex-col gap-2 pt-2 border-t border-slate-100">
          {!ehTarefa && <Grupo titulo="Fase" opcoes={FASES} cores={CORES_FASE} escolhidos={filtros.fases}
            onMudar={(v) => setFiltros({ ...filtros, fases: v })} />}
          {!ehTarefa && <Grupo titulo="Status" opcoes={SAUDES} cores={CORES_SAUDE} escolhidos={filtros.saudes}
            onMudar={(v) => setFiltros({ ...filtros, saudes: v })} />}
          {ehTarefa && <Grupo titulo="Status" opcoes={STATUS_TAREFA} cores={CORES_STATUS} escolhidos={filtros.statusT}
            onMudar={(v) => setFiltros({ ...filtros, statusT: v })} />}
          {ehTarefa && <Grupo titulo="Prioridade" opcoes={PRIO_TAREFA} cores={CORES_PRIO} escolhidos={filtros.prioT}
            onMudar={(v) => setFiltros({ ...filtros, prioT: v })} />}
        </div>
      )}
    </div>
  )
}
