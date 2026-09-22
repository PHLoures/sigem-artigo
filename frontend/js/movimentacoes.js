// movimentacoes.js
//
// Controla a pagina movimentacoes.html: registra ENTRADA/SAIDA
// e mostra o historico.

const formMovimentacao = document.getElementById('form-movimentacao');
const selectMedicamento = document.getElementById('mov-medicamento');
const selectLote = document.getElementById('mov-lote');

async function carregarFormulario() {
    try {
        const [medicamentos, setores] = await Promise.all([
            chamarApi('/medicamentos'),
            chamarApi('/setores'),
        ]);

        selectMedicamento.innerHTML = medicamentos
            .map(m => `<option value="${m.id}">${m.nome}</option>`)
            .join('');

        const selectSetor = document.getElementById('mov-setor');
        selectSetor.innerHTML =
            '<option value="">-- nenhum --</option>' +
            setores.map(s => `<option value="${s.id}">${s.nome}</option>`).join('');

        // Assim que carregar, ja busca os lotes do primeiro medicamento.
        if (medicamentos.length > 0) {
            await carregarLotesDoMedicamento(medicamentos[0].id);
        }
    } catch (erro) {
        mostrarMensagem(erro.message, 'erro');
    }
}

// Sempre que o medicamento selecionado mudar, recarrega a lista
// de lotes disponiveis (cada medicamento tem seus proprios lotes).
selectMedicamento.addEventListener('change', () => {
    carregarLotesDoMedicamento(selectMedicamento.value);
});

async function carregarLotesDoMedicamento(medicamentoId) {
    try {
        const lotes = await chamarApi(`/lotes/medicamento/${medicamentoId}`);
        if (lotes.length === 0) {
            selectLote.innerHTML = '<option value="">Nenhum lote cadastrado</option>';
            return;
        }
        selectLote.innerHTML = lotes
            .map(l => `<option value="${l.id}">${l.numero_lote} (disponivel: ${l.quantidade})</option>`)
            .join('');
    } catch (erro) {
        mostrarMensagem(erro.message, 'erro');
    }
}

formMovimentacao.addEventListener('submit', async (evento) => {
    evento.preventDefault();

    const dados = {
        medicamento_id: Number(selectMedicamento.value),
        lote_id: Number(selectLote.value),
        setor_id: document.getElementById('mov-setor').value || null,
        tipo: document.getElementById('mov-tipo').value,
        quantidade: Number(document.getElementById('mov-quantidade').value),
        motivo: document.getElementById('mov-motivo').value,
    };

    try {
        await chamarApi('/movimentacoes', 'POST', dados);
        mostrarMensagem('Movimentacao registrada com sucesso.', 'sucesso');
        formMovimentacao.reset();
        carregarLotesDoMedicamento(selectMedicamento.value);
        carregarHistorico();
    } catch (erro) {
        mostrarMensagem(erro.message, 'erro');
    }
});

async function carregarHistorico() {
    try {
        const lista = await chamarApi('/movimentacoes');
        const tbody = document.getElementById('tabela-movimentacoes');

        if (lista.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="tabela-vazia">Nenhuma movimentacao registrada.</td></tr>`;
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

carregarFormulario();
carregarHistorico();
