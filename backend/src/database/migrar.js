// migrar.js
//
// Cria as tabelas de LOGIN (usuarios e sessoes) se elas ainda nao
// existirem. Roda sozinho toda vez que o servidor liga - assim o banco
// do Render ganha as tabelas novas sem precisar rodar SQL na mao.
//
// "IF NOT EXISTS" faz o comando ser seguro de repetir: se a tabela ja
// existe, nada acontece.

const pool = require('./pool');

async function migrar() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS usuarios (
            id SERIAL PRIMARY KEY,
            nome VARCHAR(100) NOT NULL,
            email VARCHAR(150) NOT NULL UNIQUE,
            senha_hash VARCHAR(100) NOT NULL,
            perfil VARCHAR(20) NOT NULL
                CHECK (perfil IN ('farmaceutico', 'enfermeiro', 'gestor')),
            criado_em TIMESTAMP NOT NULL DEFAULT NOW()
        )
    `);

    // Uma linha por "login ativo". Guardamos so o HASH do token, nunca o
    // token em si: se alguem vazar o banco, nao consegue usar as sessoes.
    // usuario_id fica vazio para sessoes de visitante (sem conta).
    await pool.query(`
        CREATE TABLE IF NOT EXISTS sessoes (
            id SERIAL PRIMARY KEY,
            token_hash CHAR(64) NOT NULL UNIQUE,
            usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
            nome VARCHAR(100) NOT NULL,
            perfil VARCHAR(20) NOT NULL,
            criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
            expira_em TIMESTAMP NOT NULL
        )
    `);
}

module.exports = migrar;
