// transicoes.js
//
// Transicao suave entre paginas. Como o site e feito de varias
// paginas HTML separadas, trocar de aba normalmente "pisca" a tela
// em branco. Para suavizar:
//
//   1) ao clicar num link interno, em vez de navegar na hora, esta
//      funcao liga a classe "pagina-saindo" no <html> (o CSS faz o
//      conteudo sumir com um fade) e so depois de ~0.18s troca de
//      pagina;
//   2) a pagina nova, ao carregar, faz a animacao de ENTRADA
//      (definida no style.css), entao a troca parece continua.
//
// O cabecalho nao participa da animacao (so <main> e o rodape), por
// isso o menu parece "fixo" enquanto o conteudo troca.

const TEMPO_SAIDA_MS = 180;

function usuarioPrefereSemAnimacao() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function navegarComTransicao(url) {
    if (usuarioPrefereSemAnimacao()) {
        window.location.href = url;
        return;
    }

    document.documentElement.classList.add('pagina-saindo');
    setTimeout(() => {
        window.location.href = url;
    }, TEMPO_SAIDA_MS);
}

// Um unico "ouvinte" no documento inteiro pega o clique de qualquer
// link, inclusive os criados depois via JavaScript (ex: cards do
// dashboard).
document.addEventListener('click', (evento) => {
    // Deixa passar cliques "especiais" (abrir em nova aba, etc.)
    if (evento.defaultPrevented || evento.button !== 0) return;
    if (evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return;

    const link = evento.target.closest('a[href]');
    if (!link) return;
    if (link.target === '_blank' || link.hasAttribute('download')) return;

    const destino = new URL(link.href, window.location.href);

    // So links do proprio site (nada de sites externos, mailto:, etc.)
    if (destino.origin !== window.location.origin) return;

    // Link para a mesma pagina: deixa o navegador cuidar (ancora, etc.)
    const mesmaPagina = destino.pathname === window.location.pathname
        && destino.search === window.location.search;
    if (mesmaPagina) return;

    evento.preventDefault();
    navegarComTransicao(destino.href);
});

// Se o usuario voltar para esta pagina pelo botao "voltar" do
// navegador, ela pode reaparecer do cache ainda com a classe de
// saida ligada (conteudo invisivel). Aqui garantimos que ela sai.
window.addEventListener('pageshow', () => {
    document.documentElement.classList.remove('pagina-saindo');
});
