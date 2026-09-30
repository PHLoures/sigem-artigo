// dashboard.js
//
// Busca o resumo em /api/dashboard e preenche a pagina index.html.

async function carregarDashboard() {
    try {
        const dados = await chamarApi('/dashboard');
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
        const previsao = await chamarApi('/previsao-estoque');
        renderizarPrevisao(previsao);
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
function renderizarPrevisao(lista) {
    const tbody = document.getElementById('tabela-previsao');
    if (lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="tabela-vazia">Nenhum medicamento cadastrado.</td></tr>`;
        return;
    }

    tbody.innerHTML = lista.map(item => {
        const dias = item.dias_ate_esgotar !== null ? Number(item.dias_ate_esgotar) : null;

        let badge;
        if (dias === null) {
            badge = `<span class="badge badge-azul">Sem dados suficientes</span>`;
        } else if (dias <= 7) {
            badge = `<span class="badge badge-vermelho">Esgota em ${dias} dias</span>`;
        } else if (dias <= 30) {
            badge = `<span class="badge badge-amarelo">Esgota em ${dias} dias</span>`;
        } else {
            badge = `<span class="badge badge-verde">Esgota em ${dias} dias</span>`;
        }

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

    new Chart(ctx, {
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

carregarDashboard();
