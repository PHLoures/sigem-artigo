// escala.js
//
// Controla a pagina escala.html (modulo SIGEP).

const formProfissional = document.getElementById('form-profissional');
const formEscala = document.getElementById('form-escala');

async function carregarTudo() {
    await carregarProfissionais();
    await carregarEscalas();
}

// ---------- PROFISSIONAIS ----------

async function carregarProfissionais() {
    try {
        const profissionais = await chamarApi('/profissionais');
        const select = document.getElementById('escala-profissional');
        select.innerHTML = profissionais
            .map(p => `<option value="${p.id}">${p.nome} (${p.cargo})</option>`)
            .join('');

        document.getElementById('cards-resumo').innerHTML = `
            <div class="card">
                <div class="card-titulo">Profissionais cadastrados</div>
                <div class="card-valor">${profissionais.length}</div>
            </div>
        `;
    } catch (erro) {
        mostrarMensagem(erro.message, 'erro');
    }
}

formProfissional.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const dados = {
        nome: document.getElementById('prof-nome').value,
        cargo: document.getElementById('prof-cargo').value,
        setor: document.getElementById('prof-setor').value,
    };

    try {
        await chamarApi('/profissionais', 'POST', dados);
        mostrarMensagem('Profissional cadastrado com sucesso.', 'sucesso');
        formProfissional.reset();
        carregarProfissionais();
    } catch (erro) {
        mostrarMensagem(erro.message, 'erro');
    }
});

// ---------- ESCALAS ----------

async function carregarEscalas() {
    try {
        const escalas = await chamarApi('/escalas');
        renderizarTabelaEscalas(escalas);
    } catch (erro) {
        mostrarMensagem(erro.message, 'erro');
    }
}

const badgeTurno = {
    MANHA: 'badge-verde',
    TARDE: 'badge-amarelo',
    NOITE: 'badge-azul',
};

function renderizarTabelaEscalas(escalas) {
    const tbody = document.getElementById('tabela-escalas');
    if (escalas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="tabela-vazia">Nenhuma escala registrada.</td></tr>`;
        return;
    }

    tbody.innerHTML = escalas.map(e => `
        <tr>
            <td data-rotulo="Data">${formatarData(e.data_turno)}</td>
            <td data-rotulo="Turno"><span class="badge ${badgeTurno[e.turno]}">${e.turno}</span></td>
            <td data-rotulo="Profissional">${e.profissional_nome}</td>
            <td data-rotulo="Cargo">${e.profissional_cargo}</td>
            <td data-rotulo="Setor">${e.setor}</td>
            <td data-rotulo="Acoes">
                <button class="btn-perigo" onclick="excluirEscala(${e.id})">Excluir</button>
            </td>
        </tr>
    `).join('');
}

formEscala.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const dados = {
        profissional_id: Number(document.getElementById('escala-profissional').value),
        data_turno: document.getElementById('escala-data').value,
        turno: document.getElementById('escala-turno').value,
        setor: document.getElementById('escala-setor').value,
    };

    try {
        await chamarApi('/escalas', 'POST', dados);
        mostrarMensagem('Escala registrada com sucesso.', 'sucesso');
        formEscala.reset();
        carregarEscalas();
    } catch (erro) {
        mostrarMensagem(erro.message, 'erro');
    }
});

async function excluirEscala(id) {
    if (!confirm('Remover esta escala?')) return;
    try {
        await chamarApi(`/escalas/${id}`, 'DELETE');
        mostrarMensagem('Escala removida.', 'sucesso');
        carregarEscalas();
    } catch (erro) {
        mostrarMensagem(erro.message, 'erro');
    }
}

function mostrarMensagem(texto, tipo) {
    const area = document.getElementById('mensagem-area');
    area.innerHTML = `<div class="mensagem mensagem-${tipo}">${texto}</div>`;
    if (tipo === 'sucesso') {
        setTimeout(() => { area.innerHTML = ''; }, 3000);
    }
}

carregarTudo();
