// fila.js
//
// Controla a pagina fila.html (modulo SIFEC).

const formFila = document.getElementById('form-fila');

async function carregarFila() {
    try {
        const fila = await chamarApi('/fila-cirurgias');
        renderizarCards(fila);
        renderizarTabela(fila);
    } catch (erro) {
        mostrarMensagem(erro.message, 'erro');
    }
}

function renderizarCards(fila) {
    const total = fila.length;
    const urgentes = fila.filter(f => f.prioridade === 'URGENTE' && f.status !== 'REALIZADA').length;
    const aguardando = fila.filter(f => f.status === 'AGUARDANDO').length;

    document.getElementById('cards-resumo').innerHTML = `
        <div class="card">
            <div class="card-titulo">Total na fila</div>
            <div class="card-valor">${total}</div>
        </div>
        <div class="card ${urgentes > 0 ? 'alerta-vermelho' : 'alerta-verde'}">
            <div class="card-titulo">🔴 Casos urgentes</div>
            <div class="card-valor">${urgentes}</div>
        </div>
        <div class="card alerta-amarelo">
            <div class="card-titulo">🟠 Aguardando</div>
            <div class="card-valor">${aguardando}</div>
        </div>
    `;
}

const badgePrioridade = {
    BAIXA: 'badge-verde',
    MEDIA: 'badge-azul',
    ALTA: 'badge-amarelo',
    URGENTE: 'badge-vermelho',
};

const badgeStatusFila = {
    AGUARDANDO: 'badge-amarelo',
    AGENDADA: 'badge-azul',
    REALIZADA: 'badge-verde',
};

function renderizarTabela(fila) {
    const tbody = document.getElementById('tabela-fila');
    if (fila.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="tabela-vazia">Nenhum paciente na fila.</td></tr>`;
        return;
    }

    tbody.innerHTML = fila.map(item => `
        <tr>
            <td data-rotulo="Paciente">${item.nome_paciente}</td>
            <td data-rotulo="Procedimento">${item.procedimento}</td>
            <td data-rotulo="Prioridade"><span class="badge ${badgePrioridade[item.prioridade]}">${item.prioridade}</span></td>
            <td data-rotulo="Status"><span class="badge ${badgeStatusFila[item.status]}">${item.status}</span></td>
            <td data-rotulo="Entrada na fila">${formatarData(item.data_entrada)}</td>
            <td data-rotulo="Acoes">
                ${item.status === 'AGUARDANDO' ? `<button class="btn-editar" onclick="mudarStatus(${item.id}, 'AGENDADA')">Agendar</button>` : ''}
                ${item.status === 'AGENDADA' ? `<button class="btn-editar" onclick="mudarStatus(${item.id}, 'REALIZADA')">Marcar realizada</button>` : ''}
                <button class="btn-perigo" onclick="excluirDaFila(${item.id})">Remover</button>
            </td>
        </tr>
    `).join('');
}

formFila.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const dados = {
        nome_paciente: document.getElementById('fila-nome').value,
        procedimento: document.getElementById('fila-procedimento').value,
        prioridade: document.getElementById('fila-prioridade').value,
    };

    try {
        await chamarApi('/fila-cirurgias', 'POST', dados);
        mostrarMensagem('Paciente adicionado a fila.', 'sucesso');
        formFila.reset();
        carregarFila();
    } catch (erro) {
        mostrarMensagem(erro.message, 'erro');
    }
});

async function mudarStatus(id, status) {
    try {
        await chamarApi(`/fila-cirurgias/${id}`, 'PUT', { status });
        mostrarMensagem('Status atualizado.', 'sucesso');
        carregarFila();
    } catch (erro) {
        mostrarMensagem(erro.message, 'erro');
    }
}

async function excluirDaFila(id) {
    if (!confirm('Remover este paciente da fila?')) return;
    try {
        await chamarApi(`/fila-cirurgias/${id}`, 'DELETE');
        mostrarMensagem('Removido da fila.', 'sucesso');
        carregarFila();
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

carregarFila();
