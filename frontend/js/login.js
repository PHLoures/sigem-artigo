// login.js
//
// Controla a tela index.html (login). Se o usuario ja estiver
// logado (sessao salva no localStorage), pula direto para o
// dashboard - nao faz sentido mostrar a tela de login de novo.

const sessaoExistente = obterSessao();
if (sessaoExistente) {
    window.location.href = 'dashboard.html';
}

document.getElementById('form-login').addEventListener('submit', (evento) => {
    evento.preventDefault();

    const nome = document.getElementById('nome-usuario').value.trim();

    if (!nome) {
        mostrarMensagemLogin('Digite seu nome para continuar.');
        return;
    }

    const perfil = document.getElementById('perfil-usuario').value;
    salvarSessao({ tipo: 'convidado', nome, perfil });
    navegarComTransicao('dashboard.html');
});

function mostrarMensagemLogin(texto) {
    const area = document.getElementById('mensagem-login');
    area.innerHTML = `<div class="mensagem mensagem-erro">${texto}</div>`;
}

// Mostra, abaixo da caixa de escolha, o que cada perfil pode fazer.
const selectPerfil = document.getElementById('perfil-usuario');
const descricaoPerfil = document.getElementById('descricao-perfil');

function atualizarDescricaoPerfil() {
    descricaoPerfil.textContent = PERFIS[selectPerfil.value].descricao;
}

selectPerfil.addEventListener('change', atualizarDescricaoPerfil);
atualizarDescricaoPerfil();
