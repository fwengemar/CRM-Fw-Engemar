import React, { useEffect, useState } from 'react'
import { supabase, CORES_FASE, CORES_STATUS, dt } from './lib'
import { Pill } from './ui'

// A busca do topo filtra a tela aberta. Esta aqui vai ao banco e varre tudo:
// contrato, observação, tarefa, descrição e comentário — inclusive o que está
// em outra visão. Sem isso, texto antigo some do alcance de quem procura.
export function BuscaGlobal({ termo, contratos, onAbrirContrato, onAbrirTarefa, onFechar }) {
  const [res, setRes] = useState(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let cancelado = false
    const q = (termo || '').trim()
    if (q.length < 2) { setRes({ contratos: [], tarefas: [], comentarios: [] }); return }
    // vírgula e parênteses quebram a sintaxe do filtro do Supabase
    const limpo = q.replace(/[,()]/g, ' ').trim()
    const alvo = `%${limpo}%`
    setRes(null); setErro('')

    async function buscar() {
      const [c, t, k] = await Promise.all([
        supabase.from('contratos').select('id, numero, objeto, orgao, fase, processo, local')
          .is('excluido_em', null)
          .or(['objeto', 'orgao', 'numero', 'processo', 'local', 'observacoes']
            .map((campo) => `${campo}.ilike.${alvo}`).join(','))
          .limit(25),
        supabase.from('tarefas').select('id, titulo, descricao, status, contrato_id')
          .is('excluido_em', null)
          .or(`titulo.ilike.${alvo},descricao.ilike.${alvo}`)
          .limit(25),
        supabase.from('comentarios').select('id, texto, criado_em, tarefa_id, contrato_id')
          .ilike('texto', alvo).order('criado_em', { ascending: false }).limit(25),
      ])
      if (cancelado) return
      const falha = c.error || t.error || k.error
      if (falha) { setErro(falha.message); setRes({ contratos: [], tarefas: [], comentarios: [] }); return }
      setRes({ contratos: c.data || [], tarefas: t.data || [], comentarios: k.data || [] })
    }
    const id = setTimeout(buscar, 250)   // espera a digitação parar
    return () => { cancelado = true; clearTimeout(id) }
  }, [termo])

  const nomeContrato = (id) => {
    const c = contratos.find((x) => x.id === id)
    return c ? (c.numero || c.objeto.slice(0, 40)) : null
  }
  const total = res ? res.contratos.length + res.tarefas.length + res.comentarios.length : 0

  const Secao = ({ titulo, children }) => (
    <div className="mb-4">
      <div className="text-[11px] uppercase font-bold text-slate-400 mb-1">{titulo}</div>
      {children}
    </div>
  )
  const Linha = ({ onClick, children }) => (
    <button onClick={onClick} className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 border-b border-slate-50">
      {children}
    </button>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 p-4 pt-20" onMouseDown={onFechar}>
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-5" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1">
            <h2 className="text-[15px] font-extrabold text-slate-800">Busca em tudo</h2>
            <p className="text-[12px] text-slate-400">
              {(termo || '').trim().length < 2
                ? 'Digite ao menos duas letras no campo de busca.'
                : res === null ? 'Procurando…' : `${total} resultado${total === 1 ? '' : 's'} para “${termo.trim()}”`}
            </p>
          </div>
          <button onClick={onFechar} className="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
        </div>

        {erro && <div className="text-[13px] text-[#e2445c] mb-2">{erro}</div>}

        <div className="max-h-[60vh] overflow-y-auto">
          {res && total === 0 && (termo || '').trim().length >= 2 && (
            <div className="text-[13px] text-slate-400 py-6 text-center">Nada encontrado em contratos, tarefas ou comentários.</div>
          )}

          {res && res.contratos.length > 0 && (
            <Secao titulo={`Contratos (${res.contratos.length})`}>
              {res.contratos.map((c) => (
                <Linha key={c.id} onClick={() => { onFechar(); onAbrirContrato(c) }}>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-slate-700 flex-1 line-clamp-1">
                      {c.numero ? c.numero + ' · ' : ''}{c.objeto}
                    </span>
                    <Pill value={c.fase} color={CORES_FASE[c.fase] || '#c3c6d4'} />
                  </div>
                  {c.orgao && <div className="text-[11px] text-slate-400">{c.orgao}</div>}
                </Linha>
              ))}
            </Secao>
          )}

          {res && res.tarefas.length > 0 && (
            <Secao titulo={`Tarefas (${res.tarefas.length})`}>
              {res.tarefas.map((t) => (
                <Linha key={t.id} onClick={() => { onFechar(); onAbrirTarefa(t) }}>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-slate-700 flex-1 line-clamp-1">{t.titulo}</span>
                    <Pill value={t.status} color={CORES_STATUS[t.status] || '#c3c6d4'} />
                  </div>
                  {nomeContrato(t.contrato_id) && <div className="text-[11px] text-slate-400">{nomeContrato(t.contrato_id)}</div>}
                </Linha>
              ))}
            </Secao>
          )}

          {res && res.comentarios.length > 0 && (
            <Secao titulo={`Comentários (${res.comentarios.length})`}>
              {res.comentarios.map((k) => (
                <Linha key={k.id} onClick={() => {
                  onFechar()
                  if (k.tarefa_id) onAbrirTarefa({ id: k.tarefa_id })
                  else if (k.contrato_id) onAbrirContrato({ id: k.contrato_id })
                }}>
                  <div className="text-[13px] text-slate-600 line-clamp-2">{k.texto}</div>
                  <div className="text-[11px] text-slate-400">
                    {dt(k.criado_em)}{nomeContrato(k.contrato_id) ? ' · ' + nomeContrato(k.contrato_id) : ''}
                  </div>
                </Linha>
              ))}
            </Secao>
          )}
        </div>
      </div>
    </div>
  )
}
