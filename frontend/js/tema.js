// tema.js
//
// Controla o modo claro/escuro do site. A preferencia fica
// salva no localStorage (mesma tecnica usada na sessao de
// login em auth.js), entao o site "lembra" a escolha mesmo
// depois de fechar o navegador.
//
// Como funciona por baixo dos panos: todo o style.css usa
// variaveis de cor (ex: var(--superficie)) em vez de cores
// fixas. Quando adicionamos o atributo data-tema="escuro" na
// tag <html>, uma regra no CSS (html[data-tema="escuro"])
// passa a valer, trocando o VALOR dessas variaveis - o site
// inteiro muda de cor sem precisarmos alterar nenhum outro
// arquivo.

const SIGEM_TEMA_CHAVE = 'sigem_tema';

// Aplica o tema salvo assim que o arquivo carrega - isso roda
// ANTES da pagina aparecer na tela, evitando um "flash" branco
// antes de escurecer.
function aplicarTemaSalvo() {
    const temaSalvo = localStorage.getItem(SIGEM_TEMA_CHAVE);
    if (temaSalvo === 'escuro') {
        document.documentElement.setAttribute('data-tema', 'escuro');
    }
}

let temporizadorTransicaoTema = null;

function alternarTema() {
    const raiz = document.documentElement;
    const estaEscuro = raiz.getAttribute('data-tema') === 'escuro';

    // Liga a classe que faz TODAS as cores mudarem com transicao suave
    // (veja "Troca de tema" no style.css) e desliga depois que acabar.
    raiz.classList.add('tema-trocando');
    clearTimeout(temporizadorTransicaoTema);
    temporizadorTransicaoTema = setTimeout(() => raiz.classList.remove('tema-trocando'), 500);

    if (estaEscuro) {
        document.documentElement.removeAttribute('data-tema');
        localStorage.setItem(SIGEM_TEMA_CHAVE, 'claro');
    } else {
        document.documentElement.setAttribute('data-tema', 'escuro');
        localStorage.setItem(SIGEM_TEMA_CHAVE, 'escuro');
    }

    atualizarIconeBotaoTema(true);

    // avisa os graficos (dashboard.js) para trocarem de cor
    window.dispatchEvent(new CustomEvent('sigem:tema'));
}

function atualizarIconeBotaoTema(animar = false) {
    const botao = document.getElementById('btn-tema');
    if (!botao) return;

    const estaEscuro = document.documentElement.getAttribute('data-tema') === 'escuro';
    botao.innerHTML = icone(estaEscuro ? 'sun' : 'moon');
    botao.title = estaEscuro ? 'Mudar para modo claro' : 'Mudar para modo escuro';

    if (animar) {
        // Remove e recoloca a classe para a animacao poder repetir
        botao.classList.remove('girando');
        void botao.offsetWidth; // forca o navegador a "esquecer" a animacao anterior
        botao.classList.add('girando');
    }
}

aplicarTemaSalvo();
