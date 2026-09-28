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

function alternarTema() {
    const estaEscuro = document.documentElement.getAttribute('data-tema') === 'escuro';

    if (estaEscuro) {
        document.documentElement.removeAttribute('data-tema');
        localStorage.setItem(SIGEM_TEMA_CHAVE, 'claro');
    } else {
        document.documentElement.setAttribute('data-tema', 'escuro');
        localStorage.setItem(SIGEM_TEMA_CHAVE, 'escuro');
    }

    atualizarIconeBotaoTema();
}

function atualizarIconeBotaoTema() {
    const botao = document.getElementById('btn-tema');
    if (!botao) return;

    const estaEscuro = document.documentElement.getAttribute('data-tema') === 'escuro';
    botao.textContent = estaEscuro ? '☀️' : '🌙';
    botao.title = estaEscuro ? 'Mudar para modo claro' : 'Mudar para modo escuro';
}

aplicarTemaSalvo();
