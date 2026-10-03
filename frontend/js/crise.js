// crise.js
//
// Atalhos para buscar os dados do dashboard e da previsao de estoque.
// (O antigo "modo crise" foi removido do sistema.)

function obterDashboard() {
    return chamarApi('/dashboard');
}

function obterPrevisao() {
    return chamarApi('/previsao-estoque');
}
