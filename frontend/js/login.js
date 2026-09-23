// login.js
//
// Controla a tela index.html (login). Se o usuario ja estiver
// logado (sessao salva no localStorage), pula direto para o
// portal - nao faz sentido mostrar a tela de login de novo.

const sessaoExistente = obterSessao();
if (sessaoExistente) {
    window.location.href = 'portal.html';
}

document.getElementById('form-login').addEventListener('submit', (evento) => {
    evento.preventDefault();

    const nome = document.getElementById('nome-usuario').value.trim();

    if (!nome) {
        mostrarMensagemLogin('Digite seu nome para continuar.');
        return;
    }

    salvarSessao({ tipo: 'convidado', nome });
    window.location.href = 'portal.html';
});

function mostrarMensagemLogin(texto) {
    const area = document.getElementById('mensagem-login');
    area.innerHTML = `<div class="mensagem mensagem-erro">${texto}</div>`;
}
