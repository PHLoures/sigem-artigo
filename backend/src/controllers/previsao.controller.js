// previsao.controller.js
//
// Calcula, para cada medicamento, uma ESTIMATIVA de quantos
// dias faltam ate o estoque acabar, baseado no consumo medio
// (saidas) dos ultimos 30 dias.
//
// A formula e simples de proposito (projeto academico):
//   consumo_medio_diario = total de SAIDAS nos ultimos 30 dias / 30
//   dias_ate_esgotar = estoque_atual / consumo_medio_diario
//
// Se o medicamento nao teve nenhuma saida nos ultimos 30 dias,
// nao da pra calcular uma media de consumo - nesse caso
// devolvemos "null" (o frontend mostra "sem dados suficientes").

const pool = require('../database/pool');

async function previsaoEstoque(req, res) {
    try {
        const resultado = await pool.query(`
            WITH saidas_recentes AS (
                SELECT medicamento_id, SUM(quantidade) AS total_saida
                FROM movimentacoes
                WHERE tipo = 'SAIDA'
                  AND data_movimentacao >= CURRENT_DATE - INTERVAL '30 days'
                GROUP BY medicamento_id
            ),
            estoque_atual AS (
                SELECT medicamento_id, COALESCE(SUM(quantidade), 0) AS estoque
                FROM lotes
                GROUP BY medicamento_id
            )
            SELECT
                m.id,
                m.nome,
                COALESCE(ea.estoque, 0) AS estoque_atual,
                COALESCE(sr.total_saida, 0) AS saida_ultimos_30_dias,
                CASE
                    WHEN COALESCE(sr.total_saida, 0) > 0
                        THEN ROUND(COALESCE(ea.estoque, 0) / (sr.total_saida::numeric / 30), 1)
                    ELSE NULL
                END AS dias_ate_esgotar
            FROM medicamentos m
            LEFT JOIN saidas_recentes sr ON sr.medicamento_id = m.id
            LEFT JOIN estoque_atual ea ON ea.medicamento_id = m.id
            ORDER BY dias_ate_esgotar ASC NULLS LAST, m.nome
        `);
        res.json(resultado.rows);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao calcular previsão de estoque.' });
    }
}

module.exports = { previsaoEstoque };
