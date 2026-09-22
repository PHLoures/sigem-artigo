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
// Nao usamos nenhuma biblioteca extra para gerar PDF. Em vez de
// tentar "escondar" pedacos da pagina atual na hora de imprimir
// (o que depende de toda a folha de estilo do site carregar
// certinho), abrimos uma JANELA NOVA, totalmente em branco, e
// escrevemos nela SO o conteudo do relatorio, com seu proprio
// HTML e CSS embutidos (sem depender de nada externo). Assim,
// nao tem como o menu, os formularios ou qualquer outra coisa
// da pagina principal aparecer na impressao - a janela nova
// simplesmente nao tem esse conteudo.
//
// Depois de escrever o conteudo, chamamos print() nessa janela,
// e o usuario escolhe "Salvar como PDF" na caixa de impressao
// do sistema, em vez de uma impressora fisica.

document.getElementById('btn-exportar-pdf').addEventListener('click', () => {
    if (ultimoRelatorio.length === 0) {
        mostrarMensagem('Nao ha dados para exportar.', 'erro');
        return;
    }

    const periodo = document.getElementById('relatorio-periodo').textContent;
    const dataGeracao = new Date().toLocaleString('pt-BR');

    const linhasTabela = ultimoRelatorio.map(item => `
        <tr>
            <td>${formatarData(item.data_movimentacao)}</td>
            <td>${item.medicamento_nome}</td>
            <td>${item.numero_lote}</td>
            <td><span class="badge-imp ${item.tipo === 'ENTRADA' ? 'badge-entrada' : 'badge-saida'}">${item.tipo}</span></td>
            <td class="col-numero">${item.quantidade}</td>
            <td>${item.setor_nome || '-'}</td>
            <td>${item.motivo || '-'}</td>
        </tr>
    `).join('');

    const totalEntradas = ultimoRelatorio
        .filter(item => item.tipo === 'ENTRADA')
        .reduce((soma, item) => soma + item.quantidade, 0);
    const totalSaidas = ultimoRelatorio
        .filter(item => item.tipo === 'SAIDA')
        .reduce((soma, item) => soma + item.quantidade, 0);

    // ---------- Total de SAIDAS por setor ----------
    //
    // Reduce() percorre a lista e vai "acumulando" um resultado.
    // Aqui, o resultado acumulado e um objeto tipo:
    //   { "UTI": 45, "Pronto Atendimento": 20 }
    // Cada saida soma no setor correspondente.
    const totaisPorSetor = ultimoRelatorio
        .filter(item => item.tipo === 'SAIDA' && item.setor_nome)
        .reduce((acumulado, item) => {
            acumulado[item.setor_nome] = (acumulado[item.setor_nome] || 0) + item.quantidade;
            return acumulado;
        }, {});

    // Transforma o objeto em uma lista ordenada do setor que mais
    // recebeu medicamento para o que menos recebeu.
    const rankingSetores = Object.entries(totaisPorSetor)
        .sort((a, b) => b[1] - a[1]);

    // ---------- Medicamento mais movimentado ----------
    //
    // Soma ENTRADA + SAIDA de cada medicamento (quantidade total
    // que passou por ele no periodo), e pega o maior.
    const totaisPorMedicamento = ultimoRelatorio.reduce((acumulado, item) => {
        acumulado[item.medicamento_nome] = (acumulado[item.medicamento_nome] || 0) + item.quantidade;
        return acumulado;
    }, {});

    const medicamentoDestaque = Object.entries(totaisPorMedicamento)
        .sort((a, b) => b[1] - a[1])[0]; // [0] = o primeiro depois de ordenado = o maior

    // ---------- Quem gerou o relatorio ----------
    const sessao = obterSessao();
    const nomeUsuario = sessao ? sessao.nome : 'Convidado';

    const linhasRankingSetores = rankingSetores.length > 0
        ? rankingSetores.map(([setor, total]) => `<li>${setor}: <strong>${total}</strong> unidades</li>`).join('')
        : '<li>Nenhuma saida com setor informado neste periodo.</li>';

    const htmlRelatorio = `
        <!DOCTYPE html>
        <html lang="pt-br">
        <head>
            <meta charset="UTF-8">
            <title>Relatorio SIGEM - Movimentacoes</title>
            <style>
                * { box-sizing: border-box; }
                body {
                    font-family: 'Segoe UI', Arial, sans-serif;
                    color: #1c2333;
                    margin: 32px 40px;
                }
                .cabecalho {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    border-bottom: 3px solid #0f1f4d;
                    padding-bottom: 16px;
                    margin-bottom: 20px;
                }
                .cabecalho img {
                    width: 52px;
                    height: 52px;
                    object-fit: contain;
                }
                .cabecalho h1 {
                    margin: 0;
                    font-size: 20px;
                    color: #0f1f4d;
                }
                .cabecalho p {
                    margin: 2px 0 0;
                    font-size: 12.5px;
                    color: #6b7280;
                }
                h2.titulo-relatorio {
                    font-size: 16px;
                    margin: 0 0 4px;
                    color: #0f1f4d;
                }
                .subtitulo {
                    font-size: 13px;
                    color: #6b7280;
                    margin: 0 0 20px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 12px;
                }
                th {
                    background: #0f1f4d;
                    color: #ffffff;
                    text-align: left;
                    padding: 8px 10px;
                    font-size: 11px;
                    text-transform: uppercase;
                    letter-spacing: 0.3px;
                }
                td {
                    padding: 7px 10px;
                    border-bottom: 1px solid #e6e9f2;
                }
                tbody tr:nth-child(even) {
                    background: #f4f6fb;
                }
                .col-numero {
                    text-align: right;
                }
                .badge-imp {
                    display: inline-block;
                    padding: 2px 9px;
                    border-radius: 999px;
                    font-size: 10.5px;
                    font-weight: 700;
                }
                .badge-entrada { background: #dcfce7; color: #15803d; }
                .badge-saida { background: #e8eefd; color: #0f1f4d; }
                .resumo {
                    display: flex;
                    gap: 24px;
                    margin: 18px 0 22px;
                    font-size: 13px;
                }
                .resumo strong {
                    display: block;
                    font-size: 17px;
                    color: #0f1f4d;
                }
                .destaques {
                    display: flex;
                    gap: 24px;
                    margin-bottom: 22px;
                }
                .destaque-card {
                    flex: 1;
                    background: #f4f6fb;
                    border: 1px solid #e6e9f2;
                    border-radius: 8px;
                    padding: 12px 16px;
                }
                .destaque-card h3 {
                    margin: 0 0 8px;
                    font-size: 12px;
                    color: #6b7280;
                    text-transform: uppercase;
                    letter-spacing: 0.3px;
                }
                .destaque-card p {
                    margin: 0;
                    font-size: 14px;
                }
                .destaque-card ul {
                    margin: 0;
                    padding-left: 18px;
                    font-size: 12.5px;
                }
                .rodape {
                    margin-top: 28px;
                    padding-top: 12px;
                    border-top: 1px solid #e6e9f2;
                    font-size: 11px;
                    color: #9ca3af;
                    text-align: center;
                }
                @page {
                    size: A4 landscape;
                    margin: 14mm 16mm;
                }
            </style>
        </head>
        <body>
            <div class="cabecalho">
                <img src="${window.location.origin}/assets/img/logo.png" alt="Logo SIGEM">
                <div>
                    <h1>SIGEM</h1>
                    <p>Sistema de Gestao de Medicamentos Hospitalares</p>
                </div>
            </div>

            <h2 class="titulo-relatorio">Relatorio de Movimentacoes</h2>
            <p class="subtitulo">${periodo}</p>

            <div class="resumo">
                <div>Total de registros<strong>${ultimoRelatorio.length}</strong></div>
                <div>Unidades em entradas<strong>${totalEntradas}</strong></div>
                <div>Unidades em saidas<strong>${totalSaidas}</strong></div>
            </div>

            <div class="destaques">
                <div class="destaque-card">
                    <h3>Medicamento mais movimentado</h3>
                    <p>${medicamentoDestaque ? `${medicamentoDestaque[0]} &mdash; ${medicamentoDestaque[1]} unidades` : 'Sem dados no periodo'}</p>
                </div>
                <div class="destaque-card">
                    <h3>Saidas por setor</h3>
                    <ul>${linhasRankingSetores}</ul>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Medicamento</th>
                        <th>Lote</th>
                        <th>Tipo</th>
                        <th class="col-numero">Quantidade</th>
                        <th>Setor</th>
                        <th>Motivo</th>
                    </tr>
                </thead>
                <tbody>${linhasTabela}</tbody>
            </table>

            <p class="rodape">Relatorio gerado por ${nomeUsuario} &middot; SIGEM em ${dataGeracao}</p>
        </body>
        </html>
    `;

    // Abre uma janela nova em branco, escreve o HTML do relatorio
    // dentro dela, espera a logo carregar, e manda imprimir.
    const janelaRelatorio = window.open('', '_blank', 'width=900,height=700');

    // Se o navegador bloquear a abertura (bloqueador de pop-up),
    // window.open devolve "null" em vez de lancar um erro - por
    // isso essa checagem e necessaria antes de usar a janela.
    if (!janelaRelatorio) {
        mostrarMensagem(
            'O navegador bloqueou a abertura do relatorio. Permita pop-ups para este site e tente novamente.',
            'erro'
        );
        return;
    }

    janelaRelatorio.document.open();
    janelaRelatorio.document.write(htmlRelatorio);
    janelaRelatorio.document.close();

    janelaRelatorio.onload = () => {
        janelaRelatorio.focus();
        janelaRelatorio.print();
    };
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
