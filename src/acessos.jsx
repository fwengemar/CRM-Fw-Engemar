import React, { useState } from 'react'
import { supabase, FUNCOES, CHAVE_PUBLICA, PAPEIS, ROTULO_PAPEL, ehAdmin } from './lib'
import { Avatar, Botao, Campo, inputCls, Pill } from './ui'

// Criar login exige a chave de serviço do Supabase, que não pode ficar no
// navegador. Por isso a tela conversa com a função 'acessos', que roda no
// servidor e confere no banco se quem pediu é mesmo administrador.
async function chamar(acao, dados) {
  const { data: sessao } = await supabase.auth.getSession()
  const token = sessao?.session?.access_token
  if (!token) return { erro: 'Sessão expirada. Entre de novo.' }
  const url = FUNCOES + '/acessos'
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token, apikey: CHAVE_PUBLICA },
      body: JSON.stringify({ acao, ...dados }),
    })
    const corpo = await r.json().catch(() => ({}))
    if (!r.ok) return { erro: corpo.erro || 'Falhou (erro ' + r.status + ').' }
    return corpo
  } catch (e) {
    return { erro: 'Sem resposta do servidor: ' + e.message }
  }
}

const CORES_PAPEL = { admin: '#0073ea', editor: '#00c875', leitor: '#7e8fa5' }

const DESCRICAO = {
  admin: 'Faz tudo: exclui de vez, cria campos e cria acessos.',
  editor: 'Cria e edita contratos e tarefas. Não exclui de vez nem cria campos.',
  leitor: 'Só consulta. Não grava nada e não vê medições nem aditivos.',
}

export function Acessos({ perfis, meuPerfil, user, onMudou }) {
  const admin = ehAdmin(meuPerfil)
  const vazio = { nome: '', email: '', senha: '', cargo: '', papel: 'editor' }
  const [f, setF] = useState(vazio)
  const [salvando, setSalvando] = useState(false)
  const [recado, setRecado] = useState(null)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  if (!admin) {
    return (
      <div className="p-6 text-[13px] text-slate-400">
        Só o administrador cria e altera acessos. Fale com o Administrativo ou com a Diretoria.
      </div>
    )
  }

  function senhaSugerida() {
    const base = 'Fw' + Math.random().toString(36).slice(2, 7) + '@' + new Date().getFullYear()
    setF((v) => ({ ...v, senha: base }))
  }

  async function criar() {
    setSalvando(true); setRecado(null)
    const r = await chamar('criar', f)
    setSalvando(false)
    if (r.erro) return setRecado({ tipo: 'erro', texto: r.erro })
    setRecado({ tipo: 'ok', texto: `Acesso criado para ${f.nome}. Senha: ${f.senha} — passe para a pessoa e peça que troque depois.` })
    setF(vazio); onMudou()
  }

  async function trocarPapel(p, papel) {
    const r = await chamar('papel', { id: p.id, papel })
    if (r.erro) return alert(r.erro)
    onMudou()
  }

  async function novaSenha(p) {
    const senha = window.prompt(`Nova senha para ${p.nome} (mínimo 8 caracteres)`, '')
    if (senha === null) return
    const r = await chamar('senha', { id: p.id, senha: senha.trim() })
    if (r.erro) return alert(r.erro)
    alert(`Senha de ${p.nome} trocada. Passe a nova para a pessoa.`)
  }

  async function remover(p) {
    if (!confirm(`Remover o acesso de ${p.nome} (${p.email})?\n\nA pessoa deixa de entrar no CRM. Os contratos, tarefas e comentários dela continuam no sistema, com o nome preservado.`)) return
    if (!confirm('Confirmando: remover o acesso? Não há como desfazer.')) return
    const r = await chamar('remover', { id: p.id })
    if (r.erro) return alert(r.erro)
    onMudou()
  }

  return (
    <div className="p-5">
      <div className="mb-4">
        <h2 className="text-[15px] font-extrabold text-slate-800">Acessos</h2>
        <p className="text-[12px] text-slate-400">
          Quem entra no CRM e o que cada um pode fazer. Criar, trocar a senha e remover acesso é só do administrador.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 p-4 mb-6">
        <div className="text-[13px] font-bold text-slate-700 mb-3">Novo acesso</div>
        <div className="grid md:grid-cols-3 gap-3">
          <Campo label="Nome">
            <input className={inputCls} value={f.nome} onChange={set('nome')} placeholder="Ex.: Natália Souza" />
          </Campo>
          <Campo label="E-mail de entrada">
            <input className={inputCls} type="email" value={f.email} onChange={set('email')} placeholder="nome@fwengemar.com.br" />
          </Campo>
          <Campo label="Cargo">
            <input className={inputCls} value={f.cargo} onChange={set('cargo')} placeholder="Ex.: Engenharia" />
          </Campo>
          <Campo label="Senha inicial">
            <div className="flex gap-2">
              <input className={inputCls} value={f.senha} onChange={set('senha')} placeholder="mínimo 8 caracteres" />
              <button type="button" onClick={senhaSugerida}
                className="rounded-lg border border-slate-200 px-2.5 text-[12px] font-semibold text-slate-500 hover:bg-slate-50 whitespace-nowrap">
                sugerir
              </button>
            </div>
          </Campo>
          <Campo label="Perfil de acesso">
            <select className={inputCls} value={f.papel} onChange={set('papel')}>
              {PAPEIS.map((p) => <option key={p} value={p}>{ROTULO_PAPEL[p]}</option>)}
            </select>
          </Campo>
          <div className="flex items-end">
            <Botao onClick={criar} disabled={salvando}>{salvando ? 'Criando…' : 'Criar acesso'}</Botao>
          </div>
        </div>
        <p className="text-[11px] text-slate-400 mt-2">{DESCRICAO[f.papel]}</p>

        {recado && (
          <div className={'mt-3 rounded-lg px-3 py-2 text-[13px] ' +
            (recado.tipo === 'ok' ? 'bg-[#00c875]/10 text-[#0b7a4b]' : 'bg-[#e2445c]/10 text-[#b3382c]')}>
            {recado.texto}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-100">
        <div className="px-4 py-3 border-b border-slate-100 text-[13px] font-bold text-slate-700">
          Quem tem acesso hoje · {perfis.length}
        </div>
        {perfis.map((p) => (
          <div key={p.id} className="px-4 py-3 border-b border-slate-50 flex items-center gap-3 flex-wrap">
            <Avatar nome={p.nome} id={p.id} size={30} />
            <div className="flex-1 min-w-[180px]">
              <div className="text-[13px] font-semibold text-slate-700">
                {p.nome}
                {p.id === user.id && <span className="text-[11px] font-normal text-slate-400"> · você</span>}
              </div>
              <div className="text-[11px] text-slate-400">{p.email}{p.cargo ? ' · ' + p.cargo : ''}</div>
            </div>
            <Pill value={ROTULO_PAPEL[p.papel] || p.papel} color={CORES_PAPEL[p.papel] || '#c3c6d4'} />
            <select value={p.papel || 'editor'} onChange={(e) => trocarPapel(p, e.target.value)}
              className="rounded-lg border border-slate-200 px-2 py-1 text-[12px] outline-none focus:border-[#0073ea]">
              {PAPEIS.map((v) => <option key={v} value={v}>{ROTULO_PAPEL[v]}</option>)}
            </select>
            <button onClick={() => novaSenha(p)} className="text-[13px] font-semibold text-[#0073ea] hover:underline px-2">
              Trocar senha
            </button>
            {p.id !== user.id && (
              <button onClick={() => remover(p)} className="text-[13px] font-semibold text-[#e2445c] hover:underline px-2">
                Remover
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="mt-5 text-[12px] text-slate-400 max-w-[70ch] leading-relaxed">
        <b className="text-slate-500">Os três perfis.</b> Administrador faz tudo, inclusive apagar de vez, criar campos
        e criar acessos. Editor cria e edita contratos e tarefas, mas não apaga de vez nem cria campos. Leitura só
        consulta e nem enxerga medições e aditivos — é o perfil para contador, engenheiro ou fiscal de fora.
      </div>
    </div>
  )
}
