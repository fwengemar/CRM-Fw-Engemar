// Web Push escrito direto contra a Web Crypto, sem biblioteca de terceiros:
// esta funcao guarda a chave de serviço do banco e a chave privada VAPID, então
// nada aqui vem de um pacote que alguém possa trocar depois.
//
//   - assinatura VAPID (JWT ES256) ................ RFC 8292
//   - payload cifrado em aes128gcm com HKDF ....... RFC 8291
//
// Conferido contra o vetor de teste do Apêndice A da RFC 8291.

const txt = new TextEncoder()

export function paraBase64Url(bytes) {
  let s = ''
  const b = new Uint8Array(bytes)
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i])
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function deBase64Url(s) {
  const p = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)
  const bin = atob(p)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function juntar(...partes) {
  const total = partes.reduce((n, p) => n + p.length, 0)
  const out = new Uint8Array(total)
  let i = 0
  for (const p of partes) { out.set(p, i); i += p.length }
  return out
}

async function hmac(chave, dados) {
  const k = await crypto.subtle.importKey('raw', chave, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, dados))
}

// HKDF em dois passos, como a RFC escreve
async function hkdf(salt, ikm, info, tamanho) {
  const prk = await hmac(salt, ikm)
  const bruto = await hmac(prk, juntar(info, new Uint8Array([1])))
  return bruto.slice(0, tamanho)
}

const jwkPublica = (bytes65) => ({
  kty: 'EC', crv: 'P-256',
  x: paraBase64Url(bytes65.slice(1, 33)),
  y: paraBase64Url(bytes65.slice(33, 65)),
  ext: true,
})

const jwkPrivada = (bytes65, d32) => ({ ...jwkPublica(bytes65), d: paraBase64Url(d32) })

/* ---------------- payload cifrado (RFC 8291) ---------------- */
export async function cifrar(texto, uaPublicaB64, authB64, parDoServidor) {
  const uaPublica = deBase64Url(uaPublicaB64)
  const auth = deBase64Url(authB64)
  if (uaPublica.length !== 65 || uaPublica[0] !== 4) throw new Error('chave p256dh inválida')

  const par = parDoServidor || await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
  const asPublica = new Uint8Array(await crypto.subtle.exportKey('raw', par.publicKey))

  const uaChave = await crypto.subtle.importKey('raw', uaPublica,
    { name: 'ECDH', namedCurve: 'P-256' }, false, [])
  const segredo = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'ECDH', public: uaChave }, par.privateKey, 256))

  const infoChave = juntar(txt.encode('WebPush: info'), new Uint8Array([0]), uaPublica, asPublica)
  const ikm = await hkdf(auth, segredo, infoChave, 32)

  const salt = (parDoServidor && parDoServidor.salt) || crypto.getRandomValues(new Uint8Array(16))
  const cek = await hkdf(salt, ikm, juntar(txt.encode('Content-Encoding: aes128gcm'), new Uint8Array([0])), 16)
  const nonce = await hkdf(salt, ikm, juntar(txt.encode('Content-Encoding: nonce'), new Uint8Array([0])), 12)

  const aes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt'])
  const claro = juntar(txt.encode(texto), new Uint8Array([2]))   // 0x02 fecha o padding
  const cifrado = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce, tagLength: 128 }, aes, claro))

  const rs = new Uint8Array([0, 0, 0x10, 0])                      // 4096
  return juntar(salt, rs, new Uint8Array([65]), asPublica, cifrado)
}

/* ---------------- assinatura VAPID (RFC 8292) ---------------- */
async function jwtVapid(origem, assunto, publicaB64, privadaB64) {
  const cabecalho = paraBase64Url(txt.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const corpo = paraBase64Url(txt.encode(JSON.stringify({
    aud: origem, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: assunto,
  })))
  const chave = await crypto.subtle.importKey('jwk',
    jwkPrivada(deBase64Url(publicaB64), deBase64Url(privadaB64)),
    { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
  const assinatura = new Uint8Array(await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' }, chave, txt.encode(cabecalho + '.' + corpo)))
  return cabecalho + '.' + corpo + '.' + paraBase64Url(assinatura)
}

/* ---------------- envio ---------------- */
// Devolve { ok, status, morta }. 'morta' = o aparelho desinstalou ou limpou o
// site: a inscrição deve ser apagada em vez de tentada de novo para sempre.
export async function enviarPush(inscricao, dados, vapid, ttl = 86400) {
  const corpo = await cifrar(JSON.stringify(dados), inscricao.p256dh, inscricao.auth)
  const origem = new URL(inscricao.endpoint).origin
  const jwt = await jwtVapid(origem, vapid.assunto, vapid.publica, vapid.privada)

  let r
  try {
    r = await fetch(inscricao.endpoint, {
      method: 'POST',
      headers: {
        Authorization: `vapid t=${jwt}, k=${vapid.publica}`,
        'Content-Encoding': 'aes128gcm',
        'Content-Type': 'application/octet-stream',
        TTL: String(ttl),
        Urgency: 'high',
      },
      body: corpo,
    })
  } catch (e) {
    return { ok: false, status: 0, morta: false, erro: String(e) }
  }
  return {
    ok: r.status >= 200 && r.status < 300,
    status: r.status,
    morta: r.status === 404 || r.status === 410,
    erro: r.ok ? null : (await r.text().catch(() => '')).slice(0, 200),
  }
}
