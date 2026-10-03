// movimentacoes.js
//
// Controla a pagina movimentacoes.html: registra ENTRADA/SAIDA
// e mostra o historico.

const formMovimentacao = document.getElementById('form-movimentacao');
const selectMedicamento = document.getElementById('mov-medicamento');
const selectLote = document.getElementById('mov-lote');

// ---------- PERMISSOES DO PERFIL ----------
//
// Gestor: so le o historico (formulario escondido).
// Enfermeiro: so registra SAIDA (a opcao ENTRADA some da lista).
if (!podeFazer('entrada') && !podeFazer('saida')) {
    formMovimentacao.closest('section').style.display = 'none';
    mostrarAvisoPerfil('você pode consultar o histórico, mas não registrar movimentações.');
} else if (!podeFazer('entrada')) {
    document.querySelector('#mov-tipo option[value="ENTRADA"]').remove();
    mostrarAvisoPerfil('você pode registrar apenas SAÍDAS de estoque.');
}

async function carregarFormulario() {
    try {
        const [medicamentos, setores] = await Promise.all([
            chamarApi('/medicamentos'),
            chamarApi('/setores'),
        ]);

        selectMedicamento.innerHTML = medicamentos
            .map(m => `<option value="${m.id}">${esc(m.nome)}</option>`)
            .join('');

        const selectSetor = document.getElementById('mov-setor');
        selectSetor.innerHTML =
            '<option value="">Nenhum</option>' +
            setores.map(s => `<option value="${s.id}">${esc(s.nome)}</option>`).join('');

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
            .map(l => `<option value="${l.id}">${esc(l.numero_lote)} (disponível: ${l.quantidade})</option>`)
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
        mostrarMensagem('Movimentação registrada com sucesso.', 'sucesso');
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
            tbody.innerHTML = `<tr><td colspan="7" class="tabela-vazia">Nenhuma movimentação registrada.</td></tr>`;
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
                <td data-rotulo="Motivo">${esc(item.motivo || '-')}</td>
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

// ---------- SELECIONAR LOTE VIA QR CODE ----------
//
// Usada tanto pelo leitor de camera (abaixo) quanto quando a
// pagina e aberta diretamente com "?lote_id=123" na URL (por
// exemplo, se alguem escanear o QR com a camera nativa do
// celular, fora do nosso leitor).
async function selecionarLotePorId(loteId) {
    try {
        // Nao temos uma rota "GET /api/lotes/:id" pronta, entao
        // buscamos a lista completa e procuramos o id nela - para
        // a quantidade de lotes de um projeto academico, isso e
        // simples e rapido o suficiente.
        const lotes = await chamarApi('/lotes');
        const lote = lotes.find(l => l.id === loteId);

        if (!lote) {
            mostrarMensagem('Lote não encontrado.', 'erro');
            return;
        }

        selectMedicamento.value = lote.medicamento_id;
        await carregarLotesDoMedicamento(lote.medicamento_id);
        selectLote.value = loteId;

        // Escanear o QR code de um lote fisico normalmente
        // significa "esse remedio esta saindo da farmacia agora"
        // - por isso ja deixamos o tipo pre-selecionado em SAIDA.
        document.getElementById('mov-tipo').value = 'SAIDA';
        document.getElementById('mov-quantidade').focus();

        mostrarMensagem(
            `Lote ${esc(lote.numero_lote)} (${esc(lote.medicamento_nome)}) selecionado via QR Code.`,
            'sucesso'
        );
    } catch (erro) {
        mostrarMensagem(erro.message, 'erro');
    }
}

// Se a pagina foi aberta com "?lote_id=123" na URL, ja seleciona
// esse lote assim que o formulario terminar de carregar.
async function verificarLoteNaUrl() {
    const parametros = new URLSearchParams(window.location.search);
    const loteId = parametros.get('lote_id');
    if (loteId) {
        await selecionarLotePorId(Number(loteId));
    }
}

// ---------- LEITOR DE QR CODE (CAMERA) ----------
//
// Usa a biblioteca jsQR (assets/js/jsQR.js) para procurar um QR
// code em cada quadro (frame) do video da camera. O processo:
//   1) pede permissao e liga a camera (getUserMedia);
//   2) a cada frame, desenha a imagem do video num <canvas>
//      "escondido" (invisivel na tela, so usado como rascunho);
//   3) le os pixels desse canvas e pergunta ao jsQR se tem
//      algum QR code ali;
//   4) se achar, para a camera e processa o resultado.

let streamDaCamera = null;
let leituraEmAndamento = false;

const canvasEscondido = document.createElement('canvas');
const contextoEscondido = canvasEscondido.getContext('2d', { willReadFrequently: true });

async function abrirLeitorQrCode() {
    const video = document.getElementById('video-leitor');

    try {
        // facingMode "environment" pede a camera TRASEIRA em
        // celulares (a frontal seria menos pratica para ler
        // codigos). Em notebooks sem camera traseira, o navegador
        // usa a unica camera disponivel mesmo assim.
        streamDaCamera = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
        });
    } catch (erro) {
        console.error(erro);
        mostrarMensagem(
            'Não foi possível acessar a câmera. Verifique se o navegador tem permissão.',
            'erro'
        );
        return;
    }

    video.srcObject = streamDaCamera;
    document.getElementById('leitor-qrcode').classList.add('aberto');
    document.getElementById('status-leitor').textContent = 'Aponte a câmera para o QR Code do lote...';

    leituraEmAndamento = true;
    requestAnimationFrame(processarProximoFrame);
}

function fecharLeitorQrCode() {
    leituraEmAndamento = false;

    if (streamDaCamera) {
        // Sempre parar as "tracks" da camera ao fechar - senao a
        // luzinha de "camera em uso" do navegador/notebook fica
        // ligada mesmo depois do leitor fechado.
        streamDaCamera.getTracks().forEach(faixa => faixa.stop());
        streamDaCamera = null;
    }

    document.getElementById('leitor-qrcode').classList.remove('aberto');
}

function processarProximoFrame() {
    if (!leituraEmAndamento) return;

    const video = document.getElementById('video-leitor');

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvasEscondido.width = video.videoWidth;
        canvasEscondido.height = video.videoHeight;
        contextoEscondido.drawImage(video, 0, 0, canvasEscondido.width, canvasEscondido.height);

        const imagem = contextoEscondido.getImageData(0, 0, canvasEscondido.width, canvasEscondido.height);
        const codigoEncontrado = jsQR(imagem.data, imagem.width, imagem.height);

        if (codigoEncontrado) {
            document.getElementById('status-leitor').textContent = 'QR Code encontrado!';
            processarTextoEscaneado(codigoEncontrado.data);
            fecharLeitorQrCode();
            return;
        }
    }

    requestAnimationFrame(processarProximoFrame);
}

function processarTextoEscaneado(texto) {
    try {
        const url = new URL(texto);
        const loteId = url.searchParams.get('lote_id');
        if (loteId) {
            selecionarLotePorId(Number(loteId));
        } else {
            mostrarMensagem('QR Code lido, mas não contém um lote válido do SIGEM.', 'erro');
        }
    } catch {
        mostrarMensagem('QR Code lido, mas o conteúdo não é um link válido.', 'erro');
    }
}

document.getElementById('btn-abrir-leitor').addEventListener('click', abrirLeitorQrCode);
document.getElementById('btn-fechar-leitor').addEventListener('click', fecharLeitorQrCode);

carregarFormulario().then(verificarLoteNaUrl);
carregarHistorico();
