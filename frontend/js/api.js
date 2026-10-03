// api.js
//
// Funcoes compartilhadas por todas as paginas: onde fica a API,
// como formatar datas, e um "atalho" para chamar fetch() e ja
// tratar erros de forma parecida em todo o sistema.

// Quando o site esta rodando no seu computador (localhost),
// a API tambem esta no seu computador. Quando o site estiver
// publicado na internet, a API esta no Render - por isso a
// troca automatica abaixo.
const API_URL_PRODUCAO = 'https://sigem-artigo.onrender.com/api';

const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3000/api'
    : API_URL_PRODUCAO;

// ---------- Indicador de carregamento ----------
//
// Enquanto ha requisicoes esperando resposta, mostramos uma barrinha
// animada no topo da tela. Se alguma demorar mais de 4 segundos
// (acontece no plano gratis do Render, quando o servidor "dormiu"),
// aparece tambem um aviso explicando - assim a tela nunca parece
// travada sem motivo.

let requisicoesPendentes = 0;
let temporizadorAviso = null;

function garantirIndicadoresDeCarregamento() {
    if (document.getElementById('barra-carregando')) return;

    const barra = document.createElement('div');
    barra.id = 'barra-carregando';

    const aviso = document.createElement('div');
    aviso.id = 'aviso-servidor';
    aviso.textContent = '⏳ Conectando ao servidor... na primeira visita pode levar cerca de 1 minuto.';

    document.body.append(barra, aviso);
}

function iniciarCarregamento() {
    garantirIndicadoresDeCarregamento();
    requisicoesPendentes++;

    if (requisicoesPendentes === 1) {
        document.getElementById('barra-carregando').classList.add('ativa');
        temporizadorAviso = setTimeout(() => {
            document.getElementById('aviso-servidor').classList.add('visivel');
        }, 4000);
    }
}

function finalizarCarregamento() {
    requisicoesPendentes = Math.max(0, requisicoesPendentes - 1);

    if (requisicoesPendentes === 0) {
        clearTimeout(temporizadorAviso);
        document.getElementById('barra-carregando').classList.remove('ativa');
        document.getElementById('aviso-servidor').classList.remove('visivel');
    }
}

// Funcao generica para chamar a API.
// metodo: 'GET', 'POST', 'PUT', 'DELETE'
// corpo: objeto que vira JSON (so usado em POST/PUT)
async function chamarApi(caminho, metodo = 'GET', corpo = null) {
    const opcoes = {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
    };
    if (corpo) {
        opcoes.body = JSON.stringify(corpo);
    }

    // Se ha login, manda o "token" (a prova de que a pessoa entrou).
    // O servidor recusa qualquer chamada sem ele.
    const sessao = obterSessao();
    if (sessao && sessao.token) {
        opcoes.headers['Authorization'] = `Bearer ${sessao.token}`;
    }

    iniciarCarregamento();
    try {
        const resposta = await fetch(`${API_URL}${caminho}`, opcoes);
        const dados = await resposta.json();

        // 401 = login vencido ou invalido: volta para a tela de entrada.
        // (As rotas /auth/ ficam de fora: la 401 significa "senha errada".)
        if (resposta.status === 401 && !caminho.startsWith('/auth/')) {
            localStorage.removeItem('sigem_sessao');
            window.location.href = 'index.html';
            throw new Error(dados.erro || 'Sessao expirada.');
        }

        if (!resposta.ok) {
            // A API sempre devolve { erro: "mensagem" } quando algo
            // da errado - usamos essa mensagem para mostrar ao usuario.
            throw new Error(dados.erro || 'Erro desconhecido.');
        }

        return dados;
    } finally {
        finalizarCarregamento();
    }
}

// Formata uma data ISO (ex: "2026-10-07T03:00:00.000Z") para o
// formato brasileiro (ex: "07/10/2026").
function formatarData(dataIso) {
    const data = new Date(dataIso);
    return data.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

// Formata uma data para o formato que o <input type="date">
// espera (AAAA-MM-DD).
function formatarDataInput(dataIso) {
    return new Date(dataIso).toISOString().split('T')[0];
}
