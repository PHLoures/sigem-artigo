// comparativo.js
//
// Preenche os cards "ao vivo" da pagina comparativo.html com o que o
// sistema detectou nos dados reais (ou simulados, se o modo crise
// estiver ligado).

async function carregarCardsAoVivo() {
    const container = document.getElementById('cards-ao-vivo');
    try {
        const dados = await obterDashboard();

        const qtdVencidos = dados.vencidos.length;
        const qtdProximos = dados.proximosVencimento.length;
        const qtdBaixo = dados.estoqueBaixo.length;

        container.innerHTML = `
            <div class="card ${qtdVencidos > 0 ? 'alerta-vermelho' : 'alerta-verde'}">
                <div class="card-titulo">Lotes vencidos detectados</div>
                <div class="card-valor">${qtdVencidos}</div>
            </div>
            <div class="card ${qtdProximos > 0 ? 'alerta-amarelo' : 'alerta-verde'}">
                <div class="card-titulo">Lotes perto de vencer</div>
                <div class="card-valor">${qtdProximos}</div>
            </div>
            <div class="card ${qtdBaixo > 0 ? 'alerta-vermelho' : 'alerta-verde'}">
                <div class="card-titulo">Medicamentos com estoque baixo</div>
                <div class="card-valor">${qtdBaixo}</div>
            </div>
        `;
    } catch (erro) {
        container.innerHTML = `<div class="mensagem mensagem-erro">${erro.message}</div>`;
    }
}

carregarCardsAoVivo();
