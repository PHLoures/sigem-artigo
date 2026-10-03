// instalar.js
//
// Botao "Instalar app": coloca o SIGEM na tela inicial do celular
// (ou no computador) como se fosse um aplicativo, sem loja de apps.
//
// No Chrome do Android/computador, o navegador avisa quando o site
// pode ser instalado (evento "beforeinstallprompt"); guardamos esse
// aviso e o usamos quando a pessoa clica no botao. No iPhone (Safari)
// esse recurso nao existe, entao mostramos o passo a passo manual.

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(() => { /* sem service worker o site funciona igual, so nao instala */ });
    });
}

let avisoDeInstalacao = null;

window.addEventListener('beforeinstallprompt', (evento) => {
    evento.preventDefault();      // nao deixa o Chrome mostrar o aviso sozinho
    avisoDeInstalacao = evento;   // guarda para usar no clique do botao
});

window.addEventListener('appinstalled', () => {
    avisoDeInstalacao = null;
    document.querySelectorAll('.btn-instalar').forEach(b => b.remove());
});

function jaInstalado() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

async function aoClicarInstalar() {
    if (avisoDeInstalacao) {
        avisoDeInstalacao.prompt();
        await avisoDeInstalacao.userChoice;
        avisoDeInstalacao = null;
        return;
    }

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    alert(ios
        ? 'No iPhone: toque no botao Compartilhar (quadrado com seta) do Safari e escolha "Adicionar a Tela de Inicio".'
        : 'Abra o menu do Chrome (os tres pontinhos no canto) e toque em "Instalar app" ou "Adicionar a tela inicial".');
}

function criarBotaoInstalar(classeExtra) {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = `btn-instalar ${classeExtra}`;
    botao.textContent = '📲 Instalar app';
    botao.addEventListener('click', aoClicarInstalar);
    return botao;
}

if (!jaInstalado()) {
    // Telas internas: botao no cabecalho, ao lado do tema e do Sair
    const usuario = document.getElementById('usuario-logado');
    if (usuario) {
        usuario.insertBefore(criarBotaoInstalar('btn-instalar-topo'), document.getElementById('btn-tema'));
    }

    // Tela de login: botao embaixo do formulario
    const cartaoLogin = document.querySelector('.abertura-card');
    if (cartaoLogin) {
        cartaoLogin.appendChild(criarBotaoInstalar('btn-instalar-login'));
    }
}
