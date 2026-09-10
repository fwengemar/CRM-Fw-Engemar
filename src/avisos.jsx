import React, { useEffect, useRef, useState } from 'react'
import { CONCLUIDA, diasAte } from './lib'
import { Botao } from './ui'

const INTERVALO_REPETICAO = 30 * 60 * 1000  // reavisa a cada 30 min com a aba aberta
const SILENCIO = 4 * 60 * 60 * 1000         // fechar a janela silencia por 4 horas

// as chaves levam o id do usuario: cada pessoa tem o seu silencio e o seu adiamento,
// senao quem usa o mesmo navegador herda o que o outro fechou
const chaveDispensa = (uid) => `fwcrm_avisos_dispensado_em:${uid}`
const chaveAdiado = (uid) => `fwcrm_avisos_adiado_ate:${uid}`
const ler = (k) => { try { return Number(localStorage.getItem(k) || 0) } catch { return 0 } }
const gravar = (k, v) => { try { localStorage.setItem(k, String(v)) } catch {} }
const temNotificacao = () => typeof window !== 'undefined' && 'Notification' in window

export function Avisos({ tarefas, contratos, user, onAbrir, onPatch }) {
  // relogio: e ele que faz o aviso subir na hora marcada e o adiamento vencer
  const [agora, setAgora] = useState(() => Date.now())
  useEffect(() => {
    const bater = () => setAgora(Date.now())
    const id = setInterval(bater, 15 * 1000)
    // ao voltar para a aba, confere na hora em vez de esperar o proximo tique:
    // o navegador congela os temporizadores de abas em segundo plano
    document.addEventListener('visibilitychange', bater)
    window.addEventListener('focus', bater)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', bater)
      window.removeEventListener('focus', bater)
    }
  }, [])
  const minuto = new Date(agora).toTimeString().slice(0, 5)

  // uma tarefa de hoje com hora marcada so entra no aviso depois que a hora chega
  const chegouAHora = (t) => {
    const d = diasAte(t.prazo)
    if (d < 0) return true
    if (d > 0) return false
    const hora = (t.hora_prazo || '').slice(0, 5)
    return !hora || minuto >= hora
  }

  const pendentes = tarefas
    .filter((t) => t.responsavel_id === user.id && !CONCLUIDA(t) && t.prazo && chegouAHora(t))
    .sort((a, b) => diasAte(a.prazo) - diasAte(b.prazo) || (a.hora_prazo || '').localeCompare(b.hora_prazo || ''))
  const atrasadas = pendentes.filter((t) => diasAte(t.prazo) < 0)
  const paraHoje = pendentes.filter((t) => diasAte(t.prazo) === 0)

  const [aberto, setAberto] = useState(false)
  const [adiadoAte, setAdiadoAte] = useState(0)
  const [permissao, setPermissao] = useState(temNotificacao() ? Notification.permission : 'indisponivel')

  // trocou de usuario no mesmo navegador: recomeca do zero
  const jaAvisadas = useRef(new Set())
  useEffect(() => {
    jaAvisadas.current = new Set()
    setAberto(false)
    setAdiadoAte(ler(chaveAdiado(user.id)))
  }, [user.id])

  // a identidade inclui prazo e hora: mexer na data ou na hora faz a tarefa avisar de novo
  const marca = (t) => `${t.id}|${t.prazo}|${(t.hora_prazo || '').slice(0, 5)}`
  const chaves = pendentes.map(marca).join(',')
  const adiado = agora < adiadoAte

  useEffect(() => {
    const atuais = pendentes.map(marca)
    // quem saiu da lista (concluida, adiada ou com hora ainda por vir) volta a
    // contar como nova quando entrar outra vez — senao o horario nao avisaria
    Array.from(jaAvisadas.current).forEach((k) => {
      if (!atuais.includes(k)) jaAvisadas.current.delete(k)
    })
    if (!atuais.length || adiado) return
    const novas = atuais.some((k) => !jaAvisadas.current.has(k))
    if (novas || Date.now() - ler(chaveDispensa(user.id)) > SILENCIO) {
      setAberto(true)
      atuais.forEach((k) => jaAvisadas.current.add(k))
    }
  }, [chaves, agora, adiado, user.id])

  // notificacao do sistema, repetida enquanto a tarefa nao for concluida
  useEffect(() => {
    if (permissao !== 'granted' || !pendentes.length || adiado) return
    const disparar = () => pendentes.forEach((t) => {
      try {
        new Notification(diasAte(t.prazo) < 0 ? 'FW CRM · tarefa atrasada' : 'FW CRM · vence hoje', {
          body: t.titulo, tag: 'fwcrm-' + t.id, renotify: true, icon: '/logo.png',
        })
      } catch {}
    })
    disparar()
    const id = setInterval(disparar, INTERVALO_REPETICAO)
    return () => clearInterval(id)
  }, [permissao, chaves, adiado])

  async function pedirPermissao() {
    if (!temNotificacao()) return
    try { setPermissao(await Notification.requestPermission()) } catch {}
  }

  function fechar() { gravar(chaveDispensa(user.id), Date.now()); setAberto(false) }

  function adiar(minutos) {
    const ate = Date.now() + minutos * 60 * 1000
    gravar(chaveAdiado(user.id), ate)
    setAdiadoAte(ate)
    setAberto(false)
  }

  const nomeContrato = (id) => {
    const c = contratos.find((x) => x.id === id)
    return c ? (c.numero || c.objeto.slice(0, 40)) : null
  }

  const Linha = ({ t }) => {
    const d = diasAte(t.prazo)
    const contrato = nomeContrato(t.contrato_id)
    return (
      <div className="flex items-center gap-3 py-2 border-t border-slate-100">
        <input type="checkbox" title="Marcar como concluída" className="w-4 h-4 accent-[#00c875] cursor-pointer shrink-0"
          onChange={() => onPatch(t.id, { status: 'Concluído' })} />
        <button onClick={() => { fechar(); onAbrir(t) }} className="flex-1 min-w-0 text-left">
          <div className="text-[13px] font-semibold text-slate-700 line-clamp-1">{t.titulo}</div>
          {contrato && <div className="text-[11px] text-slate-400">{contrato}</div>}
        </button>
        <span className="text-[11px] font-semibold whitespace-nowrap" style={{ color: d < 0 ? '#e2445c' : '#fdab3d' }}>
          {d < 0 ? `${Math.abs(d)} dia${Math.abs(d) > 1 ? 's' : ''} de atraso` : 'hoje'}
          {(t.hora_prazo || '') && ` · ${(t.hora_prazo || '').slice(0, 5)}`}
        </span>
      </div>
    )
  }

  const faltamParaVoltar = Math.max(1, Math.round((adiadoAte - agora) / 60000))

  return (
    <>
      {pendentes.length > 0 && (
        <div className="nao-imprimir flex items-center gap-3 px-5 py-2 text-[13px]"
          style={{ background: atrasadas.length ? '#e2445c14' : '#fdab3d14', borderBottom: '1px solid #e6e9ef' }}>
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: atrasadas.length ? '#e2445c' : '#fdab3d' }} />
          <span className="text-slate-600">
            {atrasadas.length > 0 && <b style={{ color: '#e2445c' }}>{atrasadas.length} atrasada{atrasadas.length > 1 ? 's' : ''}</b>}
            {atrasadas.length > 0 && paraHoje.length > 0 && ' · '}
            {paraHoje.length > 0 && <b style={{ color: '#a16207' }}>{paraHoje.length} vence{paraHoje.length > 1 ? 'm' : ''} hoje</b>}
            {adiado && <span className="text-slate-400"> · adiado por {faltamParaVoltar} min</span>}
          </span>
          {permissao === 'default' && (
            <button onClick={pedirPermissao}
              className="rounded-lg border border-[#0073ea] text-[#0073ea] font-semibold px-2.5 py-1 text-[12px] hover:bg-[#0073ea] hover:text-white">
              Ativar avisos na tela do computador
            </button>
          )}
          <button onClick={() => setAberto(true)} className="ml-auto font-semibold text-[#0073ea] hover:underline">ver</button>
        </div>
      )}

      {aberto && pendentes.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onMouseDown={fechar}>
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6" onMouseDown={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-1">
                <h2 className="text-lg font-extrabold text-slate-800">
                  {pendentes.length === 1 ? 'Você tem 1 tarefa pendente' : `Você tem ${pendentes.length} tarefas pendentes`}
                </h2>
                <p className="text-[12px] text-slate-400">Marque no quadrinho para concluir, ou clique para abrir a tarefa.</p>
              </div>
              <button onClick={fechar} className="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
            </div>

            <div className="max-h-[45vh] overflow-y-auto">
              {atrasadas.length > 0 && (
                <>
                  <div className="text-[11px] uppercase font-bold text-[#e2445c] mt-2">Atrasadas</div>
                  {atrasadas.map((t) => <Linha key={t.id} t={t} />)}
                </>
              )}
              {paraHoje.length > 0 && (
                <>
                  <div className="text-[11px] uppercase font-bold text-[#a16207] mt-4">Vencem hoje</div>
                  {paraHoje.map((t) => <Linha key={t.id} t={t} />)}
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-5 pt-4 border-t border-slate-100">
              <span className="text-[12px] text-slate-400">Lembrar de novo em</span>
              <button onClick={() => adiar(5)} className="rounded-lg border border-slate-200 px-2.5 py-1 text-[12px] font-semibold text-slate-600 hover:bg-slate-50">5 min</button>
              <button onClick={() => adiar(10)} className="rounded-lg border border-slate-200 px-2.5 py-1 text-[12px] font-semibold text-slate-600 hover:bg-slate-50">10 min</button>
              <div className="ml-auto"><Botao variante="neutro" onClick={fechar}>Fechar</Botao></div>
            </div>

            <div className="mt-3 text-[12px]">
              {permissao === 'default' && (
                <button onClick={pedirPermissao} className="font-semibold text-[#0073ea] hover:underline">
                  Ativar avisos na tela do computador
                </button>
              )}
              {permissao === 'granted' && <span className="text-slate-400">Avisos na tela ativados neste computador</span>}
              {permissao === 'denied' && <span className="text-slate-400">Avisos bloqueados no navegador — libere no cadeado da barra de endereço</span>}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
