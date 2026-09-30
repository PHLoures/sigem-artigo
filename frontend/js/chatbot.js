// chatbot.js
//
// Assistente de busca por palavras-chave. NAO e uma IA de
// verdade (nao usa nenhum servico externo pago) - e um sistema
// baseado em REGRAS: o codigo procura certas palavras na
// pergunta do usuario e decide qual informacao mostrar, sempre
// puxando dados reais da nossa propria API.
//
// Isso e chamado de "chatbot baseado em intencoes" (rule-based
// chatbot) - uma tecnica classica e bem mais simples que IA
// generativa, mas que funciona bem para um conjunto pequeno e
// prevesivel de perguntas, como e o caso aqui.

// Injeta o HTML do widget (botao flutuante + painel de chat) em
// qualquer pagina que carregue este arquivo - assim nao
// precisamos colar o mesmo HTML em 5 arquivos diferentes.
function inicializarChatbot() {
    const widget = document.createElement('div');
    widget.innerHTML = `
        <button type="button" class="chatbot-botao" id="chatbot-botao" title="Assistente SIGEM">💬</button>
        <div class="chatbot-painel" id="chatbot-painel">
            <div class="chatbot-cabecalho">
                <span>🤖 Assistente SIGEM</span>
                <button type="button" class="chatbot-fechar" id="chatbot-fechar">✕</button>
            </div>
            <div class="chatbot-mensagens" id="chatbot-mensagens"></div>
            <form class="chatbot-form" id="chatbot-form">
                <input type="text" id="chatbot-input" placeholder="Pergunte algo..." autocomplete="off">
                <button type="submit" class="btn-primario">Enviar</button>
            </form>
        </div>
    `;
    document.body.appendChild(widget);

    document.getElementById('chatbot-botao').addEventListener('click', abrirFecharChatbot);
    document.getElementById('chatbot-fechar').addEventListener('click', abrirFecharChatbot);
    document.getElementById('chatbot-form').addEventListener('submit', enviarPergunta);

    adicionarMensagemBot(
        'Oi! Eu sou o assistente do SIGEM. Pergunte coisas como ' +
        '"medicamentos vencidos", "o que esta acabando", "estoque de dipirona" ' +
        'ou "previsao de esgotamento".'
    );
}

function abrirFecharChatbot() {
    document.getElementById('chatbot-painel').classList.toggle('aberto');
}

function adicionarMensagem(texto, classe) {
    const area = document.getElementById('chatbot-mensagens');
    const bolha = document.createElement('div');
    bolha.className = `chatbot-bolha ${classe}`;
    bolha.innerHTML = texto;
    area.appendChild(bolha);
    area.scrollTop = area.scrollHeight;
}

function adicionarMensagemUsuario(texto) {
    adicionarMensagem(texto, 'chatbot-bolha-usuario');
}

function adicionarMensagemBot(texto) {
    adicionarMensagem(texto, 'chatbot-bolha-bot');
}

// Remove acentos e deixa tudo minusculo, para a comparacao de
// palavras-chave funcionar mesmo se o usuario nao usar acento
// (ex: "vencidos" ou "vencídos" devem dar o mesmo resultado).
function normalizar(texto) {
    return texto
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '');
}

function contemAlguma(textoNormalizado, palavras) {
    return palavras.some(palavra => textoNormalizado.includes(palavra));
}

async function enviarPergunta(evento) {
    evento.preventDefault();
    const input = document.getElementById('chatbot-input');
    const pergunta = input.value.trim();
    if (!pergunta) return;

    adicionarMensagemUsuario(pergunta);
    input.value = '';

    const respostaHtml = await responderPergunta(pergunta);
    adicionarMensagemBot(respostaHtml);
}

// ---------- MOTOR DE RESPOSTAS (baseado em palavras-chave) ----------
//
// Cada "intencao" e checada em ordem, da mais especifica para a
// mais generica. A primeira que bater com alguma palavra da
// pergunta e a que responde.
async function responderPergunta(perguntaOriginal) {
    const pergunta = normalizar(perguntaOriginal);

    try {
        // 1) Saudacao / ajuda
        if (contemAlguma(pergunta, ['oi', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'ajuda', 'o que voce faz'])) {
            return 'Posso te ajudar com informacoes sobre: medicamentos vencidos, proximos do vencimento, ' +
                   'estoque baixo, previsao de esgotamento, estoque de um medicamento especifico, ' +
                   'e as ultimas movimentacoes registradas.';
        }

        // 2) Pergunta sobre um MEDICAMENTO especifico (procura o
        //    nome de algum medicamento cadastrado dentro da pergunta)
        const medicamentos = await chamarApi('/medicamentos');
        const medicamentoCitado = medicamentos.find(m => pergunta.includes(normalizar(m.nome)));

        if (medicamentoCitado) {
            const lotes = await chamarApi(`/lotes/medicamento/${medicamentoCitado.id}`);
            const totalEstoque = lotes.reduce((soma, l) => soma + l.quantidade, 0);
            const status = totalEstoque <= medicamentoCitado.estoque_minimo
                ? '<span class="badge badge-vermelho">Estoque baixo</span>'
                : '<span class="badge badge-verde">Estoque normal</span>';

            return `<strong>${medicamentoCitado.nome}</strong>: ${totalEstoque} unidades em estoque ` +
                   `(${lotes.length} lote${lotes.length === 1 ? '' : 's'}), estoque minimo de ${medicamentoCitado.estoque_minimo}. ${status}`;
        }

        // 3) Vencidos (checar ANTES de "proximo do vencimento",
        //    porque "vencid" e mais especifico que "venc")
        if (contemAlguma(pergunta, ['vencid', 'ja venceu', 'ja passou da validade'])) {
            const dados = await chamarApi('/dashboard');
            if (dados.vencidos.length === 0) {
                return '✅ Nenhum medicamento vencido no momento.';
            }
            const itens = dados.vencidos
                .map(v => `${v.medicamento_nome} (lote ${v.numero_lote}, venceu em ${formatarData(v.data_validade)})`)
                .join('<br>');
            return `🔴 Medicamentos vencidos:<br>${itens}`;
        }

        // 4) Proximo do vencimento
        if (contemAlguma(pergunta, ['venc', 'validade'])) {
            const dados = await chamarApi('/dashboard');
            if (dados.proximosVencimento.length === 0) {
                return '✅ Nenhum lote proximo do vencimento nos proximos 30 dias.';
            }
            const itens = dados.proximosVencimento
                .map(v => `${v.medicamento_nome} (lote ${v.numero_lote}, vence em ${formatarData(v.data_validade)})`)
                .join('<br>');
            return `🟠 Proximos do vencimento:<br>${itens}`;
        }

        // 5) Previsao de esgotamento
        if (contemAlguma(pergunta, ['esgota', 'previsao', 'quando acaba', 'vai acabar'])) {
            const previsao = await chamarApi('/previsao-estoque');
            const comDados = previsao.filter(p => p.dias_ate_esgotar !== null);

            if (comDados.length === 0) {
                return 'Ainda nao ha saidas suficientes registradas para calcular uma previsao confiavel.';
            }

            const itens = comDados
                .slice(0, 3)
                .map(p => `${p.nome}: esgota em ${Number(p.dias_ate_esgotar)} dias`)
                .join('<br>');
            return `📉 Previsao (mais urgentes primeiro):<br>${itens}`;
        }

        // 6) Estoque baixo / acabando
        if (contemAlguma(pergunta, ['estoque baixo', 'acabando', 'faltando', 'baixo'])) {
            const dados = await chamarApi('/dashboard');
            if (dados.estoqueBaixo.length === 0) {
                return '✅ Nenhum medicamento com estoque baixo no momento.';
            }
            const itens = dados.estoqueBaixo
                .map(e => `${e.nome}: ${e.quantidade_total} unidades (minimo: ${e.estoque_minimo})`)
                .join('<br>');
            return `🔴 Estoque baixo:<br>${itens}`;
        }

        // 7) Totais gerais
        if (contemAlguma(pergunta, ['quantos medicamentos', 'total de medicamentos', 'quantos tipos'])) {
            const dados = await chamarApi('/dashboard');
            return `Temos <strong>${dados.totalMedicamentos}</strong> medicamentos diferentes cadastrados no sistema.`;
        }

        if (contemAlguma(pergunta, ['estoque total', 'quantidade total', 'total em estoque', 'unidades em estoque'])) {
            const dados = await chamarApi('/dashboard');
            return `O estoque total (somando todos os lotes de todos os medicamentos) e de <strong>${dados.totalEstoque}</strong> unidades.`;
        }

        // 8) Historico / movimentacoes
        if (contemAlguma(pergunta, ['movimenta', 'historico', 'entrada', 'saida'])) {
            const dados = await chamarApi('/dashboard');
            const ultimas = dados.ultimasMovimentacoes.slice(0, 3);
            if (ultimas.length === 0) {
                return 'Nenhuma movimentacao registrada ainda.';
            }
            const itens = ultimas
                .map(m => `${m.tipo} de ${m.quantidade} ${m.medicamento_nome} em ${formatarData(m.data_movimentacao)}`)
                .join('<br>');
            return `Ultimas movimentacoes:<br>${itens}`;
        }

        // 9) Nao entendeu nenhuma das intencoes acima
        return 'Nao entendi essa pergunta 🤔. Tente perguntar sobre: medicamentos vencidos, ' +
               'proximos do vencimento, estoque baixo, previsao de esgotamento, o nome de um ' +
               'medicamento especifico, ou o historico de movimentacoes.';
    } catch (erro) {
        console.error(erro);
        return 'Desculpa, tive um problema para buscar essa informacao. Tente novamente.';
    }
}

inicializarChatbot();
