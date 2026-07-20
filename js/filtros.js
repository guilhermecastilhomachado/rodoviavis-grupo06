/*
 * RodoviaVis — filtros.js
 * Responsável: Guilherme Castilho Machado (dados, arquitetura e integração)
 *
 * Filtros que são realmente globais e afetam todos os layouts: ano,
 * UF, métrica e o botão de limpar. Filtros específicos de um único
 * layout (mês e fim de semana no calendário, causa e faixa de
 * horário na matriz, período na linha temporal) ficam por conta do
 * módulo dono daquele layout, não deste arquivo.
 *
 * As opções de cada <select> já estão fixas no index.html — os anos
 * (2022 a 2024) e as UFs não mudam durante a execução do sistema,
 * então não há necessidade de gerá-las via JS a partir dos dados.
 * Este arquivo só ouve os eventos dos controles e repassa para o
 * Estado global (state.js).
 */

const Filtros = {

    // app.js chama iniciar(dados) para todo módulo. Este módulo não
    // precisa dos dados carregados, porque as opções já estão no
    // HTML, mas mantém o parâmetro para respeitar o contrato comum.
    iniciar: function (dados) {
        d3.select('#filtro-ano')
            .on('change', tratarMudancaDeAno);

        d3.select('#filtro-uf')
            .on('change', tratarMudancaDeUf);

        d3.select('#filtro-metrica')
            .on('change', tratarMudancaDeMetrica);

        d3.select('#filtro-limpar')
            .on('click', tratarCliqueEmRestaurar);

        Filtros.atualizar(obterFiltros());
    },

    // Chamado sempre que o Estado muda, inclusive quando a mudança
    // veio de outro módulo (ex.: clique numa UF no mapa). Mantém os
    // <select> sincronizados com o estado atual.
    atualizar: function (filtros) {
        const valorAno = filtros.ano === null
            ? ''
            : String(filtros.ano);

        const valorUf = filtros.uf === null
            ? ''
            : filtros.uf;

        d3.select('#filtro-ano')
            .property('value', valorAno);

        d3.select('#filtro-uf')
            .property('value', valorUf);

        d3.select('#filtro-metrica')
            .property('value', filtros.metrica);

        atualizarBotaoLimpar();
    }

};

// ===== EVENTOS DOS FILTROS =====

function tratarMudancaDeAno(event) {
    const valorSelecionado = event.currentTarget.value;
    definirFiltro('ano', valorSelecionado === '' ? null : +valorSelecionado);
}

function tratarMudancaDeUf(event) {
    const valorSelecionado = event.currentTarget.value;
    definirFiltro('uf', valorSelecionado === '' ? null : valorSelecionado);
}

function tratarMudancaDeMetrica(event) {
    definirFiltro('metrica', event.currentTarget.value);
}

function tratarCliqueEmRestaurar() {
    resetarFiltros();
}

// ===== BOTÃO DE RESTAURAÇÃO =====
// Fica desabilitado quando a visualização já está no estado padrão.

function atualizarBotaoLimpar() {
    d3.select('#filtro-limpar').property('disabled', !existeFiltroAtivo());
}