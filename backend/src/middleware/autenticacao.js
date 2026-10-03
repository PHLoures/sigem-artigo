// autenticacao.js
//
// "Middlewares" sao funcoes que rodam ANTES da rota de verdade. Aqui:
//   autenticar        -> exige um login valido (senao responde 401)
//   exigirPermissao   -> exige que o perfil possa fazer determinada acao
//                        (senao responde 403)
//
// Assim as regras de quem pode o que valem NO SERVIDOR, e nao so nos
// botoes escondidos da tela.

const crypto = require('crypto');
const pool = require('../database/pool');

// Mesmo quadro de permissoes do frontend (js/auth.js).
const PERMISSOES = {
    farmaceutico: { editar_cadastros: true, entrada: true, saida: true, relatorios: true },
    enfermeiro: { editar_cadastros: false, entrada: false, saida: true, relatorios: false },
    gestor: { editar_cadastros: false, entrada: false, saida: false, relatorios: true },
};

function hashDoToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

async function autenticar(req, res, next) {
    const cabecalho = req.headers.authorization || '';
    const token = cabecalho.startsWith('Bearer ') ? cabecalho.slice(7) : null;
    if (!token) {
        return res.status(401).json({ erro: 'Faça login para continuar.' });
    }

    try {
        const resultado = await pool.query(
            `SELECT nome, perfil, usuario_id FROM sessoes
             WHERE token_hash = $1 AND expira_em > NOW()`,
            [hashDoToken(token)]
        );
        if (resultado.rows.length === 0) {
            return res.status(401).json({ erro: 'Sessão expirada. Entre novamente.' });
        }
        req.usuario = resultado.rows[0];
        next();
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao verificar o login.' });
    }
}

function exigirPermissao(acao) {
    return (req, res, next) => {
        const permissoes = PERMISSOES[req.usuario.perfil] || {};
        if (!permissoes[acao]) {
            return res.status(403).json({ erro: 'Seu perfil não tem permissão para esta ação.' });
        }
        next();
    };
}

// Leitura (GET) e liberada para qualquer logado; alterar (POST/PUT/DELETE)
// exige a permissao informada.
function exigirPermissaoParaAlterar(acao) {
    const checar = exigirPermissao(acao);
    return (req, res, next) => (req.method === 'GET' ? next() : checar(req, res, next));
}

// Movimentacao: ENTRADA e SAIDA tem permissoes diferentes.
function exigirPermissaoDeMovimentacao(req, res, next) {
    if (req.method === 'GET') return next();
    const acao = req.body && req.body.tipo === 'ENTRADA' ? 'entrada' : 'saida';
    return exigirPermissao(acao)(req, res, next);
}

module.exports = {
    PERMISSOES,
    hashDoToken,
    autenticar,
    exigirPermissao,
    exigirPermissaoParaAlterar,
    exigirPermissaoDeMovimentacao,
};
