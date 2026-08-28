import React, { useEffect, useState } from 'react'
import {
  supabase, STATUS_TAREFA, CORES_STATUS, PRIO_TAREFA, CORES_PRIO, RECORRENCIAS, CONCLUIDA,
} from './lib'
import { SelectPill, Avatar, Campo, inputCls, Botao } from './ui'

const vazia = {
  titulo: '', descricao: '', status: 'A fazer', prioridade: 'Normal', responsavel_id: '',
  contrato_id: '', data_inicio: '', prazo: '', recorrencia: 'Nenhuma', depende_de_id: '', tarefa_pai_id: null,
}

export function TarefaDrawer({ tarefa, tarefas, contratos, perfis, user, onClose, onSalvo }) {
  const nova = !tarefa?.id
  const [f, setF] = useState({ ...vazia, ...(tarefa || {}) })
  const [aba, setAba] = useState('detalhes')
  const [checklist, setChecklist] = useState([])
  const [novoItem, setNovoItem] = useState('')
  const [novaSub, setNovaSub] = useState('')
  const [comentarios, setComentarios] = useState([])
  const [atividades, setAtividades] = useState([])
  const [texto, setTexto] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => { setF({ ...vazia, ...(tarefa || {}) }); setAba('detalhes') }, [tarefa?.id])

  async function carregar() {
    if (nova) return
    const [ck, co, at] = await Promise.all([
      supabase.from('checklist_itens').select('*').eq('tarefa_id', tarefa.id).order('ordem'),
      supabase.from('comentarios').select('*').eq('tarefa_id', tarefa.id).order('criado_em', { ascending: false }),
      supabase.from('atividades').select('*').eq('tarefa_id', tarefa.id).order('criado_em', { ascending: false }).limit(30),
    ])
    setChecklist(ck.data || []); setComentarios(co.data || []); setAtividades(at.data || [])
  }
  useEffect(() => { carregar() }, [tarefa?.id])

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const nome = (id) => perfis.find((p) => p.id === id)?.nome || 'alguém'
  const subtarefas = nova ? [] : tarefas.filter((t) => t.tarefa_pai_id === tarefa.id)
  const irmas = tarefas.filter((t) => t.id !== f.id && t.contrato_id === (f.contrato_id || null) && !t.tarefa_pai_id)

  async function salvar() {
    setSalvando(true)
    const txt = (v) => (v === '' ? null : v)
    const dados = {
      titulo: f.titulo, descricao: txt(f.descricao), status: f.status, prioridade: f.prioridade,
      responsavel_id: f.responsavel_id || null, contrato_id: f.contrato_id || null,
      data_inicio: txt(f.data_inicio), prazo: txt(f.prazo), recorrencia: f.recorrencia,
      depende_de_id: f.depende_de_id || null, tarefa_pai_id: f.tarefa_pai_id || null,
    }
    if (!dados.titulo) { alert('Dê um título à tarefa.'); setSalvando(false); return }
    const r = nova
      ? await supabase.from('tarefas').insert({ ...dados, criado_por: user.id })
      : await supabase.from('tarefas').update(dados).eq('id', tarefa.id)
    setSalvando(false)
    if (r.error) { alert('Erro ao salvar: ' + r.error.message); return }
    onSalvo()
    if (nova) onClose()
  }

  async function excluir() {
    if (!confirm('Excluir esta tarefa, suas subtarefas e o checklist?')) return
    const { error } = await supabase.from('tarefas').delete().eq('id', tarefa.id)
    if (error) { alert(error.message); return }
    onSalvo(); onClose()
  }

  async function addItem() {
    if (!novoItem.trim()) return
    await supabase.from('checklist_itens').insert({ tarefa_id: tarefa.id, texto: novoItem.trim(), ordem: checklist.length })
    setNovoItem(''); carregar()
  }
  async function toggleItem(it) { await supabase.from('checklist_itens').update({ feito: !it.feito }).eq('id', it.id); carregar() }
  async function delItem(id) { await supabase.from('checklist_itens').delete().eq('id', id); carregar() }

  async function addSub() {
    if (!novaSub.trim()) return
    await supabase.from('tarefas').insert({
      titulo: novaSub.trim(), tarefa_pai_id: tarefa.id, contrato_id: tarefa.contrato_id,
      prazo: f.prazo || null, responsavel_id: f.responsavel_id || null, criado_por: user.id,
    })
    setNovaSub(''); onSalvo()
  }
  async function patchSub(id, dados) { await supabase.from('tarefas').update(dados).eq('id', id); onSalvo() }

  async function comentar() {
    if (!texto.trim()) return
    const { error } = await supabase.from('comentarios').insert({ tarefa_id: tarefa.id, autor_id: user.id, texto: texto.trim() })
    if (error) { alert(error.message); return }
    setTexto(''); carregar()
  }

  const feitos = checklist.filter((i) => i.feito).length
  const abas = nova ? [['detalhes', 'Detalhes']] :
    [['detalhes', 'Detalhes'], ['checklist', `Checklist (${feitos}/${checklist.length})`],
     ['subtarefas', `Subtarefas (${subtarefas.length})`], ['conversa', `Conversa (${comentarios.length})`], ['atividade', 'Atividade']]

  const dep = tarefas.find((t) => t.id === f.depende_de_id)
  const bloqueada = dep && !CONCLUIDA(dep)

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/30" onMouseDown={onClose}>
      <div className="w-full max-w-2xl h-full bg-white shadow-2xl flex flex-col" onMouseDown={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-100 flex items-start gap-3">
          <input type="checkbox" checked={f.status === 'Concluído'} onChange={(e) => setF({ ...f, status: e.target.checked ? 'Concluído' : 'A fazer' })}
            className="w-5 h-5 mt-1 accent-[#00c875] cursor-pointer shrink-0" />
          <div className="flex-1 min-w-0">
            <input value={f.titulo || ''} onChange={set('titulo')} placeholder="Título da tarefa"
              className="w-full text-lg font-bold text-slate-800 outline-none placeholder:text-slate-300" />
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <SelectPill value={f.status} options={STATUS_TAREFA} colors={CORES_STATUS} onChange={(v) => setF({ ...f, status: v })} />
              <SelectPill value={f.prioridade} options={PRIO_TAREFA} colors={CORES_PRIO} onChange={(v) => setF({ ...f, prioridade: v })} />
              {bloqueada && <span className="text-[11px] font-semibold text-[#e2445c]">🔒 aguarda: {dep.titulo}</span>}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
        </div>

        <div className="px-6 border-b border-slate-100 flex gap-1 overflow-x-auto">
          {abas.map(([k, label]) => (
            <button key={k} onClick={() => setAba(k)}
              className={'px-3 py-2.5 text-[13px] font-semibold border-b-2 whitespace-nowrap ' + (aba === k ? 'border-[#7b68ee] text-[#7b68ee]' : 'border-transparent text-slate-400 hover:text-slate-600')}>{label}</button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {aba === 'detalhes' && (
            <div className="grid grid-cols-2 gap-4">
              <Campo label="Contrato">
                <select className={inputCls} value={f.contrato_id || ''} onChange={set('contrato_id')}>
                  <option value="">Sem contrato (tarefa avulsa)</option>
                  {contratos.map((c) => <option key={c.id} value={c.id}>{c.numero ? c.numero + ' — ' : ''}{c.objeto.slice(0, 50)}</option>)}
                </select>
              </Campo>
              <Campo label="Responsável">
                <select className={inputCls} value={f.responsavel_id || ''} onChange={set('responsavel_id')}>
                  <option value="">Sem responsável</option>
                  {perfis.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </Campo>
              <Campo label="Início"><input type="date" className={inputCls} value={f.data_inicio || ''} onChange={set('data_inicio')} /></Campo>
              <Campo label="Prazo de entrega"><input type="date" className={inputCls} value={f.prazo || ''} onChange={set('prazo')} /></Campo>
              <Campo label="Recorrência">
                <select className={inputCls} value={f.recorrencia} onChange={set('recorrencia')}>
                  {RECORRENCIAS.map((r) => <option key={r}>{r}</option>)}
                </select>
              </Campo>
              <Campo label="Depende de">
                <select className={inputCls} value={f.depende_de_id || ''} onChange={set('depende_de_id')}>
                  <option value="">Nenhuma</option>
                  {irmas.map((t) => <option key={t.id} value={t.id}>{t.titulo.slice(0, 50)}</option>)}
                </select>
              </Campo>
              <Campo label="Descrição" className="col-span-2">
                <textarea rows={6} className={inputCls} value={f.descricao || ''} onChange={set('descricao')} />
              </Campo>
              {f.recorrencia !== 'Nenhuma' && (
                <p className="col-span-2 text-[12px] text-slate-400">
                  Ao marcar como concluída, o sistema cria automaticamente a próxima ocorrência ({f.recorrencia.toLowerCase()}) com o checklist zerado.
                </p>
              )}
            </div>
          )}

          {aba === 'checklist' && (
            <div>
              {checklist.length > 0 && (
                <div className="h-1.5 bg-slate-100 rounded-full mb-4 overflow-hidden">
                  <div className="h-full bg-[#00c875] rounded-full transition-all" style={{ width: `${(feitos / checklist.length) * 100}%` }} />
                </div>
              )}
              <div className="space-y-1">
                {checklist.map((it) => (
                  <div key={it.id} className="flex items-center gap-3 py-1.5 group">
                    <input type="checkbox" checked={it.feito} onChange={() => toggleItem(it)} className="w-4 h-4 accent-[#00c875] cursor-pointer" />
                    <span className={'flex-1 text-[13px] ' + (it.feito ? 'text-slate-400 line-through' : 'text-slate-700')}>{it.texto}</span>
                    <button onClick={() => delItem(it.id)} className="text-slate-300 hover:text-[#e2445c] opacity-0 group-hover:opacity-100">✕</button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-4">
                <input value={novoItem} onChange={(e) => setNovoItem(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addItem()}
                  placeholder="Novo item do checklist" className={inputCls} />
                <Botao onClick={addItem}>Adicionar</Botao>
              </div>
            </div>
          )}

          {aba === 'subtarefas' && (
            <div>
              <div className="space-y-1">
                {subtarefas.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 py-1.5 border-b border-slate-50">
                    <input type="checkbox" checked={s.status === 'Concluído'} onChange={(e) => patchSub(s.id, { status: e.target.checked ? 'Concluído' : 'A fazer' })}
                      className="w-4 h-4 accent-[#00c875] cursor-pointer" />
                    <input defaultValue={s.titulo} onBlur={(e) => e.target.value !== s.titulo && patchSub(s.id, { titulo: e.target.value })}
                      className={'flex-1 text-[13px] outline-none bg-transparent ' + (CONCLUIDA(s) ? 'text-slate-400 line-through' : 'text-slate-700')} />
                    <input type="date" value={s.prazo || ''} onChange={(e) => patchSub(s.id, { prazo: e.target.value || null })}
                      className="text-[12px] border border-slate-200 rounded px-2 py-1 text-slate-500" />
                    <select value={s.responsavel_id || ''} onChange={(e) => patchSub(s.id, { responsavel_id: e.target.value || null })}
                      className="text-[12px] border border-slate-200 rounded px-2 py-1 text-slate-500 max-w-[130px]">
                      <option value="">—</option>
                      {perfis.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                    </select>
                  </div>
                ))}
                {subtarefas.length === 0 && <p className="text-[13px] text-slate-400">Nenhuma subtarefa.</p>}
              </div>
              <div className="flex gap-2 mt-4">
                <input value={novaSub} onChange={(e) => setNovaSub(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addSub()}
                  placeholder="Nova subtarefa" className={inputCls} />
                <Botao onClick={addSub}>Adicionar</Botao>
              </div>
            </div>
          )}

          {aba === 'conversa' && (
            <div>
              <textarea rows={3} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Comente nesta tarefa…" className={inputCls} />
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
          {!nova ? <Botao variante="perigo" onClick={excluir}>Excluir</Botao> : <span />}
          <div className="flex gap-2">
            <Botao variante="neutro" onClick={onClose}>Fechar</Botao>
            <Botao onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : nova ? 'Criar tarefa' : 'Salvar alterações'}</Botao>
          </div>
        </div>
      </div>
    </div>
  )
}
