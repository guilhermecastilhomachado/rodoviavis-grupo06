/*
 * RodoviaVis — timeline.js
 * Responsável: Guilherme Castilho Machado (dados, arquitetura e integração)
 *
 * Linha temporal auxiliar (#timeline-container). Não é uma
 * visualização analítica principal — é uma ferramenta de navegação:
 * mostra a métrica escolhida ao longo do tempo e permite selecionar
 * um período arrastando o mouse (d3.brushX), que vira o filtro
 * global de dataInicial/dataFinal.
 *
 * Fonte dos dados: Dados.porDataUf (uma linha por data e UF). Depois
 * de aplicar os filtros de ano/UF, é preciso agrupar de novo por
 * data, porque pode sobrar mais de uma UF no mesmo dia.
 *
 * Regra importante (a mesma do kpis.js): a taxa de gravidade de cada
 * dia é recalculada a partir dos totais do dia, nunca somada ou
 * tirada a média a partir das taxas que já vinham por UF.
 */

const MARGEM_TIMELINE = { superior: 16, direita: 24, inferior: 28, esquerda: 56 };
const LARGURA_TOTAL_TIMELINE = 700;
const ALTURA_TOTAL_TIMELINE = 220;
const LARGURA_TIMELINE = LARGURA_TOTAL_TIMELINE - MARGEM_TIMELINE.esquerda - MARGEM_TIMELINE.direita;
const ALTURA_TIMELINE = ALTURA_TOTAL_TIMELINE - MARGEM_TIMELINE.superior - MARGEM_TIMELINE.inferior;

const ROTULOS_METRICA = {
    total_acidentes: 'Total de acidentes',
    total_graves_fatais: 'Acidentes graves ou fatais',
    total_mortos: 'Mortos',
    total_feridos_graves: 'Feridos graves',
    total_vitimas: 'Total de vítimas',
    taxa_gravidade: 'Taxa de gravidade'
};

// Estado interno do módulo. Criado uma única vez em iniciar() e
// reaproveitado em toda atualização — só os dados desenhados mudam.
let dadosTimeline = [];
let metricaAtual = 'total_acidentes';

let grupoPrincipalTimeline;
let grupoEixoXTimeline;
let grupoEixoYTimeline;
let grupoLinhaTimeline;
let grupoBrushTimeline;

const escalaXTimeline = d3.scaleTime().range([0, LARGURA_TIMELINE]);
const escalaYTimeline = d3.scaleLinear().range([ALTURA_TIMELINE, 0]);

let geradorDeLinhaTimeline;
let comportamentoBrushTimeline;

const Timeline = {

    iniciar: function (dados) {
        dadosTimeline = Array.isArray(dados.porDataUf)
            ? dados.porDataUf.filter(function (d) {
                return d.data instanceof Date &&
                    !Number.isNaN(d.data.getTime());
            })
            : [];

        criarEstruturaSvgTimeline();

        Timeline.atualizar(obterFiltros());
    },

    atualizar: function (filtros) {
        metricaAtual = Object.prototype.hasOwnProperty.call(
            ROTULOS_METRICA,
            filtros.metrica
        )
            ? filtros.metrica
            : 'total_acidentes';

        /*
        * A Timeline controla dataInicial e dataFinal.
        * Por isso, ela respeita os demais filtros, mas não usa o próprio
        * intervalo para remover partes da linha temporal.
        */
        const filtrosDaTimeline = Object.assign({}, filtros, {
            dataInicial: null,
            dataFinal: null
        });

        const dadosFiltrados = filtrarPorEstado(
            dadosTimeline,
            filtrosDaTimeline
        );

        const pontos = agruparPorData(
            dadosFiltrados,
            metricaAtual
        );

        if (!possuiDados(pontos)) {
            grupoLinhaTimeline.selectAll('*').remove();
            grupoEixoYTimeline.selectAll('*').remove();

            grupoBrushTimeline.call(
                comportamentoBrushTimeline.move,
                null
            );

            mostrarMensagemVazia(
                '#timeline-container',
                'Nenhum acidente encontrado para os filtros selecionados.'
            );

            return;
        }

        removerMensagemVazia('#timeline-container');

        atualizarDominioDoEixoX(pontos);
        desenharLinha(pontos);
        sincronizarSelecaoDoBrush(filtros);
    }

};

// ===== ESTRUTURA (criada uma vez) =====

function criarEstruturaSvgTimeline() {
    const svg = d3.select('#timeline-container')
        .append('svg')
        .attr('viewBox', '0 0 ' + LARGURA_TOTAL_TIMELINE + ' ' + ALTURA_TOTAL_TIMELINE)
        .attr('class', 'timeline__svg')
        .attr('role', 'img')
        .attr('aria-label', 'Linha temporal dos acidentes. Arraste sobre o gráfico para selecionar um período.');


    grupoPrincipalTimeline = svg.append('g')
        .attr('transform', 'translate(' + MARGEM_TIMELINE.esquerda + ',' + MARGEM_TIMELINE.superior + ')');

    grupoEixoXTimeline = grupoPrincipalTimeline.append('g')
        .attr('class', 'timeline__eixo-x')
        .attr('transform', 'translate(0,' + ALTURA_TIMELINE + ')');

    grupoEixoYTimeline = grupoPrincipalTimeline.append('g')
        .attr('class', 'timeline__eixo-y');

    grupoBrushTimeline = grupoPrincipalTimeline
        .append('g')
        .attr('class', 'timeline__brush');

    grupoLinhaTimeline = grupoPrincipalTimeline
        .append('g')
        .attr('class', 'timeline__linha');

    geradorDeLinhaTimeline = d3.line()
        .x(function (d) { return escalaXTimeline(d.data); })
        .y(function (d) { return escalaYTimeline(d.valor); });

    comportamentoBrushTimeline = d3.brushX()
        .extent([[0, 0], [LARGURA_TIMELINE, ALTURA_TIMELINE]])
        .on('end', tratarFimDoBrush);

    grupoBrushTimeline.call(comportamentoBrushTimeline);
}

function atualizarDominioDoEixoX(pontos) {
    let extensaoDeDatas = d3.extent(
        pontos,
        function (d) {
            return d.data;
        }
    );

    if (!extensaoDeDatas[0] || !extensaoDeDatas[1]) {
        return;
    }

    /*
     * Evita um domínio de largura zero caso exista somente
     * uma data após a aplicação dos filtros.
     */
    if (
        extensaoDeDatas[0].getTime() ===
        extensaoDeDatas[1].getTime()
    ) {
        extensaoDeDatas = [
            extensaoDeDatas[0],
            d3.timeDay.offset(extensaoDeDatas[1], 1)
        ];
    }

    escalaXTimeline.domain(extensaoDeDatas);

    grupoEixoXTimeline.call(
        d3.axisBottom(escalaXTimeline)
            .ticks(8)
            .tickFormat(d3.timeFormat('%m/%Y'))
    );
}

// ===== AGRUPAMENTO POR DATA =====

function agruparPorData(dadosFiltrados, metrica) {
    const agrupado = d3.rollups(
        dadosFiltrados,
        function (registros) {
            const totalAcidentes = d3.sum(registros, function (d) { return d.total_acidentes; });
            const totalGravesFatais = d3.sum(registros, function (d) { return d.total_graves_fatais; });
            const totalMortos = d3.sum(registros, function (d) { return d.total_mortos; });
            const totalFeridosGraves = d3.sum(registros, function (d) { return d.total_feridos_graves; });
            const totalVitimas = d3.sum(registros, function (d) { return d.total_vitimas; });

            return {
                total_acidentes: totalAcidentes,
                total_graves_fatais: totalGravesFatais,
                total_mortos: totalMortos,
                total_feridos_graves: totalFeridosGraves,
                total_vitimas: totalVitimas,
                // recalculada a partir dos totais do dia, nunca somada
                // nem tirada a média a partir das taxas por UF.
                taxa_gravidade: totalAcidentes > 0 ? (totalGravesFatais / totalAcidentes) : 0
            };
        },
        function (d) { return +d.data; }
    );

    return agrupado
        .map(function (par) {
            const dataDoPonto = new Date(par[0]);
            const totaisDoDia = par[1];
            return {
                data: dataDoPonto,
                valor: totaisDoDia[metrica],
                totais: totaisDoDia
            };
        })
        .sort(function (a, b) { return a.data - b.data; });
}

// ===== DESENHO DA LINHA =====

function desenharLinha(pontos) {
    const maiorValor = d3.max(pontos, function (d) { return d.valor; });
    escalaYTimeline.domain([0, maiorValor > 0 ? maiorValor : 1]).nice();

    grupoEixoYTimeline.call(
        d3.axisLeft(escalaYTimeline)
            .ticks(5)
            .tickFormat(metricaAtual === 'taxa_gravidade' ? d3.format('.0%') : d3.format('~s'))
    );

    grupoLinhaTimeline.selectAll('.timeline__caminho')
        .data([pontos])
        .join('path')
        .attr('class', 'timeline__caminho')
        .attr('d', geradorDeLinhaTimeline);

    const raioDosPontos = pontos.length > 400 ? 1.5 : 3;
    const opacidadeDosPontos = pontos.length > 400 ? 0.45 : 0.85;
    
    grupoLinhaTimeline
        .selectAll('.timeline__ponto')
        .data(pontos, function (d) {
            return +d.data;
        })
        .join('circle')
        .attr('class', 'timeline__ponto')
        .attr('r', raioDosPontos)
        .attr('opacity', opacidadeDosPontos)
        .attr('cx', function (d) {
            return escalaXTimeline(d.data);
        })
        .attr('cy', function (d) {
            return escalaYTimeline(d.valor);
        })
        .on('mouseover', tratarMouseoverPonto)
        .on('mousemove', moverTooltip)
        .on('mouseout', esconderTooltip);
}

function tratarMouseoverPonto(event, d) {
    const rotulo = ROTULOS_METRICA[metricaAtual] || metricaAtual;
    const valorFormatado = metricaAtual === 'taxa_gravidade'
        ? formatarPercentual(d.valor)
        : formatarNumero(d.valor);

    mostrarTooltip(
        '<strong>' + formatarData(d.data) + '</strong><br>' + rotulo + ': ' + valorFormatado,
        event
    );
}

// ===== BRUSH (SELEÇÃO DE PERÍODO) =====

function tratarFimDoBrush(event) {
    // Quando o brush é reposicionado por código (sincronizarSelecaoDoBrush),
    // e não por um arraste real do usuário, sourceEvent vem nulo. Sem essa
    // checagem, sincronizar a seleção e reagir à seleção ficariam se
    // chamando em loop.
    if (!event.sourceEvent) {
        return;
    }

    if (!event.selection) {
        definirFiltros({ dataInicial: null, dataFinal: null });
        return;
    }

    const pixelInicial = event.selection[0];
    const pixelFinal = event.selection[1];

    const dataInicial = d3.timeDay.floor(
        escalaXtimeline.invert(pixelInicial)
    );

    const dataFinal = d3.timeDay.floor(
        escalaXtimeline.invert(pixelFinal)
    );

    definirFiltros({
        dataInicial: dataInicial,
        dataFinal: dataFinal
    });
}

function sincronizarSelecaoDoBrush(filtros) {
    if (filtros.dataInicial === null || filtros.dataFinal === null) {
        grupoBrushTimeline.call(comportamentoBrushTimeline.move, null);
        return;
    }

    grupoBrushTimeline.call(comportamentoBrushTimeline.move, [
        escalaXTimeline(filtros.dataInicial),
        escalaXTimeline(filtros.dataFinal)
    ]);
}