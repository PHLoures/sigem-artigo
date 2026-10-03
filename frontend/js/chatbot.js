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
    const painel = document.getElementById('chatbot-painel');
    painel.classList.toggle('aberto');

    // Ao abrir, ja deixa o cursor pronto para digitar (depois da animacao)
    if (painel.classList.contains('aberto')) {
        setTimeout(() => document.getElementById('chatbot-input').focus(), 250);
    }
}

function adicionarMensagem(texto, classe) {
    const area = document.getElementById('chatbot-mensagens');
    const bolha = document.createElement('div');
    bolha.className = `chatbot-bolha ${classe}`;
    bolha.innerHTML = texto;
    area.appendChild(bolha);
    area.scrollTop = area.scrollHeight;
    return bolha;
}

function adicionarMensagemUsuario(texto) {
    return adicionarMensagem(texto, 'chatbot-bolha-usuario');
}

function adicionarMensagemBot(texto) {
    return adicionarMensagem(texto, 'chatbot-bolha-bot');
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

    // Bolha com tres pontinhos pulando enquanto o assistente "pensa"
    const digitando = adicionarMensagemBot('<span class="digitando"><i></i><i></i><i></i></span>');
    const inicio = Date.now();

    const respostaHtml = await responderPergunta(pergunta);

    // Mesmo quando a resposta e instantanea, deixa os pontinhos
    // aparecerem por um instante - sem isso eles apenas "piscariam".
    const faltaEsperar = 450 - (Date.now() - inicio);
    if (faltaEsperar > 0) {
        await new Promise((resolver) => setTimeout(resolver, faltaEsperar));
    }

    digitando.remove();
    adicionarMensagemBot(respostaHtml);
}

// ---------- MOTOR DE RESPOSTAS (baseado em palavras-chave) ----------
//
// Cada "intencao" abaixo e checada de forma INDEPENDENTE (nao
// para na primeira que bater) - assim, uma pergunta composta
// como "quero saber os vencidos E os proximos do vencimento"
// recebe as DUAS respostas, uma embaixo da outra, em vez de so
// a primeira que a gente detectar.
//
// A saudacao e a unica excecao: se o usuario so disse "oi", nao
// faz sentido tentar casar isso com as outras intencoes.
async function responderPergunta(perguntaOriginal) {
    const pergunta = normalizar(perguntaOriginal);

    if (contemAlguma(pergunta, ['oi', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'ajuda', 'o que voce faz'])) {
        return 'Posso te ajudar com informacoes sobre: medicamentos vencidos, proximos do vencimento, ' +
               'estoque baixo, previsao de esgotamento, estoque de um medicamento especifico, ' +
               'e as ultimas movimentacoes registradas. Voce tambem pode perguntar mais de uma ' +
               'coisa na mesma frase.';
    }

    const respostas = [];

    try {
        // Busca os dados uma unica vez e reaproveita em varias
        // intencoes, em vez de chamar a API repetida vezes.
        const dados = await obterDashboard();

        // 1) Pergunta sobre MEDICAMENTOS especificos (pode citar
        //    mais de um na mesma frase - por isso usamos filter,
        //    nao find, e percorremos todos os que baterem).
        const medicamentos = await chamarApi('/medicamentos');
        const medicamentosCitados = medicamentos.filter(m => pergunta.includes(normalizar(m.nome)));

        for (const medicamento of medicamentosCitados) {
            const lotes = await chamarApi(`/lotes/medicamento/${medicamento.id}`);
            const estoqueReal = lotes.reduce((soma, l) => soma + l.quantidade, 0);
            const totalEstoque = criseAtiva() ? estoqueEmCrise(estoqueReal, medicamento.estoque_minimo) : estoqueReal;
            const status = totalEstoque <= medicamento.estoque_minimo
                ? '<span class="badge badge-vermelho">Estoque baixo</span>'
                : '<span class="badge badge-verde">Estoque normal</span>';

            respostas.push(
                `<strong>${medicamento.nome}</strong>: ${totalEstoque} unidades em estoque ` +
                `(${lotes.length} lote${lotes.length === 1 ? '' : 's'}), estoque minimo de ${medicamento.estoque_minimo}. ${status}`
            );
        }

        // 2) Vencidos (checado ANTES de "proximo do vencimento",
        //    porque "vencid" e mais especifico que "venc")
        if (contemAlguma(pergunta, ['vencid', 'ja venceu', 'ja passou da validade'])) {
            if (dados.vencidos.length === 0) {
                respostas.push('✅ Nenhum medicamento vencido no momento.');
            } else {
                const itens = dados.vencidos
                    .map(v => `${v.medicamento_nome} (lote ${v.numero_lote}, venceu em ${formatarData(v.data_validade)})`)
                    .join('<br>');
                respostas.push(`🔴 Medicamentos vencidos:<br>${itens}`);
            }
        }

        // 3) Proximo do vencimento
        if (contemAlguma(pergunta, ['proxim', 'venc', 'validade'])) {
            if (dados.proximosVencimento.length === 0) {
                respostas.push('✅ Nenhum lote proximo do vencimento nos proximos 30 dias.');
            } else {
                const itens = dados.proximosVencimento
                    .map(v => `${v.medicamento_nome} (lote ${v.numero_lote}, vence em ${formatarData(v.data_validade)})`)
                    .join('<br>');
                respostas.push(`🟠 Proximos do vencimento:<br>${itens}`);
            }
        }

        // 4) Previsao de esgotamento
        if (contemAlguma(pergunta, ['esgota', 'previsao', 'quando acaba', 'vai acabar'])) {
            const previsao = await obterPrevisao();
            const comDados = previsao.filter(p => p.dias_ate_esgotar !== null);

            if (comDados.length === 0) {
                respostas.push('Ainda nao ha saidas suficientes registradas para calcular uma previsao confiavel.');
            } else {
                const itens = comDados
                    .slice(0, 3)
                    .map(p => `${p.nome}: esgota em ${Number(p.dias_ate_esgotar)} dias`)
                    .join('<br>');
                respostas.push(`📉 Previsao (mais urgentes primeiro):<br>${itens}`);
            }
        }

        // 5) Estoque baixo / acabando
        if (contemAlguma(pergunta, ['estoque baixo', 'acabando', 'faltando', 'baixo'])) {
            if (dados.estoqueBaixo.length === 0) {
                respostas.push('✅ Nenhum medicamento com estoque baixo no momento.');
            } else {
                const itens = dados.estoqueBaixo
                    .map(e => `${e.nome}: ${e.quantidade_total} unidades (minimo: ${e.estoque_minimo})`)
                    .join('<br>');
                respostas.push(`🔴 Estoque baixo:<br>${itens}`);
            }
        }

        // 6) Totais gerais
        if (contemAlguma(pergunta, ['quantos medicamentos', 'total de medicamentos', 'quantos tipos'])) {
            respostas.push(`Temos <strong>${dados.totalMedicamentos}</strong> medicamentos diferentes cadastrados no sistema.`);
        }

        if (contemAlguma(pergunta, ['estoque total', 'quantidade total', 'total em estoque', 'unidades em estoque'])) {
            respostas.push(`O estoque total (somando todos os lotes de todos os medicamentos) e de <strong>${dados.totalEstoque}</strong> unidades.`);
        }

        // 7) Historico / movimentacoes
        if (contemAlguma(pergunta, ['movimenta', 'historico', 'entrada', 'saida'])) {
            const ultimas = dados.ultimasMovimentacoes.slice(0, 3);
            if (ultimas.length === 0) {
                respostas.push('Nenhuma movimentacao registrada ainda.');
            } else {
                const itens = ultimas
                    .map(m => `${m.tipo} de ${m.quantidade} ${m.medicamento_nome} em ${formatarData(m.data_movimentacao)}`)
                    .join('<br>');
                respostas.push(`Ultimas movimentacoes:<br>${itens}`);
            }
        }

        // Nenhuma intencao bateu com nada na pergunta
        if (respostas.length === 0) {
            return 'Nao entendi essa pergunta 🤔. Tente perguntar sobre: medicamentos vencidos, ' +
                   'proximos do vencimento, estoque baixo, previsao de esgotamento, o nome de um ' +
                   'medicamento especifico, ou o historico de movimentacoes.';
        }

        const aviso = criseAtiva()
            ? '<strong>🚨 Modo crise ativo</strong> (dados simulados)<br><br>'
            : '';
        return aviso + respostas.join('<br><br>');
    } catch (erro) {
        console.error(erro);
        return 'Desculpa, tive um problema para buscar essa informacao. Tente novamente.';
    }
}

inicializarChatbot();
