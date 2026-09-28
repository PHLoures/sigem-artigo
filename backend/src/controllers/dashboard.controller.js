// dashboard.controller.js
//
// Reune numeros resumidos para a tela inicial: totais,
// alertas de estoque baixo, vencimento proximo e vencidos.

const pool = require('../database/pool');

// Quantos dias antes do vencimento contam como "proximo do
// vencimento". Deixamos como uma constante para ficar facil
// de mudar depois.
const DIAS_ALERTA_VENCIMENTO = 30;

async function resumo(req, res) {
    try {
        // Total de medicamentos cadastrados (tipos diferentes,
        // nao soma de quantidade).
        const totalMedicamentosResultado = await pool.query(
            'SELECT COUNT(*) AS total FROM medicamentos'
        );

        // Soma de todas as quantidades de todos os lotes = total
        // de unidades fisicas em estoque no hospital.
        const totalEstoqueResultado = await pool.query(
            'SELECT COALESCE(SUM(quantidade), 0) AS total FROM lotes'
        );

        // Medicamentos com estoque baixo: soma dos lotes de cada
        // medicamento <= estoque_minimo dele.
        const estoqueBaixoResultado = await pool.query(`
            SELECT m.id, m.nome, m.estoque_minimo,
                   COALESCE(SUM(l.quantidade), 0) AS quantidade_total
            FROM medicamentos m
            LEFT JOIN lotes l ON l.medicamento_id = m.id
            GROUP BY m.id, m.nome, m.estoque_minimo
            HAVING COALESCE(SUM(l.quantidade), 0) <= m.estoque_minimo
            ORDER BY m.nome
        `);

        // Lotes proximos do vencimento (dentro dos proximos X dias,
        // mas ainda nao vencidos). $1::INTEGER * INTERVAL '1 day'
        // multiplica o numero de dias por um intervalo de 1 dia.
        const proximosVencimentoResultado = await pool.query(
            `SELECT l.id, l.numero_lote, l.quantidade, l.data_validade, m.nome AS medicamento_nome
             FROM lotes l
             JOIN medicamentos m ON m.id = l.medicamento_id
             WHERE l.data_validade >= CURRENT_DATE
               AND l.data_validade <= CURRENT_DATE + $1::INTEGER * INTERVAL '1 day'
             ORDER BY l.data_validade`,
            [DIAS_ALERTA_VENCIMENTO]
        );

        // Lotes ja vencidos.
        const vencidosResultado = await pool.query(
            `SELECT l.id, l.numero_lote, l.quantidade, l.data_validade, m.nome AS medicamento_nome
             FROM lotes l
             JOIN medicamentos m ON m.id = l.medicamento_id
             WHERE l.data_validade < CURRENT_DATE
             ORDER BY l.data_validade`
        );

        // Ultimas 10 movimentacoes.
        const ultimasMovimentacoesResultado = await pool.query(
            `SELECT mv.tipo, mv.quantidade, mv.data_movimentacao,
                    m.nome AS medicamento_nome, l.numero_lote, s.nome AS setor_nome
             FROM movimentacoes mv
             JOIN medicamentos m ON m.id = mv.medicamento_id
             JOIN lotes l ON l.id = mv.lote_id
             LEFT JOIN setores s ON s.id = mv.setor_id
             ORDER BY mv.data_movimentacao DESC
             LIMIT 10`
        );

        // ---------- Dados para o GRAFICO do dashboard ----------

        // Quantidade total em estoque de CADA medicamento (todos,
        // nao so os com estoque baixo) - usado no grafico de barras.
        const estoquePorMedicamentoResultado = await pool.query(`
            SELECT m.nome, COALESCE(SUM(l.quantidade), 0) AS quantidade_total
            FROM medicamentos m
            LEFT JOIN lotes l ON l.medicamento_id = m.id
            GROUP BY m.id, m.nome
            ORDER BY m.nome
        `);

        res.json({
            totalMedicamentos: Number(totalMedicamentosResultado.rows[0].total),
            totalEstoque: Number(totalEstoqueResultado.rows[0].total),
            estoqueBaixo: estoqueBaixoResultado.rows,
            proximosVencimento: proximosVencimentoResultado.rows,
            vencidos: vencidosResultado.rows,
            ultimasMovimentacoes: ultimasMovimentacoesResultado.rows,
            estoquePorMedicamento: estoquePorMedicamentoResultado.rows,
        });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao gerar dashboard.' });
    }
}

module.exports = { resumo };
