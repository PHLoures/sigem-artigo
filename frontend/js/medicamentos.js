// medicamentos.js
//
// Controla a pagina medicamentos.html: cadastro/edicao/exclusao
// de medicamentos, e cadastro/listagem de lotes.

const formMedicamento = document.getElementById('form-medicamento');
const formLote = document.getElementById('form-lote');

// ---------- PERMISSOES DO PERFIL ----------
//
// Quem nao pode editar cadastros (enfermeiro, gestor) so ve as
// listas: escondemos os formularios e os botoes Editar/Excluir.
const podeEditar = podeFazer('editar_cadastros');

if (!podeEditar) {
    formMedicamento.closest('section').style.display = 'none';
    formLote.style.display = 'none';
    mostrarAvisoPerfil('nesta tela você só pode consultar medicamentos e lotes.');
}

// ---------- MEDICAMENTOS ----------

async function carregarMedicamentos() {
    try {
        const medicamentos = await chamarApi('/medicamentos');
        renderizarTabelaMedicamentos(medicamentos);
        preencherSelectMedicamentos(medicamentos);
    } catch (erro) {
        mostrarMensagem(erro.message, 'erro');
    }
}

function renderizarTabelaMedicamentos(lista) {
    const tbody = document.getElementById('tabela-medicamentos');
    if (lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="tabela-vazia">Nenhum medicamento cadastrado.</td></tr>`;
        return;
    }
    tbody.innerHTML = lista.map(m => `
        <tr>
            <td data-rotulo="Nome"><strong>#${m.id}</strong> ${esc(m.nome)}</td>
            <td data-rotulo="Princípio ativo">${esc(m.principio_ativo)}</td>
            <td data-rotulo="Dosagem">${esc(m.dosagem)}</td>
            <td data-rotulo="Forma">${esc(m.forma_farmaceutica)}</td>
            <td data-rotulo="Fabricante">${esc(m.fabricante)}</td>
            <td data-rotulo="Estoque mínimo">${m.estoque_minimo}</td>
            <td data-rotulo="Ações">
                ${podeEditar ? `
                    <button class="btn-editar" onclick="editarMedicamento(${m.id})">Editar</button>
                    <button class="btn-perigo" onclick="excluirMedicamento(${m.id})">Excluir</button>
                ` : '-'}
            </td>
        </tr>
    `).join('');
}

function preencherSelectMedicamentos(lista) {
    const select = document.getElementById('lote-medicamento');
    select.innerHTML = lista.map(m => `<option value="${m.id}">${esc(m.nome)} (#${m.id})</option>`).join('');
}

formMedicamento.addEventListener('submit', async (evento) => {
    evento.preventDefault();

    const id = document.getElementById('medicamento-id').value;
    const dados = {
        nome: document.getElementById('nome').value,
        principio_ativo: document.getElementById('principio_ativo').value,
        dosagem: document.getElementById('dosagem').value,
        forma_farmaceutica: document.getElementById('forma_farmaceutica').value,
        fabricante: document.getElementById('fabricante').value,
        estoque_minimo: Number(document.getElementById('estoque_minimo').value),
    };

    try {
        if (id) {
            await chamarApi(`/medicamentos/${id}`, 'PUT', dados);
            mostrarMensagem('Medicamento atualizado com sucesso.', 'sucesso');
        } else {
            await chamarApi('/medicamentos', 'POST', dados);
            mostrarMensagem('Medicamento cadastrado com sucesso.', 'sucesso');
        }
        cancelarEdicao();
        carregarMedicamentos();
    } catch (erro) {
        mostrarMensagem(erro.message, 'erro');
    }
});

async function editarMedicamento(id) {
    try {
        const m = await chamarApi(`/medicamentos/${id}`);
        document.getElementById('medicamento-id').value = m.id;
        document.getElementById('nome').value = m.nome;
        document.getElementById('principio_ativo').value = m.principio_ativo;
        document.getElementById('dosagem').value = m.dosagem;
        document.getElementById('forma_farmaceutica').value = m.forma_farmaceutica;
        document.getElementById('fabricante').value = m.fabricante;
        document.getElementById('estoque_minimo').value = m.estoque_minimo;

        document.getElementById('titulo-formulario').textContent = `Editando: ${m.nome}`;
        document.getElementById('btn-salvar').textContent = 'Salvar alterações';
        document.getElementById('btn-cancelar').style.display = 'inline-block';

        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (erro) {
        mostrarMensagem(erro.message, 'erro');
    }
}

function cancelarEdicao() {
    formMedicamento.reset();
    document.getElementById('medicamento-id').value = '';
    document.getElementById('titulo-formulario').textContent = 'Cadastrar medicamento';
    document.getElementById('btn-salvar').textContent = 'Cadastrar';
    document.getElementById('btn-cancelar').style.display = 'none';
}

document.getElementById('btn-cancelar').addEventListener('click', cancelarEdicao);

async function excluirMedicamento(id) {
    if (!confirm('Tem certeza que deseja excluir este medicamento?')) return;

    try {
        await chamarApi(`/medicamentos/${id}`, 'DELETE');
        mostrarMensagem('Medicamento excluído com sucesso.', 'sucesso');
        carregarMedicamentos();
    } catch (erro) {
        mostrarMensagem(erro.message, 'erro');
    }
}

// ---------- LOTES ----------

async function carregarLotes() {
    try {
        const lotes = await chamarApi('/lotes');
        renderizarTabelaLotes(lotes);
    } catch (erro) {
        mostrarMensagem(erro.message, 'erro');
    }
}

function renderizarTabelaLotes(lista) {
    const tbody = document.getElementById('tabela-lotes');
    if (lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="tabela-vazia">Nenhum lote cadastrado.</td></tr>`;
        return;
    }
    tbody.innerHTML = lista.map(l => `
        <tr>
            <td data-rotulo="Medicamento">${esc(l.medicamento_nome)}</td>
            <td data-rotulo="Lote">${esc(l.numero_lote)}</td>
            <td data-rotulo="Quantidade">${l.quantidade}</td>
            <td data-rotulo="Validade">${formatarData(l.data_validade)}</td>
            <td data-rotulo="QR Code">
                <button type="button" class="btn-editar" data-acao="qr" data-id="${l.id}" data-lote="${esc(l.numero_lote)}" data-med="${esc(l.medicamento_nome)}">${icone('qr')}Gerar QR</button>
                <button type="button" class="btn-editar" data-acao="historico" data-id="${l.id}">${icone('historico')}Histórico</button>
            </td>
        </tr>
    `).join('');
}

// ---------- QR CODE DO LOTE ----------
//
// Gera um QR code que contem uma URL apontando para a pagina de
// movimentacoes, ja indicando o lote (?lote_id=123). A biblioteca
// "qrcode-generator" (assets/js/qrcode.js) faz o desenho - ela
// so precisa do texto a codificar, sem precisar de internet.
// Os botoes da tabela de lotes guardam os dados em "data-" (e nao em
// onclick) para que um nome de lote malicioso nunca vire codigo.
document.getElementById('tabela-lotes').addEventListener('click', (e) => {
    const botao = e.target.closest('button[data-acao]');
    if (!botao) return;
    if (botao.dataset.acao === 'qr') {
        mostrarQrCodeLote(Number(botao.dataset.id), botao.dataset.lote, botao.dataset.med);
    } else {
        mostrarHistoricoLote(Number(botao.dataset.id));
    }
});

function mostrarQrCodeLote(loteId, numeroLote, medicamentoNome) {
    const url = `${window.location.origin}/movimentacoes.html?lote_id=${loteId}`;

    // typeNumber = 0 deixa a biblioteca escolher automaticamente
    // o "tamanho" do QR code necessario para caber o texto.
    // errorCorrectionLevel 'M' e um meio-termo entre confiabilidade
    // de leitura e quantidade de informacao que cabe no codigo.
    const qr = qrcode(0, 'M');
    qr.addData(url);
    qr.make();

    document.getElementById('modal-qrcode-titulo').textContent =
        `Lote ${numeroLote} - ${medicamentoNome}`;
    document.getElementById('modal-qrcode-canvas').innerHTML = qr.createImgTag(6, 8);
    document.getElementById('modal-qrcode').classList.add('aberto');
}

document.getElementById('btn-fechar-modal-qrcode').addEventListener('click', () => {
    document.getElementById('modal-qrcode').classList.remove('aberto');
});

// ---------- LINHA DO TEMPO DO LOTE (rastreabilidade) ----------
//
// Mostra a "vida" de um lote: quando foi cadastrado, cada entrada e
// saida (com setor e motivo) e a data de validade. E isso que a
// vigilancia sanitaria chama de RASTREABILIDADE: saber para onde
// foi cada unidade de um lote.
async function mostrarHistoricoLote(loteId) {
    const corpo = document.getElementById('modal-historico-corpo');
    corpo.innerHTML = '<p class="secao-explicacao">Carregando...</p>';
    document.getElementById('modal-historico').classList.add('aberto');

    try {
        const { lote, movimentacoes } = await chamarApi(`/lotes/${loteId}/historico`);
        document.getElementById('modal-historico-titulo').textContent =
            `Lote ${lote.numero_lote} - ${lote.medicamento_nome}`;
        corpo.innerHTML = montarLinhaDoTempo(lote, movimentacoes);
    } catch (erro) {
        corpo.textContent = erro.message;
    }
}

function montarLinhaDoTempo(lote, movimentacoes) {
    const hoje = new Date();
    const validade = new Date(lote.data_validade);
    const diasParaVencer = Math.ceil((validade - hoje) / 86400000);

    // Eventos em ordem cronologica. O cadastro vai sempre no topo
    // (e o inicio da historia do lote).
    const eventos = movimentacoes.map(m => ({
        data: new Date(m.data_movimentacao),
        classe: m.tipo === 'ENTRADA' ? 'verde' : 'azul',
        titulo: `${m.tipo === 'ENTRADA' ? 'Entrada' : 'Saída'} de ${m.quantidade} unidades`,
        detalhe: [m.setor_nome ? `Setor: ${esc(m.setor_nome)}` : '', m.motivo ? `Motivo: ${esc(m.motivo)}` : '']
            .filter(Boolean).join(' - '),
        quando: formatarData(m.data_movimentacao),
    }));

    const linhas = [{
        classe: 'cinza',
        titulo: 'Lote cadastrado no sistema',
        detalhe: `Quantidade atual: ${lote.quantidade} unidades`,
        quando: formatarData(lote.criado_em),
    }, ...eventos];

    // Validade: vermelho se ja venceu, amarelo se falta menos de 30 dias
    let classeValidade = 'verde';
    let textoValidade = `Vence em ${diasParaVencer} dias`;
    if (diasParaVencer < 0) {
        classeValidade = 'vermelho';
        textoValidade = `Venceu há ${-diasParaVencer} dias`;
    } else if (diasParaVencer <= 30) {
        classeValidade = 'amarelo';
    }
    linhas.push({
        classe: classeValidade,
        titulo: 'Data de validade',
        detalhe: textoValidade,
        quando: formatarData(lote.data_validade),
    });

    const html = linhas.map((l, i) => `
        <li class="tl-item tl-${l.classe}" style="animation-delay:${i * 0.07}s">
            <div class="tl-quando">${l.quando}</div>
            <div class="tl-titulo">${l.titulo}</div>
            ${l.detalhe ? `<div class="tl-detalhe">${l.detalhe}</div>` : ''}
        </li>
    `).join('');

    const vazio = movimentacoes.length === 0
        ? '<p class="secao-explicacao">Este lote ainda nao teve nenhuma movimentacao.</p>'
        : '';

    return `${vazio}<ol class="timeline">${html}</ol>`;
}

document.getElementById('btn-fechar-modal-historico').addEventListener('click', () => {
    document.getElementById('modal-historico').classList.remove('aberto');
});

formLote.addEventListener('submit', async (evento) => {
    evento.preventDefault();

    const dados = {
        medicamento_id: Number(document.getElementById('lote-medicamento').value),
        numero_lote: document.getElementById('numero_lote').value,
        quantidade: Number(document.getElementById('lote-quantidade').value),
        data_validade: document.getElementById('data_validade').value,
    };

    try {
        await chamarApi('/lotes', 'POST', dados);
        mostrarMensagem('Lote cadastrado com sucesso.', 'sucesso');
        formLote.reset();
        carregarLotes();
    } catch (erro) {
        mostrarMensagem(erro.message, 'erro');
    }
});

// ---------- MENSAGENS ----------

function mostrarMensagem(texto, tipo) {
    const area = document.getElementById('mensagem-area');
    area.innerHTML = `<div class="mensagem mensagem-${tipo}">${texto}</div>`;
    if (tipo === 'sucesso') {
        setTimeout(() => { area.innerHTML = ''; }, 3000);
    }
}

carregarMedicamentos();
carregarLotes();
