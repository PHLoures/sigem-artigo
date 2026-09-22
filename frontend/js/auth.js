// auth.js
//
// Controla a "sessao" de quem esta usando o sistema. Como este
// e um projeto academico sem servidor de autenticacao completo,
// a sessao e guardada no localStorage do navegador (nao existe
// senha real nem verificacao no backend - e um login simples de
// identificacao, nao de seguranca).
//
// localStorage e um "armario" que o navegador mantem para cada
// site, e os dados ficam salvos mesmo se a pagina for recarregada
// (diferente de uma variavel comum, que se perde ao trocar de
// pagina).
//
// Estrutura da sessao salva:
//   { tipo: "convidado", nome: "Maria" }
//
// OBS: esta estrutura foi pensada para no futuro aceitar tambem
// tipo: "google", com nome/email vindos do login do Google, sem
// precisar mudar as paginas que so LEEM a sessao (dashboard,
// medicamentos, etc).

const SIGEM_SESSAO_CHAVE = 'sigem_sessao';

function salvarSessao(sessao) {
    localStorage.setItem(SIGEM_SESSAO_CHAVE, JSON.stringify(sessao));
}

function obterSessao() {
    const dados = localStorage.getItem(SIGEM_SESSAO_CHAVE);
    if (!dados) return null;
    try {
        return JSON.parse(dados);
    } catch {
        return null;
    }
}

function encerrarSessao() {
    localStorage.removeItem(SIGEM_SESSAO_CHAVE);
    window.location.href = 'index.html';
}

// Chamada no TOPO das paginas protegidas (dashboard, medicamentos,
// movimentacoes, relatorios). Se nao houver sessao, manda o
// usuario de volta para a tela de login antes mesmo da pagina
// terminar de carregar.
function exigirLogin() {
    const sessao = obterSessao();
    if (!sessao) {
        window.location.href = 'index.html';
    }
    return sessao;
}

// Preenche o "Ola, Nome" e o botao de Sair no cabecalho das
// paginas protegidas. Espera encontrar um elemento com
// id="usuario-logado" dentro do <nav class="menu">.
function renderizarUsuarioLogado() {
    const sessao = obterSessao();
    if (!sessao) return;

    const container = document.getElementById('usuario-logado');
    if (!container) return;

    container.innerHTML = `
        <span class="usuario-nome">Ola, ${sessao.nome}</span>
        <button type="button" class="btn-sair" id="btn-sair">Sair</button>
    `;

    document.getElementById('btn-sair').addEventListener('click', encerrarSessao);
}

// Executa automaticamente em toda pagina que carrega este
// arquivo (as paginas protegidas incluem <script src="js/auth.js">
// no final do <body>, quando o cabecalho ja existe no HTML).
renderizarUsuarioLogado();
