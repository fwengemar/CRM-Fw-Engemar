import React, { useState } from 'react'
import {
  STATUS_TAREFA, CORES_STATUS, PRIO_TAREFA, CORES_PRIO, GRUPOS_PRAZO, CORES_GRUPO,
  grupoPrazo, CONCLUIDA, dt, diasAte, hoje,
} from './lib'
import { Pill, SelectPill, Avatar } from './ui'

function Bandeira({ prioridade }) {
  return <span title={'Prioridade: ' + prioridade} style={{ color: CORES_PRIO[prioridade] }} className="text-[13px]">⚑</span>
}

function PrazoTag({ tarefa }) {
  if (!tarefa.prazo) return <span className="text-[11px] text-slate-300">sem prazo</span>
  const d = diasAte(tarefa.prazo)
  const cor = CONCLUIDA(tarefa) ? '#c3c6d4' : d < 0 ? '#e2445c' : d === 0 ? '#fdab3d' : d <= 7 ? '#7b68ee' : '#9aa3b2'
  const txt = d < 0 ? `${Math.abs(d)}d atrasada` : d === 0 ? 'hoje' : dt(tarefa.prazo)
  return <span className="text-[11px] font-semibold" style={{ color: cor }}>{txt}</span>
}

function Bloqueada({ tarefa, tarefas }) {
  if (!tarefa.depende_de_id) return null
  const dep = tarefas.find((t) => t.id === tarefa.depende_de_id)
  if (!dep || CONCLUIDA(dep)) return null
  return <span className="text-[11px] text-[#e2445c] font-semibold" title={'Aguarda: ' + dep.titulo}>🔒 bloqueada</span>
}

function Linha({ t, tarefas, perfis, contratos, onPatch, onAbrir, mostrarContrato = true }) {
  const resp = perfis.find((p) => p.id === t.responsavel_id)
  const contrato = contratos.find((c) => c.id === t.contrato_id)
  const subs = tarefas.filter((x) => x.tarefa_pai_id === t.id)
  const feitas = subs.filter(CONCLUIDA).length
  return (
    <div className="flex items-center gap-3 px-3 py-2 border-t border-slate-100 hover:bg-slate-50/70">
      <input type="checkbox" checked={t.status === 'Concluído'}
        onChange={(e) => onPatch(t.id, { status: e.target.checked ? 'Concluído' : 'A fazer' })}
        className="w-4 h-4 accent-[#00c875] cursor-pointer shrink-0" />
      <Bandeira prioridade={t.prioridade} />
      <button onClick={() => onAbrir(t)} className="flex-1 min-w-0 text-left">
        <div className={'text-[13px] font-semibold line-clamp-1 ' + (CONCLUIDA(t) ? 'text-slate-400 line-through' : 'text-slate-700')}>{t.titulo}</div>
        <div className="flex items-center gap-2 flex-wrap">
          {mostrarContrato && contrato && <span className="text-[11px] text-slate-400">{contrato.numero || contrato.objeto.slice(0, 34)}</span>}
          {subs.length > 0 && <span className="text-[11px] text-slate-400">☑ {feitas}/{subs.length}</span>}
          <Bloqueada tarefa={t} tarefas={tarefas} />
          {t.recorrencia !== 'Nenhuma' && <span className="text-[11px] text-slate-400">↻ {t.recorrencia}</span>}
        </div>
      </button>
      <PrazoTag tarefa={t} />
      <SelectPill value={t.status} options={STATUS_TAREFA} colors={CORES_STATUS} onChange={(v) => onPatch(t.id, { status: v })} />
      <select value={t.responsavel_id || ''} onChange={(e) => onPatch(t.id, { responsavel_id: e.target.value || null })}
        className="cell-select w-8 h-8 rounded-full text-[10px] font-bold border-0 outline-none shrink-0"
        style={{ background: resp ? '#0073ea' : '#e6e9ef', color: resp ? '#fff' : '#9aa3b2' }} title={resp ? resp.nome : 'Sem responsável'}>
        <option value="" style={{ color: '#323338' }}>Sem responsável</option>
        {perfis.map((p) => <option key={p.id} value={p.id} style={{ color: '#323338' }}>{p.nome}</option>)}
      </select>
    </div>
  )
}

/* ===================== MINHAS TAREFAS ===================== */
export function MinhasTarefas({ tarefas, perfis, contratos, user, onPatch, onAbrir, onNova }) {
  const [somenteMinhas, setSomenteMinhas] = useState(true)
  const [verConcluidas, setVerConcluidas] = useState(false)
  const base = tarefas.filter((t) => !t.tarefa_pai_id)
    .filter((t) => (somenteMinhas ? t.responsavel_id === user.id : true))
    .filter((t) => (verConcluidas ? true : !CONCLUIDA(t)))

  const grupos = GRUPOS_PRAZO.map((g) => [g, base.filter((t) => grupoPrazo(t) === g)]).filter(([, l]) => l.length)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <label className="flex items-center gap-2 text-[13px] text-slate-600">
          <input type="checkbox" checked={somenteMinhas} onChange={(e) => setSomenteMinhas(e.target.checked)} className="accent-[#0073ea]" />
          Só as minhas
        </label>
        <label className="flex items-center gap-2 text-[13px] text-slate-600">
          <input type="checkbox" checked={verConcluidas} onChange={(e) => setVerConcluidas(e.target.checked)} className="accent-[#0073ea]" />
          Mostrar concluídas
        </label>
        <span className="text-[13px] text-slate-400">{base.length} tarefa(s)</span>
      </div>

      {grupos.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-400 text-[14px]">
          Nada por aqui. {somenteMinhas ? 'Nenhuma tarefa atribuída a você.' : 'Nenhuma tarefa em aberto.'}
        </div>
      )}

      {grupos.map(([g, lista]) => (
        <section key={g} className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: CORES_GRUPO[g] + '14' }}>
            <span className="w-2 h-2 rounded-full" style={{ background: CORES_GRUPO[g] }} />
            <h3 className="text-[13px] font-bold" style={{ color: CORES_GRUPO[g] }}>{g}</h3>
            <span className="text-[11px] text-slate-400">{lista.length}</span>
          </div>
          {lista.map((t) => (
            <Linha key={t.id} t={t} tarefas={tarefas} perfis={perfis} contratos={contratos} onPatch={onPatch} onAbrir={onAbrir} />
          ))}
        </section>
      ))}

      <button onClick={onNova} className="text-sm text-slate-400 hover:text-[#0073ea] font-semibold">+ Nova tarefa</button>
    </div>
  )
}

/* ===================== QUADRO DE TAREFAS ===================== */
export function QuadroTarefas({ tarefas, perfis, contratos, onPatch, onAbrir }) {
  const [sobre, setSobre] = useState(null)
  const base = tarefas.filter((t) => !t.tarefa_pai_id)
  return (
    <div className="p-6 overflow-x-auto">
      <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
        {STATUS_TAREFA.map((st) => {
          const lista = base.filter((t) => t.status === st)
          return (
            <div key={st} className={'w-[280px] shrink-0 rounded-xl p-2 transition ' + (sobre === st ? 'bg-[#7b68ee]/10 ring-2 ring-[#7b68ee]/40' : 'bg-slate-100/70')}
              onDragOver={(e) => { e.preventDefault(); setSobre(st) }}
              onDragLeave={() => setSobre((s) => (s === st ? null : s))}
              onDrop={(e) => { e.preventDefault(); setSobre(null); const id = e.dataTransfer.getData('text/plain'); const t = base.find((x) => x.id === id); if (t && t.status !== st) onPatch(id, { status: st }) }}>
              <div className="flex items-center justify-between px-2 py-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: CORES_STATUS[st] }} />
                  <span className="text-[13px] font-bold text-slate-600">{st}</span>
                </div>
                <span className="text-[11px] text-slate-400 font-semibold">{lista.length}</span>
              </div>
              <div className="space-y-2 min-h-[80px]">
                {lista.map((t) => {
                  const resp = perfis.find((p) => p.id === t.responsavel_id)
                  const contrato = contratos.find((c) => c.id === t.contrato_id)
                  const subs = tarefas.filter((x) => x.tarefa_pai_id === t.id)
                  return (
                    <div key={t.id} draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', t.id)}
                      onClick={() => onAbrir(t)}
                      className="bg-white rounded-lg p-3 shadow-sm border border-slate-200 cursor-pointer hover:shadow-md"
                      style={{ borderLeft: `4px solid ${CORES_PRIO[t.prioridade]}` }}>
                      <div className="text-[13px] font-semibold text-slate-700 line-clamp-2">{t.titulo}</div>
                      {contrato && <div className="text-[11px] text-slate-400 mt-1 line-clamp-1">{contrato.numero || contrato.objeto.slice(0, 30)}</div>}
                      <div className="flex items-center justify-between mt-3">
                        <PrazoTag tarefa={t} />
                        <div className="flex items-center gap-2">
                          {subs.length > 0 && <span className="text-[11px] text-slate-400">☑ {subs.filter(CONCLUIDA).length}/{subs.length}</span>}
                          <Avatar nome={resp?.nome} id={resp?.id} size={22} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ===================== CALENDÁRIO ===================== */
export function Calendario({ tarefas, contratos, perfis, onAbrir, onAbrirContrato, onNovaTarefa, onPatch }) {
  const agora = new Date()
  const [dia, setDia] = useState(null)
  const [ref, setRef] = useState(new Date(agora.getFullYear(), agora.getMonth(), 1))
  const ano = ref.getFullYear(), mes = ref.getMonth()
  const primeiro = new Date(ano, mes, 1)
  const inicioGrade = new Date(primeiro)
  inicioGrade.setDate(1 - primeiro.getDay())
  const dias = Array.from({ length: 42 }, (_, i) => { const d = new Date(inicioGrade); d.setDate(inicioGrade.getDate() + i); return d })
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const nomeMes = ref.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setRef(new Date(ano, mes - 1, 1))} className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50">‹</button>
          <h2 className="text-[15px] font-bold text-slate-700 capitalize w-48 text-center">{nomeMes}</h2>
          <button onClick={() => setRef(new Date(ano, mes + 1, 1))} className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50">›</button>
          <button onClick={() => { setRef(new Date(agora.getFullYear(), agora.getMonth(), 1)); setDia(hoje()) }}
            className="ml-2 text-[12px] font-semibold text-slate-400 hover:text-[#0073ea]">hoje</button>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#7b68ee]" /> tarefa</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#fdab3d]" /> sessão</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#e2445c]" /> fim de vigência</span>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 border-b border-slate-100">
          {['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'].map((d) => (
            <div key={d} className="px-2 py-2 text-[11px] uppercase font-semibold text-slate-400 text-center">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {dias.map((d, i) => {
            const s = iso(d)
            const noMes = d.getMonth() === mes
            const ehHoje = s === hoje()
            const tdia = tarefas.filter((t) => t.prazo === s && !t.tarefa_pai_id)
            const sessoes = contratos.filter((c) => c.data_sessao === s)
            const vencs = contratos.filter((c) => c.vigencia_fim === s)
            return (
              <div key={i} onClick={() => setDia(s)}
                className={'min-h-[104px] border-b border-r border-slate-100 p-1.5 cursor-pointer transition '
                  + (noMes ? 'bg-white' : 'bg-slate-50/60')
                  + (dia === s ? ' ring-2 ring-inset ring-[#0073ea]/50 bg-[#0073ea]/5' : ' hover:bg-slate-50')}>
                <div className={'text-[11px] font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full ' + (ehHoje ? 'bg-[#0073ea] text-white' : noMes ? 'text-slate-500' : 'text-slate-300')}>{d.getDate()}</div>
                <div className="space-y-1">
                  {sessoes.map((c) => (
                    <button key={'s' + c.id} onClick={(e) => { e.stopPropagation(); onAbrirContrato(c) }} className="w-full text-left text-[10px] px-1.5 py-1 rounded bg-[#fdab3d]/15 text-[#a16207] font-semibold line-clamp-1">
                      Sessão · {c.numero || c.objeto.slice(0, 18)}
                    </button>
                  ))}
                  {vencs.map((c) => (
                    <button key={'v' + c.id} onClick={(e) => { e.stopPropagation(); onAbrirContrato(c) }} className="w-full text-left text-[10px] px-1.5 py-1 rounded bg-[#e2445c]/15 text-[#b91c1c] font-semibold line-clamp-1">
                      Fim vigência · {c.numero || c.objeto.slice(0, 14)}
                    </button>
                  ))}
                  {tdia.slice(0, 4).map((t) => (
                    <button key={t.id} onClick={(e) => { e.stopPropagation(); onAbrir(t) }}
                      className={'w-full text-left text-[10px] px-1.5 py-1 rounded line-clamp-1 font-medium ' + (CONCLUIDA(t) ? 'bg-slate-100 text-slate-400 line-through' : 'bg-[#7b68ee]/12 text-[#4c3fbb]')}>
                      {t.titulo}
                    </button>
                  ))}
                  {tdia.length > 4 && <div className="text-[10px] text-slate-400 pl-1">+{tdia.length - 4} tarefas</div>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {dia && (() => {
        const doDia = tarefas.filter((t) => t.prazo === dia)
        const sessoesDia = contratos.filter((c) => c.data_sessao === dia)
        const vencsDia = contratos.filter((c) => c.vigencia_fim === dia)
        const titulo = new Date(dia + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        const vazio = !doDia.length && !sessoesDia.length && !vencsDia.length
        return (
          <div className="mt-4 rounded-xl border border-slate-200 bg-white shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-700 capitalize">
                {titulo}{dia === hoje() && <span className="ml-2 text-[11px] font-semibold text-[#0073ea] normal-case">hoje</span>}
              </h3>
              <button onClick={() => setDia(null)} className="text-slate-400 hover:text-slate-600 text-lg leading-none">✕</button>
            </div>

            {vazio && <p className="text-[13px] text-slate-400">Nada marcado para este dia.</p>}

            {sessoesDia.map((c) => (
              <button key={'ps' + c.id} onClick={() => onAbrirContrato(c)} className="w-full text-left flex items-center gap-3 py-2 border-t border-slate-100 hover:bg-slate-50">
                <span className="w-2 h-2 rounded-full bg-[#fdab3d] shrink-0" />
                <span className="text-[13px] text-slate-700"><b>Sessão de licitação</b> · {c.numero || c.objeto}</span>
              </button>
            ))}
            {vencsDia.map((c) => (
              <button key={'pv' + c.id} onClick={() => onAbrirContrato(c)} className="w-full text-left flex items-center gap-3 py-2 border-t border-slate-100 hover:bg-slate-50">
                <span className="w-2 h-2 rounded-full bg-[#e2445c] shrink-0" />
                <span className="text-[13px] text-slate-700"><b>Fim de vigência</b> · {c.numero || c.objeto}</span>
              </button>
            ))}
            {doDia.map((t) => (
              <Linha key={'p' + t.id} t={t} tarefas={tarefas} perfis={perfis} contratos={contratos} onPatch={onPatch} onAbrir={onAbrir} />
            ))}

            <button onClick={() => onNovaTarefa(dia)} className="mt-4 text-[13px] font-semibold text-slate-400 hover:text-[#0073ea]">
              + Nova tarefa neste dia
            </button>
          </div>
        )
      })()}
    </div>
  )
}


/* ===================== PAINEL DE TAREFAS ===================== */
function KpiT({ titulo, valor, sub, cor }) {
  return (
    <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-4">
      <div className="text-[11px] uppercase font-semibold text-slate-400">{titulo}</div>
      <div className="text-2xl font-extrabold mt-1" style={{ color: cor || '#323338' }}>{valor}</div>
      {sub && <div className="text-[12px] text-slate-400 mt-1">{sub}</div>}
    </div>
  )
}

export function PainelTarefas({ tarefas, perfis, contratos, onAbrir }) {
  const [emCima, setEmCima] = useState(null)
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  const abertas = tarefas.filter((t) => !CONCLUIDA(t))
  const concluidas = tarefas.filter((t) => t.status === 'Concluído')
  const atrasadas = abertas.filter((t) => t.prazo && diasAte(t.prazo) < 0)
  const diaDe = (t) => (t.concluida_em || '').slice(0, 10)

  const dias = Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 13 + i); return iso(d) })
  const porDia = dias.map((d) => ({ dia: d, n: concluidas.filter((t) => diaDe(t) === d).length }))
  const maxDia = Math.max(1, ...porDia.map((p) => p.n))
  const ultimos7 = porDia.slice(-7).reduce((s, p) => s + p.n, 0)
  const noMes = concluidas.filter((t) => diaDe(t).slice(0, 7) === iso(new Date()).slice(0, 7)).length

  const porStatus = STATUS_TAREFA.map((st) => ({ st, n: tarefas.filter((t) => t.status === st).length }))
  const maxStatus = Math.max(1, ...porStatus.map((p) => p.n))

  const recentes = [...concluidas].sort((a, b) => (b.concluida_em || '').localeCompare(a.concluida_em || '')).slice(0, 10)
  const nomeContrato = (id) => { const c = contratos.find((x) => x.id === id); return c ? (c.numero || c.objeto.slice(0, 32)) : 'sem contrato' }
  const diaCurto = (d) => new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="imprimir-cabecalho">
          <h2 className="text-lg font-extrabold text-slate-800">FW CRM · Painel de tarefas</h2>
          <p className="text-[12px] text-slate-500">FW Construções e Serviços Marítimos — gerado em {new Date().toLocaleString('pt-BR')}</p>
        </div>
        <button onClick={() => window.print()}
          className="nao-imprimir ml-auto rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-50">
          Salvar PDF
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiT titulo="Concluídas em 7 dias" valor={ultimos7} sub={`${noMes} no mês · ${concluidas.length} no total`} cor="#00c875" />
        <KpiT titulo="Em aberto" valor={abertas.length} sub={`de ${tarefas.length} tarefas`} />
        <KpiT titulo="Atrasadas" valor={atrasadas.length} sub={atrasadas.length ? 'passaram do prazo' : 'nenhuma vencida'} cor={atrasadas.length ? '#e2445c' : '#00c875'} />
        <KpiT titulo="Sem responsável" valor={abertas.filter((t) => !t.responsavel_id).length} sub="tarefas em aberto sem dono" cor={abertas.some((t) => !t.responsavel_id) ? '#fdab3d' : '#323338'} />
      </div>

      <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-5 quebra-evitar">
        <h3 className="text-sm font-bold text-slate-600">Tarefas concluídas por dia</h3>
        <p className="text-[11px] text-slate-400 mb-5">últimos 14 dias</p>
        <div className="relative flex items-end gap-1.5 h-40">
          {porDia.map((p) => (
            <div key={p.dia} className="flex-1 flex flex-col items-center justify-end h-full"
              onMouseEnter={() => setEmCima(p.dia)} onMouseLeave={() => setEmCima(null)}>
              {emCima === p.dia && (
                <div className="absolute -top-1 px-2 py-1 rounded-md bg-slate-800 text-white text-[11px] whitespace-nowrap z-10">
                  {diaCurto(p.dia)} · {p.n} concluída{p.n === 1 ? '' : 's'}
                </div>
              )}
              <div className="w-full rounded-t transition-all"
                style={{ height: `${(p.n / maxDia) * 100}%`, minHeight: p.n ? 6 : 2,
                  background: p.n ? '#00c875' : '#eef1f6', opacity: emCima && emCima !== p.dia ? 0.55 : 1 }} />
              <span className="text-[10px] text-slate-400 mt-1.5">{diaCurto(p.dia).slice(0, 2)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-5 quebra-evitar">
          <h3 className="text-sm font-bold text-slate-600 mb-4">Tarefas por status</h3>
          <div className="space-y-2.5">
            {porStatus.map(({ st, n }) => (
              <div key={st} className="flex items-center gap-3">
                <span className="text-[12px] text-slate-500 w-[110px] shrink-0">{st}</span>
                <div className="flex-1 h-5 bg-slate-100 rounded-md overflow-hidden">
                  <div className="h-full rounded-md transition-all" style={{ width: `${(n / maxStatus) * 100}%`, background: CORES_STATUS[st] }} />
                </div>
                <span className="text-[12px] font-bold text-slate-500 w-6 text-right">{n}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-5 quebra-evitar">
          <h3 className="text-sm font-bold text-slate-600 mb-4">Por responsável</h3>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-[11px] uppercase text-slate-400">
                <th className="text-left py-1">Pessoa</th>
                <th className="text-center">Concluídas 7d</th>
                <th className="text-center">Em aberto</th>
                <th className="text-center">Atrasadas</th>
              </tr>
            </thead>
            <tbody>
              {perfis.map((p) => {
                const c7 = concluidas.filter((t) => t.responsavel_id === p.id && porDia.slice(-7).some((d) => d.dia === diaDe(t))).length
                const ab = abertas.filter((t) => t.responsavel_id === p.id).length
                const at = atrasadas.filter((t) => t.responsavel_id === p.id).length
                return (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="py-2 flex items-center gap-2">
                      <Avatar nome={p.nome} id={p.id} size={24} />
                      <span className="text-slate-700">{p.nome}</span>
                    </td>
                    <td className="text-center font-semibold text-[#00c875]">{c7}</td>
                    <td className="text-center font-semibold text-slate-600">{ab}</td>
                    <td className="text-center font-semibold" style={{ color: at ? '#e2445c' : '#c3c6d4' }}>{at}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-5 quebra-evitar">
        <h3 className="text-sm font-bold text-slate-600 mb-4">Últimas atividades concluídas</h3>
        {recentes.length === 0 && <p className="text-[13px] text-slate-400">Nenhuma tarefa concluída ainda.</p>}
        {recentes.map((t) => {
          const resp = perfis.find((p) => p.id === t.responsavel_id)
          return (
            <button key={t.id} onClick={() => onAbrir(t)} className="w-full text-left flex items-center gap-3 py-2 border-t border-slate-100 hover:bg-slate-50">
              <span className="text-[#00c875] text-[13px]">✓</span>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-slate-700 line-clamp-1">{t.titulo}</div>
                <div className="text-[11px] text-slate-400">{nomeContrato(t.contrato_id)}</div>
              </div>
              <span className="text-[11px] text-slate-400 whitespace-nowrap">
                {t.concluida_em ? new Date(t.concluida_em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
              </span>
              <Avatar nome={resp?.nome} id={resp?.id} size={22} />
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ===== lista compacta usada dentro do contrato ===== */
export function ListaTarefasContrato({ tarefas, perfis, contratos, onPatch, onAbrir }) {
  const raiz = tarefas.filter((t) => !t.tarefa_pai_id)
  if (!raiz.length) return <p className="text-[13px] text-slate-400">Nenhuma tarefa neste contrato ainda.</p>
  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden">
      {raiz.map((t) => (
        <Linha key={t.id} t={t} tarefas={tarefas} perfis={perfis} contratos={contratos} onPatch={onPatch} onAbrir={onAbrir} mostrarContrato={false} />
      ))}
    </div>
  )
}
