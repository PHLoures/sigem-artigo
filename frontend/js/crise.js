// crise.js
//
// MODO CRISE: uma simulacao para mostrar, na apresentacao, como o
// sistema reage quando um hospital entra em desabastecimento.
//
// Nada e gravado no banco! A ideia e simples: quando o modo esta
// ligado, os dados que chegam da API sao "piorados" aqui no
// navegador antes de serem mostrados (estoque despenca, consumo
// aumenta). Desligou, voltam os dados reais.
//
// Os numeros de estoque e de previsao de TODO o sistema (dashboard
// e chatbot) passam pelas funcoes abaixo, por isso ficam coerentes.

const CRISE_CHAVE = 'sigem_crise';

// Na crise, cada medicamento fica com so 25% do estoque minimo.
const CRISE_FRACAO_DO_MINIMO = 0.25;
// E o consumo sobe 50% (mais pacientes, menos reposicao).
const CRISE_AUMENTO_CONSUMO = 1.5;

function criseAtiva() {
    try {
        return localStorage.getItem(CRISE_CHAVE) === '1';
    } catch {
        return false;
    }
}

function definirCrise(ligada) {
    try {
        if (ligada) localStorage.setItem(CRISE_CHAVE, '1');
        else localStorage.removeItem(CRISE_CHAVE);
    } catch { /* sem localStorage: o modo simplesmente nao persiste */ }
}

// Estoque "de crise" de um medicamento: nunca maior que o real.
function estoqueEmCrise(estoqueReal, estoqueMinimo) {
    return Math.min(Number(estoqueReal), Math.floor(Number(estoqueMinimo) * CRISE_FRACAO_DO_MINIMO));
}

// Busca /dashboard ja aplicando a crise (se estiver ligada).
async function obterDashboard() {
    const dados = await chamarApi('/dashboard');
    if (!criseAtiva()) return dados;

    const medicamentos = await chamarApi('/medicamentos');
    const estoquePorMedicamento = medicamentos.map(m => {
        const real = dados.estoquePorMedicamento.find(e => e.nome === m.nome);
        return {
            nome: m.nome,
            quantidade_total: estoqueEmCrise(real ? real.quantidade_total : 0, m.estoque_minimo),
        };
    });

    return {
        ...dados,
        estoquePorMedicamento,
        totalEstoque: estoquePorMedicamento.reduce((soma, e) => soma + e.quantidade_total, 0),
        // Com o estoque de crise, TODOS ficam abaixo do minimo.
        estoqueBaixo: medicamentos.map(m => ({
            id: m.id,
            nome: m.nome,
            estoque_minimo: m.estoque_minimo,
            quantidade_total: estoqueEmCrise(
                (dados.estoquePorMedicamento.find(e => e.nome === m.nome) || {}).quantidade_total || 0,
                m.estoque_minimo
            ),
        })),
    };
}

// Busca /previsao-estoque ja aplicando a crise (se estiver ligada).
async function obterPrevisao() {
    const lista = await chamarApi('/previsao-estoque');
    if (!criseAtiva()) return lista;

    const medicamentos = await chamarApi('/medicamentos');

    return lista.map(item => {
        const med = medicamentos.find(m => m.nome === item.nome);
        const estoque = estoqueEmCrise(item.estoque_atual, med ? med.estoque_minimo : 0);

        // Sem historico de saidas, assume que o consumo mensal e igual ao minimo.
        const base = Number(item.saida_ultimos_30_dias) > 0
            ? Number(item.saida_ultimos_30_dias)
            : (med ? Number(med.estoque_minimo) : 0);
        const consumo = Math.round(base * CRISE_AUMENTO_CONSUMO);

        return {
            ...item,
            estoque_atual: estoque,
            saida_ultimos_30_dias: consumo,
            dias_ate_esgotar: consumo > 0 ? Math.round((estoque / (consumo / 30)) * 10) / 10 : null,
        };
    }).sort((a, b) => {
        if (a.dias_ate_esgotar === null) return 1;
        if (b.dias_ate_esgotar === null) return -1;
        return a.dias_ate_esgotar - b.dias_ate_esgotar;
    });
}

// Enquanto a crise estiver ligada, o cabecalho fica vermelho em
// TODAS as paginas (lembrete de que os numeros sao simulados).
if (criseAtiva()) {
    document.body.classList.add('modo-crise');
}
