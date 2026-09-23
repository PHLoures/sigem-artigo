// api.js
//
// Funcoes compartilhadas por todas as paginas: onde fica a API,
// como formatar datas, e um "atalho" para chamar fetch() e ja
// tratar erros de forma parecida em todo o sistema.

// Quando o site esta rodando no seu computador (localhost),
// a API tambem esta no seu computador. Quando o site estiver
// publicado na internet, a API estara em outro endereco (o do
// Railway) - por isso a troca automatica abaixo.
//
// SUBSTITUA a linha abaixo pelo endereco real do seu backend
// depois que ele estiver publicado no Railway (Passo 2 do guia
// de deploy). Exemplo: 'https://sigem-backend.up.railway.app/api'
const API_URL_PRODUCAO = 'https://COLOQUE-AQUI-A-URL-DO-RAILWAY.up.railway.app/api';

const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3000/api'
    : API_URL_PRODUCAO;

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

    const resposta = await fetch(`${API_URL}${caminho}`, opcoes);
    const dados = await resposta.json();

    if (!resposta.ok) {
        // A API sempre devolve { erro: "mensagem" } quando algo
        // da errado - usamos essa mensagem para mostrar ao usuario.
        throw new Error(dados.erro || 'Erro desconhecido.');
    }

    return dados;
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
