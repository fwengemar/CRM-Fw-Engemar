import { supabase } from './lib'

// Aviso no celular. O caminho é: registrar o service worker, pedir permissão,
// assinar no serviço de push do próprio navegador (Google, Apple ou Mozilla) e
// guardar essa assinatura no banco. Quem entrega é a função enviar-push.

export const temSuporte = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator &&
  'PushManager' in window && 'Notification' in window

// iPhone só deixa avisar quando o site foi adicionado à tela de início
export const ehIphone = () =>
  typeof navigator !== 'undefined' &&
  /iPad|iPhone|iPod/.test(navigator.userAgent || '') && !window.MSStream

export const instalado = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true)

// no iPhone, sem instalar na tela de início, nem adianta pedir
export const precisaInstalar = () => ehIphone() && !instalado()

function paraUint8(base64url) {
  const b64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4))
    .replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export async function registrarSW() {
  if (!temSuporte()) return null
  try { return await navigator.serviceWorker.register('/sw.js') } catch { return null }
}

const comoChamar = () => {
  const ua = navigator.userAgent || ''
  if (/iPad|iPhone|iPod/.test(ua)) return instalado() ? 'iPhone (app)' : 'iPhone'
  if (/Android/.test(ua)) return 'Android'
  if (/Macintosh/.test(ua)) return 'Mac'
  if (/Windows/.test(ua)) return 'Windows'
  return 'Aparelho'
}

// true = inscrito. Devolve { ok, motivo } para a tela explicar o que faltou.
export async function ligarAvisos(userId) {
  if (!temSuporte()) return { ok: false, motivo: 'Este navegador não entrega avisos.' }
  if (precisaInstalar()) {
    return { ok: false, motivo: 'instalar' }
  }
  const reg = await registrarSW()
  if (!reg) return { ok: false, motivo: 'Não consegui preparar o aviso neste aparelho.' }

  const permissao = await Notification.requestPermission()
  if (permissao !== 'granted') {
    return { ok: false, motivo: 'Você recusou os avisos. Libere nas configurações do navegador para este site.' }
  }

  const { data: config } = await supabase.from('push_config').select('chave_publica').maybeSingle()
  if (!config?.chave_publica) return { ok: false, motivo: 'O servidor ainda não gerou a chave de avisos. Tente de novo em um minuto.' }

  let inscricao = await reg.pushManager.getSubscription()
  if (!inscricao) {
    inscricao = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: paraUint8(config.chave_publica),
    })
  }

  const j = inscricao.toJSON()
  const { error } = await supabase.from('push_inscricoes').upsert({
    perfil_id: userId,
    endpoint: j.endpoint,
    p256dh: j.keys.p256dh,
    auth: j.keys.auth,
    aparelho: comoChamar(),
    usado_em: new Date().toISOString(),
  }, { onConflict: 'endpoint' })
  if (error) return { ok: false, motivo: 'Não consegui guardar a inscrição: ' + error.message }

  return { ok: true }
}

export async function desligarAvisos() {
  if (!temSuporte()) return
  const reg = await navigator.serviceWorker.getRegistration()
  const inscricao = reg && (await reg.pushManager.getSubscription())
  if (!inscricao) return
  await supabase.from('push_inscricoes').delete().eq('endpoint', inscricao.endpoint)
  await inscricao.unsubscribe()
}

export async function estaLigado() {
  if (!temSuporte() || Notification.permission !== 'granted') return false
  const reg = await navigator.serviceWorker.getRegistration()
  if (!reg) return false
  return !!(await reg.pushManager.getSubscription())
}
