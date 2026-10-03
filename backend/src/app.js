// app.js
//
// Este e o arquivo principal do backend. Ele:
//   1) Cria o servidor Express;
//   2) Liga os "middlewares" (funcoes que rodam antes das rotas);
//   3) Liga as rotas de cada parte do sistema (medicamentos,
//      lotes, movimentacoes, dashboard);
//   4) Inicia o servidor numa porta.

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const medicamentosRoutes = require('./routes/medicamentos.routes');
const lotesRoutes = require('./routes/lotes.routes');
const movimentacoesRoutes = require('./routes/movimentacoes.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const setoresRoutes = require('./routes/setores.routes');
const relatoriosRoutes = require('./routes/relatorios.routes');
const previsaoRoutes = require('./routes/previsao.routes');
const authRoutes = require('./routes/auth.routes');
const migrar = require('./database/migrar');
const {
    autenticar,
    exigirPermissao,
    exigirPermissaoParaAlterar,
    exigirPermissaoDeMovimentacao,
} = require('./middleware/autenticacao');

const app = express();

// Middlewares:
//   cors()  -> libera o frontend a fazer requisicoes para essa API
//   express.json() -> permite ler JSON enviado no corpo (body)
//                      das requisicoes POST/PUT
// Atras do Render ha um proxy: sem isto, todo mundo pareceria ter o mesmo IP.
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json());

// Cada "app.use" abaixo diz: "toda rota que comecar com esse
// prefixo, joga para esse arquivo de rotas resolver".
// Login e cadastro sao as unicas rotas abertas. Todas as outras
// passam primeiro por "autenticar" (exige login) e depois pela
// checagem de permissao do perfil.
app.use('/api/auth', authRoutes);
app.use('/api/medicamentos', autenticar, exigirPermissaoParaAlterar('editar_cadastros'), medicamentosRoutes);
app.use('/api/lotes', autenticar, exigirPermissaoParaAlterar('editar_cadastros'), lotesRoutes);
app.use('/api/movimentacoes', autenticar, exigirPermissaoDeMovimentacao, movimentacoesRoutes);
app.use('/api/dashboard', autenticar, dashboardRoutes);
app.use('/api/setores', autenticar, setoresRoutes);
app.use('/api/relatorios', autenticar, exigirPermissao('relatorios'), relatoriosRoutes);
app.use('/api/previsao-estoque', autenticar, previsaoRoutes);

// Rota simples so para confirmar que a API esta no ar.
app.get('/', (req, res) => {
    res.json({ mensagem: 'API do SIGEM esta funcionando.' });
});

const PORT = process.env.PORT || 3000;

// Cria as tabelas de login (se faltarem) e so depois liga o servidor.
migrar()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Servidor SIGEM rodando em http://localhost:${PORT}`);
        });
    })
    .catch((erro) => {
        console.error('Falha ao preparar o banco de dados:', erro);
        process.exit(1);
    });
