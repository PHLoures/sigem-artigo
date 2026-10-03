// sw.js - "service worker" do SIGEM.
//
// E um pequeno programa que o navegador guarda e que permite ao
// site ser INSTALADO como app no celular. Aqui ele faz uma coisa so:
// tenta sempre buscar a versao mais nova na internet (para nunca
// mostrar tela velha) e, se estiver sem internet, mostra a ultima
// copia guardada das paginas e arquivos do proprio site.
//
// Chamadas a API (outro endereco, no Render) NAO sao guardadas:
// estoque precisa ser sempre o dado real.

const CACHE = 'sigem-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (evento) => {
    evento.waitUntil(
        caches.keys()
            .then(nomes => Promise.all(nomes.filter(n => n !== CACHE).map(n => caches.delete(n))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (evento) => {
    const req = evento.request;
    if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

    evento.respondWith(
        fetch(req)
            .then(resposta => {
                const copia = resposta.clone();
                caches.open(CACHE).then(c => c.put(req, copia));
                return resposta;
            })
            .catch(() => caches.match(req))
    );
});
