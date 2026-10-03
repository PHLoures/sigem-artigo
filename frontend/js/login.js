// login.js
//
// Controla a tela index.html: entrar, criar conta e entrar como
// visitante. Quem confere e-mail e senha e o SERVIDOR (tabela
// "usuarios" do banco de dados); aqui so enviamos os dados e
// guardamos o "token" que ele devolve.

// Ja esta logado de verdade (com token)? Vai direto ao dashboard.
// Sessao antiga, sem token, nao vale mais: limpa e mostra o login.
const sessaoExistente = obterSessao();
if (sessaoExistente && sessaoExistente.token) {
    window.location.href = 'dashboard.html';
} else if (sessaoExistente) {
    localStorage.removeItem('sigem_sessao');
}

const formEntrar = document.getElementById('form-entrar');
const formCriar = document.getElementById('form-criar');
const abaEntrar = document.getElementById('aba-entrar');
const abaCriar = document.getElementById('aba-criar');

function mostrarAba(aba) {
    const entrar = aba === 'entrar';
    formEntrar.hidden = !entrar;
    formCriar.hidden = entrar;
    abaEntrar.classList.toggle('ativa', entrar);
    abaCriar.classList.toggle('ativa', !entrar);
    document.getElementById('mensagem-login').innerHTML = '';
}

abaEntrar.addEventListener('click', () => mostrarAba('entrar'));
abaCriar.addEventListener('click', () => mostrarAba('criar'));

// "Mostrar senha": troca o campo entre pontinhos e texto
document.querySelectorAll('.mostrar-senha input').forEach((caixa) => {
    caixa.addEventListener('change', () => {
        document.getElementById(caixa.dataset.alvo).type = caixa.checked ? 'text' : 'password';
    });
});

// Guarda o que o servidor devolveu e entra no sistema
function concluirLogin(resposta, tipo) {
    salvarSessao({
        tipo,
        nome: resposta.usuario.nome,
        perfil: resposta.usuario.perfil,
        token: resposta.token,
    });
    navegarComTransicao('dashboard.html');
}

// Desativa o botao enquanto espera o servidor (que pode estar
// "acordando" no plano gratis do Render) para nao enviar duas vezes.
async function comBotaoOcupado(formulario, acao) {
    const botao = formulario.querySelector('button[type="submit"]');
    const textoOriginal = botao.textContent;
    botao.disabled = true;
    botao.textContent = 'Aguarde...';
    try {
        await acao();
    } catch (erro) {
        mostrarMensagemLogin(erro.message);
    } finally {
        botao.disabled = false;
        botao.textContent = textoOriginal;
    }
}

formEntrar.addEventListener('submit', (evento) => {
    evento.preventDefault();
    comBotaoOcupado(formEntrar, async () => {
        const resposta = await chamarApi('/auth/login', 'POST', {
            email: document.getElementById('entrar-email').value,
            senha: document.getElementById('entrar-senha').value,
        });
        concluirLogin(resposta, 'conta');
    });
});

formCriar.addEventListener('submit', (evento) => {
    evento.preventDefault();
    comBotaoOcupado(formCriar, async () => {
        const resposta = await chamarApi('/auth/registrar', 'POST', {
            nome: document.getElementById('criar-nome').value,
            email: document.getElementById('criar-email').value,
            senha: document.getElementById('criar-senha').value,
            perfil: document.getElementById('criar-perfil').value,
        });
        concluirLogin(resposta, 'conta');
    });
});

document.getElementById('btn-visitante').addEventListener('click', async () => {
    try {
        concluirLogin(await chamarApi('/auth/visitante', 'POST', {}), 'visitante');
    } catch (erro) {
        mostrarMensagemLogin(erro.message);
    }
});

function mostrarMensagemLogin(texto) {
    const area = document.getElementById('mensagem-login');
    area.innerHTML = `<div class="mensagem mensagem-erro">${texto}</div>`;
}

// Mostra, abaixo da caixa de escolha, o que cada perfil pode fazer.
const selectPerfil = document.getElementById('criar-perfil');
const descricaoPerfil = document.getElementById('descricao-perfil');

function atualizarDescricaoPerfil() {
    descricaoPerfil.textContent = PERFIS[selectPerfil.value].descricao;
}

selectPerfil.addEventListener('change', atualizarDescricaoPerfil);
atualizarDescricaoPerfil();
