// pool.js
//
// Este arquivo cria uma "pool de conexoes" com o PostgreSQL.
//
// O que e uma pool? Em vez de abrir e fechar uma conexao nova
// com o banco toda vez que uma requisicao chega (o que e lento),
// a pool mantem um grupo de conexoes ja abertas e prontas para
// uso. Quando uma rota precisa consultar o banco, ela "pega
// emprestada" uma conexao da pool, usa, e devolve.
//
// O pacote "pg" ja implementa isso pronto para uso.

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

module.exports = pool;
