// profissionais.controller.js
//
// Modulo SIGEP - Escala de Profissionais. Cadastro basico dos
// profissionais de saude (nome, cargo, setor).

const pool = require('../database/pool');

async function listar(req, res) {
    try {
        const [linhas] = await pool.query('SELECT * FROM profissionais ORDER BY nome');
        res.json(linhas);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao buscar profissionais.' });
    }
}

async function criar(req, res) {
    const { nome, cargo, setor } = req.body;

    if (!nome || !cargo || !setor) {
        return res.status(400).json({ erro: 'Preencha nome, cargo e setor.' });
    }

    try {
        const [resultado] = await pool.query(
            'INSERT INTO profissionais (nome, cargo, setor) VALUES (?, ?, ?)',
            [nome, cargo, setor]
        );
        const [linhas] = await pool.query('SELECT * FROM profissionais WHERE id = ?', [resultado.insertId]);
        res.status(201).json(linhas[0]);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao cadastrar profissional.' });
    }
}

async function remover(req, res) {
    const { id } = req.params;
    try {
        const [resultado] = await pool.query('DELETE FROM profissionais WHERE id = ?', [id]);
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ erro: 'Profissional nao encontrado.' });
        }
        res.json({ mensagem: 'Profissional removido com sucesso.' });
    } catch (erro) {
        console.error(erro);
        if (erro.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).json({ erro: 'Nao e possivel excluir: existem escalas vinculadas a este profissional.' });
        }
        res.status(500).json({ erro: 'Erro ao remover profissional.' });
    }
}

module.exports = { listar, criar, remover };
