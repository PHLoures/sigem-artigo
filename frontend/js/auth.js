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
//   { tipo: "conta" | "visitante", nome: "Maria", perfil: "enfermeiro", token: "..." }
// O "token" vem do servidor no login e e enviado em toda chamada da API.
//
// OBS: esta estrutura foi pensada para no futuro aceitar tambem
// tipo: "google", com nome/email vindos do login do Google, sem
// precisar mudar as paginas que so LEEM a sessao (dashboard,
// medicamentos, etc).

const SIGEM_SESSAO_CHAVE = 'sigem_sessao';

// ---------- PERFIS DE USUARIO ----------
//
// Cada perfil enxerga e pode fazer coisas diferentes, como num
// hospital de verdade (quem cadastra remedio nao e quem so retira
// da prateleira). Cada permissao e um "sim/nao":
//   editar_cadastros -> cadastrar/editar/excluir medicamentos e lotes
//   entrada          -> registrar ENTRADA de estoque
//   saida            -> registrar SAIDA de estoque
//   relatorios       -> acessar a pagina de relatorios
//
// ATENCAO: assim como o login, isso vale so no NAVEGADOR (esconde
// botoes e telas). Num sistema real, o backend tambem checaria o
// perfil a cada requisicao.
const PERFIS = {
    farmaceutico: {
        rotulo: 'Farmacêutico',
        descricao: 'Acesso completo: cadastra, movimenta estoque e gera relatorios.',
        permissoes: { editar_cadastros: true, entrada: true, saida: true, relatorios: true },
    },
    enfermeiro: {
        rotulo: 'Enfermeiro',
        descricao: 'Consulta o estoque e registra apenas SAIDAS (retirada de medicamentos).',
        permissoes: { editar_cadastros: false, entrada: false, saida: true, relatorios: false },
    },
    gestor: {
        rotulo: 'Gestor',
        descricao: 'Somente leitura: acompanha dashboard e relatorios, sem alterar nada.',
        permissoes: { editar_cadastros: false, entrada: false, saida: false, relatorios: true },
    },
};

// Sessoes antigas (criadas antes dos perfis existirem) nao tem o
// campo "perfil" - tratamos como farmaceutico para nao tirar
// acesso de ninguem.
function perfilAtual() {
    const sessao = obterSessao();
    const chave = sessao && PERFIS[sessao.perfil] ? sessao.perfil : 'farmaceutico';
    return { chave, ...PERFIS[chave] };
}

function podeFazer(acao) {
    return perfilAtual().permissoes[acao] === true;
}

// Mostra uma faixa explicativa no topo da pagina (dentro do <main>)
// quando o perfil tem alguma restricao ali.
function mostrarAvisoPerfil(texto) {
    const main = document.querySelector('main');
    if (!main) return;
    const aviso = document.createElement('div');
    aviso.className = 'aviso-perfil';
    aviso.innerHTML = `${icone('cadeado')}<span><strong>Perfil ${perfilAtual().rotulo}:</strong> ${esc(texto)}</span>`;
    main.prepend(aviso);
}

// Esconde do menu o que o perfil nao pode acessar, e expulsa quem
// abriu a pagina digitando o endereco direto.
function aplicarPermissoesDePagina() {
    if (!podeFazer('relatorios')) {
        document.querySelectorAll('nav.menu a[href="relatorios.html"]').forEach(a => a.remove());
        if (window.location.pathname.endsWith('relatorios.html')) {
            window.location.replace('dashboard.html');
        }
    }
}

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
    // Avisa o servidor para apagar a sessao do banco (se falhar, tudo
    // bem: ela expira sozinha em 7 dias).
    const sessao = obterSessao();
    if (sessao && sessao.token && typeof API_URL !== 'undefined') {
        fetch(`${API_URL}/auth/logout`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${sessao.token}` },
        }).catch(() => {});
    }
    localStorage.removeItem(SIGEM_SESSAO_CHAVE);
    navegarComTransicao('index.html');
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

    const perfil = perfilAtual();
    const iniciais = String(sessao.nome || '?').split(' ').filter(Boolean).slice(0, 2)
        .map(parte => parte[0]).join('').toUpperCase();

    container.innerHTML = `
        <div class="usuario-avatar" aria-hidden="true">${esc(iniciais)}</div>
        <div class="usuario-info">
            <span class="usuario-nome">${esc(sessao.nome)}</span>
            <span class="selo-perfil selo-${perfil.chave}" title="${esc(perfil.descricao)}">${perfil.rotulo}</span>
        </div>
        <button type="button" class="btn-tema" id="btn-tema" aria-label="Mudar tema"></button>
        <button type="button" class="btn-sair" id="btn-sair" title="Sair" aria-label="Sair">${icone('sair')}</button>
    `;

    document.getElementById('btn-sair').addEventListener('click', encerrarSessao);
    document.getElementById('btn-tema').addEventListener('click', alternarTema);

    // tema.js roda ANTES deste arquivo (aplica o tema salvo no
    // <html> assim que a pagina carrega), mas o icone do botao
    // (🌙 ou ☀️) so pode ser atualizado depois que o botao existir
    // no HTML - por isso chamamos de novo aqui.
    atualizarIconeBotaoTema();
}

// Executa automaticamente em toda pagina que carrega este
// arquivo (as paginas protegidas incluem <script src="js/auth.js">
// no final do <body>, quando o cabecalho ja existe no HTML).
renderizarUsuarioLogado();
aplicarPermissoesDePagina();
