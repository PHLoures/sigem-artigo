const pool = require('../database/pool');

async function listar(req, res) {
    try {
        const resultado = await pool.query('SELECT * FROM setores ORDER BY nome');
        res.json(resultado.rows);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao buscar setores.' });
    }
}

module.exports = { listar };
