import React, { useState, useEffect } from 'react'
import { iniciais, CORES_AVATAR } from './lib'

export function lumText(hex) {
  const c = hex.replace('#', '')
  const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) > 165 ? '#323338' : '#ffffff'
}

export function Pill({ value, color, className = '' }) {
  return (
    <span className={'inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ' + className}
      style={{ background: color, color: lumText(color) }}>
      {value}
    </span>
  )
}

export function SelectPill({ value, options, colors, onChange, full = false }) {
  const color = colors[value] || '#c3c6d4'
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className={'cell-select rounded-md text-xs font-semibold px-2 py-1.5 border-0 outline-none ' + (full ? 'w-full' : '')}
      style={{ background: color, color: lumText(color), minWidth: 118 }}>
      {options.map((o) => <option key={o} value={o} style={{ background: '#fff', color: '#323338' }}>{o}</option>)}
    </select>
  )
}

export function Avatar({ nome, id, size = 28, title }) {
  const idx = id ? (id.charCodeAt(0) + id.charCodeAt(1)) % CORES_AVATAR.length : 0
  return (
    <span title={title || nome} className="inline-flex items-center justify-center rounded-full font-bold text-white shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.38, background: nome ? CORES_AVATAR[idx] : '#c3c6d4' }}>
      {nome ? iniciais(nome) : '?'}
    </span>
  )
}

// digita so numeros e vai formatando: 206218798 -> 2.062.187,98
export function InputMoeda({ value, onChange, className = '', placeholder = '0,00' }) {
  const formata = (n) =>
    n === null || n === undefined || n === ''
      ? ''
      : Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const [texto, setTexto] = useState(formata(value))
  useEffect(() => { setTexto(formata(value)) }, [value])

  function digitar(e) {
    const digitos = e.target.value.replace(/\D/g, '').slice(0, 15)
    if (!digitos) { setTexto(''); onChange(null); return }
    const n = Number(digitos) / 100
    setTexto(formata(n))
    onChange(n)
  }
  return (
    <input inputMode="decimal" value={texto} onChange={digitar} placeholder={placeholder}
      className={className} style={{ textAlign: 'right' }} />
  )
}

export function Campo({ label, children, className = '' }) {
  return (
    <label className={'block ' + className}>
      <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1">{label}</span>
      {children}
    </label>
  )
}

export const inputCls =
  'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#0073ea] focus:ring-2 focus:ring-[#0073ea]/15 bg-white'

export function Modal({ open, onClose, children, largura = 'max-w-3xl' }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 p-4 overflow-y-auto" onMouseDown={onClose}>
      <div className={'w-full ' + largura + ' bg-white rounded-2xl shadow-2xl mt-10 mb-10'} onMouseDown={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

export function Botao({ children, onClick, variante = 'primario', className = '', type = 'button', disabled }) {
  const estilos = {
    primario: 'bg-[#0073ea] text-white hover:bg-[#0060b9]',
    neutro: 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50',
    perigo: 'bg-white text-[#e2445c] border border-[#e2445c]/30 hover:bg-[#e2445c]/5',
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${estilos[variante]} ${className}`}>
      {children}
    </button>
  )
}
