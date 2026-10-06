import React, { useEffect, useState } from 'react'
import { supabase, dt, ehAdmin, CORES_FASE, CORES_STATUS } from './lib'
import { Pill, Botao, Avatar } from './ui'

// Excluir agora marca a data em vez de apagar. O registro some das telas, mas
// continua no banco com medições, tarefas, comentários e histórico intactos —
// dá para voltar atrás. Só administrador apaga de vez, e aí não tem volta.
export function Lixeira({ perfis, meuPerfil, onMudou }) {
  const [contratos, setContratos] = useState([])
  const [tarefas, setTarefas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const admin = ehAdmin(meuPerfil)

  async function carregar() {
    setCarregando(true)
    const [c, t] = await Promise.all([
      supabase.from('contratos').select('*').not('excluido_em', 'is', null).order('excluido_em', { ascending: false }),
      supabase.from('tarefas').select('*').not('excluido_em', 'is', null).order('excluido_em', { ascending: false }),
    ])
    setContratos(c.data || []); setTarefas(t.data || []); setCarregando(false)
  }
  useEffect(() => { carregar() }, [])

  const nome = (id) => perfis.find((p) => p.id === id)?.nome || 'alguém'

  async function restaurar(tabela, linha) {
    const { error } = await supabase.from(tabela).update({ excluido_em: null, excluido_por: null }).eq('id', linha.id)
    if (error) return alert('Erro ao restaurar: ' + error.message)
    carregar(); onMudou()
  }

  async function apagarDeVez(tabela, linha, rotulo) {
    const extra = tabela === 'contratos'
      ? '\n\nIsso apaga junto as medições, aditivos, tarefas, comentários e todo o histórico deste contrato.'
      : '\n\nIsso apaga junto as subtarefas, o checklist e os comentários desta tarefa.'
    if (!confirm(`Apagar de vez "${rotulo}"?${extra}\n\nNão há como desfazer.`)) return
    if (!confirm('Confirmando: apagar permanentemente? Esta é a última pergunta.')) return
    const { error } = await supabase.from(tabela).delete().eq('id', linha.id)
    if (error) return alert('Erro ao apagar: ' + error.message)
    carregar(); onMudou()
  }

  const Bloco = ({ titulo, linhas, tabela, rotuloDe, corDe, faseDe }) => (
    <div className="bg-white rounded-xl border border-slate-100 mb-5">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
        <span className="text-[13px] font-bold text-slate-700">{titulo}</span>
        <span className="text-[12px] text-slate-400">{linhas.length}</span>
      </div>
      {linhas.length === 0 && <div className="px-4 py-6 text-[13px] text-slate-400">Nada aqui.</div>}
      {linhas.map((l) => (
        <div key={l.id} className="px-4 py-3 border-b border-slate-50 flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[220px]">
            <div className="text-[13px] font-semibold text-slate-700 line-clamp-1">{rotuloDe(l)}</div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Avatar nome={nome(l.excluido_por)} id={l.excluido_por || 'x'} size={16} />
              excluído por {nome(l.excluido_por)} em {dt(l.excluido_em)}
            </div>
          </div>
          <Pill value={faseDe(l)} color={corDe(l)} />
          <Botao variante="neutro" onClick={() => restaurar(tabela, l)}>Restaurar</Botao>
          {admin && (
            <button onClick={() => apagarDeVez(tabela, l, rotuloDe(l))}
              className="text-[13px] font-semibold text-[#e2445c] hover:underline px-2">Apagar de vez</button>
          )}
        </div>
      ))}
    </div>
  )

  return (
    <div className="p-5">
      <div className="mb-4">
        <h2 className="text-[15px] font-extrabold text-slate-800">Lixeira</h2>
        <p className="text-[12px] text-slate-400">
          O que foi excluído continua aqui com todo o conteúdo. Restaurar devolve para as telas.
          {admin ? ' Apagar de vez é definitivo.' : ' Apagar de vez é só para administrador.'}
        </p>
      </div>
      {carregando ? (
        <div className="text-[13px] text-slate-400">Carregando…</div>
      ) : (
        <>
          <Bloco titulo="Contratos" linhas={contratos} tabela="contratos"
            rotuloDe={(c) => (c.numero ? c.numero + ' · ' : '') + c.objeto}
            faseDe={(c) => c.fase} corDe={(c) => CORES_FASE[c.fase] || '#c3c6d4'} />
          <Bloco titulo="Tarefas" linhas={tarefas} tabela="tarefas"
            rotuloDe={(t) => t.titulo}
            faseDe={(t) => t.status} corDe={(t) => CORES_STATUS[t.status] || '#c3c6d4'} />
        </>
      )}
    </div>
  )
}
