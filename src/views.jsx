import React, { useMemo, useState } from 'react'
import {
  FASES, CORES_FASE, SAUDES, CORES_SAUDE, PRIORIDADES, CORES_PRIORIDADE,
  money, moneyShort, dt, diasAte,
} from './lib'
import { Pill, SelectPill, Avatar, lumText } from './ui'

/* ============================ TABELA ============================ */
export function Tabela({ contratos, perfis, onPatch, onAbrir, onNovo }) {
  const [fechados, setFechados] = useState({})
  const grupos = FASES.map((f) => [f, contratos.filter((c) => c.fase === f)]).filter(([, l]) => l.length)

  return (
    <div className="p-6 space-y-8">
      {grupos.map(([fase, lista]) => {
        const aberto = !fechados[fase]
        const total = lista.reduce((s, c) => s + Number(c.valor_total || 0), 0)
        return (
          <section key={fase}>
            <div className="flex items-center gap-2 mb-2">
              <button onClick={() => setFechados({ ...fechados, [fase]: aberto })}
                className="text-xs w-5 h-5 rounded hover:bg-slate-200 text-slate-400">{aberto ? '▾' : '▸'}</button>
              <h2 className="text-[15px] font-bold" style={{ color: CORES_FASE[fase] }}>{fase}</h2>
              <span className="text-xs text-slate-400">{lista.length} contrato{lista.length > 1 ? 's' : ''}</span>
              {total > 0 && <span className="text-xs text-slate-400">· {moneyShort(total)}</span>}
            </div>
            {aberto && (
              <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
                <table className="w-full border-collapse text-sm" style={{ minWidth: 1180 }}>
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wide text-slate-400">
                      <th className="w-1 p-0"></th>
                      <th className="text-left font-semibold px-3 py-2 min-w-[300px]">Contrato</th>
                      <th className="text-left font-semibold px-3 py-2 min-w-[170px]">Órgão / Cliente</th>
                      <th className="font-semibold px-3 py-2">Resp.</th>
                      <th className="font-semibold px-3 py-2">Fase</th>
                      <th className="font-semibold px-3 py-2">Status</th>
                      <th className="font-semibold px-3 py-2">Prioridade</th>
                      <th className="text-right font-semibold px-3 py-2">Valor</th>
                      <th className="font-semibold px-3 py-2">Sessão</th>
                      <th className="font-semibold px-3 py-2">Vigência</th>
                      <th className="font-semibold px-3 py-2">Prazo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lista.map((c) => {
                      const resp = perfis.find((p) => p.id === c.responsavel_id)
                      const alvo = c.vigencia_fim || c.data_sessao
                      const d = diasAte(alvo)
                      return (
                        <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50/70">
                          <td className="p-0"><div style={{ background: CORES_FASE[c.fase], width: 5, height: 44 }} /></td>
                          <td className="px-3 py-2">
                            <button onClick={() => onAbrir(c)} className="text-left group">
                              <div className="font-semibold text-slate-700 group-hover:text-[#0073ea] line-clamp-1">{c.objeto}</div>
                              <div className="text-[11px] text-slate-400">{c.numero || 'sem número'} · {c.modalidade}</div>
                            </button>
                          </td>
                          <td className="px-3 py-2 text-slate-500 text-[13px]">
                            {c.orgao || '—'}
                            <div className="text-[11px] text-slate-400">{c.local || ''}</div>
                          </td>
                          <td className="px-3 py-2">
                            <select value={c.responsavel_id || ''} onChange={(e) => onPatch(c.id, { responsavel_id: e.target.value || null })}
                              className="cell-select w-9 h-9 rounded-full text-[11px] font-bold text-white border-0 outline-none"
                              style={{ background: resp ? '#0073ea' : '#e6e9ef', color: resp ? '#fff' : '#9aa3b2' }}
                              title={resp ? resp.nome : 'Sem responsável'}>
                              <option value="" style={{ color: '#323338' }}>Sem responsável</option>
                              {perfis.map((p) => <option key={p.id} value={p.id} style={{ color: '#323338' }}>{p.nome}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-2"><SelectPill value={c.fase} options={FASES} colors={CORES_FASE} onChange={(v) => onPatch(c.id, { fase: v })} /></td>
                          <td className="px-3 py-2"><SelectPill value={c.saude} options={SAUDES} colors={CORES_SAUDE} onChange={(v) => onPatch(c.id, { saude: v })} /></td>
                          <td className="px-3 py-2"><SelectPill value={c.prioridade} options={PRIORIDADES} colors={CORES_PRIORIDADE} onChange={(v) => onPatch(c.id, { prioridade: v })} /></td>
                          <td className="px-3 py-2 text-right font-semibold text-slate-600 whitespace-nowrap">{money(c.valor_total)}</td>
                          <td className="px-3 py-2 text-center text-slate-500 whitespace-nowrap">{dt(c.data_sessao)}</td>
                          <td className="px-3 py-2 text-center text-slate-500 whitespace-nowrap text-[12px]">
                            {c.vigencia_inicio || c.vigencia_fim ? `${dt(c.vigencia_inicio)} → ${dt(c.vigencia_fim)}` : '—'}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {d === null ? <span className="text-slate-300">—</span> :
                              <Pill value={d < 0 ? `${Math.abs(d)}d atrás` : `${d}d`}
                                color={d < 0 ? '#7e8fa5' : d <= 30 ? '#e2445c' : d <= 90 ? '#fdab3d' : '#00c875'} />}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )
      })}
      <button onClick={onNovo} className="text-sm text-slate-400 hover:text-[#0073ea] font-semibold">+ Adicionar contrato</button>
    </div>
  )
}

/* ============================ KANBAN ============================ */
export function Kanban({ contratos, perfis, onPatch, onAbrir }) {
  const [sobre, setSobre] = useState(null)
  return (
    <div className="p-6 overflow-x-auto">
      <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
        {FASES.map((fase) => {
          const lista = contratos.filter((c) => c.fase === fase)
          const total = lista.reduce((s, c) => s + Number(c.valor_total || 0), 0)
          return (
            <div key={fase} className={'w-[290px] shrink-0 rounded-xl p-2 transition ' + (sobre === fase ? 'bg-[#0073ea]/10 ring-2 ring-[#0073ea]/40' : 'bg-slate-100/70')}
              onDragOver={(e) => { e.preventDefault(); setSobre(fase) }}
              onDragLeave={() => setSobre((s) => (s === fase ? null : s))}
              onDrop={(e) => { e.preventDefault(); setSobre(null); const id = e.dataTransfer.getData('text/plain'); const c = contratos.find((x) => x.id === id); if (c && c.fase !== fase) onPatch(id, { fase }) }}>
              <div className="flex items-center justify-between px-2 py-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: CORES_FASE[fase] }} />
                  <span className="text-[13px] font-bold text-slate-600">{fase}</span>
                </div>
                <span className="text-[11px] text-slate-400 font-semibold">{lista.length}</span>
              </div>
              {total > 0 && <div className="px-2 pb-2 text-[11px] text-slate-400">{moneyShort(total)}</div>}
              <div className="space-y-2 min-h-[80px]">
                {lista.map((c) => {
                  const resp = perfis.find((p) => p.id === c.responsavel_id)
                  const d = diasAte(c.vigencia_fim || c.data_sessao)
                  return (
                    <div key={c.id} draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', c.id)}
                      onClick={() => onAbrir(c)}
                      className="bg-white rounded-lg p-3 shadow-sm border border-slate-200 cursor-pointer hover:shadow-md active:cursor-grabbing"
                      style={{ borderLeft: `4px solid ${CORES_FASE[fase]}` }}>
                      <div className="text-[13px] font-semibold text-slate-700 line-clamp-2">{c.objeto}</div>
                      <div className="text-[11px] text-slate-400 mt-1">{c.numero || 'sem número'} · {c.orgao || '—'}</div>
                      <div className="flex items-center justify-between mt-3">
                        <Pill value={c.saude} color={CORES_SAUDE[c.saude]} />
                        <Avatar nome={resp?.nome} id={resp?.id} size={24} />
                      </div>
                      <div className="flex items-center justify-between mt-2 text-[11px] text-slate-400">
                        <span>{c.valor_total ? moneyShort(c.valor_total) : '—'}</span>
                        {d !== null && <span className={d <= 30 ? 'text-[#e2445c] font-semibold' : ''}>{d < 0 ? 'vencido' : `${d} dias`}</span>}
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

/* ============================ TIMELINE ============================ */
export function Timeline({ contratos, onAbrir }) {
  const comData = contratos.filter((c) => c.vigencia_inicio || c.vigencia_fim || c.data_sessao)
  const semData = contratos.filter((c) => !(c.vigencia_inicio || c.vigencia_fim || c.data_sessao))

  const { meses, inicio, fim } = useMemo(() => {
    const datas = []
    comData.forEach((c) => {
      ;[c.vigencia_inicio, c.vigencia_fim, c.data_sessao].forEach((d) => d && datas.push(new Date(String(d).slice(0, 10) + 'T00:00:00')))
    })
    datas.push(new Date())
    const min = new Date(Math.min(...datas)), max = new Date(Math.max(...datas))
    const inicio = new Date(min.getFullYear(), min.getMonth(), 1)
    const fim = new Date(max.getFullYear(), max.getMonth() + 1, 0)
    const meses = []
    const cur = new Date(inicio)
    while (cur <= fim) { meses.push(new Date(cur)); cur.setMonth(cur.getMonth() + 1) }
    return { meses, inicio, fim }
  }, [contratos])

  const W = 84
  const larguraTotal = Math.max(meses.length * W, 600)
  const pos = (d) => {
    const data = new Date(String(d).slice(0, 10) + 'T00:00:00')
    const dias = (data - inicio) / 86400000
    const diasTotal = (fim - inicio) / 86400000
    return Math.max(0, Math.min(1, dias / diasTotal)) * larguraTotal
  }
  const hojeX = pos(new Date().toISOString().slice(0, 10))
  const nomeMes = (d) => d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '') + '/' + String(d.getFullYear()).slice(2)

  return (
    <div className="p-6">
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
        <div style={{ width: larguraTotal + 300, minWidth: '100%' }}>
          <div className="flex sticky top-0 bg-white z-10 border-b border-slate-100">
            <div className="w-[300px] shrink-0 px-4 py-2 text-[11px] uppercase font-semibold text-slate-400">Contrato</div>
            <div className="relative" style={{ width: larguraTotal }}>
              <div className="flex">
                {meses.map((m, i) => (
                  <div key={i} className="text-[11px] text-slate-400 text-center py-2 border-l border-slate-100" style={{ width: W }}>{nomeMes(m)}</div>
                ))}
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="absolute top-0 bottom-0 w-px bg-[#e2445c]/60 z-10" style={{ left: 300 + hojeX }}>
              <span className="absolute -top-0 -translate-x-1/2 text-[10px] text-[#e2445c] font-bold bg-white px-1">hoje</span>
            </div>
            {comData.map((c) => {
              const ini = c.vigencia_inicio || c.data_sessao
              const f = c.vigencia_fim || c.vigencia_inicio || c.data_sessao
              const x1 = pos(ini), x2 = pos(f)
              const largura = Math.max(x2 - x1, 8)
              return (
                <div key={c.id} className="flex items-center border-t border-slate-50 hover:bg-slate-50/70">
                  <button onClick={() => onAbrir(c)} className="w-[300px] shrink-0 px-4 py-3 text-left">
                    <div className="text-[13px] font-semibold text-slate-700 line-clamp-1">{c.objeto}</div>
                    <div className="text-[11px] text-slate-400">{c.numero || 'sem número'}</div>
                  </button>
                  <div className="relative h-12" style={{ width: larguraTotal }}>
                    <div className="absolute top-1/2 -translate-y-1/2 rounded-full flex items-center px-2 text-[10px] font-semibold shadow-sm cursor-pointer"
                      onClick={() => onAbrir(c)}
                      style={{ left: x1, width: largura, height: 22, background: CORES_FASE[c.fase], color: lumText(CORES_FASE[c.fase]) }}
                      title={`${dt(ini)} → ${dt(f)}`}>
                      <span className="truncate">{c.vigencia_fim ? dt(c.vigencia_fim) : dt(ini)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      {semData.length > 0 && (
        <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-4">
          <div className="text-[11px] uppercase font-semibold text-slate-400 mb-2">Sem datas cadastradas</div>
          <div className="flex flex-wrap gap-2">
            {semData.map((c) => (
              <button key={c.id} onClick={() => onAbrir(c)} className="text-[12px] px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600">
                {c.objeto.slice(0, 48)}{c.objeto.length > 48 ? '…' : ''}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ============================ DASHBOARD ============================ */
function Kpi({ titulo, valor, sub, cor }) {
  return (
    <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-4">
      <div className="text-[11px] uppercase font-semibold text-slate-400">{titulo}</div>
      <div className="text-2xl font-extrabold mt-1" style={{ color: cor || '#323338' }}>{valor}</div>
      {sub && <div className="text-[12px] text-slate-400 mt-1">{sub}</div>}
    </div>
  )
}

export function Dashboard({ contratos, perfis, onAbrir }) {
  const ativos = contratos.filter((c) => !['Encerrado', 'Não prosseguir'].includes(c.fase))
  const emExecucao = contratos.filter((c) => c.fase === 'Em execução' || c.fase === 'Contrato assinado')
  const emLicitacao = contratos.filter((c) => c.fase === 'Em licitação' || c.fase === 'Oportunidade')
  const carteira = emExecucao.reduce((s, c) => s + Number(c.valor_total || 0), 0)
  const pipeline = emLicitacao.reduce((s, c) => s + Number(c.valor_total || 0), 0)
  const criticos = contratos.filter((c) => c.saude === 'Crítico').length
  const atencao = contratos.filter((c) => c.saude === 'Atenção').length

  const vencendo = ativos
    .filter((c) => c.vigencia_fim && diasAte(c.vigencia_fim) !== null && diasAte(c.vigencia_fim) <= 90)
    .sort((a, b) => diasAte(a.vigencia_fim) - diasAte(b.vigencia_fim))
  const sessoes = contratos
    .filter((c) => c.data_sessao && diasAte(c.data_sessao) >= 0)
    .sort((a, b) => diasAte(a.data_sessao) - diasAte(b.data_sessao))

  const porFase = FASES.map((f) => ({ fase: f, n: contratos.filter((c) => c.fase === f).length }))
  const maxFase = Math.max(1, ...porFase.map((p) => p.n))

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Kpi titulo="Contratos ativos" valor={ativos.length} sub={`${contratos.length} no total`} />
        <Kpi titulo="Carteira contratada" valor={moneyShort(carteira)} sub={`${emExecucao.length} assinados / em execução`} cor="#00c875" />
        <Kpi titulo="Pipeline em disputa" valor={moneyShort(pipeline)} sub={`${emLicitacao.length} oportunidades e licitações`} cor="#fdab3d" />
        <Kpi titulo="Precisam de atenção" valor={criticos + atencao} sub={`${criticos} críticos · ${atencao} em atenção`} cor={criticos ? '#e2445c' : '#fdab3d'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-5">
          <h3 className="text-sm font-bold text-slate-600 mb-4">Contratos por fase</h3>
          <div className="space-y-2.5">
            {porFase.map(({ fase, n }) => (
              <div key={fase} className="flex items-center gap-3">
                <span className="text-[12px] text-slate-500 w-[120px] shrink-0">{fase}</span>
                <div className="flex-1 h-5 bg-slate-100 rounded-md overflow-hidden">
                  <div className="h-full rounded-md transition-all" style={{ width: `${(n / maxFase) * 100}%`, background: CORES_FASE[fase] }} />
                </div>
                <span className="text-[12px] font-bold text-slate-500 w-5 text-right">{n}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-5">
          <h3 className="text-sm font-bold text-slate-600 mb-4">Vigências vencendo em 90 dias</h3>
          {vencendo.length === 0 && <p className="text-[13px] text-slate-400">Nenhuma vigência cadastrada vencendo nesse período.</p>}
          <div className="space-y-3">
            {vencendo.map((c) => {
              const d = diasAte(c.vigencia_fim)
              return (
                <button key={c.id} onClick={() => onAbrir(c)} className="w-full text-left flex items-center justify-between gap-3 hover:bg-slate-50 rounded-lg p-1">
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-slate-700 line-clamp-1">{c.objeto}</div>
                    <div className="text-[11px] text-slate-400">{c.numero || c.orgao}</div>
                  </div>
                  <Pill value={d < 0 ? 'vencido' : `${d}d`} color={d < 0 ? '#e2445c' : d <= 30 ? '#e2445c' : '#fdab3d'} />
                </button>
              )
            })}
          </div>
        </div>

        <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-5">
          <h3 className="text-sm font-bold text-slate-600 mb-4">Próximas sessões / disputas</h3>
          {sessoes.length === 0 && <p className="text-[13px] text-slate-400">Nenhuma sessão futura cadastrada.</p>}
          <div className="space-y-3">
            {sessoes.map((c) => (
              <button key={c.id} onClick={() => onAbrir(c)} className="w-full text-left flex items-center justify-between gap-3 hover:bg-slate-50 rounded-lg p-1">
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-slate-700 line-clamp-1">{c.objeto}</div>
                  <div className="text-[11px] text-slate-400">{dt(c.data_sessao)} · {c.orgao}</div>
                </div>
                <Pill value={`${diasAte(c.data_sessao)}d`} color={diasAte(c.data_sessao) <= 15 ? '#fdab3d' : '#579bfc'} />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-5">
        <h3 className="text-sm font-bold text-slate-600 mb-4">Carteira por responsável</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {perfis.map((p) => {
            const meus = contratos.filter((c) => c.responsavel_id === p.id && !['Encerrado', 'Não prosseguir'].includes(c.fase))
            return (
              <div key={p.id} className="flex items-center gap-3 rounded-lg border border-slate-100 p-3">
                <Avatar nome={p.nome} id={p.id} size={36} />
                <div>
                  <div className="text-[13px] font-semibold text-slate-700">{p.nome}</div>
                  <div className="text-[11px] text-slate-400">{meus.length} contrato(s) · {moneyShort(meus.reduce((s, c) => s + Number(c.valor_total || 0), 0))}</div>
                </div>
              </div>
            )
          })}
          {(() => {
            const sem = contratos.filter((c) => !c.responsavel_id && !['Encerrado', 'Não prosseguir'].includes(c.fase))
            return sem.length ? (
              <div className="flex items-center gap-3 rounded-lg border border-dashed border-slate-200 p-3">
                <Avatar nome={null} size={36} />
                <div>
                  <div className="text-[13px] font-semibold text-slate-500">Sem responsável</div>
                  <div className="text-[11px] text-slate-400">{sem.length} contrato(s)</div>
                </div>
              </div>
            ) : null
          })()}
        </div>
      </div>
    </div>
  )
}
