import React, { useCallback, useEffect, useRef, useState } from 'react'
import { supabase, dt } from './lib'
import { Avatar } from './ui'

// Comentário que ninguém lê é comentário perdido: quem é citado com @ recebe
// aqui e, com a permissão já dada para os prazos, um balão na tela também.
export function Sino({ user, perfis, onAbrirTarefa, onAbrirContrato }) {
  const [itens, setItens] = useState([])
  const [aberto, setAberto] = useState(false)
  const jaMostradas = useRef(new Set())
  const primeiraCarga = useRef(true)

  const carregar = useCallback(async () => {
    const { data } = await supabase.from('notificacoes').select('*')
      .order('criado_em', { ascending: false }).limit(30)
    setItens(data || [])
  }, [])

  useEffect(() => {
    carregar()
    const canal = supabase.channel('fw-notificacoes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificacoes' }, carregar)
      .subscribe()
    const id = setInterval(carregar, 2 * 60 * 1000)   // rede caiu, volta sozinho
    return () => { supabase.removeChannel(canal); clearInterval(id) }
  }, [carregar])

  // balão do sistema para o que chegou depois que a tela abriu
  useEffect(() => {
    const novas = itens.filter((n) => !n.lida_em && !jaMostradas.current.has(n.id))
    novas.forEach((n) => jaMostradas.current.add(n.id))
    if (primeiraCarga.current) { primeiraCarga.current = false; return }
    if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') return
    novas.forEach((n) => {
      try {
        new Notification('FW CRM · ' + (nomeDe(n.autor_id) || 'alguém') + ' chamou você', {
          body: n.titulo + (n.texto ? ' — ' + n.texto.slice(0, 90) : ''),
          tag: 'fwcrm-mencao-' + n.id, icon: '/logo.png',
        })
      } catch {}
    })
  }, [itens])

  function nomeDe(id) { return perfis.find((p) => p.id === id)?.nome || '' }
  const naoLidas = itens.filter((n) => !n.lida_em)

  async function marcarLidas() {
    if (!naoLidas.length) return
    const agora = new Date().toISOString()
    setItens((ns) => ns.map((n) => (n.lida_em ? n : { ...n, lida_em: agora })))
    await supabase.from('notificacoes').update({ lida_em: agora })
      .is('lida_em', null).eq('perfil_id', user.id)
  }

  function abrir(n) {
    setAberto(false)
    if (n.tarefa_id) onAbrirTarefa({ id: n.tarefa_id })
    else if (n.contrato_id) onAbrirContrato({ id: n.contrato_id })
  }

  return (
    <div className="relative">
      <button onClick={() => { setAberto(!aberto); if (!aberto) marcarLidas() }}
        title="Menções e avisos" className="relative px-2 py-1 text-[18px] leading-none text-slate-400 hover:text-slate-600">
        ◔
        {naoLidas.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
            style={{ background: '#e2445c' }}>{naoLidas.length}</span>
        )}
      </button>

      {aberto && (
        <>
          <div className="fixed inset-0 z-20" onMouseDown={() => setAberto(false)} />
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-100 z-30 max-h-[70vh] overflow-y-auto">
            <div className="px-3 py-2 border-b border-slate-100 text-[12px] font-bold text-slate-500">
              Menções {itens.length > 0 && <span className="font-normal text-slate-400">· últimas {itens.length}</span>}
            </div>
            {itens.length === 0 && (
              <div className="px-3 py-6 text-[13px] text-slate-400 text-center">
                Nada por aqui. Quem escrever @{nomeDe(user.id) || 'seu nome'} num comentário aparece aqui.
              </div>
            )}
            {itens.map((n) => (
              <button key={n.id} onClick={() => abrir(n)}
                className={'w-full text-left px-3 py-2.5 border-b border-slate-50 hover:bg-slate-50 ' + (n.lida_em ? '' : 'bg-[#0073ea]/5')}>
                <div className="flex items-center gap-2">
                  <Avatar nome={nomeDe(n.autor_id)} id={n.autor_id || 'x'} size={20} />
                  <span className="text-[12px] font-semibold text-slate-700 flex-1 line-clamp-1">{n.titulo}</span>
                </div>
                {n.texto && <div className="text-[12px] text-slate-500 mt-1 line-clamp-2">{n.texto}</div>}
                <div className="text-[11px] text-slate-400 mt-0.5">{dt(n.criado_em)}</div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
