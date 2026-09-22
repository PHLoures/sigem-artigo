// medicamentos.controller.js
//
// "Controller" e onde fica a LOGICA de cada operacao.
// A rota apenas diz "quando chegar um GET em /api/medicamentos,
// chame essa funcao" - e essa funcao (o controller) que sabe
// o que fazer: falar com o banco e devolver a resposta.
//
// NOTA SOBRE O MYSQL2:
//   pool.query(...) sempre devolve um ARRAY: [linhas, colunas].
//   Por isso desestruturamos so a primeira posicao: [resultado].
//   Os placeholders sao "?" (no PostgreSQL eram $1, $2, $3...).

const pool = require('../database/pool');

// GET /api/medicamentos
// Lista todos os medicamentos cadastrados.
async function listar(req, res) {
    try {
        const [linhas] = await pool.query(
            'SELECT * FROM medicamentos ORDER BY nome'
        );
        res.json(linhas);
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
        const [linhas] = await pool.query(
            'SELECT * FROM medicamentos WHERE id = ?',
            [id]
        );
        if (linhas.length === 0) {
            return res.status(404).json({ erro: 'Medicamento nao encontrado.' });
        }
        res.json(linhas[0]);
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
        // O MySQL nao tem "RETURNING *" como o PostgreSQL. Em vez
        // disso, o resultado do INSERT traz "insertId" (o id que
        // acabou de ser gerado pelo AUTO_INCREMENT), e usamos esse
        // id para buscar a linha completa logo em seguida.
        const [resultado] = await pool.query(
            `INSERT INTO medicamentos
                (nome, principio_ativo, dosagem, forma_farmaceutica, fabricante, estoque_minimo)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [nome, principio_ativo, dosagem, forma_farmaceutica, fabricante, estoque_minimo || 0]
        );

        const [linhas] = await pool.query(
            'SELECT * FROM medicamentos WHERE id = ?',
            [resultado.insertId]
        );

        res.status(201).json(linhas[0]);
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
        const [resultado] = await pool.query(
            `UPDATE medicamentos
             SET nome = ?,
                 principio_ativo = ?,
                 dosagem = ?,
                 forma_farmaceutica = ?,
                 fabricante = ?,
                 estoque_minimo = ?
             WHERE id = ?`,
            [nome, principio_ativo, dosagem, forma_farmaceutica, fabricante, estoque_minimo, id]
        );

        // affectedRows diz quantas linhas o UPDATE alterou.
        // Se for 0, e porque nenhum medicamento tinha esse id.
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ erro: 'Medicamento nao encontrado.' });
        }

        const [linhas] = await pool.query('SELECT * FROM medicamentos WHERE id = ?', [id]);
        res.json(linhas[0]);
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
        const [resultado] = await pool.query(
            'DELETE FROM medicamentos WHERE id = ?',
            [id]
        );
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ erro: 'Medicamento nao encontrado.' });
        }
        res.json({ mensagem: 'Medicamento removido com sucesso.' });
    } catch (erro) {
        console.error(erro);
        // Erro comum: nao da pra excluir um medicamento que tem
        // lotes cadastrados, porque isso quebraria a FOREIGN KEY
        // da tabela lotes. No MySQL, esse erro tem o codigo
        // 'ER_ROW_IS_REFERENCED_2'.
        if (erro.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).json({
                erro: 'Nao e possivel excluir: existem lotes ou movimentacoes vinculados a este medicamento.',
            });
        }
        res.status(500).json({ erro: 'Erro ao remover medicamento.' });
    }
}

module.exports = { listar, buscarPorId, criar, atualizar, remover };
