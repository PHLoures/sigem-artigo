// filaCirurgias.controller.js
//
// Modulo SIFEC - Fila de Espera para Cirurgias.

const pool = require('../database/pool');

// Ordena por prioridade clinica primeiro (URGENTE no topo),
// depois por quem entrou na fila ha mais tempo.
//
// FIELD() e uma funcao do MySQL que devolve a POSICAO de um
// valor dentro de uma lista - aqui usamos ela como um "ranking
// manual": URGENTE = posicao 1, ALTA = posicao 2, etc. Isso
// permite ordenar por prioridade clinica em vez de ordem
// alfabetica (que colocaria "ALTA" antes de "URGENTE", errado).
const ORDENACAO_PRIORIDADE = `
    ORDER BY FIELD(prioridade, 'URGENTE', 'ALTA', 'MEDIA', 'BAIXA'), data_entrada ASC
`;

async function listar(req, res) {
    try {
        const [linhas] = await pool.query(
            `SELECT * FROM fila_cirurgias ${ORDENACAO_PRIORIDADE}`
        );
        res.json(linhas);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao buscar fila de cirurgias.' });
    }
}

async function criar(req, res) {
    const { nome_paciente, procedimento, prioridade } = req.body;

    if (!nome_paciente || !procedimento) {
        return res.status(400).json({ erro: 'Preencha nome do paciente e procedimento.' });
    }

    try {
        const [resultado] = await pool.query(
            'INSERT INTO fila_cirurgias (nome_paciente, procedimento, prioridade) VALUES (?, ?, ?)',
            [nome_paciente, procedimento, prioridade || 'MEDIA']
        );
        const [linhas] = await pool.query('SELECT * FROM fila_cirurgias WHERE id = ?', [resultado.insertId]);
        res.status(201).json(linhas[0]);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao adicionar paciente na fila.' });
    }
}

// PUT /api/fila-cirurgias/:id
// Atualiza o status (AGUARDANDO -> AGENDADA -> REALIZADA).
async function atualizarStatus(req, res) {
    const { id } = req.params;
    const { status } = req.body;

    const statusValidos = ['AGUARDANDO', 'AGENDADA', 'REALIZADA'];
    if (!statusValidos.includes(status)) {
        return res.status(400).json({ erro: 'Status invalido.' });
    }

    try {
        const [resultado] = await pool.query(
            'UPDATE fila_cirurgias SET status = ? WHERE id = ?',
            [status, id]
        );
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ erro: 'Registro nao encontrado na fila.' });
        }
        const [linhas] = await pool.query('SELECT * FROM fila_cirurgias WHERE id = ?', [id]);
        res.json(linhas[0]);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao atualizar status.' });
    }
}

async function remover(req, res) {
    const { id } = req.params;
    try {
        const [resultado] = await pool.query('DELETE FROM fila_cirurgias WHERE id = ?', [id]);
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ erro: 'Registro nao encontrado na fila.' });
        }
        res.json({ mensagem: 'Removido da fila com sucesso.' });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao remover da fila.' });
    }
}

module.exports = { listar, criar, atualizarStatus, remover };
