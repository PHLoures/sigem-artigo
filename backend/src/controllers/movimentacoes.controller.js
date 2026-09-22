// movimentacoes.controller.js
//
// Este e o controller mais importante do sistema: toda vez que
// alguem registra uma ENTRADA ou SAIDA, este arquivo precisa
// fazer DUAS coisas ao mesmo tempo:
//   1) inserir uma linha na tabela movimentacoes (o "historico");
//   2) atualizar a quantidade na tabela lotes (o "estoque atual").
//
// Por que usar uma TRANSACTION (transacao)?
// Se o passo 1 der certo mas o passo 2 falhar (por exemplo,
// o servidor cair no meio do caminho), o banco ficaria com um
// registro de movimentacao que nao bate com o estoque real -
// uma inconsistencia grave num sistema hospitalar.
//
// Uma transacao garante que os dois passos aconteçam JUNTOS:
// ou os dois sao salvos, ou nenhum e salvo (chamamos isso de
// atomicidade). No mysql2, isso e feito com:
//   connection.beginTransaction()
//   connection.commit()
//   connection.rollback()

const pool = require('../database/pool');

// GET /api/movimentacoes
// Lista o historico completo, com nomes em vez de so ids.
async function listar(req, res) {
    try {
        const [linhas] = await pool.query(
            `SELECT
                mv.id,
                mv.tipo,
                mv.quantidade,
                mv.motivo,
                mv.data_movimentacao,
                m.nome AS medicamento_nome,
                l.numero_lote,
                s.nome AS setor_nome
             FROM movimentacoes mv
             JOIN medicamentos m ON m.id = mv.medicamento_id
             JOIN lotes l ON l.id = mv.lote_id
             LEFT JOIN setores s ON s.id = mv.setor_id
             ORDER BY mv.data_movimentacao DESC`
        );
        res.json(linhas);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao buscar movimentacoes.' });
    }
}

// POST /api/movimentacoes
// Registra uma ENTRADA ou SAIDA e atualiza o estoque do lote.
async function criar(req, res) {
    const { medicamento_id, lote_id, setor_id, tipo, quantidade, motivo } = req.body;

    if (!medicamento_id || !lote_id || !tipo || !quantidade) {
        return res.status(400).json({ erro: 'Preencha todos os campos obrigatorios.' });
    }
    if (tipo !== 'ENTRADA' && tipo !== 'SAIDA') {
        return res.status(400).json({ erro: 'Tipo deve ser ENTRADA ou SAIDA.' });
    }
    if (quantidade <= 0) {
        return res.status(400).json({ erro: 'Quantidade deve ser maior que zero.' });
    }

    // Pegamos uma conexao EXCLUSIVA da pool para poder rodar
    // a transacao nela (isso nao funcionaria chamando pool.query
    // varias vezes soltas, porque cada chamada poderia usar uma
    // conexao diferente da pool).
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 1) Verifica a quantidade atual do lote e "trava" a
        //    linha com FOR UPDATE, para evitar que duas
        //    movimentacoes simultaneas leiam o mesmo estoque
        //    "antigo" ao mesmo tempo (condicao de corrida).
        const [loteLinhas] = await connection.query(
            'SELECT quantidade FROM lotes WHERE id = ? FOR UPDATE',
            [lote_id]
        );

        if (loteLinhas.length === 0) {
            await connection.rollback();
            return res.status(404).json({ erro: 'Lote nao encontrado.' });
        }

        const quantidadeAtual = loteLinhas[0].quantidade;

        if (tipo === 'SAIDA' && quantidade > quantidadeAtual) {
            await connection.rollback();
            return res.status(400).json({
                erro: `Estoque insuficiente. Disponivel: ${quantidadeAtual}, solicitado: ${quantidade}.`,
            });
        }

        // 2) Calcula a nova quantidade do lote.
        const novaQuantidade =
            tipo === 'ENTRADA' ? quantidadeAtual + quantidade : quantidadeAtual - quantidade;

        await connection.query(
            'UPDATE lotes SET quantidade = ? WHERE id = ?',
            [novaQuantidade, lote_id]
        );

        // 3) Registra a movimentacao no historico.
        const [insercao] = await connection.query(
            `INSERT INTO movimentacoes
                (medicamento_id, lote_id, setor_id, tipo, quantidade, motivo)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [medicamento_id, lote_id, setor_id || null, tipo, quantidade, motivo || null]
        );

        const [movimentacaoCriada] = await connection.query(
            'SELECT * FROM movimentacoes WHERE id = ?',
            [insercao.insertId]
        );

        // Se chegou ate aqui, os dois passos deram certo:
        // confirma tudo de uma vez.
        await connection.commit();

        res.status(201).json(movimentacaoCriada[0]);
    } catch (erro) {
        await connection.rollback();
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao registrar movimentacao.' });
    } finally {
        // Devolve a conexao para a pool, independente de ter
        // dado certo ou errado.
        connection.release();
    }
}

module.exports = { listar, criar };
