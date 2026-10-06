import React, { useState } from 'react'
import { supabase, money } from './lib'
import { Botao, Campo, inputCls, InputMoeda, Pill, lumText } from './ui'

export const TIPOS_CAMPO = [
  ['texto', 'Texto'], ['numero', 'Número'], ['moeda', 'Moeda (R$)'],
  ['data', 'Data'], ['booleano', 'Sim / Não'], ['lista', 'Lista de opções'],
]
const CORES_SUGERIDAS = ['#0073ea', '#00c875', '#fdab3d', '#e2445c', '#a25ddc', '#7e8fa5']

// chave estável a partir do rótulo: o rótulo pode ser renomeado depois sem
// perder o que já foi preenchido nos registros
const chaveDe = (rotulo) =>
  rotulo.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || ('campo_' + Date.now())

/* ====== o que aparece dentro do painel de contrato e de tarefa ====== */
export function CamposExtras({ campos, valores, onChange, editor = true }) {
  const lista = campos.filter((c) => c.ativo)
  if (!lista.length) return null
  const v = valores || {}
  const set = (chave) => (valor) => onChange({ ...v, [chave]: valor })

  return (
    <>
      {lista.map((c) => (
        <Campo key={c.id} label={c.rotulo}>
          {c.tipo === 'texto' && (
            <input className={inputCls} disabled={!editor} value={v[c.chave] || ''}
              onChange={(e) => set(c.chave)(e.target.value)} />
          )}
          {c.tipo === 'numero' && (
            <input type="number" className={inputCls} disabled={!editor} value={v[c.chave] ?? ''}
              onChange={(e) => set(c.chave)(e.target.value === '' ? null : Number(e.target.value))} />
          )}
          {c.tipo === 'moeda' && (
            <InputMoeda className={inputCls} value={v[c.chave] ?? null} onChange={set(c.chave)} />
          )}
          {c.tipo === 'data' && (
            <input type="date" className={inputCls} disabled={!editor} value={v[c.chave] || ''}
              onChange={(e) => set(c.chave)(e.target.value || null)} />
          )}
          {c.tipo === 'booleano' && (
            <select className={inputCls} disabled={!editor} value={v[c.chave] === true ? 'sim' : v[c.chave] === false ? 'nao' : ''}
              onChange={(e) => set(c.chave)(e.target.value === '' ? null : e.target.value === 'sim')}>
              <option value="">—</option><option value="sim">Sim</option><option value="nao">Não</option>
            </select>
          )}
          {c.tipo === 'lista' && (
            <select className={inputCls} disabled={!editor} value={v[c.chave] || ''}
              onChange={(e) => set(c.chave)(e.target.value || null)}>
              <option value="">—</option>
              {(c.opcoes || []).map((o) => <option key={o.valor} value={o.valor}>{o.valor}</option>)}
            </select>
          )}
        </Campo>
      ))}
    </>
  )
}

// valor formatado para leitura rápida (tabela, exportação)
export function textoCampo(campo, valor) {
  if (valor === null || valor === undefined || valor === '') return ''
  if (campo.tipo === 'moeda') return money(valor)
  if (campo.tipo === 'booleano') return valor ? 'Sim' : 'Não'
  return String(valor)
}

/* ====== tela de administração dos campos ====== */
export function Campos({ campos, meuPerfil, onMudou }) {
  const admin = meuPerfil?.papel === 'admin'
  const [novo, setNovo] = useState({ entidade: 'contrato', rotulo: '', tipo: 'texto', opcoes: [] })
  const [opcao, setOpcao] = useState('')
  const [salvando, setSalvando] = useState(false)

  async function criar() {
    if (!novo.rotulo.trim()) { alert('Dê um nome ao campo.'); return }
    if (novo.tipo === 'lista' && novo.opcoes.length === 0) { alert('Uma lista precisa de ao menos uma opção.'); return }
    setSalvando(true)
    const { error } = await supabase.from('campos_personalizados').insert({
      entidade: novo.entidade, chave: chaveDe(novo.rotulo), rotulo: novo.rotulo.trim(),
      tipo: novo.tipo, opcoes: novo.opcoes, ordem: campos.length,
    })
    setSalvando(false)
    if (error) return alert(error.code === '23505' ? 'Já existe um campo com esse nome aqui.' : error.message)
    setNovo({ entidade: novo.entidade, rotulo: '', tipo: 'texto', opcoes: [] }); setOpcao(''); onMudou()
  }

  async function alternar(c) {
    const { error } = await supabase.from('campos_personalizados').update({ ativo: !c.ativo }).eq('id', c.id)
    if (error) return alert(error.message)
    onMudou()
  }

  async function apagar(c) {
    if (!confirm(`Apagar o campo "${c.rotulo}"?\n\nO que já foi preenchido nos registros continua guardado, mas some das telas. Desativar é mais seguro que apagar.`)) return
    const { error } = await supabase.from('campos_personalizados').delete().eq('id', c.id)
    if (error) return alert(error.message)
    onMudou()
  }

  if (!admin) {
    return <div className="p-6 text-[13px] text-slate-400">Só o administrador cria campos. Fale com o ADM ou com a Diretoria.</div>
  }

  const porEntidade = (e) => campos.filter((c) => c.entidade === e)

  const Tabela = ({ titulo, lista }) => (
    <div className="bg-white rounded-xl border border-slate-100 mb-5">
      <div className="px-4 py-3 border-b border-slate-100 text-[13px] font-bold text-slate-700">{titulo} · {lista.length}</div>
      {lista.length === 0 && <div className="px-4 py-5 text-[13px] text-slate-400">Nenhum campo criado aqui ainda.</div>}
      {lista.map((c) => (
        <div key={c.id} className="px-4 py-3 border-b border-slate-50 flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <div className="text-[13px] font-semibold text-slate-700">{c.rotulo}</div>
            <div className="text-[11px] text-slate-400">
              {(TIPOS_CAMPO.find(([t]) => t === c.tipo) || [])[1]}
              {c.tipo === 'lista' && (c.opcoes || []).length ? ' · ' + c.opcoes.map((o) => o.valor).join(', ') : ''}
            </div>
          </div>
          {!c.ativo && <Pill value="desativado" color="#c3c6d4" />}
          <button onClick={() => alternar(c)} className="text-[13px] font-semibold text-[#0073ea] hover:underline px-2">
            {c.ativo ? 'Desativar' : 'Reativar'}
          </button>
          <button onClick={() => apagar(c)} className="text-[13px] font-semibold text-[#e2445c] hover:underline px-2">Apagar</button>
        </div>
      ))}
    </div>
  )

  return (
    <div className="p-5">
      <div className="mb-4">
        <h2 className="text-[15px] font-extrabold text-slate-800">Campos personalizados</h2>
        <p className="text-[12px] text-slate-400">
          Campos criados aqui aparecem no painel de cada contrato ou tarefa e saem na exportação.
          Desativar esconde das telas sem perder o que já foi preenchido.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 p-4 mb-6">
        <div className="text-[13px] font-bold text-slate-700 mb-3">Novo campo</div>
        <div className="grid md:grid-cols-4 gap-3">
          <Campo label="Onde">
            <select className={inputCls} value={novo.entidade} onChange={(e) => setNovo({ ...novo, entidade: e.target.value })}>
              <option value="contrato">Contratos</option>
              <option value="tarefa">Tarefas</option>
            </select>
          </Campo>
          <Campo label="Nome do campo">
            <input className={inputCls} value={novo.rotulo} placeholder="Ex.: Nº da ART"
              onChange={(e) => setNovo({ ...novo, rotulo: e.target.value })} />
          </Campo>
          <Campo label="Tipo">
            <select className={inputCls} value={novo.tipo} onChange={(e) => setNovo({ ...novo, tipo: e.target.value, opcoes: [] })}>
              {TIPOS_CAMPO.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
            </select>
          </Campo>
          <div className="flex items-end"><Botao onClick={criar} disabled={salvando}>{salvando ? 'Criando…' : 'Criar campo'}</Botao></div>
        </div>

        {novo.tipo === 'lista' && (
          <div className="mt-3">
            <div className="text-[11px] font-bold uppercase text-slate-400 mb-1">Opções da lista</div>
            <div className="flex flex-wrap items-center gap-2">
              {novo.opcoes.map((o, i) => (
                <span key={o.valor} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold"
                  style={{ background: o.cor, color: lumText(o.cor) }}>
                  {o.valor}
                  <button onClick={() => setNovo({ ...novo, opcoes: novo.opcoes.filter((_, j) => j !== i) })}>✕</button>
                </span>
              ))}
              <input className={inputCls + ' w-44'} value={opcao} placeholder="Nova opção"
                onChange={(e) => setOpcao(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter' || !opcao.trim()) return
                  e.preventDefault()
                  setNovo({ ...novo, opcoes: [...novo.opcoes, { valor: opcao.trim(), cor: CORES_SUGERIDAS[novo.opcoes.length % CORES_SUGERIDAS.length] }] })
                  setOpcao('')
                }} />
              <span className="text-[11px] text-slate-400">Enter para adicionar</span>
            </div>
          </div>
        )}
      </div>

      <Tabela titulo="Em contratos" lista={porEntidade('contrato')} />
      <Tabela titulo="Em tarefas" lista={porEntidade('tarefa')} />
    </div>
  )
}
