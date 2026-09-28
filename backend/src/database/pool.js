// pool.js
//
// Este arquivo cria uma "pool de conexoes" com o PostgreSQL.
//
// O que e uma pool? Em vez de abrir e fechar uma conexao nova
// com o banco toda vez que uma requisicao chega (o que e lento),
// a pool mantem um grupo de conexoes ja abertas e prontas para
// uso. Quando uma rota precisa consultar o banco, ela "pega
// emprestada" uma conexao da pool, usa, e devolve.

const { Pool } = require('pg');
require('dotenv').config();

// DATABASE_URL e a forma como o Render/Railway costumam fornecer
// as credenciais do banco: uma unica string com tudo dentro
// (usuario, senha, host, porta e nome do banco). Se ela existir,
// usamos ela. Caso contrario (rodando local), usamos as
// variaveis separadas do .env (DB_HOST, DB_USER, etc).
const pool = process.env.DATABASE_URL
    ? new Pool({
          connectionString: process.env.DATABASE_URL,
          // Bancos na nuvem (Render, Railway, etc) exigem conexao
          // criptografada (SSL). "rejectUnauthorized: false" e
          // necessario porque esses servicos usam certificados
          // que o Node nao reconhece automaticamente.
          ssl: { rejectUnauthorized: false },
      })
    : new Pool({
          host: process.env.DB_HOST,
          port: process.env.DB_PORT,
          database: process.env.DB_NAME,
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
      });

module.exports = pool;
