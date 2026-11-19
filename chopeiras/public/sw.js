/* Service worker – Chopeiras Gonçalves
 * - Telas (HTML): rede primeiro com limite de tempo (4G fraco) e cópia em cache para uso offline.
 * - Arquivos estáticos do Next: cache primeiro (são versionados).
 * - Supabase e /api: sempre direto na rede (dados e fila offline tratados no app).
 */
const VERSAO = 'v1';
const PAGINAS = 'paginas';
const ESTATICOS = 'estaticos-' + VERSAO;
const BASE = ['/offline', '/manifest.webmanifest', '/icons/icon.svg', '/icons/icon-192.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(ESTATICOS).then((c) => c.addAll(BASE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k.startsWith('estaticos-') && k !== ESTATICOS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function comTempo(promessa, ms) {
  return new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('timeout')), ms);
    promessa.then((r) => { clearTimeout(t); res(r); }, (e) => { clearTimeout(t); rej(e); });
  });
}

async function paginaRedePrimeiro(req) {
  const cache = await caches.open(PAGINAS);
  const rede = fetch(req).then((r) => {
    if (r.ok && r.type === 'basic' && !r.redirected) cache.put(req, r.clone());
    return r;
  });
  try {
    return await comTempo(rede, 6000);
  } catch {
    const salvo = await cache.match(req, { ignoreSearch: false });
    if (salvo) return salvo;
    try { return await rede; } catch {
      return (await caches.match('/offline')) || new Response('Sem conexão', { status: 503 });
    }
  }
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) return;

  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    e.respondWith(
      caches.open(ESTATICOS).then(async (c) => {
        const hit = await c.match(req);
        if (hit) return hit;
        const r = await fetch(req);
        if (r.ok) c.put(req, r.clone());
        return r;
      }),
    );
    return;
  }

  if (req.mode === 'navigate') {
    e.respondWith(paginaRedePrimeiro(req));
  }
});

// O app pede para guardar telas da rota do dia (para abrir sem sinal)
self.addEventListener('message', (e) => {
  if (e.data && e.data.tipo === 'precache' && Array.isArray(e.data.urls)) {
    e.waitUntil(caches.open(PAGINAS).then((c) => Promise.all(e.data.urls.map((u) =>
      fetch(u, { credentials: 'same-origin' }).then((r) => r.ok && !r.redirected && c.put(u, r)).catch(() => {}),
    ))));
  }
  if (e.data && e.data.tipo === 'limpar') {
    e.waitUntil(caches.delete(PAGINAS));
  }
});
