import React, { useEffect, useState } from 'react'
import {
  supabase, FASES, CORES_FASE, SAUDES, CORES_SAUDE, PRIORIDADES, CORES_PRIORIDADE,
  MODALIDADES, STATUS_MEDICAO, CORES_MEDICAO, TIPOS_ADITIVO, money, dt,
} from './lib'
import { Pill, SelectPill, Avatar, Campo, inputCls, Botao } from './ui'
import { ListaTarefasContrato } from './tarefas'

const vazio = {
  numero: '', objeto: '', orgao: '', modalidade: 'Pregão Eletrônico', processo: '', local: '',
  fase: 'Oportunidade', saude: 'Em dia', prioridade: 'Média', responsavel_id: '', continuado: false,
  valor_total: '', valor_contratado: '', valor_anual: '', data_sessao: '', data_assinatura: '',
  vigencia_inicio: '', vigencia_fim: '', prazo_meses: '', garantia_percentual: '', observacoes: '',
}

export function Drawer({ contrato, perfis, user, tarefas = [], contratos = [], onAbrirTarefa, onNovaTarefa, onPatchTarefa, onClose, onSalvo }) {
  const novo = !contrato?.id
  const [f, setF] = useState({ ...vazio, ...(contrato || {}) })
  const [aba, setAba] = useState('detalhes')
  const [medicoes, setMedicoes] = useState([])
  const [aditivos, setAditivos] = useState([])
  const [comentarios, setComentarios] = useState([])
  const [atividades, setAtividades] = useState([])
  const [texto, setTexto] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => { setF({ ...vazio, ...(contrato || {}) }); setAba('detalhes') }, [contrato?.id])

  async function carregarRelacionados() {
    if (novo) return
    const [m, a, c, at] = await Promise.all([
      supabase.from('medicoes').select('*').eq('contrato_id', contrato.id).order('competencia'),
      supabase.from('aditivos').select('*').eq('contrato_id', contrato.id).order('data'),
      supabase.from('comentarios').select('*').eq('contrato_id', contrato.id).order('criado_em', { ascending: false }),
      supabase.from('atividades').select('*').eq('contrato_id', contrato.id).order('criado_em', { ascending: false }).limit(40),
    ])
    setMedicoes(m.data || []); setAditivos(a.data || []); setComentarios(c.data || []); setAtividades(at.data || [])
  }
  useEffect(() => { carregarRelacionados() }, [contrato?.id])

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const nome = (id) => perfis.find((p) => p.id === id)?.nome || 'alguém'

  async function salvar() {
    setSalvando(true)
    const num = (v) => (v === '' || v === null || v === undefined ? null : Number(v))
    const txt = (v) => (v === '' ? null : v)
    const dados = {
      numero: txt(f.numero), objeto: f.objeto, orgao: txt(f.orgao), modalidade: f.modalidade,
      processo: txt(f.processo), local: txt(f.local), fase: f.fase, saude: f.saude, prioridade: f.prioridade,
      responsavel_id: f.responsavel_id || null, valor_total: num(f.valor_total), valor_contratado: num(f.valor_contratado), valor_anual: num(f.valor_anual),
      data_sessao: txt(f.data_sessao), data_assinatura: txt(f.data_assinatura),
      vigencia_inicio: txt(f.vigencia_inicio), vigencia_fim: txt(f.vigencia_fim),
      prazo_meses: num(f.prazo_meses), garantia_percentual: num(f.garantia_percentual),
      continuado: !!f.continuado, observacoes: txt(f.observacoes),
    }
    if (!dados.objeto) { alert('Descreva o objeto do contrato.'); setSalvando(false); return }
    let erro
    if (novo) { const r = await supabase.from('contratos').insert({ ...dados, criado_por: user.id }); erro = r.error }
    else { const r = await supabase.from('contratos').update(dados).eq('id', contrato.id); erro = r.error }
    setSalvando(false)
    if (erro) return alert('Erro ao salvar: ' + erro.message)
    onSalvo()
    if (novo) onClose()
  }

  async function excluir() {
    if (!confirm('Excluir este contrato e todos os seus registros?')) return
    const { error } = await supabase.from('contratos').delete().eq('id', contrato.id)
    if (error) return alert(error.message)
    onSalvo(); onClose()
  }

  async function addMedicao() {
    const { error } = await supabase.from('medicoes').insert({
      contrato_id: contrato.id, numero: medicoes.length + 1,
      competencia: new Date().toISOString().slice(0, 8) + '01', status: 'Prevista',
    })
    if (error) alert(error.message); else carregarRelacionados()
  }
  async function patchMedicao(id, dados) {
    await supabase.from('medicoes').update(dados).eq('id', id); carregarRelacionados()
  }
  async function delMedicao(id) { await supabase.from('medicoes').delete().eq('id', id); carregarRelacionados() }

  async function addAditivo() {
    const { error } = await supabase.from('aditivos').insert({
      contrato_id: contrato.id, tipo: 'Prazo', data: new Date().toISOString().slice(0, 10),
    })
    if (error) alert(error.message); else carregarRelacionados()
  }
  async function patchAditivo(id, dados) { await supabase.from('aditivos').update(dados).eq('id', id); carregarRelacionados() }
  async function delAditivo(id) { await supabase.from('aditivos').delete().eq('id', id); carregarRelacionados() }

  async function comentar() {
    if (!texto.trim()) return
    const { error } = await supabase.from('comentarios').insert({ contrato_id: contrato.id, autor_id: user.id, texto: texto.trim() })
    if (error) return alert(error.message)
    setTexto(''); carregarRelacionados()
  }

  const minhasTarefas = novo ? [] : tarefas.filter((t) => t.contrato_id === contrato.id)
  const pendentes = minhasTarefas.filter((t) => t.status !== 'Concluído' && t.status !== 'Cancelado').length

  async function gerarDaFase() {
    const { data: modelos, error } = await supabase.from('modelos_tarefa').select('*').eq('fase', contrato.fase).eq('ativo', true).order('ordem')
    if (error) { alert(error.message); return }
    const existentes = new Set(minhasTarefas.map((t) => t.titulo))
    const novas = (modelos || []).filter((m) => !existentes.has(m.titulo)).map((m) => ({
      contrato_id: contrato.id, titulo: m.titulo, descricao: m.descricao, status: 'A fazer',
      prioridade: m.prioridade, recorrencia: m.recorrencia, origem_modelo: m.fase, ordem: m.ordem,
      responsavel_id: contrato.responsavel_id || null, criado_por: user.id,
      prazo: new Date(Date.now() + m.dias_prazo * 86400000).toISOString().slice(0, 10),
    }))
    if (!novas.length) { alert('As tarefas padrão desta fase já existem neste contrato.'); return }
    const r = await supabase.from('tarefas').insert(novas)
    if (r.error) alert(r.error.message); else onSalvo()
  }

  const abas = novo ? [['detalhes', 'Detalhes']] :
    [['detalhes', 'Detalhes'], ['tarefas', `Tarefas (${pendentes})`], ['medicoes', `Medições (${medicoes.length})`], ['aditivos', `Aditivos (${aditivos.length})`], ['conversa', `Conversa (${comentarios.length})`], ['atividade', 'Atividade']]

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/30" onMouseDown={onClose}>
      <div className="w-full max-w-2xl h-full bg-white shadow-2xl flex flex-col" onMouseDown={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-100 flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <input value={f.objeto} onChange={set('objeto')} placeholder="Objeto do contrato"
              className="w-full text-lg font-bold text-slate-800 outline-none placeholder:text-slate-300" />
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <SelectPill value={f.fase} options={FASES} colors={CORES_FASE} onChange={(v) => setF({ ...f, fase: v })} />
              <SelectPill value={f.saude} options={SAUDES} colors={CORES_SAUDE} onChange={(v) => setF({ ...f, saude: v })} />
              <SelectPill value={f.prioridade} options={PRIORIDADES} colors={CORES_PRIORIDADE} onChange={(v) => setF({ ...f, prioridade: v })} />
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
        </div>

        <div className="px-6 border-b border-slate-100 flex gap-1 overflow-x-auto">
          {abas.map(([k, label]) => (
            <button key={k} onClick={() => setAba(k)}
              className={'px-3 py-2.5 text-[13px] font-semibold border-b-2 whitespace-nowrap ' + (aba === k ? 'border-[#0073ea] text-[#0073ea]' : 'border-transparent text-slate-400 hover:text-slate-600')}>
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {aba === 'detalhes' && (
            <div className="grid grid-cols-2 gap-4">
              <Campo label="Número do contrato / edital"><input className={inputCls} value={f.numero || ''} onChange={set('numero')} placeholder="ex.: CDP nº 15/2026" /></Campo>
              <Campo label="Modalidade">
                <select className={inputCls} value={f.modalidade || ''} onChange={set('modalidade')}>
                  {MODALIDADES.map((m) => <option key={m}>{m}</option>)}
                </select>
              </Campo>
              <Campo label="Órgão / Cliente"><input className={inputCls} value={f.orgao || ''} onChange={set('orgao')} /></Campo>
              <Campo label="Local"><input className={inputCls} value={f.local || ''} onChange={set('local')} placeholder="Cidade/UF" /></Campo>
              <Campo label="Processo administrativo" className="col-span-2"><input className={inputCls} value={f.processo || ''} onChange={set('processo')} placeholder="ex.: SEI 50901.001313/2026-47" /></Campo>
              <Campo label="Responsável">
                <select className={inputCls} value={f.responsavel_id || ''} onChange={set('responsavel_id')}>
                  <option value="">Sem responsável</option>
                  {perfis.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </Campo>
              <Campo label="Prazo (meses)"><input type="number" className={inputCls} value={f.prazo_meses || ''} onChange={set('prazo_meses')} /></Campo>
              <Campo label="Valor estimado (R$)"><input type="number" step="0.01" className={inputCls} value={f.valor_total || ''} onChange={set('valor_total')} placeholder="valor de referência do edital" /></Campo>
              <Campo label="Valor do contrato (R$)"><input type="number" step="0.01" className={inputCls} value={f.valor_contratado || ''} onChange={set('valor_contratado')} placeholder="valor efetivamente fechado" /></Campo>
              <Campo label="Valor anual (R$)"><input type="number" step="0.01" className={inputCls} value={f.valor_anual || ''} onChange={set('valor_anual')} /></Campo>
              <Campo label="Data da sessão / disputa"><input type="date" className={inputCls} value={f.data_sessao || ''} onChange={set('data_sessao')} /></Campo>
              <Campo label="Data de assinatura"><input type="date" className={inputCls} value={f.data_assinatura || ''} onChange={set('data_assinatura')} /></Campo>
              <Campo label="Contrato continuado" className="col-span-2">
                <select className={inputCls} value={f.continuado ? 'sim' : 'nao'} onChange={(e) => setF({ ...f, continuado: e.target.value === 'sim' })}>
                  <option value="nao">Não — obra ou serviço com prazo de entrega</option>
                  <option value="sim">Sim — serviço continuado, com vigência a acompanhar</option>
                </select>
              </Campo>
              <Campo label={f.continuado ? 'Início da vigência' : 'Data de início'}><input type="date" className={inputCls} value={f.vigencia_inicio || ''} onChange={set('vigencia_inicio')} /></Campo>
              <Campo label={f.continuado ? 'Fim da vigência' : 'Data de fim'}><input type="date" className={inputCls} value={f.vigencia_fim || ''} onChange={set('vigencia_fim')} /></Campo>
              <Campo label="Garantia contratual (%)"><input type="number" step="0.01" className={inputCls} value={f.garantia_percentual || ''} onChange={set('garantia_percentual')} /></Campo>
              <Campo label="Observações" className="col-span-2">
                <textarea rows={5} className={inputCls} value={f.observacoes || ''} onChange={set('observacoes')} />
              </Campo>
            </div>
          )}

          {aba === 'tarefas' && (
            <div>
              <ListaTarefasContrato tarefas={minhasTarefas} perfis={perfis} contratos={contratos} onPatch={onPatchTarefa} onAbrir={onAbrirTarefa} />
              <div className="flex gap-4 mt-4">
                <button onClick={() => onNovaTarefa(contrato.id)} className="text-[13px] font-semibold text-slate-400 hover:text-[#0073ea]">+ Nova tarefa</button>
                <button onClick={gerarDaFase} className="text-[13px] font-semibold text-[#7b68ee] hover:underline">↻ Gerar tarefas padrão da fase \"{contrato.fase}\"</button>
              </div>
            </div>
          )}

          {aba === 'medicoes' && (
            <div>
              <table className="w-full text-[13px]">
                <thead><tr className="text-[11px] uppercase text-slate-400">
                  <th className="text-left py-2">Nº</th><th className="text-left">Competência</th>
                  <th className="text-right">Valor</th><th className="text-center">Status</th>
                  <th className="text-center">NF</th><th></th>
                </tr></thead>
                <tbody>
                  {medicoes.map((m) => (
                    <tr key={m.id} className="border-t border-slate-100">
                      <td className="py-2 w-10">{m.numero}</td>
                      <td><input type="month" value={(m.competencia || '').slice(0, 7)} onChange={(e) => patchMedicao(m.id, { competencia: e.target.value + '-01' })} className="border border-slate-200 rounded px-2 py-1" /></td>
                      <td className="text-right"><input type="number" step="0.01" value={m.valor || ''} onChange={(e) => patchMedicao(m.id, { valor: e.target.value === '' ? null : Number(e.target.value) })} className="w-28 border border-slate-200 rounded px-2 py-1 text-right" /></td>
                      <td className="text-center px-2"><SelectPill value={m.status} options={STATUS_MEDICAO} colors={CORES_MEDICAO} onChange={(v) => patchMedicao(m.id, { status: v })} /></td>
                      <td className="text-center"><input value={m.nota_fiscal || ''} onChange={(e) => patchMedicao(m.id, { nota_fiscal: e.target.value })} className="w-20 border border-slate-200 rounded px-2 py-1" /></td>
                      <td className="text-right"><button onClick={() => delMedicao(m.id)} className="text-slate-300 hover:text-[#e2445c]">✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {medicoes.length > 0 && (
                <div className="text-right text-[13px] font-bold text-slate-600 mt-3">
                  Total medido: {money(medicoes.reduce((s, m) => s + Number(m.valor || 0), 0))}
                  <span className="font-normal text-slate-400"> · recebido: {money(medicoes.filter((m) => m.status === 'Recebida').reduce((s, m) => s + Number(m.valor || 0), 0))}</span>
                </div>
              )}
              {medicoes.length === 0 && <p className="text-[13px] text-slate-400 mt-2">Nenhuma medição lançada neste contrato.</p>}
              <button onClick={addMedicao} className="mt-4 text-[13px] font-semibold text-slate-400 hover:text-[#0073ea]">+ Adicionar medição</button>
            </div>
          )}

          {aba === 'aditivos' && (
            <div>
              {aditivos.map((a) => (
                <div key={a.id} className="border-t border-slate-100 py-3 grid grid-cols-12 gap-2 items-center text-[13px]">
                  <input value={a.numero || ''} onChange={(e) => patchAditivo(a.id, { numero: e.target.value })} placeholder="nº" className="col-span-2 border border-slate-200 rounded px-2 py-1" />
                  <select value={a.tipo} onChange={(e) => patchAditivo(a.id, { tipo: e.target.value })} className="col-span-3 border border-slate-200 rounded px-2 py-1">
                    {TIPOS_ADITIVO.map((t) => <option key={t}>{t}</option>)}
                  </select>
                  <input type="number" step="0.01" value={a.valor || ''} onChange={(e) => patchAditivo(a.id, { valor: e.target.value === '' ? null : Number(e.target.value) })} placeholder="valor" className="col-span-3 border border-slate-200 rounded px-2 py-1 text-right" />
                  <input type="date" value={a.nova_vigencia_fim || ''} onChange={(e) => patchAditivo(a.id, { nova_vigencia_fim: e.target.value || null })} className="col-span-3 border border-slate-200 rounded px-2 py-1" />
                  <button onClick={() => delAditivo(a.id)} className="col-span-1 text-slate-300 hover:text-[#e2445c]">✕</button>
                  <input value={a.descricao || ''} onChange={(e) => patchAditivo(a.id, { descricao: e.target.value })} placeholder="descrição" className="col-span-12 border border-slate-200 rounded px-2 py-1" />
                </div>
              ))}
              {aditivos.length === 0 && <p className="text-[13px] text-slate-400">Nenhum aditivo registrado neste contrato.</p>}
              <button onClick={addAditivo} className="mt-4 text-[13px] font-semibold text-slate-400 hover:text-[#0073ea]">+ Adicionar aditivo</button>
            </div>
          )}

          {aba === 'conversa' && (
            <div>
              <div className="flex gap-2">
                <textarea rows={3} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escreva uma atualização para a equipe…" className={inputCls} />
              </div>
              <div className="text-right mt-2"><Botao onClick={comentar}>Publicar</Botao></div>
              <div className="mt-6 space-y-4">
                {comentarios.map((c) => (
                  <div key={c.id} className="flex gap-3">
                    <Avatar nome={nome(c.autor_id)} id={c.autor_id} />
                    <div className="flex-1">
                      <div className="text-[13px] font-semibold text-slate-700">{nome(c.autor_id)}
                        <span className="font-normal text-slate-400 text-[11px] ml-2">{new Date(c.criado_em).toLocaleString('pt-BR')}</span></div>
                      <div className="text-[13px] text-slate-600 whitespace-pre-wrap">{c.texto}</div>
                    </div>
                  </div>
                ))}
                {comentarios.length === 0 && <p className="text-[13px] text-slate-400">Nenhuma mensagem ainda.</p>}
              </div>
            </div>
          )}

          {aba === 'atividade' && (
            <div className="space-y-3">
              {atividades.map((a) => (
                <div key={a.id} className="flex gap-3 items-start">
                  <Avatar nome={a.autor_id ? nome(a.autor_id) : null} id={a.autor_id} size={24} />
                  <div className="text-[13px] text-slate-600">
                    <b>{a.autor_id ? nome(a.autor_id) : 'Sistema'}</b> {a.acao}
                    {a.detalhe && <span className="text-slate-400"> — {a.detalhe}</span>}
                    <div className="text-[11px] text-slate-400">{new Date(a.criado_em).toLocaleString('pt-BR')}</div>
                  </div>
                </div>
              ))}
              {atividades.length === 0 && <p className="text-[13px] text-slate-400">Sem atividade registrada.</p>}
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between">
          {!novo ? <Botao variante="perigo" onClick={excluir}>Excluir</Botao> : <span />}
          <div className="flex gap-2">
            <Botao variante="neutro" onClick={onClose}>Fechar</Botao>
            <Botao onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : novo ? 'Criar contrato' : 'Salvar alterações'}</Botao>
          </div>
        </div>
      </div>
    </div>
  )
}
