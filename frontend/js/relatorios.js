// relatorios.js
//
// Controla a pagina relatorios.html: filtra o historico de
// movimentacoes e permite exportar em CSV ou PDF.

const formFiltro = document.getElementById('form-filtro');
let ultimoRelatorio = []; // guarda os dados exibidos, para exportar

// ---------- CARREGAR SELECT DE MEDICAMENTOS ----------

async function carregarMedicamentos() {
    try {
        const medicamentos = await chamarApi('/medicamentos');
        const select = document.getElementById('filtro-medicamento');
        select.innerHTML =
            '<option value="">Todos</option>' +
            medicamentos.map(m => `<option value="${m.id}">${m.nome}</option>`).join('');
    } catch (erro) {
        mostrarMensagem(erro.message, 'erro');
    }
}

// ---------- BUSCAR RELATORIO (com filtros) ----------

async function buscarRelatorio() {
    const dataInicio = document.getElementById('filtro-data-inicio').value;
    const dataFim = document.getElementById('filtro-data-fim').value;
    const tipo = document.getElementById('filtro-tipo').value;
    const medicamentoId = document.getElementById('filtro-medicamento').value;

    // URLSearchParams monta a "query string" (?data_inicio=...&tipo=...)
    // so com os filtros que realmente foram preenchidos.
    const parametros = new URLSearchParams();
    if (dataInicio) parametros.set('data_inicio', dataInicio);
    if (dataFim) parametros.set('data_fim', dataFim);
    if (tipo) parametros.set('tipo', tipo);
    if (medicamentoId) parametros.set('medicamento_id', medicamentoId);

    try {
        const dados = await chamarApi(`/relatorios/movimentacoes?${parametros.toString()}`);
        ultimoRelatorio = dados;
        renderizarTabela(dados);
        atualizarSubtitulo(dataInicio, dataFim, tipo);
    } catch (erro) {
        mostrarMensagem(erro.message, 'erro');
    }
}

function atualizarSubtitulo(dataInicio, dataFim, tipo) {
    const partes = [];
    if (dataInicio) partes.push(`de ${formatarDataInputParaBr(dataInicio)}`);
    if (dataFim) partes.push(`até ${formatarDataInputParaBr(dataFim)}`);
    if (tipo) partes.push(`tipo ${tipo}`);

    const texto = partes.length > 0 ? `Periodo: ${partes.join(' ')}` : 'Periodo: todos os registros';
    document.getElementById('relatorio-periodo').textContent = texto;
}

function formatarDataInputParaBr(dataAAAAMMDD) {
    const [ano, mes, dia] = dataAAAAMMDD.split('-');
    return `${dia}/${mes}/${ano}`;
}

function renderizarTabela(lista) {
    const tbody = document.getElementById('tabela-relatorio');
    if (lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="tabela-vazia">Nenhuma movimentacao encontrada para esse filtro.</td></tr>`;
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
            <td data-rotulo="Motivo">${item.motivo || '-'}</td>
        </tr>
    `).join('');
}

formFiltro.addEventListener('submit', (evento) => {
    evento.preventDefault();
    buscarRelatorio();
});

document.getElementById('btn-limpar-filtro').addEventListener('click', () => {
    formFiltro.reset();
    buscarRelatorio();
});

// ---------- EXPORTAR CSV ----------
//
// CSV (Comma-Separated Values) e um arquivo de texto simples
// onde cada linha e uma linha da tabela, e as colunas sao
// separadas por ";" (usamos ponto-e-virgula porque o Excel em
// portugues-BR espera esse separador). Programas como Excel e
// Google Planilhas abrem esse formato como se fosse uma planilha.

document.getElementById('btn-exportar-csv').addEventListener('click', () => {
    if (ultimoRelatorio.length === 0) {
        mostrarMensagem('Nao ha dados para exportar.', 'erro');
        return;
    }

    const cabecalho = ['Data', 'Medicamento', 'Lote', 'Tipo', 'Quantidade', 'Setor', 'Motivo'];
    const linhas = ultimoRelatorio.map(item => [
        formatarData(item.data_movimentacao),
        item.medicamento_nome,
        item.numero_lote,
        item.tipo,
        item.quantidade,
        item.setor_nome || '-',
        item.motivo || '-',
    ]);

    // Monta o texto do CSV: cabecalho + cada linha, unidos por ";"
    // e quebras de linha ("\n") entre cada registro.
    const conteudoCsv = [cabecalho, ...linhas]
        .map(colunas => colunas.map(valor => `"${String(valor).replace(/"/g, '""')}"`).join(';'))
        .join('\n');

    // Blob e um "arquivo em memoria". Criamos um link invisivel
    // que aponta para esse arquivo e clicamos nele via JavaScript,
    // o que faz o navegador iniciar o download.
    const blob = new Blob(['﻿' + conteudoCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sigem-relatorio-movimentacoes-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    mostrarMensagem('CSV exportado com sucesso.', 'sucesso');
});

// ---------- EXPORTAR PDF ----------
//
// Nao usamos nenhuma biblioteca extra para gerar PDF. Em vez
// disso, usamos a funcao de impressao do proprio navegador
// (window.print()), combinada com uma folha de estilo especial
// "@media print" (em css/style.css) que esconde o cabecalho, o
// menu e os formularios, mostrando so a tabela do relatorio.
// Ao imprimir, o usuario escolhe "Salvar como PDF" em vez de
// uma impressora física.

document.getElementById('btn-exportar-pdf').addEventListener('click', () => {
    if (ultimoRelatorio.length === 0) {
        mostrarMensagem('Nao ha dados para exportar.', 'erro');
        return;
    }
    document.getElementById('relatorio-data-geracao').textContent =
        new Date().toLocaleString('pt-BR');
    window.print();
});

function mostrarMensagem(texto, tipo) {
    const area = document.getElementById('mensagem-area');
    area.innerHTML = `<div class="mensagem mensagem-${tipo}">${texto}</div>`;
    if (tipo === 'sucesso') {
        setTimeout(() => { area.innerHTML = ''; }, 3000);
    }
}

carregarMedicamentos();
buscarRelatorio();
