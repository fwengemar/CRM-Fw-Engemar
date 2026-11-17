// Service worker do FW CRM. Faz uma coisa só: receber o aviso do servidor e
// mostrar na tela do aparelho, mesmo com o navegador fechado.
// Não guarda cópia das páginas de propósito — o CRM é ao vivo, e cache velho
// aqui significaria contrato velho na tela.

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('push', (e) => {
  let d = {}
  try { d = e.data ? e.data.json() : {} } catch { d = { titulo: 'FW CRM', corpo: e.data ? e.data.text() : '' } }
  const titulo = d.titulo || 'FW CRM'
  e.waitUntil(self.registration.showNotification(titulo, {
    body: d.corpo || '',
    icon: '/icone-192.png',
    badge: '/icone-192.png',
    tag: d.tag || 'fwcrm',
    renotify: true,
    data: { url: d.url || '/' },
  }))
})

// tocar no aviso: traz a aba que já estiver aberta, senão abre uma
self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const destino = (e.notification.data && e.notification.data.url) || '/'
  e.waitUntil((async () => {
    const abas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const aba of abas) {
      if (new URL(aba.url).origin === self.location.origin) {
        await aba.focus()
        if ('navigate' in aba) { try { await aba.navigate(destino) } catch {} }
        return
      }
    }
    await self.clients.openWindow(destino)
  })())
})
