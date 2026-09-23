// escalas.controller.js
//
// Modulo SIGEP - Escala de Profissionais. Cada linha e um
// turno de trabalho de um profissional em um dia especifico.

const pool = require('../database/pool');

async function listar(req, res) {
    try {
        const [linhas] = await pool.query(`
            SELECT e.*, p.nome AS profissional_nome, p.cargo AS profissional_cargo
            FROM escalas e
            JOIN profissionais p ON p.id = e.profissional_id
            ORDER BY e.data_turno, e.turno
        `);
        res.json(linhas);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao buscar escalas.' });
    }
}

async function criar(req, res) {
    const { profissional_id, data_turno, turno, setor } = req.body;

    if (!profissional_id || !data_turno || !turno || !setor) {
        return res.status(400).json({ erro: 'Preencha todos os campos obrigatorios.' });
    }

    try {
        const [resultado] = await pool.query(
            'INSERT INTO escalas (profissional_id, data_turno, turno, setor) VALUES (?, ?, ?, ?)',
            [profissional_id, data_turno, turno, setor]
        );
        const [linhas] = await pool.query(
            `SELECT e.*, p.nome AS profissional_nome, p.cargo AS profissional_cargo
             FROM escalas e JOIN profissionais p ON p.id = e.profissional_id
             WHERE e.id = ?`,
            [resultado.insertId]
        );
        res.status(201).json(linhas[0]);
    } catch (erro) {
        console.error(erro);
        // Viola a UNIQUE (profissional_id, data_turno, turno):
        // esse profissional ja esta escalado nesse turno/dia.
        if (erro.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ erro: 'Este profissional ja esta escalado nesse turno e data.' });
        }
        res.status(500).json({ erro: 'Erro ao cadastrar escala.' });
    }
}

async function remover(req, res) {
    const { id } = req.params;
    try {
        const [resultado] = await pool.query('DELETE FROM escalas WHERE id = ?', [id]);
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ erro: 'Escala nao encontrada.' });
        }
        res.json({ mensagem: 'Escala removida com sucesso.' });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao remover escala.' });
    }
}

module.exports = { listar, criar, remover };
