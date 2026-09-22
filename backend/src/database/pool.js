// pool.js
//
// Este arquivo cria uma "pool de conexoes" com o MySQL.
//
// O que e uma pool? Em vez de abrir e fechar uma conexao nova
// com o banco toda vez que uma requisicao chega (o que e lento),
// a pool mantem um grupo de conexoes ja abertas e prontas para
// uso. Quando uma rota precisa consultar o banco, ela "pega
// emprestada" uma conexao da pool, usa, e devolve.
//
// O pacote "mysql2" ja implementa isso pronto para uso, atraves
// de mysql2/promise (a versao que usa async/await em vez de
// callbacks).

const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    waitForConnections: true,
    connectionLimit: 10,
});

module.exports = pool;
