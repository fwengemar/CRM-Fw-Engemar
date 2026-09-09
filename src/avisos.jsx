import React, { useEffect, useRef, useState } from 'react'
import { CONCLUIDA, diasAte, dt } from './lib'
import { Botao } from './ui'

const CHAVE = 'fwcrm_avisos_dispensado_em'
const INTERVALO_REPETICAO = 30 * 60 * 1000  // reavisa a cada 30 min com a aba aberta
const SILENCIO = 4 * 60 * 60 * 1000         // fechar a janela silencia por 4 horas

const leu = () => { try { return Number(localStorage.getItem(CHAVE) || 0) } catch { return 0 } }
const gravou = () => { try { localStorage.setItem(CHAVE, String(Date.now())) } catch {} }
const temNotificacao = () => typeof window !== 'undefined' && 'Notification' in window

export function Avisos({ tarefas, contratos, user, onAbrir, onPatch }) {
  // relógio de um minuto: é ele que faz o aviso subir na hora marcada
  const [minuto, setMinuto] = useState(() => new Date().toTimeString().slice(0, 5))
  useEffect(() => {
    const bater = () => setMinuto(new Date().toTimeString().slice(0, 5))
    const id = setInterval(bater, 15 * 1000)
    // ao voltar para a aba, confere na hora em vez de esperar o próximo tique
    document.addEventListener('visibilitychange', bater)
    window.addEventListener('focus', bater)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', bater)
      window.removeEventListener('focus', bater)
    }
  }, [])

  // uma tarefa de hoje com hora marcada só entra no aviso depois que a hora chega
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
  const [permissao, setPermissao] = useState(temNotificacao() ? Notification.permission : 'indisponivel')

  // abre ao entrar e depois do silêncio; e sempre que uma tarefa nova vence,
  // inclusive na hora marcada — senão o horário escolhido não valeria de nada
  // a identidade inclui prazo e hora: mexer na data ou na hora faz a tarefa avisar de novo
  const marca = (t) => `${t.id}|${t.prazo}|${(t.hora_prazo || '').slice(0, 5)}`
  const chaves = pendentes.map(marca).join(',')
  const jaAvisadas = useRef(new Set())
  useEffect(() => {
    const atuais = pendentes.map(marca)
    // quem saiu da lista (concluída, adiada ou com hora ainda por vir) volta a
    // contar como nova quando entrar outra vez — senão o horário não avisaria
    Array.from(jaAvisadas.current).forEach((k) => {
      if (!atuais.includes(k)) jaAvisadas.current.delete(k)
    })
    if (!atuais.length) return
    const novas = atuais.some((k) => !jaAvisadas.current.has(k))
    if (novas || Date.now() - leu() > SILENCIO) setAberto(true)
    atuais.forEach((k) => jaAvisadas.current.add(k))
  }, [chaves])

  // notificação do sistema, repetida enquanto a tarefa não for concluída
  useEffect(() => {
    if (permissao !== 'granted' || !pendentes.length) return
    const disparar = () => pendentes.forEach((t) => {
      try {
        new Notification(diasAte(t.prazo) < 0 ? 'FW CRM · tarefa atrasada' : 'FW CRM · vence hoje', {
          body: t.titulo, tag: 'fwcrm-' + t.id, icon: '/logo.png',
        })
      } catch {}
    })
    disparar()
    const id = setInterval(disparar, INTERVALO_REPETICAO)
    return () => clearInterval(id)
  }, [permissao, chaves])

  async function pedirPermissao() {
    if (!temNotificacao()) return
    try { setPermissao(await Notification.requestPermission()) } catch {}
  }

  function fechar() { gravou(); setAberto(false) }

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
          </span>
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

            <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-100">
              {permissao === 'default' && (
                <button onClick={pedirPermissao} className="text-[13px] font-semibold text-[#0073ea] hover:underline">
                  Ativar avisos na tela do computador
                </button>
              )}
              {permissao === 'granted' && <span className="text-[12px] text-slate-400">Avisos na tela ativados</span>}
              {permissao === 'denied' && <span className="text-[12px] text-slate-400">Avisos bloqueados no navegador</span>}
              <div className="ml-auto"><Botao variante="neutro" onClick={fechar}>Fechar</Botao></div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
