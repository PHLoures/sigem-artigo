// auth.controller.js
//
// Cadastro, login e logout.
//
// Como a senha e protegida: NUNCA guardamos a senha em si. Guardamos um
// "hash" bcrypt - uma impressao digital irreversivel dela. No login,
// calculamos o hash da senha digitada e comparamos. Mesmo quem ler o
// banco inteiro nao consegue descobrir as senhas.

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const pool = require('../database/pool');
const { hashDoToken } = require('../middleware/autenticacao');

const PERFIS_VALIDOS = ['farmaceutico', 'enfermeiro', 'gestor'];
const DIAS_DE_SESSAO = 7;
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Hash "de mentira" usado quando o e-mail nao existe, para o login
// demorar o mesmo tempo (nao revela quais e-mails estao cadastrados).
const HASH_FALSO = bcrypt.hashSync('senha-falsa-para-igualar-tempo', 10);

// ---------- Limite de tentativas (anti "chute" de senha) ----------
// Guarda em memoria quantas tentativas erradas cada IP+email fez.
const tentativas = new Map();
const MAX_TENTATIVAS = 8;
const JANELA_MS = 15 * 60 * 1000;

function bloqueado(chave) {
    const registro = tentativas.get(chave);
    if (!registro) return false;
    if (Date.now() - registro.inicio > JANELA_MS) {
        tentativas.delete(chave);
        return false;
    }
    return registro.total >= MAX_TENTATIVAS;
}

function registrarFalha(chave) {
    const registro = tentativas.get(chave);
    if (!registro || Date.now() - registro.inicio > JANELA_MS) {
        tentativas.set(chave, { total: 1, inicio: Date.now() });
    } else {
        registro.total++;
    }
}

async function criarSessao({ usuarioId, nome, perfil }) {
    const token = crypto.randomBytes(32).toString('hex');
    await pool.query(
        `INSERT INTO sessoes (token_hash, usuario_id, nome, perfil, expira_em)
         VALUES ($1, $2, $3, $4, NOW() + $5::INTEGER * INTERVAL '1 day')`,
        [hashDoToken(token), usuarioId, nome, perfil, DIAS_DE_SESSAO]
    );
    // Limpeza: aproveita para apagar sessoes ja vencidas.
    pool.query('DELETE FROM sessoes WHERE expira_em < NOW()').catch(() => {});
    return token;
}

// POST /api/auth/registrar
async function registrar(req, res) {
    const nome = String(req.body.nome || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const senha = String(req.body.senha || '');
    const perfil = req.body.perfil;

    if (nome.length < 2 || nome.length > 100) {
        return res.status(400).json({ erro: 'Informe seu nome (2 a 100 letras).' });
    }
    if (!REGEX_EMAIL.test(email) || email.length > 150) {
        return res.status(400).json({ erro: 'Informe um e-mail válido.' });
    }
    if (senha.length < 6 || senha.length > 72) {
        return res.status(400).json({ erro: 'A senha deve ter de 6 a 72 caracteres.' });
    }
    if (!PERFIS_VALIDOS.includes(perfil)) {
        return res.status(400).json({ erro: 'Escolha um perfil válido.' });
    }

    try {
        const senhaHash = await bcrypt.hash(senha, 10);
        const resultado = await pool.query(
            `INSERT INTO usuarios (nome, email, senha_hash, perfil)
             VALUES ($1, $2, $3, $4) RETURNING id, nome, perfil`,
            [nome, email, senhaHash, perfil]
        );
        const usuario = resultado.rows[0];
        const token = await criarSessao({ usuarioId: usuario.id, nome: usuario.nome, perfil: usuario.perfil });
        res.status(201).json({ token, usuario: { nome: usuario.nome, perfil: usuario.perfil } });
    } catch (erro) {
        if (erro.code === '23505') {
            return res.status(409).json({ erro: 'Já existe uma conta com esse e-mail.' });
        }
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao criar a conta.' });
    }
}

// POST /api/auth/login
async function login(req, res) {
    const email = String(req.body.email || '').trim().toLowerCase();
    const senha = String(req.body.senha || '');
    const chave = `${req.ip}|${email}`;

    if (bloqueado(chave)) {
        return res.status(429).json({ erro: 'Muitas tentativas erradas. Aguarde 15 minutos e tente de novo.' });
    }

    try {
        const resultado = await pool.query(
            'SELECT id, nome, perfil, senha_hash FROM usuarios WHERE email = $1',
            [email]
        );
        const usuario = resultado.rows[0];
        const senhaCorreta = await bcrypt.compare(senha, usuario ? usuario.senha_hash : HASH_FALSO);

        if (!usuario || !senhaCorreta) {
            registrarFalha(chave);
            return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });
        }

        tentativas.delete(chave);
        const token = await criarSessao({ usuarioId: usuario.id, nome: usuario.nome, perfil: usuario.perfil });
        res.json({ token, usuario: { nome: usuario.nome, perfil: usuario.perfil } });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao entrar.' });
    }
}

// POST /api/auth/visitante
// Entrada sem conta, SOMENTE LEITURA (perfil gestor), para quem so quer
// conhecer o sistema.
async function visitante(req, res) {
    try {
        const token = await criarSessao({ usuarioId: null, nome: 'Visitante', perfil: 'gestor' });
        res.json({ token, usuario: { nome: 'Visitante', perfil: 'gestor' } });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao entrar como visitante.' });
    }
}

// POST /api/auth/logout  (apaga a sessao no banco)
async function logout(req, res) {
    const cabecalho = req.headers.authorization || '';
    const token = cabecalho.startsWith('Bearer ') ? cabecalho.slice(7) : null;
    try {
        if (token) {
            await pool.query('DELETE FROM sessoes WHERE token_hash = $1', [hashDoToken(token)]);
        }
        res.json({ mensagem: 'Sessão encerrada.' });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao sair.' });
    }
}

module.exports = { registrar, login, visitante, logout };
