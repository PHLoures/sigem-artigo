// leitos.js
//
// Controla a pagina leitos.html (modulo SIGLE).

const formLeito = document.getElementById('form-leito');

async function carregarLeitos() {
    try {
        const leitos = await chamarApi('/leitos');
        renderizarCards(leitos);
        renderizarTabela(leitos);
    } catch (erro) {
        mostrarMensagem(erro.message, 'erro');
    }
}

function renderizarCards(leitos) {
    const total = leitos.length;
    const livres = leitos.filter(l => l.status === 'LIVRE').length;
    const ocupados = leitos.filter(l => l.status === 'OCUPADO').length;
    const manutencao = leitos.filter(l => l.status === 'MANUTENCAO').length;

    document.getElementById('cards-resumo').innerHTML = `
        <div class="card">
            <div class="card-titulo">Total de leitos</div>
            <div class="card-valor">${total}</div>
        </div>
        <div class="card alerta-verde">
            <div class="card-titulo">🟢 Livres</div>
            <div class="card-valor">${livres}</div>
        </div>
        <div class="card alerta-vermelho">
            <div class="card-titulo">🔴 Ocupados</div>
            <div class="card-valor">${ocupados}</div>
        </div>
        <div class="card alerta-amarelo">
            <div class="card-titulo">🟠 Em manutencao</div>
            <div class="card-valor">${manutencao}</div>
        </div>
    `;
}

function badgeStatus(status) {
    const mapa = {
        LIVRE: 'badge-verde',
        OCUPADO: 'badge-vermelho',
        MANUTENCAO: 'badge-amarelo',
    };
    return `<span class="badge ${mapa[status]}">${status}</span>`;
}

function renderizarTabela(leitos) {
    const tbody = document.getElementById('tabela-leitos');
    if (leitos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="tabela-vazia">Nenhum leito cadastrado.</td></tr>`;
        return;
    }

    tbody.innerHTML = leitos.map(leito => `
        <tr>
            <td data-rotulo="Numero"><strong>${leito.numero}</strong></td>
            <td data-rotulo="Setor">${leito.setor}</td>
            <td data-rotulo="Status">${badgeStatus(leito.status)}</td>
            <td data-rotulo="Paciente">${leito.paciente_nome || '-'}</td>
            <td data-rotulo="Acoes">
                ${leito.status !== 'OCUPADO' ? `<button class="btn-editar" onclick="ocuparLeito(${leito.id})">Ocupar</button>` : ''}
                ${leito.status !== 'LIVRE' ? `<button class="btn-editar" onclick="mudarStatus(${leito.id}, 'LIVRE')">Liberar</button>` : ''}
                ${leito.status !== 'MANUTENCAO' ? `<button class="btn-editar" onclick="mudarStatus(${leito.id}, 'MANUTENCAO')">Manutencao</button>` : ''}
                <button class="btn-perigo" onclick="excluirLeito(${leito.id})">Excluir</button>
            </td>
        </tr>
    `).join('');
}

formLeito.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const dados = {
        numero: document.getElementById('numero').value,
        setor: document.getElementById('setor').value,
    };

    try {
        await chamarApi('/leitos', 'POST', dados);
        mostrarMensagem('Leito cadastrado com sucesso.', 'sucesso');
        formLeito.reset();
        carregarLeitos();
    } catch (erro) {
        mostrarMensagem(erro.message, 'erro');
    }
});

async function ocuparLeito(id) {
    const nome = prompt('Nome do paciente que vai ocupar o leito:');
    if (nome === null) return; // usuario cancelou o prompt

    try {
        await chamarApi(`/leitos/${id}`, 'PUT', { status: 'OCUPADO', paciente_nome: nome });
        mostrarMensagem('Leito atualizado.', 'sucesso');
        carregarLeitos();
    } catch (erro) {
        mostrarMensagem(erro.message, 'erro');
    }
}

async function mudarStatus(id, status) {
    try {
        await chamarApi(`/leitos/${id}`, 'PUT', { status });
        mostrarMensagem('Leito atualizado.', 'sucesso');
        carregarLeitos();
    } catch (erro) {
        mostrarMensagem(erro.message, 'erro');
    }
}

async function excluirLeito(id) {
    if (!confirm('Tem certeza que deseja excluir este leito?')) return;
    try {
        await chamarApi(`/leitos/${id}`, 'DELETE');
        mostrarMensagem('Leito excluido.', 'sucesso');
        carregarLeitos();
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

carregarLeitos();
