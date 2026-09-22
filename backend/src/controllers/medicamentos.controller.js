// medicamentos.controller.js
//
// "Controller" e onde fica a LOGICA de cada operacao.
// A rota apenas diz "quando chegar um GET em /api/medicamentos,
// chame essa funcao" - e essa funcao (o controller) que sabe
// o que fazer: falar com o banco e devolver a resposta.

const pool = require('../database/pool');

// GET /api/medicamentos
// Lista todos os medicamentos cadastrados.
async function listar(req, res) {
    try {
        const resultado = await pool.query(
            'SELECT * FROM medicamentos ORDER BY nome'
        );
        res.json(resultado.rows);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao buscar medicamentos.' });
    }
}

// GET /api/medicamentos/:id
// Busca um unico medicamento pelo id.
async function buscarPorId(req, res) {
    const { id } = req.params;
    try {
        const resultado = await pool.query(
            'SELECT * FROM medicamentos WHERE id = $1',
            [id]
        );
        if (resultado.rows.length === 0) {
            return res.status(404).json({ erro: 'Medicamento nao encontrado.' });
        }
        res.json(resultado.rows[0]);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao buscar medicamento.' });
    }
}

// POST /api/medicamentos
// Cria um novo medicamento.
async function criar(req, res) {
    const {
        nome,
        principio_ativo,
        dosagem,
        forma_farmaceutica,
        fabricante,
        estoque_minimo,
    } = req.body;

    if (!nome || !principio_ativo || !dosagem || !forma_farmaceutica || !fabricante) {
        return res.status(400).json({ erro: 'Preencha todos os campos obrigatorios.' });
    }

    try {
        const resultado = await pool.query(
            `INSERT INTO medicamentos
                (nome, principio_ativo, dosagem, forma_farmaceutica, fabricante, estoque_minimo)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [nome, principio_ativo, dosagem, forma_farmaceutica, fabricante, estoque_minimo || 0]
        );
        res.status(201).json(resultado.rows[0]);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao criar medicamento.' });
    }
}

// PUT /api/medicamentos/:id
// Atualiza um medicamento existente.
async function atualizar(req, res) {
    const { id } = req.params;
    const {
        nome,
        principio_ativo,
        dosagem,
        forma_farmaceutica,
        fabricante,
        estoque_minimo,
    } = req.body;

    try {
        const resultado = await pool.query(
            `UPDATE medicamentos
             SET nome = $1,
                 principio_ativo = $2,
                 dosagem = $3,
                 forma_farmaceutica = $4,
                 fabricante = $5,
                 estoque_minimo = $6
             WHERE id = $7
             RETURNING *`,
            [nome, principio_ativo, dosagem, forma_farmaceutica, fabricante, estoque_minimo, id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({ erro: 'Medicamento nao encontrado.' });
        }
        res.json(resultado.rows[0]);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao atualizar medicamento.' });
    }
}

// DELETE /api/medicamentos/:id
// Remove um medicamento.
async function remover(req, res) {
    const { id } = req.params;
    try {
        const resultado = await pool.query(
            'DELETE FROM medicamentos WHERE id = $1 RETURNING *',
            [id]
        );
        if (resultado.rows.length === 0) {
            return res.status(404).json({ erro: 'Medicamento nao encontrado.' });
        }
        res.json({ mensagem: 'Medicamento removido com sucesso.' });
    } catch (erro) {
        console.error(erro);
        // Erro comum: nao da pra excluir um medicamento que tem
        // lotes cadastrados, porque isso quebraria a FOREIGN KEY
        // da tabela lotes. O PostgreSQL bloqueia essa exclusao.
        if (erro.code === '23503') {
            return res.status(409).json({
                erro: 'Nao e possivel excluir: existem lotes ou movimentacoes vinculados a este medicamento.',
            });
        }
        res.status(500).json({ erro: 'Erro ao remover medicamento.' });
    }
}

module.exports = { listar, buscarPorId, criar, atualizar, remover };
