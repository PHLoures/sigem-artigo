// relatorios.controller.js
//
// Gera relatorios filtrados do historico de movimentacoes, para
// a tela de Relatorios do frontend (exportacao em CSV/PDF).
//
// Os filtros sao opcionais: se o usuario nao informar um filtro,
// ele simplesmente nao entra na clausula WHERE.

const pool = require('../database/pool');

// GET /api/relatorios/movimentacoes
// Query params aceitos (todos opcionais):
//   data_inicio=AAAA-MM-DD
//   data_fim=AAAA-MM-DD
//   tipo=ENTRADA | SAIDA
//   medicamento_id=numero
async function movimentacoes(req, res) {
    const { data_inicio, data_fim, tipo, medicamento_id } = req.query;

    // Construimos a clausula WHERE dinamicamente: comecamos com
    // "1 = 1" (uma condicao sempre verdadeira) para poder ir
    // encadeando "AND" sem precisar checar se e o primeiro filtro.
    const condicoes = ['1 = 1'];
    const valores = [];

    if (data_inicio) {
        condicoes.push('mv.data_movimentacao >= ?');
        valores.push(`${data_inicio} 00:00:00`);
    }
    if (data_fim) {
        condicoes.push('mv.data_movimentacao <= ?');
        valores.push(`${data_fim} 23:59:59`);
    }
    if (tipo === 'ENTRADA' || tipo === 'SAIDA') {
        condicoes.push('mv.tipo = ?');
        valores.push(tipo);
    }
    if (medicamento_id) {
        condicoes.push('mv.medicamento_id = ?');
        valores.push(medicamento_id);
    }

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
             WHERE ${condicoes.join(' AND ')}
             ORDER BY mv.data_movimentacao DESC`,
            valores
        );
        res.json(linhas);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao gerar relatorio.' });
    }
}

module.exports = { movimentacoes };
