// dashboard.js
//
// Busca o resumo em /api/dashboard e preenche a pagina index.html.

let graficoEstoque = null;
let graficoSituacao = null;
let previsaoAtual = [];
let ultimosDados = null;   // guardado para redesenhar os graficos ao trocar de tema

async function carregarDashboard() {
    try {
        const dados = await obterDashboard();
        ultimosDados = dados;
        renderizarHero(dados);
        renderizarCards(dados);
        renderizarVencidos(dados.vencidos);
        renderizarProximosVencimento(dados.proximosVencimento);
        renderizarEstoqueBaixo(dados.estoqueBaixo);
        renderizarUltimasMovimentacoes(dados.ultimasMovimentacoes);
        renderizarGraficos(dados);
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
                <td data-rotulo="Medicamento">${esc(item.nome)}</td>
                <td data-rotulo="Estoque atual">${item.estoque_atual}</td>
                <td data-rotulo="Saída (30 dias)">${item.saida_ultimos_30_dias}</td>
                <td data-rotulo="Previsão">${badge}</td>
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

// Le as cores atuais do site (que mudam no modo escuro) para o grafico
// combinar com o resto da tela.
function coresDoTema() {
    const css = getComputedStyle(document.documentElement);
    const ler = (nome) => css.getPropertyValue(nome).trim();
    return {
        texto: ler('--cinza'),
        grade: ler('--cinza-borda'),
        superficie: ler('--superficie'),
        destaque: ler('--texto-destaque'),
        azul: ler('--azul'),
        azul2: ler('--azul-2'),
        verde: ler('--verde'),
        vermelho: ler('--vermelho'),
    };
}

// Faz uma barra com degrade (mais forte embaixo, mais claro no topo).
function degrade(ctx, area, corTopo, corBase) {
    const grad = ctx.createLinearGradient(0, area.bottom, 0, area.top);
    grad.addColorStop(0, corBase);
    grad.addColorStop(1, corTopo);
    return grad;
}

function renderizarGraficos(dados) {
    if (typeof Chart === 'undefined') return;   // biblioteca nao carregou: o resto da pagina segue normal
    const cor = coresDoTema();

    Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
    Chart.defaults.color = cor.texto;

    const estoquesBaixos = new Set(dados.estoqueBaixo.map(e => e.nome));
    const lista = dados.estoquePorMedicamento;

    // ----- Barras: estoque de cada medicamento (vermelho = abaixo do minimo) -----
    if (graficoEstoque) graficoEstoque.destroy();
    graficoEstoque = new Chart(document.getElementById('grafico-estoque'), {
        type: 'bar',
        data: {
            labels: lista.map(item => item.nome),
            datasets: [{
                label: 'Unidades em estoque',
                data: lista.map(item => Number(item.quantidade_total)),
                backgroundColor: (contexto) => {
                    const { ctx, chartArea } = contexto.chart;
                    if (!chartArea) return cor.azul;
                    const baixo = estoquesBaixos.has(lista[contexto.dataIndex].nome);
                    return baixo
                        ? degrade(ctx, chartArea, '#ff8a8a', cor.vermelho)
                        : degrade(ctx, chartArea, cor.azul2, cor.azul);
                },
                borderRadius: 10,
                borderSkipped: false,
                maxBarThickness: 56,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 1100, easing: 'easeOutQuart' },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#0a1647',
                    padding: 12,
                    cornerRadius: 10,
                    displayColors: false,
                    titleFont: { weight: '700' },
                    callbacks: {
                        label: (item) => `${item.parsed.y} unidades`,
                        afterLabel: (item) => estoquesBaixos.has(item.label) ? 'Abaixo do estoque mínimo' : '',
                    },
                },
            },
            scales: {
                x: { grid: { display: false }, border: { display: false } },
                y: { beginAtZero: true, grid: { color: cor.grade }, border: { display: false }, ticks: { precision: 0 } },
            },
        },
    });

    // ----- Rosca: quantos medicamentos estao com estoque normal x baixo -----
    const baixos = dados.estoqueBaixo.length;
    const normais = Math.max(0, dados.totalMedicamentos - baixos);

    // Escreve o total no centro da rosca
    const textoCentral = {
        id: 'textoCentral',
        afterDraw(grafico) {
            const { ctx, chartArea: { left, right, top, bottom } } = grafico;
            const x = (left + right) / 2;
            const y = (top + bottom) / 2;
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = cor.destaque;
            ctx.font = "800 34px 'Inter', sans-serif";
            ctx.fillText(dados.totalMedicamentos, x, y - 8);
            ctx.fillStyle = cor.texto;
            ctx.font = "500 12px 'Inter', sans-serif";
            ctx.fillText('medicamentos', x, y + 18);
            ctx.restore();
        },
    };

    if (graficoSituacao) graficoSituacao.destroy();
    graficoSituacao = new Chart(document.getElementById('grafico-situacao'), {
        type: 'doughnut',
        data: {
            labels: ['Estoque normal', 'Estoque baixo'],
            datasets: [{
                data: [normais, baixos],
                backgroundColor: [cor.verde, cor.vermelho],
                borderColor: cor.superficie,
                borderWidth: 4,
                hoverOffset: 8,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '72%',
            animation: { duration: 1300, easing: 'easeOutQuart', animateRotate: true },
            plugins: {
                legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', padding: 18 } },
                tooltip: { backgroundColor: '#0a1647', padding: 12, cornerRadius: 10 },
            },
        },
        plugins: [textoCentral],
    });
}

// Ao trocar entre claro/escuro, redesenha os graficos com as cores novas
window.addEventListener('sigem:tema', () => {
    if (ultimosDados) renderizarGraficos(ultimosDados);
});

// ---------- HERO (saudacao no topo do dashboard) ----------
function renderizarHero(dados) {
    const sessao = obterSessao();
    const hora = new Date().getHours();
    const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
    const primeiroNome = sessao && sessao.nome ? sessao.nome.split(' ')[0] : 'bem-vindo';
    const data = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

    document.getElementById('hero-saudacao').textContent = saudacao;
    document.getElementById('hero-nome').textContent = primeiroNome;
    document.getElementById('hero-resumo').textContent =
        `Hoje é ${data}. São ${dados.totalMedicamentos} medicamentos cadastrados e ${dados.totalEstoque} unidades em estoque.`;

    const qtdCriticos = dados.vencidos.length + dados.estoqueBaixo.length;
    const qtdAtencao = dados.proximosVencimento.length;
    const total = qtdCriticos + qtdAtencao;

    const chip = document.getElementById('hero-status');
    chip.classList.remove('atencao', 'critico');
    if (total === 0) {
        document.getElementById('hero-status-texto').textContent = 'Tudo em ordem no estoque';
    } else {
        chip.classList.add(qtdCriticos > 0 ? 'critico' : 'atencao');
        document.getElementById('hero-status-texto').textContent =
            `${total} ${total === 1 ? 'alerta precisa' : 'alertas precisam'} de atenção`;
    }

    // Quem nao pode registrar movimentacao (gestor) nao ve o atalho
    if (!podeFazer('entrada') && !podeFazer('saida')) {
        document.getElementById('hero-registrar').style.display = 'none';
    }
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

    // Cada card e clicavel: os 3 de alerta rolam a pagina ate a
    // tabela correspondente (mesma pagina); os 2 primeiros levam
    // para a pagina de Medicamentos, onde a lista completa esta.
    const rodape = (temAlerta) => temAlerta
        ? `Ver detalhes ${icone('seta')}`
        : `${icone('ok')} Tudo certo`;

    container.innerHTML = `
        <a href="medicamentos.html" class="card card-clicavel">
            <div class="card-topo"><span class="card-icone">${icone('pill')}</span><span class="card-titulo">Medicamentos cadastrados</span></div>
            <div class="card-valor">${dados.totalMedicamentos}</div>
            <div class="card-rodape">Ver cadastro ${icone('seta')}</div>
        </a>
        <a href="medicamentos.html" class="card card-clicavel">
            <div class="card-topo"><span class="card-icone">${icone('pacote')}</span><span class="card-titulo">Unidades em estoque</span></div>
            <div class="card-valor">${dados.totalEstoque}</div>
            <div class="card-rodape">Ver lotes ${icone('seta')}</div>
        </a>
        <div class="card card-clicavel ${qtdEstoqueBaixo > 0 ? 'alerta-vermelho' : 'alerta-verde'}" onclick="rolarPara('secao-estoque-baixo')">
            <div class="card-topo"><span class="card-icone">${icone('alerta')}</span><span class="card-titulo">Estoque baixo</span></div>
            <div class="card-valor">${qtdEstoqueBaixo}</div>
            <div class="card-rodape">${rodape(qtdEstoqueBaixo > 0)}</div>
        </div>
        <div class="card card-clicavel ${qtdProximos > 0 ? 'alerta-amarelo' : 'alerta-verde'}" onclick="rolarPara('secao-vencimento')">
            <div class="card-topo"><span class="card-icone">${icone('relogio')}</span><span class="card-titulo">Próximos do vencimento</span></div>
            <div class="card-valor">${qtdProximos}</div>
            <div class="card-rodape">${rodape(qtdProximos > 0)}</div>
        </div>
        <div class="card card-clicavel ${qtdVencidos > 0 ? 'alerta-vermelho' : 'alerta-verde'}" onclick="rolarPara('secao-vencidos')">
            <div class="card-topo"><span class="card-icone">${icone('calendario-x')}</span><span class="card-titulo">Vencidos</span></div>
            <div class="card-valor">${qtdVencidos}</div>
            <div class="card-rodape">${rodape(qtdVencidos > 0)}</div>
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
            <td data-rotulo="Medicamento">${esc(item.medicamento_nome)}</td>
            <td data-rotulo="Lote">${esc(item.numero_lote)}</td>
            <td data-rotulo="Quantidade">${item.quantidade}</td>
            <td data-rotulo="Validade"><span class="badge badge-vermelho">${formatarData(item.data_validade)}</span></td>
        </tr>
    `).join('');
}

function renderizarProximosVencimento(lista) {
    const tbody = document.getElementById('tabela-vencimento');
    if (lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="tabela-vazia">Nenhum lote próximo do vencimento.</td></tr>`;
        return;
    }
    tbody.innerHTML = lista.map(item => `
        <tr>
            <td data-rotulo="Medicamento">${esc(item.medicamento_nome)}</td>
            <td data-rotulo="Lote">${esc(item.numero_lote)}</td>
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
            <td data-rotulo="Medicamento">${esc(item.nome)}</td>
            <td data-rotulo="Estoque mínimo">${item.estoque_minimo}</td>
            <td data-rotulo="Quantidade atual"><span class="badge badge-vermelho">${item.quantidade_total}</span></td>
        </tr>
    `).join('');
}

function renderizarUltimasMovimentacoes(lista) {
    const tbody = document.getElementById('tabela-ultimas-movimentacoes');
    if (lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="tabela-vazia">Nenhuma movimentação registrada.</td></tr>`;
        return;
    }
    tbody.innerHTML = lista.map(item => `
        <tr>
            <td data-rotulo="Data">${formatarData(item.data_movimentacao)}</td>
            <td data-rotulo="Medicamento">${esc(item.medicamento_nome)}</td>
            <td data-rotulo="Lote">${esc(item.numero_lote)}</td>
            <td data-rotulo="Tipo">
                <span class="badge ${item.tipo === 'ENTRADA' ? 'badge-verde' : 'badge-azul'}">${item.tipo}</span>
            </td>
            <td data-rotulo="Quantidade">${item.quantidade}</td>
            <td data-rotulo="Setor">${esc(item.setor_nome || '-')}</td>
        </tr>
    `).join('');
}

// ---------- SIMULADOR "E SE?" ----------
//
// Pega a previsao real  e recalcula na hora,
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
                <td data-rotulo="Medicamento">${esc(item.nome)}</td>
                <td data-rotulo="Hoje">${badgePrevisao(diasHoje)}</td>
                <td data-rotulo="No cenário">${badgePrevisao(diasCenario)}</td>
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

carregarDashboard();
