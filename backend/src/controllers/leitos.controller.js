// leitos.controller.js
//
// Modulo SIGLE - Gestao de Leitos. Controla o cadastro de
// leitos e a mudanca de status (LIVRE / OCUPADO / MANUTENCAO).

const pool = require('../database/pool');

// GET /api/leitos
async function listar(req, res) {
    try {
        const [linhas] = await pool.query(
            'SELECT * FROM leitos ORDER BY setor, numero'
        );
        res.json(linhas);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao buscar leitos.' });
    }
}

// POST /api/leitos
async function criar(req, res) {
    const { numero, setor } = req.body;

    if (!numero || !setor) {
        return res.status(400).json({ erro: 'Preencha numero e setor do leito.' });
    }

    try {
        const [resultado] = await pool.query(
            'INSERT INTO leitos (numero, setor) VALUES (?, ?)',
            [numero, setor]
        );
        const [linhas] = await pool.query('SELECT * FROM leitos WHERE id = ?', [resultado.insertId]);
        res.status(201).json(linhas[0]);
    } catch (erro) {
        console.error(erro);
        if (erro.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ erro: 'Ja existe um leito com esse numero.' });
        }
        res.status(500).json({ erro: 'Erro ao criar leito.' });
    }
}

// PUT /api/leitos/:id
// Atualiza o status do leito (e o nome do paciente, quando
// o leito passa a ficar OCUPADO).
async function atualizarStatus(req, res) {
    const { id } = req.params;
    const { status, paciente_nome } = req.body;

    const statusValidos = ['LIVRE', 'OCUPADO', 'MANUTENCAO'];
    if (!statusValidos.includes(status)) {
        return res.status(400).json({ erro: 'Status invalido.' });
    }

    // Quando o leito fica LIVRE ou entra em MANUTENCAO, nao
    // deve sobrar nome de paciente registrado.
    const nomeParaSalvar = status === 'OCUPADO' ? (paciente_nome || null) : null;

    try {
        const [resultado] = await pool.query(
            'UPDATE leitos SET status = ?, paciente_nome = ? WHERE id = ?',
            [status, nomeParaSalvar, id]
        );
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ erro: 'Leito nao encontrado.' });
        }
        const [linhas] = await pool.query('SELECT * FROM leitos WHERE id = ?', [id]);
        res.json(linhas[0]);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao atualizar leito.' });
    }
}

// DELETE /api/leitos/:id
async function remover(req, res) {
    const { id } = req.params;
    try {
        const [resultado] = await pool.query('DELETE FROM leitos WHERE id = ?', [id]);
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ erro: 'Leito nao encontrado.' });
        }
        res.json({ mensagem: 'Leito removido com sucesso.' });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao remover leito.' });
    }
}

module.exports = { listar, criar, atualizarStatus, remover };
