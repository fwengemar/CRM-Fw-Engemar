import React, { useEffect, useState } from 'react'
import { temSuporte, precisaInstalar, ligarAvisos, desligarAvisos, estaLigado, ehIphone } from './push'

// Linha dentro do menu do perfil: liga e desliga o aviso no celular.
export function AvisosCelular({ user }) {
  const [ligado, setLigado] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [recado, setRecado] = useState(null)
  const [comoInstalar, setComoInstalar] = useState(false)

  useEffect(() => { estaLigado().then(setLigado) }, [])

  if (!temSuporte()) return null

  async function alternar() {
    setOcupado(true); setRecado(null)
    if (ligado) {
      await desligarAvisos()
      setLigado(false)
    } else {
      const r = await ligarAvisos(user.id)
      if (r.ok) setLigado(true)
      else if (r.motivo === 'instalar') setComoInstalar(true)
      else setRecado(r.motivo)
    }
    setOcupado(false)
  }

  return (
    <>
      <button onClick={alternar} disabled={ocupado}
        className="w-full flex items-center gap-2 text-left text-[13px] font-semibold text-slate-600 hover:bg-slate-50 rounded px-2 py-1.5 mb-1 disabled:opacity-60">
        <span className="text-slate-400">{ligado ? '🔔' : '🔕'}</span>
        <span className="flex-1">{ocupado ? 'Um instante…' : ligado ? 'Avisos ligados neste aparelho' : 'Receber avisos neste aparelho'}</span>
        <span className={'w-8 h-[18px] rounded-full relative transition ' + (ligado ? 'bg-[#00c875]' : 'bg-slate-200')}>
          <span className={'absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white transition-all ' + (ligado ? 'left-[16px]' : 'left-[2px]')} />
        </span>
      </button>
      {recado && <p className="text-[11px] text-[#e2445c] px-2 pb-2 leading-snug">{recado}</p>}
      {ligado && (
        <p className="text-[11px] text-slate-400 px-2 pb-2 leading-snug">
          Chega aviso de tarefa com hora marcada, tarefa atribuída a você e resposta nas suas tarefas.
        </p>
      )}
      {comoInstalar && <ComoInstalar onFechar={() => setComoInstalar(false)} />}
    </>
  )
}

// O iPhone só entrega aviso de site quando ele foi para a tela de início.
export function ComoInstalar({ onFechar }) {
  const iphone = ehIphone()
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4" onMouseDown={onFechar}>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-5" onMouseDown={(e) => e.stopPropagation()}>
        <h3 className="text-[15px] font-extrabold text-slate-800 mb-1">Deixar o FW CRM na tela do celular</h3>
        <p className="text-[12px] text-slate-400 mb-4">
          {iphone
            ? 'No iPhone, o aviso só chega depois que o CRM vira um ícone na tela de início. É rápido:'
            : 'Com o CRM na tela de início o aviso chega igual ao de qualquer aplicativo:'}
        </p>
        <ol className="text-[13px] text-slate-600 space-y-2 list-decimal pl-4">
          {iphone ? (
            <>
              <li>Abra o CRM no <b>Safari</b> (não funciona pelo Chrome do iPhone).</li>
              <li>Toque no botão <b>Compartilhar</b>, o quadradinho com a seta para cima.</li>
              <li>Escolha <b>Adicionar à Tela de Início</b> e confirme.</li>
              <li>Abra o CRM por esse ícone novo e ligue os avisos de novo aqui no menu.</li>
            </>
          ) : (
            <>
              <li>Toque nos <b>três pontinhos</b> do Chrome.</li>
              <li>Escolha <b>Instalar aplicativo</b> ou <b>Adicionar à tela inicial</b>.</li>
              <li>Abra o CRM por esse ícone e ligue os avisos aqui no menu.</li>
            </>
          )}
        </ol>
        <button onClick={onFechar}
          className="mt-5 w-full rounded-lg bg-[#0073ea] text-white font-semibold py-2 text-[13px] hover:bg-[#0060b9]">
          Entendi
        </button>
      </div>
    </div>
  )
}
