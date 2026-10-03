// comparativo.js
//
// Preenche os cards "ao vivo" da pagina comparativo.html com o que o
// sistema detectou nos dados reais.

async function carregarCardsAoVivo() {
    const container = document.getElementById('cards-ao-vivo');
    try {
        const dados = await obterDashboard();

        const qtdVencidos = dados.vencidos.length;
        const qtdProximos = dados.proximosVencimento.length;
        const qtdBaixo = dados.estoqueBaixo.length;

        const cartao = (tom, ico, titulo, valor) => `
            <div class="card ${tom}">
                <div class="card-topo"><span class="card-icone">${icone(ico)}</span><span class="card-titulo">${titulo}</span></div>
                <div class="card-valor">${valor}</div>
            </div>`;

        container.innerHTML =
            cartao(qtdVencidos > 0 ? 'alerta-vermelho' : 'alerta-verde', 'calendario-x', 'Lotes vencidos detectados', qtdVencidos) +
            cartao(qtdProximos > 0 ? 'alerta-amarelo' : 'alerta-verde', 'relogio', 'Lotes perto de vencer', qtdProximos) +
            cartao(qtdBaixo > 0 ? 'alerta-vermelho' : 'alerta-verde', 'pacote', 'Medicamentos com estoque baixo', qtdBaixo);
    } catch (erro) {
        container.innerHTML = `<div class="mensagem mensagem-erro">${erro.message}</div>`;
    }
}

carregarCardsAoVivo();
