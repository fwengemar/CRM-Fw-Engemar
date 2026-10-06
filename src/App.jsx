import React, { useEffect, useState, useCallback } from 'react'
import { supabase, CONCLUIDA, diasAte, pedirNotaConclusao, podeEditar, ehAdmin, exportarXlsx, dataArquivo, money, dt, valorVigente, ehMinha, responsaveisDe } from './lib'
import { Avatar, Botao, inputCls } from './ui'
import { Tabela, Kanban, Timeline, Dashboard } from './views'
import { MinhasTarefas, QuadroTarefas, Calendario, PainelTarefas } from './tarefas'
import { Drawer } from './drawer'
import { Avisos } from './avisos'
import { TarefaDrawer } from './tarefa-drawer'
import { BuscaGlobal } from './busca'
import { Lixeira } from './lixeira'
import { Sino } from './sino'
import { Campos, textoCampo } from './campos'
import { BarraFiltros, FILTRO_VAZIO, filtroLimpo, dentroDaJanela } from './filtros'

function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function entrar(e) {
    e.preventDefault()
    setCarregando(true); setErro('')
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha })
    setCarregando(false)
    if (error) setErro(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'linear-gradient(135deg,#0b2a4a 0%,#0073ea 100%)' }}>
      <form onSubmit={entrar} className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-6">
          <img src="/logo.png" alt="FW CRM" className="w-20 h-20 mx-auto rounded-xl" />
          <h1 className="text-xl font-extrabold text-slate-800 mt-2">FW CRM</h1>
          <p className="text-[13px] text-slate-400">FW Engemar · Construções e Serviços Marítimos</p>
        </div>
        <label className="block mb-3">
          <span className="text-[11px] font-bold uppercase text-slate-400">E-mail</span>
          <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </label>
        <label className="block mb-4">
          <span className="text-[11px] font-bold uppercase text-slate-400">Senha</span>
          <input className={inputCls} type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
        </label>
        {erro && <div className="text-[13px] text-[#e2445c] mb-3">{erro}</div>}
        <button type="submit" disabled={carregando} className="w-full rounded-lg bg-[#0073ea] text-white font-semibold py-2.5 hover:bg-[#0060b9] disabled:opacity-60">
          {carregando ? 'Entrando…' : 'Entrar'}
        </button>
        <p className="text-[11px] text-slate-400 text-center mt-4">Acesso restrito à equipe FW Engemar</p>
      </form>
    </div>
  )
}

const NAV = [
  ['Contratos', [['tabela', 'Tabela', '▤'], ['kanban', 'Quadro', '▦'], ['timeline', 'Timeline', '▭'], ['dashboard', 'Dashboard', '◫']]],
  ['Tarefas', [['minhas', 'Minhas tarefas', '☑'], ['quadro', 'Quadro de tarefas', '▦'], ['calendario', 'Calendário', '▤'], ['painel', 'Painel de tarefas', '◫']]],
  ['Sistema', [['lixeira', 'Lixeira', '🗑'], ['campos', 'Campos', '⚙']]],
]
const VISOES_TAREFA = ['minhas', 'quadro', 'calendario', 'painel']

export default function App() {
  const [sessao, setSessao] = useState(undefined)
  const [perfis, setPerfis] = useState([])
  const [contratos, setContratos] = useState([])
  const [tarefas, setTarefas] = useState([])
  const [medicoes, setMedicoes] = useState([])
  const [visao, setVisao] = useState('minhas')
  const [busca, setBusca] = useState('')
  const [filtroResp, setFiltroResp] = useState('')
  const [aberto, setAberto] = useState(null)
  const [tarefaAberta, setTarefaAberta] = useState(null)
  const [menu, setMenu] = useState(false)
  const [buscaGlobal, setBuscaGlobal] = useState(false)
  const [campos, setCampos] = useState([])
  const [visoes, setVisoes] = useState([])
  const [filtros, setFiltros] = useState(FILTRO_VAZIO)
  const [agrupamento, setAgrupamento] = useState('fase')
  // tema fica no navegador: cada pessoa escolhe o seu, na sua maquina
  const [tema, setTema] = useState(() => {
    try { return localStorage.getItem('fwcrm_tema') || 'claro' } catch { return 'claro' }
  })
  useEffect(() => {
    document.documentElement.classList.toggle('escuro', tema === 'escuro')
    try { localStorage.setItem('fwcrm_tema', tema) } catch {}
  }, [tema])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessao(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSessao(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const carregar = useCallback(async () => {
    const [c, p, t, m, cp, vi] = await Promise.all([
      supabase.from('contratos').select('*').is('excluido_em', null).order('ordem').order('criado_em'),
      supabase.from('perfis').select('*').order('nome'),
      supabase.from('tarefas').select('*').is('excluido_em', null).order('prazo', { nullsFirst: false }).order('ordem'),
      supabase.from('medicoes').select('id, contrato_id, valor, status, competencia'),
      supabase.from('campos_personalizados').select('*').order('ordem').order('criado_em'),
      supabase.from('visoes').select('*').order('nome'),
    ])
    if (c.data) setContratos(c.data)
    if (p.data) setPerfis(p.data)
    if (t.data) setTarefas(t.data)
    if (m.data) setMedicoes(m.data)
    if (cp.data) setCampos(cp.data)
    if (vi.data) setVisoes(vi.data)
  }, [])

  useEffect(() => {
    if (!sessao) return
    carregar()
    const canal = supabase.channel('fw-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contratos' }, carregar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tarefas' }, carregar)
      .subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [sessao, carregar])

  async function patch(id, dados) {
    setContratos((cs) => cs.map((c) => (c.id === id ? { ...c, ...dados } : c)))
    const { error } = await supabase.from('contratos').update(dados).eq('id', id)
    if (error) alert('Erro ao salvar: ' + error.message)
    carregar()
  }

  async function patchTarefa(id, dados) {
    const atual = tarefas.find((t) => t.id === id)
    if (dados.status === 'Concluído' && atual && atual.status !== 'Concluído') {
      const nota = pedirNotaConclusao(atual.titulo)
      if (!nota) return            // desistiu: a tarefa continua como estava
      dados = { ...dados, ...nota }
    }
    setTarefas((ts) => ts.map((t) => (t.id === id ? { ...t, ...dados } : t)))
    const { error } = await supabase.from('tarefas').update(dados).eq('id', id)
    if (error) alert('Erro ao salvar: ' + error.message)
    carregar()
  }

  if (sessao === undefined) return <div className="min-h-screen flex items-center justify-center text-slate-400">Carregando…</div>
  if (!sessao) return <Login />

  const user = sessao.user
  const meuPerfil = perfis.find((p) => p.id === user.id)
  const ehTarefa = VISOES_TAREFA.includes(visao)
  const termo = busca.trim().toLowerCase()

  const contratosFiltrados = contratos.filter((c) => {
    const okBusca = !termo || [c.objeto, c.orgao, c.numero, c.local, c.processo].some((v) => (v || '').toLowerCase().includes(termo))
    const okResp = !filtroResp || c.responsavel_id === filtroResp
    const okFase = !filtros.fases.length || filtros.fases.includes(c.fase)
    const okSaude = !filtros.saudes.length || filtros.saudes.includes(c.saude)
    const okJanela = dentroDaJanela(c.data_sessao, filtros.janela)
    return okBusca && okResp && okFase && okSaude && okJanela
  })
  const tarefasFiltradas = tarefas.filter((t) => {
    const contrato = contratos.find((c) => c.id === t.contrato_id)
    const okBusca = !termo || [t.titulo, t.descricao, contrato?.numero, contrato?.objeto].some((v) => (v || '').toLowerCase().includes(termo))
    const okResp = !filtroResp || ehMinha(t, filtroResp)
    const okStatus = !filtros.statusT.length || filtros.statusT.includes(t.status)
    const okPrio = !filtros.prioT.length || filtros.prioT.includes(t.prioridade)
    const okJanela = dentroDaJanela(t.prazo, filtros.janela)
    return okBusca && okResp && okStatus && okPrio && okJanela
  })

  const minhasAbertas = tarefas.filter((t) => ehMinha(t, user.id) && !CONCLUIDA(t))
  const minhasAtrasadas = minhasAbertas.filter((t) => t.prazo && diasAte(t.prazo) < 0).length

  const editor = podeEditar(meuPerfil)
  const admin = ehAdmin(meuPerfil)
  const nomeDe = (id) => perfis.find((p) => p.id === id)?.nome || ''

  // exporta o que esta na tela, com os filtros aplicados, mais o relatorio pronto
  function exportar() {
    const linhasContrato = contratosFiltrados.map((c) => ({
      Número: c.numero || '', Objeto: c.objeto, Órgão: c.orgao || '', Modalidade: c.modalidade || '',
      Processo: c.processo || '', Local: c.local || '', Fase: c.fase, Status: c.saude, Prioridade: c.prioridade,
      Responsável: nomeDe(c.responsavel_id), 'Valor estimado': Number(c.valor_total || 0),
      'Valor de contrato': Number(c.valor_contratado || 0), Continuado: c.continuado ? 'Sim' : 'Não',
      Sessão: c.data_sessao || '', Assinatura: c.data_assinatura || '',
      Início: c.vigencia_inicio || '', Fim: c.vigencia_fim || '', Observações: c.observacoes || '',
      ...Object.fromEntries(campos.filter((k) => k.entidade === 'contrato' && k.ativo)
        .map((k) => [k.rotulo, textoCampo(k, (c.extras || {})[k.chave])])),
    }))
    const linhasTarefa = tarefasFiltradas.map((t) => ({
      Tarefa: t.titulo, Status: t.status, Prioridade: t.prioridade,
      Responsável: responsaveisDe(t).map(nomeDe).join(', '),
      Contrato: (contratos.find((c) => c.id === t.contrato_id)?.numero) || '',
      Início: t.data_inicio || '', Prazo: t.prazo || '', Hora: (t.hora_prazo || '').slice(0, 5),
      Recorrência: t.recorrencia, 'Concluída em': t.concluida_em ? dt(t.concluida_em) : '',
      'O que foi feito': t.nota_conclusao || '', Descrição: t.descricao || '',
      ...Object.fromEntries(campos.filter((k) => k.entidade === 'tarefa' && k.ativo)
        .map((k) => [k.rotulo, textoCampo(k, (t.extras || {})[k.chave])])),
    }))
    const linhasMedicao = medicoes.map((m) => {
      const c = contratos.find((x) => x.id === m.contrato_id)
      return {
        Contrato: c?.numero || c?.objeto || '', Órgão: c?.orgao || '', Competência: m.competencia || '',
        Valor: Number(m.valor || 0), Status: m.status,
      }
    })
    const porOrgao = {}
    contratosFiltrados.forEach((c) => {
      const k = c.orgao || 'Sem órgão'
      porOrgao[k] = porOrgao[k] || { Órgão: k, Contratos: 0, 'Valor contratado': 0, 'Valor estimado': 0 }
      porOrgao[k].Contratos += 1
      porOrgao[k]['Valor contratado'] += Number(c.valor_contratado || 0)
      porOrgao[k]['Valor estimado'] += Number(c.valor_total || 0)
    })
    const produtividade = perfis.map((p) => {
      const minhas = tarefas.filter((t) => ehMinha(t, p.id))
      return {
        Pessoa: p.nome,
        'Em aberto': minhas.filter((t) => !CONCLUIDA(t)).length,
        Atrasadas: minhas.filter((t) => !CONCLUIDA(t) && t.prazo && diasAte(t.prazo) < 0).length,
        Concluídas: minhas.filter((t) => t.status === 'Concluído').length,
      }
    })
    exportarXlsx(`fw-crm-${dataArquivo()}.xlsx`, [
      { nome: 'Contratos', linhas: linhasContrato },
      { nome: 'Tarefas', linhas: linhasTarefa },
      { nome: 'Medições', linhas: linhasMedicao },
      { nome: 'Carteira por órgão', linhas: Object.values(porOrgao) },
      { nome: 'Produtividade', linhas: produtividade },
    ])
  }

  function aplicarVisao(v) {
    const f = v.filtros || {}
    setFiltros({ ...FILTRO_VAZIO, ...f })
    if (f.busca !== undefined) setBusca(f.busca || '')
    if (f.filtroResp !== undefined) setFiltroResp(f.filtroResp || '')
    if (v.agrupamento) setAgrupamento(v.agrupamento)
  }

  const propsContrato = { contratos: contratosFiltrados, perfis, onPatch: patch, onAbrir: setAberto, onNovo: () => setAberto({}), agruparPor: agrupamento }
  const propsTarefa = {
    tarefas: tarefasFiltradas, perfis, contratos, user,
    onPatch: patchTarefa, onAbrir: setTarefaAberta, onNova: () => setTarefaAberta({}),
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-[218px] shrink-0 bg-white border-r border-slate-200 hidden md:flex flex-col">
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="FW CRM" className="w-8 h-8" />
            <div>
              <div className="font-extrabold text-slate-800 leading-tight text-[15px]">FW CRM</div>
              <div className="text-[11px] text-slate-400">FW Engemar</div>
            </div>
          </div>
        </div>
        <div className="p-3 space-y-4 overflow-y-auto">
          {NAV.map(([secao, itens]) => (
            <div key={secao}>
              <div className="text-[11px] uppercase font-bold text-slate-400 px-2 mb-1">{secao}</div>
              {itens.map(([k, label, icone]) => (
                <button key={k} onClick={() => setVisao(k)}
                  className={'w-full text-left px-2 py-2 rounded-lg text-[13px] font-medium flex items-center gap-2 ' + (visao === k ? 'bg-slate-100 text-slate-800 font-semibold' : 'text-slate-500 hover:bg-slate-50')}>
                  <span className="text-slate-400">{icone}</span>
                  <span className="flex-1">{label}</span>
                  {k === 'minhas' && minhasAbertas.length > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
                      style={{ background: minhasAtrasadas ? '#e2445c' : '#7b68ee' }}>{minhasAbertas.length}</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
        <div className="mt-auto p-3">
          <div className="text-[11px] uppercase font-bold text-slate-400 px-2 mb-2">Equipe</div>
          <div className="flex flex-wrap gap-1 px-2">
            {perfis.map((p) => <Avatar key={p.id} nome={p.nome} id={p.id} size={26} title={p.nome + (p.cargo ? ' · ' + p.cargo : '')} />)}
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="bg-white border-b border-slate-200 px-5 py-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[180px]">
              <h1 className="text-lg font-extrabold text-slate-800">{ehTarefa ? 'Tarefas' : 'Gestão de Contratos'}</h1>
              <p className="text-[12px] text-slate-400">
                {ehTarefa
                  ? `${tarefas.filter((t) => !CONCLUIDA(t)).length} tarefas em aberto · ${minhasAbertas.length} com você`
                  : `${contratos.length} contratos · atualizado em tempo real`}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <input value={busca} onChange={(e) => setBusca(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && busca.trim().length >= 2) setBuscaGlobal(true) }}
                placeholder={ehTarefa ? 'Buscar tarefa…' : 'Buscar contrato, órgão, processo…'}
                title="Filtra esta tela. Enter procura em tudo."
                className="rounded-lg border border-slate-200 px-3 py-2 text-[13px] w-56 outline-none focus:border-[#0073ea]" />
              <button onClick={() => setBuscaGlobal(true)} title="Procurar em contratos, tarefas e comentários"
                className="rounded-lg border border-slate-200 px-2.5 py-2 text-[13px] text-slate-500 hover:bg-slate-50">tudo</button>
            </div>
            <select value={filtroResp} onChange={(e) => setFiltroResp(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-[#0073ea]">
              <option value="">Todos responsáveis</option>
              {perfis.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
            <Botao variante="neutro" onClick={exportar}>Exportar</Botao>
            {editor && (ehTarefa
              ? <Botao onClick={() => setTarefaAberta({})}>+ Nova tarefa</Botao>
              : <Botao onClick={() => setAberto({})}>+ Novo contrato</Botao>)}
            <Sino user={user} perfis={perfis} onAbrirTarefa={setTarefaAberta} onAbrirContrato={setAberto} />
            <div className="relative">
              <button onClick={() => setMenu(!menu)}><Avatar nome={meuPerfil?.nome || user.email} id={user.id} size={34} /></button>
              {menu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 p-3 z-30">
                  <div className="text-[13px] font-semibold text-slate-700">{meuPerfil?.nome}</div>
                  <div className="text-[11px] text-slate-400">{user.email}</div>
                  <div className="text-[11px] text-slate-400 mb-3">
                    {admin ? 'Administrador' : editor ? 'Editor' : 'Somente leitura'}
                  </div>
                  <button onClick={() => setTema(tema === 'escuro' ? 'claro' : 'escuro')}
                    className="w-full flex items-center gap-2 text-left text-[13px] font-semibold text-slate-600 hover:bg-slate-50 rounded px-2 py-1.5 mb-1">
                    <span className="text-slate-400">{tema === 'escuro' ? '☀' : '☾'}</span>
                    <span>{tema === 'escuro' ? 'Modo claro' : 'Modo escuro'}</span>
                  </button>
                  <button onClick={() => supabase.auth.signOut()} className="w-full text-left text-[13px] text-[#e2445c] font-semibold hover:bg-slate-50 rounded px-2 py-1.5">Sair</button>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-1 mt-3 md:hidden overflow-x-auto">
            {NAV.flatMap(([, itens]) => itens).map(([k, label]) => (
              <button key={k} onClick={() => setVisao(k)}
                className={'px-3 py-1.5 rounded-lg text-[13px] whitespace-nowrap ' + (visao === k ? 'bg-slate-100 font-semibold text-slate-800' : 'text-slate-500')}>{label}</button>
            ))}
          </div>
        </header>

        {visao !== 'lixeira' && visao !== 'campos' && (
          <BarraFiltros ehTarefa={ehTarefa} filtros={filtros} setFiltros={setFiltros}
            agrupamento={agrupamento} setAgrupamento={setAgrupamento}
            visoes={visoes} user={user} telaAtual={visao}
            contexto={{ busca, filtroResp }}
            onRecarregarVisoes={carregar} onAplicarVisao={aplicarVisao} />
        )}

        <Avisos tarefas={tarefas} contratos={contratos} user={user} onAbrir={setTarefaAberta} onPatch={patchTarefa} />

        <main className="flex-1 overflow-auto">
          {visao === 'tabela' && <Tabela {...propsContrato} />}
          {visao === 'kanban' && <Kanban {...propsContrato} />}
          {visao === 'timeline' && <Timeline contratos={contratosFiltrados} onAbrir={setAberto} />}
          {visao === 'dashboard' && <Dashboard contratos={contratosFiltrados} perfis={perfis} medicoes={medicoes} onAbrir={setAberto} />}
          {visao === 'minhas' && <MinhasTarefas {...propsTarefa} />}
          {visao === 'painel' && <PainelTarefas tarefas={tarefasFiltradas} perfis={perfis} contratos={contratos} onAbrir={setTarefaAberta} />}
          {visao === 'quadro' && <QuadroTarefas {...propsTarefa} />}
          {visao === 'lixeira' && <Lixeira perfis={perfis} meuPerfil={meuPerfil} onMudou={carregar} />}
          {visao === 'campos' && <Campos campos={campos} meuPerfil={meuPerfil} onMudou={carregar} />}
          {visao === 'calendario' && (
            <Calendario tarefas={tarefasFiltradas} contratos={contratos} perfis={perfis}
              onAbrir={setTarefaAberta} onAbrirContrato={setAberto} onPatch={patchTarefa}
              onNovaTarefa={(prazo) => setTarefaAberta({ prazo })} />
          )}
        </main>
      </div>

      {buscaGlobal && (
        <BuscaGlobal termo={busca} contratos={contratos}
          onAbrirContrato={(c) => setAberto(c)} onAbrirTarefa={(t) => setTarefaAberta(t)}
          onFechar={() => setBuscaGlobal(false)} />
      )}

      {aberto && (
        <Drawer contrato={aberto.id ? contratos.find((c) => c.id === aberto.id) : null}
          perfis={perfis} user={user} editor={editor} tarefas={tarefas} contratos={contratos}
          campos={campos.filter((k) => k.entidade === 'contrato')}
          onAbrirTarefa={setTarefaAberta} onNovaTarefa={(cid) => setTarefaAberta({ contrato_id: cid })}
          onPatchTarefa={patchTarefa} onClose={() => setAberto(null)} onSalvo={carregar} />
      )}

      {tarefaAberta && (
        <TarefaDrawer tarefa={tarefaAberta.id ? tarefas.find((t) => t.id === tarefaAberta.id) : (Object.keys(tarefaAberta).length ? tarefaAberta : null)}
          tarefas={tarefas} contratos={contratos} perfis={perfis} user={user} editor={editor}
          campos={campos.filter((k) => k.entidade === 'tarefa')}
          onClose={() => setTarefaAberta(null)} onSalvo={carregar} />
      )}
    </div>
  )
}
