# SIGEM — Sistema de Gestao de Medicamentos Hospitalares

Projeto academico desenvolvido para o trabalho sobre **"A precariedade dos
hospitais no Brasil"**. O sistema simula uma solucao para um dos problemas
citados no tema: falta de controle de medicamentos, estoques baixos,
desperdicios e vencimentos.

## Tecnologias

- **Frontend**: HTML5, CSS3, JavaScript puro (sem frameworks)
- **Backend**: Node.js + Express.js
- **Banco de dados**: MySQL

## Estrutura do projeto

```
sigem-artigo/
├── frontend/           # HTML, CSS e JS puro
│   ├── index.html          (dashboard)
│   ├── medicamentos.html   (cadastro de medicamentos e lotes)
│   ├── movimentacoes.html  (entradas/saidas e historico)
│   ├── css/style.css
│   └── js/
├── backend/             # API REST em Node.js + Express
│   ├── src/
│   │   ├── controllers/     (logica de cada operacao)
│   │   ├── routes/          (enderecos da API)
│   │   ├── database/pool.js (conexao com o MySQL)
│   │   └── app.js           (arquivo principal)
│   ├── package.json
│   └── .env              (NAO vai para o Git — veja .gitignore)
├── database/
│   ├── schema.sql        (cria as tabelas)
│   └── seed.sql           (dados ficticios para teste)
└── README.md
```

## Como rodar o projeto do zero

### 1) Banco de dados (MySQL)

Instale o MySQL (no macOS, com Homebrew):

```bash
brew install mysql
brew services start mysql
```

Crie o banco e rode os scripts:

```bash
mysql -u root -e "CREATE DATABASE sigem CHARACTER SET utf8mb4;"
mysql -u root sigem < database/schema.sql
mysql -u root sigem < database/seed.sql
```

Para conferir se deu certo:

```bash
mysql -u root sigem -e "SHOW TABLES;"
mysql -u root sigem -e "SELECT * FROM medicamentos;"
```

### 2) Backend (API)

```bash
cd backend
npm install
```

Copie o arquivo `.env` de exemplo (ou crie um) com:

```
DB_HOST=localhost
DB_PORT=3306
DB_NAME=sigem
DB_USER=root
DB_PASSWORD=sua_senha
PORT=3000
```

Inicie o servidor:

```bash
node src/app.js
```

A API vai responder em `http://localhost:3000/api`.

### 3) Frontend

O frontend e HTML/CSS/JS puro, entao basta servir a pasta `frontend/` com
qualquer servidor estatico. Exemplo simples com Python:

```bash
cd frontend
python3 -m http.server 5500
```

Depois abra `http://localhost:5500/index.html` no navegador.

> Importante: o backend precisa estar rodando (passo 2) para o frontend
> funcionar, pois ele busca os dados via `fetch()` em `http://localhost:3000/api`.

## Funcionalidades

- Dashboard com totais, alertas de estoque baixo, vencimento proximo e vencidos
- Cadastro, edicao e exclusao de medicamentos
- Cadastro de lotes (quantidade e data de validade) por medicamento
- Registro de entradas e saidas de estoque, com:
  - atualizacao automatica da quantidade do lote
  - bloqueio de saida maior que o estoque disponivel
- Historico completo de movimentacoes

## API REST

| Metodo | Rota | Descricao |
|---|---|---|
| GET | /api/medicamentos | Lista medicamentos |
| GET | /api/medicamentos/:id | Busca um medicamento |
| POST | /api/medicamentos | Cria medicamento |
| PUT | /api/medicamentos/:id | Atualiza medicamento |
| DELETE | /api/medicamentos/:id | Remove medicamento |
| GET | /api/lotes | Lista lotes |
| GET | /api/lotes/medicamento/:id | Lotes de um medicamento |
| POST | /api/lotes | Cria lote |
| GET | /api/movimentacoes | Historico de movimentacoes |
| POST | /api/movimentacoes | Registra entrada/saida |
| GET | /api/setores | Lista setores |
| GET | /api/dashboard | Resumo para o dashboard |
