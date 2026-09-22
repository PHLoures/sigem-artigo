// medicamentos.js
//
// Controla a pagina medicamentos.html: cadastro/edicao/exclusao
// de medicamentos, e cadastro/listagem de lotes.

const formMedicamento = document.getElementById('form-medicamento');
const formLote = document.getElementById('form-lote');

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
            <td data-rotulo="Nome"><strong>#${m.id}</strong> ${m.nome}</td>
            <td data-rotulo="Principio ativo">${m.principio_ativo}</td>
            <td data-rotulo="Dosagem">${m.dosagem}</td>
            <td data-rotulo="Forma">${m.forma_farmaceutica}</td>
            <td data-rotulo="Fabricante">${m.fabricante}</td>
            <td data-rotulo="Estoque minimo">${m.estoque_minimo}</td>
            <td data-rotulo="Acoes">
                <button class="btn-editar" onclick="editarMedicamento(${m.id})">Editar</button>
                <button class="btn-perigo" onclick="excluirMedicamento(${m.id})">Excluir</button>
            </td>
        </tr>
    `).join('');
}

function preencherSelectMedicamentos(lista) {
    const select = document.getElementById('lote-medicamento');
    select.innerHTML = lista.map(m => `<option value="${m.id}">${m.nome} (#${m.id})</option>`).join('');
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
        document.getElementById('btn-salvar').textContent = 'Salvar alteracoes';
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
        mostrarMensagem('Medicamento excluido com sucesso.', 'sucesso');
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
        tbody.innerHTML = `<tr><td colspan="4" class="tabela-vazia">Nenhum lote cadastrado.</td></tr>`;
        return;
    }
    tbody.innerHTML = lista.map(l => `
        <tr>
            <td data-rotulo="Medicamento">${l.medicamento_nome}</td>
            <td data-rotulo="Lote">${l.numero_lote}</td>
            <td data-rotulo="Quantidade">${l.quantidade}</td>
            <td data-rotulo="Validade">${formatarData(l.data_validade)}</td>
        </tr>
    `).join('');
}

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
