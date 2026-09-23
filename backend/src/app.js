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

// Modulos adicionais (SIGLE, SIGEP, SIFEC)
const leitosRoutes = require('./routes/leitos.routes');
const profissionaisRoutes = require('./routes/profissionais.routes');
const escalasRoutes = require('./routes/escalas.routes');
const filaCirurgiasRoutes = require('./routes/filaCirurgias.routes');

const app = express();

// Middlewares:
//   cors()  -> libera o frontend a fazer requisicoes para essa API
//   express.json() -> permite ler JSON enviado no corpo (body)
//                      das requisicoes POST/PUT
app.use(cors());
app.use(express.json());

// Cada "app.use" abaixo diz: "toda rota que comecar com esse
// prefixo, joga para esse arquivo de rotas resolver".
app.use('/api/medicamentos', medicamentosRoutes);
app.use('/api/lotes', lotesRoutes);
app.use('/api/movimentacoes', movimentacoesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/setores', setoresRoutes);
app.use('/api/relatorios', relatoriosRoutes);
app.use('/api/leitos', leitosRoutes);
app.use('/api/profissionais', profissionaisRoutes);
app.use('/api/escalas', escalasRoutes);
app.use('/api/fila-cirurgias', filaCirurgiasRoutes);

// Rota simples so para confirmar que a API esta no ar.
app.get('/', (req, res) => {
    res.json({ mensagem: 'API do SIGEM esta funcionando.' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor SIGEM rodando em http://localhost:${PORT}`);
});
