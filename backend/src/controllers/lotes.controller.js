// lotes.controller.js
//
// Controla o cadastro de lotes. Cada lote pertence a um
// medicamento (medicamento_id) e tem sua propria quantidade
// e data de validade.

const pool = require('../database/pool');

// GET /api/lotes
// Lista todos os lotes, ja trazendo o nome do medicamento
// junto (por isso o JOIN).
async function listar(req, res) {
    try {
        const resultado = await pool.query(
            `SELECT l.*, m.nome AS medicamento_nome
             FROM lotes l
             JOIN medicamentos m ON m.id = l.medicamento_id
             ORDER BY l.data_validade`
        );
        res.json(resultado.rows);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao buscar lotes.' });
    }
}

// GET /api/lotes/medicamento/:medicamentoId
// Lista apenas os lotes de UM medicamento especifico.
async function listarPorMedicamento(req, res) {
    const { medicamentoId } = req.params;
    try {
        const resultado = await pool.query(
            `SELECT * FROM lotes WHERE medicamento_id = $1 ORDER BY data_validade`,
            [medicamentoId]
        );
        res.json(resultado.rows);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao buscar lotes do medicamento.' });
    }
}

// GET /api/lotes/:id/historico
// Devolve os dados de UM lote e todas as movimentacoes dele, para
// montar a "linha do tempo" (rastreabilidade) na tela.
async function historico(req, res) {
    const { id } = req.params;
    try {
        const loteResultado = await pool.query(
            `SELECT l.*, m.nome AS medicamento_nome
             FROM lotes l
             JOIN medicamentos m ON m.id = l.medicamento_id
             WHERE l.id = $1`,
            [id]
        );
        if (loteResultado.rows.length === 0) {
            return res.status(404).json({ erro: 'Lote não encontrado.' });
        }

        const movimentacoesResultado = await pool.query(
            `SELECT mv.tipo, mv.quantidade, mv.motivo, mv.data_movimentacao,
                    s.nome AS setor_nome
             FROM movimentacoes mv
             LEFT JOIN setores s ON s.id = mv.setor_id
             WHERE mv.lote_id = $1
             ORDER BY mv.data_movimentacao ASC, mv.id ASC`,
            [id]
        );

        res.json({
            lote: loteResultado.rows[0],
            movimentacoes: movimentacoesResultado.rows,
        });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao buscar histórico do lote.' });
    }
}

// POST /api/lotes
// Cria um novo lote.
async function criar(req, res) {
    const { medicamento_id, numero_lote, quantidade, data_validade } = req.body;

    if (!medicamento_id || !numero_lote || quantidade == null || !data_validade) {
        return res.status(400).json({ erro: 'Preencha todos os campos obrigatórios.' });
    }

    try {
        const resultado = await pool.query(
            `INSERT INTO lotes (medicamento_id, numero_lote, quantidade, data_validade)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [medicamento_id, numero_lote, quantidade, data_validade]
        );
        res.status(201).json(resultado.rows[0]);
    } catch (erro) {
        console.error(erro);
        // Erro comum: numero_lote repetido para o mesmo medicamento
        // (viola a UNIQUE (medicamento_id, numero_lote) do schema).
        if (erro.code === '23505') {
            return res.status(409).json({ erro: 'Já existe um lote com esse número para este medicamento.' });
        }
        res.status(500).json({ erro: 'Erro ao criar lote.' });
    }
}

// PUT /api/lotes/:id
async function atualizar(req, res) {
    const { id } = req.params;
    const { numero_lote, quantidade, data_validade } = req.body;

    try {
        const resultado = await pool.query(
            `UPDATE lotes
             SET numero_lote = $1, quantidade = $2, data_validade = $3
             WHERE id = $4
             RETURNING *`,
            [numero_lote, quantidade, data_validade, id]
        );
        if (resultado.rows.length === 0) {
            return res.status(404).json({ erro: 'Lote não encontrado.' });
        }
        res.json(resultado.rows[0]);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao atualizar lote.' });
    }
}

// DELETE /api/lotes/:id
async function remover(req, res) {
    const { id } = req.params;
    try {
        const resultado = await pool.query(
            'DELETE FROM lotes WHERE id = $1 RETURNING *',
            [id]
        );
        if (resultado.rows.length === 0) {
            return res.status(404).json({ erro: 'Lote não encontrado.' });
        }
        res.json({ mensagem: 'Lote removido com sucesso.' });
    } catch (erro) {
        console.error(erro);
        if (erro.code === '23503') {
            return res.status(409).json({ erro: 'Não é possível excluir: existem movimentações vinculadas a este lote.' });
        }
        res.status(500).json({ erro: 'Erro ao remover lote.' });
    }
}

module.exports = { listar, listarPorMedicamento, historico, criar, atualizar, remover };
