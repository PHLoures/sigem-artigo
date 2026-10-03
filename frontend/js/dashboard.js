// dashboard.js
//
// Busca o resumo em /api/dashboard e preenche a pagina index.html.

let graficoEstoque = null;
let previsaoAtual = [];

async function carregarDashboard() {
    try {
        const dados = await obterDashboard();
        renderizarCards(dados);
        renderizarVencidos(dados.vencidos);
        renderizarProximosVencimento(dados.proximosVencimento);
        renderizarEstoqueBaixo(dados.estoqueBaixo);
        renderizarUltimasMovimentacoes(dados.ultimasMovimentacoes);
        renderizarGraficoEstoque(dados.estoquePorMedicamento);
    } catch (erro) {
        mostrarMensagem(erro.message, 'erro');
    }

    try {
        const previsao = await obterPrevisao();
        previsaoAtual = previsao;
        renderizarPrevisao(previsao);
        atualizarSimulador();
    } catch (erro) {
        mostrarMensagem(erro.message, 'erro');
    }
}

// ---------- PREVISAO DE ESGOTAMENTO ----------
//
// Classifica visualmente cada previsao:
//   sem dados suficientes -> cinza (nao teve saida nos ultimos 30 dias)
//   <= 7 dias  -> vermelho (critico)
//   <= 30 dias -> amarelo (atencao)
//   > 30 dias  -> verde (tranquilo)
function badgePrevisao(dias) {
    if (dias === null) return `<span class="badge badge-azul">Sem dados suficientes</span>`;
    const arredondado = Math.round(dias * 10) / 10;
    if (dias <= 7) return `<span class="badge badge-vermelho">Esgota em ${arredondado} dias</span>`;
    if (dias <= 30) return `<span class="badge badge-amarelo">Esgota em ${arredondado} dias</span>`;
    return `<span class="badge badge-verde">Esgota em ${arredondado} dias</span>`;
}

function renderizarPrevisao(lista) {
    const tbody = document.getElementById('tabela-previsao');
    if (lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="tabela-vazia">Nenhum medicamento cadastrado.</td></tr>`;
        return;
    }

    tbody.innerHTML = lista.map(item => {
        const dias = item.dias_ate_esgotar !== null ? Number(item.dias_ate_esgotar) : null;

        const badge = badgePrevisao(dias);

        return `
            <tr>
                <td data-rotulo="Medicamento">${item.nome}</td>
                <td data-rotulo="Estoque atual">${item.estoque_atual}</td>
                <td data-rotulo="Saida (30 dias)">${item.saida_ultimos_30_dias}</td>
                <td data-rotulo="Previsao">${badge}</td>
            </tr>
        `;
    }).join('');
}

// ---------- GRAFICOS (biblioteca Chart.js) ----------
//
// Chart.js e uma biblioteca so de GRAFICOS (nao e um framework
// de frontend como React/Vue - continua sendo so HTML/CSS/JS
// puro por baixo). Ela desenha o grafico dentro de uma tag
// <canvas>, que e como uma "tela de pintura" do navegador.

function renderizarGraficoEstoque(lista) {
    const ctx = document.getElementById('grafico-estoque');

    if (graficoEstoque) graficoEstoque.destroy();

    graficoEstoque = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: lista.map(item => item.nome),
            datasets: [{
                label: 'Unidades em estoque',
                data: lista.map(item => Number(item.quantidade_total)),
                backgroundColor: '#2f5fe0',
                borderRadius: 6,
            }],
        },
        options: {
            responsive: true,
            animation: { duration: 900, easing: 'easeOutQuart' },
            plugins: {
                legend: { display: false },
            },
            scales: {
                y: { beginAtZero: true },
            },
        },
    });
}

function mostrarMensagem(texto, tipo) {
    const area = document.getElementById('mensagem-area');
    area.innerHTML = `<div class="mensagem mensagem-${tipo}">${texto}</div>`;
}

function renderizarCards(dados) {
    const container = document.getElementById('cards-resumo');

    const qtdVencidos = dados.vencidos.length;
    const qtdProximos = dados.proximosVencimento.length;
    const qtdEstoqueBaixo = dados.estoqueBaixo.length;

    // Cada card e clicavel: os 3 de alerta rolam a pagina at a
    // tabela correspondente (mesma pagina); os 2 primeiros levam
    // para a pagina de Medicamentos, onde a lista completa esta.
    container.innerHTML = `
        <a href="medicamentos.html" class="card card-clicavel">
            <div class="card-titulo">Medicamentos cadastrados</div>
            <div class="card-valor">${dados.totalMedicamentos}</div>
        </a>
        <a href="medicamentos.html" class="card card-clicavel">
            <div class="card-titulo">Unidades em estoque</div>
            <div class="card-valor">${dados.totalEstoque}</div>
        </a>
        <div class="card card-clicavel ${qtdEstoqueBaixo > 0 ? 'alerta-vermelho' : 'alerta-verde'}" onclick="rolarPara('secao-estoque-baixo')">
            <div class="card-titulo">🔴 Estoque baixo</div>
            <div class="card-valor">${qtdEstoqueBaixo}</div>
        </div>
        <div class="card card-clicavel ${qtdProximos > 0 ? 'alerta-amarelo' : 'alerta-verde'}" onclick="rolarPara('secao-vencimento')">
            <div class="card-titulo">🟠 Proximos do vencimento</div>
            <div class="card-valor">${qtdProximos}</div>
        </div>
        <div class="card card-clicavel ${qtdVencidos > 0 ? 'alerta-vermelho' : 'alerta-verde'}" onclick="rolarPara('secao-vencidos')">
            <div class="card-titulo">🔴 Vencidos</div>
            <div class="card-valor">${qtdVencidos}</div>
        </div>
    `;

    animarContadores();
}

// Faz os numeros dos cards "contarem" de 0 ate o valor real, em vez de
// aparecerem prontos. A curva "ease-out" comeca rapido e desacelera
// no final, o que da uma sensacao mais natural.
function animarContadores() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const DURACAO_MS = 800;

    document.querySelectorAll('.card-valor').forEach((elemento) => {
        const valorFinal = Number(elemento.textContent);
        if (!Number.isFinite(valorFinal) || valorFinal === 0) return;

        const inicio = performance.now();

        function passo(agora) {
            const progresso = Math.min((agora - inicio) / DURACAO_MS, 1);
            const suavizado = 1 - Math.pow(1 - progresso, 3); // ease-out cubico
            elemento.textContent = Math.round(valorFinal * suavizado);

            if (progresso < 1) {
                requestAnimationFrame(passo);
            }
        }

        elemento.textContent = '0';
        requestAnimationFrame(passo);
    });
}

// Rola a pagina suavemente até a secao com o id informado, e
// da um destaque visual rapido (classe "destacado") para deixar
// claro pra onde o usuario foi.
function rolarPara(idSecao) {
    const secao = document.getElementById(idSecao);
    if (!secao) return;

    secao.scrollIntoView({ behavior: 'smooth', block: 'start' });

    secao.classList.add('destacado');
    setTimeout(() => secao.classList.remove('destacado'), 1500);
}

function renderizarVencidos(lista) {
    const tbody = document.getElementById('tabela-vencidos');
    if (lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="tabela-vazia">Nenhum medicamento vencido.</td></tr>`;
        return;
    }
    tbody.innerHTML = lista.map(item => `
        <tr>
            <td data-rotulo="Medicamento">${item.medicamento_nome}</td>
            <td data-rotulo="Lote">${item.numero_lote}</td>
            <td data-rotulo="Quantidade">${item.quantidade}</td>
            <td data-rotulo="Validade"><span class="badge badge-vermelho">${formatarData(item.data_validade)}</span></td>
        </tr>
    `).join('');
}

function renderizarProximosVencimento(lista) {
    const tbody = document.getElementById('tabela-vencimento');
    if (lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="tabela-vazia">Nenhum lote proximo do vencimento.</td></tr>`;
        return;
    }
    tbody.innerHTML = lista.map(item => `
        <tr>
            <td data-rotulo="Medicamento">${item.medicamento_nome}</td>
            <td data-rotulo="Lote">${item.numero_lote}</td>
            <td data-rotulo="Quantidade">${item.quantidade}</td>
            <td data-rotulo="Validade"><span class="badge badge-amarelo">${formatarData(item.data_validade)}</span></td>
        </tr>
    `).join('');
}

function renderizarEstoqueBaixo(lista) {
    const tbody = document.getElementById('tabela-estoque-baixo');
    if (lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="tabela-vazia">Nenhum medicamento com estoque baixo.</td></tr>`;
        return;
    }
    tbody.innerHTML = lista.map(item => `
        <tr>
            <td data-rotulo="Medicamento">${item.nome}</td>
            <td data-rotulo="Estoque minimo">${item.estoque_minimo}</td>
            <td data-rotulo="Quantidade atual"><span class="badge badge-vermelho">${item.quantidade_total}</span></td>
        </tr>
    `).join('');
}

function renderizarUltimasMovimentacoes(lista) {
    const tbody = document.getElementById('tabela-ultimas-movimentacoes');
    if (lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="tabela-vazia">Nenhuma movimentacao registrada.</td></tr>`;
        return;
    }
    tbody.innerHTML = lista.map(item => `
        <tr>
            <td data-rotulo="Data">${formatarData(item.data_movimentacao)}</td>
            <td data-rotulo="Medicamento">${item.medicamento_nome}</td>
            <td data-rotulo="Lote">${item.numero_lote}</td>
            <td data-rotulo="Tipo">
                <span class="badge ${item.tipo === 'ENTRADA' ? 'badge-verde' : 'badge-azul'}">${item.tipo}</span>
            </td>
            <td data-rotulo="Quantidade">${item.quantidade}</td>
            <td data-rotulo="Setor">${item.setor_nome || '-'}</td>
        </tr>
    `).join('');
}

// ---------- SIMULADOR "E SE?" ----------
//
// Pega a previsao real (ou a de crise) e recalcula na hora,
// aplicando duas mudancas hipoteticas:
//   consumo   -> multiplica o consumo diario (ex: +50% = x1.5)
//   reposicao -> aumenta o estoque atual (ex: +100% = dobra)
// dias = estoque / consumo diario
const sliderConsumo = document.getElementById('sim-consumo');
const sliderReposicao = document.getElementById('sim-reposicao');

function atualizarSimulador() {
    const consumoPct = Number(sliderConsumo.value);
    const reposicaoPct = Number(sliderReposicao.value);

    document.getElementById('sim-consumo-valor').textContent =
        consumoPct === 0 ? 'sem mudança' : `${consumoPct > 0 ? '+' : ''}${consumoPct}%`;
    document.getElementById('sim-reposicao-valor').textContent =
        reposicaoPct === 0 ? 'nenhuma' : `+${reposicaoPct}% de estoque`;

    const tbody = document.getElementById('tabela-simulador');
    if (previsaoAtual.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="tabela-vazia">Sem dados para simular.</td></tr>`;
        return;
    }

    let criticosHoje = 0;
    let criticosCenario = 0;

    tbody.innerHTML = previsaoAtual.map(item => {
        const consumoMensal = Number(item.saida_ultimos_30_dias);
        const diasHoje = item.dias_ate_esgotar !== null ? Number(item.dias_ate_esgotar) : null;

        let diasCenario = null;
        if (consumoMensal > 0) {
            const consumoDiario = (consumoMensal / 30) * (1 + consumoPct / 100);
            const estoque = Number(item.estoque_atual) * (1 + reposicaoPct / 100);
            diasCenario = consumoDiario > 0 ? estoque / consumoDiario : null;
        }

        if (diasHoje !== null && diasHoje <= 7) criticosHoje++;
        if (diasCenario !== null && diasCenario <= 7) criticosCenario++;

        return `
            <tr>
                <td data-rotulo="Medicamento">${item.nome}</td>
                <td data-rotulo="Hoje">${badgePrevisao(diasHoje)}</td>
                <td data-rotulo="No cenario">${badgePrevisao(diasCenario)}</td>
            </tr>
        `;
    }).join('');

    const resumo = document.getElementById('sim-resumo');
    resumo.textContent = criticosCenario === criticosHoje
        ? `Medicamentos em situação crítica (esgotam em até 7 dias): ${criticosCenario} — igual a hoje.`
        : `Medicamentos em situação crítica (esgotam em até 7 dias): ${criticosCenario} no cenário, contra ${criticosHoje} hoje.`;
    resumo.className = 'sim-resumo ' + (criticosCenario > criticosHoje ? 'sim-pior' : criticosCenario < criticosHoje ? 'sim-melhor' : '');
}

sliderConsumo.addEventListener('input', atualizarSimulador);
sliderReposicao.addEventListener('input', atualizarSimulador);

// ---------- MODO CRISE (botao) ----------
function atualizarVisualCrise() {
    const ativa = criseAtiva();
    document.body.classList.toggle('modo-crise', ativa);
    document.getElementById('bloco-crise').classList.toggle('crise-ativa', ativa);
    document.getElementById('btn-crise').textContent = ativa ? 'Voltar ao normal' : 'Simular crise';
    document.getElementById('crise-titulo').textContent = ativa
        ? '🚨 MODO CRISE ATIVO (simulação)'
        : '🚨 Modo crise';
    document.getElementById('crise-descricao').textContent = ativa
        ? 'Estes números são simulados: estoque a 25% do mínimo e consumo +50%. Nada foi alterado no banco de dados.'
        : 'Simula um hospital em desabastecimento: o estoque despenca e o consumo sobe 50%. Serve para ver como o SIGEM alerta a equipe a tempo.';
}

document.getElementById('btn-crise').addEventListener('click', () => {
    definirCrise(!criseAtiva());
    atualizarVisualCrise();
    carregarDashboard();
});

atualizarVisualCrise();
carregarDashboard();
