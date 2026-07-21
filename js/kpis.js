/*
 * RodoviaVis — kpis.js
 * Responsável: Guilherme Castilho Machado (dados, arquitetura e integração)
 *
 * Painel de indicadores gerais (#painel-kpis). Usa Dados.porUfAno,
 * que tem uma linha por UF e ano com os totais já prontos — não
 * precisa recalcular nada em cima da base detalhada.
 *
 * Indicadores mostrados:
 *   1. total de acidentes;
 *   2. acidentes graves ou fatais;
 *   3. mortos;
 *   4. feridos graves;
 *   5. total de vítimas;
 *   6. taxa de gravidade.
 *
 * Regra importante: a taxa de gravidade NUNCA é a média nem a soma
 * das taxas de cada UF. Cada UF tem um volume de acidentes muito
 * diferente (São Paulo e Roraima não podem pesar igual), então a
 * taxa é sempre recalculada em cima dos totais já filtrados:
 *
 *   taxaGravidade = totalAcidentes > 0
 *       ? totalGravesFatais / totalAcidentes
 *       : 0
 */

const CARTOES_KPI = [
    { id: 'total-acidentes', titulo: 'Total de acidentes' },
    { id: 'total-graves-fatais', titulo: 'Acidentes graves ou fatais' },
    { id: 'total-mortos', titulo: 'Mortos' },
    { id: 'total-feridos-graves', titulo: 'Feridos graves' },
    { id: 'total-vitimas', titulo: 'Total de vítimas' },
    { id: 'taxa-gravidade', titulo: 'Taxa de gravidade' },
];

const KPIs = {

    dados: [],

    iniciar: function (dados) {
        KPIs.dados = Array.isArray(dados.porUfAno) ? dados.porUfAno : [];

        criarEstruturaDosCartoes();

        KPIs.atualizar(obterFiltros());
    },

    atualizar: function (filtros) {
        const dadosFiltrados = filtrarPorEstado(KPIs.dados, filtros);

        if (!possuiDados(dadosFiltrados)) {
            zerarCartoes();
            mostrarMensagemVazia('#painel-kpis', 'Nenhum acidente encontrado para os filtros selecionados.');
            return;
        }

        removerMensagemVazia('#painel-kpis');

        const totalAcidentes = d3.sum(dadosFiltrados, function (d) { return d.total_acidentes; });
        const totalGravesFatais = d3.sum(dadosFiltrados, function (d) { return d.total_graves_fatais; });
        const totalMortos = d3.sum(dadosFiltrados, function (d) { return d.total_mortos; });
        const totalFeridosGraves = d3.sum(dadosFiltrados, function (d) { return d.total_feridos_graves; });
        const totalVitimas = d3.sum(dadosFiltrados, function (d) { return d.total_vitimas; });

        // Nunca fazer d3.sum(dadosFiltrados, d => d.taxa_gravidade) nem
        // média das taxas por UF — tem que ser recalculada em cima
        // dos totais acima, como explicado no comentário do topo.
        const taxaGravidade = totalAcidentes > 0 ? (totalGravesFatais / totalAcidentes) : 0;

        atualizarValorDoCartao('total-acidentes', formatarNumero(totalAcidentes));
        atualizarValorDoCartao('total-graves-fatais', formatarNumero(totalGravesFatais));
        atualizarValorDoCartao('total-mortos', formatarNumero(totalMortos));
        atualizarValorDoCartao('total-feridos-graves', formatarNumero(totalFeridosGraves));
        atualizarValorDoCartao('total-vitimas', formatarNumero(totalVitimas));
        atualizarValorDoCartao('taxa-gravidade', formatarPercentual(taxaGravidade));
    }

};

// ===== ESTRUTURA DOS CARTÕES =====
// Criada uma única vez em iniciar(). As atualizações seguintes só
// trocam o texto do valor de cada cartão.

function criarEstruturaDosCartoes() {
    const cartoes = d3.select('#painel-kpis')
        .selectAll('.cartao-kpi')
        .data(CARTOES_KPI, function (d) {
            return d.id;
        })
        .join(
            function (enter) {
                const novosCartoes = enter
                    .append('article')
                    .attr('class', 'cartao-kpi')
                    .attr('id', function (d) {
                        return 'cartao-' + d.id;
                    });

                novosCartoes
                    .append('p')
                    .attr('class', 'cartao-kpi__titulo');

                novosCartoes
                    .append('p')
                    .attr('class', 'cartao-kpi__valor');

                return novosCartoes;
            },
            function (update) {
                return update;
            },
            function (exit) {
                return exit.remove();
            }
        );

    cartoes
        .select('.cartao-kpi__titulo')
        .text(function (d) {
            return d.titulo;
        });

    cartoes
        .select('.cartao-kpi__valor')
        .attr('id', function (d) {
            return 'valor-' + d.id;
        })
        .text('-');
}

function atualizarValorDoCartao(id, textoFormatado) {
    d3.select('#valor-' + id).text(textoFormatado);
}

function zerarCartoes() {
    CARTOES_KPI.forEach(function (cartao) {
        atualizarValorDoCartao(cartao.id, '-');
    });
}