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

    container.innerHTML = `
        <div class="card">
            <div class="card-titulo">Medicamentos cadastrados</div>
            <div class="card-valor">${dados.totalMedicamentos}</div>
        </div>
        <div class="card">
            <div class="card-titulo">Unidades em estoque</div>
            <div class="card-valor">${dados.totalEstoque}</div>
        </div>
        <div class="card ${qtdEstoqueBaixo > 0 ? 'alerta-vermelho' : 'alerta-verde'}">
            <div class="card-titulo">🔴 Estoque baixo</div>
            <div class="card-valor">${qtdEstoqueBaixo}</div>
        </div>
        <div class="card ${qtdProximos > 0 ? 'alerta-amarelo' : 'alerta-verde'}">
            <div class="card-titulo">🟠 Proximos do vencimento</div>
            <div class="card-valor">${qtdProximos}</div>
        </div>
        <div class="card ${qtdVencidos > 0 ? 'alerta-vermelho' : 'alerta-verde'}">
            <div class="card-titulo">🔴 Vencidos</div>
            <div class="card-valor">${qtdVencidos}</div>
        </div>
    `;
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
