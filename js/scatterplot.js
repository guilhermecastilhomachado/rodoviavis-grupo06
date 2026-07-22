/*
 * RodoviaVis — scatterplot.js
 * Implementação visual inicial: Wothon de Araujo
 * Refatoração e integração: Guilherme Castilho Machado
 * Perfil de risco por UF integrado ao estado global do RodoviaVis.
 * Codificação: acidentes no eixo X, taxa de gravidade no eixo Y,
 * mortos no raio e região na cor.
 */

const Scatterplot = (function () {
    const CONFIG = {
        largura: 900,
        altura: 620,
        margem: { superior: 56, direita: 190, inferior: 60, esquerda: 70 }
    };

    const LARGURA_GRAFICO = CONFIG.largura - CONFIG.margem.esquerda - CONFIG.margem.direita;
    const ALTURA_GRAFICO = CONFIG.altura - CONFIG.margem.superior - CONFIG.margem.inferior;

    const CORES_REGIAO = {
        Norte: '#2E86DE',
        Nordeste: '#F39C12',
        'Centro-Oeste': '#27AE60',
        Sudeste: '#C0392B',
        Sul: '#8E44AD'
    };

    const ESTADO = {
        dadosBrutos: [],
        svg: null,
        grupoPrincipal: null,
        grupoQuadrantes: null,
        grupoPontos: null,
        grupoBrush: null,
        legendaRaioGrupo: null,
        grupoEixoX: null,
        grupoEixoY: null,
        escalaX: d3.scaleLinear().range([0, LARGURA_GRAFICO]),
        escalaY: d3.scaleLinear().range([ALTURA_GRAFICO, 0]),
        escalaRaio: d3.scaleSqrt().range([6, 30]),
        comportamentoBrush: null
    };

    // ===== ESTRUTURA (criada uma única vez) =====

    function construirBaseSVG() {
        const container = d3.select('#scatterplot-container');

        const areaRolagem = container
            .selectAll('div.scatterplot-area-rolagem')
            .data([null])
            .join('div')
            .attr('class', 'scatterplot-area-rolagem');

        ESTADO.svg = areaRolagem
            .selectAll('svg.scatterplot-svg')
            .data([null])
            .join('svg')
            .attr('class', 'scatterplot-svg')
            .attr('viewBox', `0 0 ${CONFIG.largura} ${CONFIG.altura}`)
            .attr('preserveAspectRatio', 'xMidYMid meet');

        ESTADO.svg.selectAll('*').remove();

        ESTADO.svg.append('text')
            .attr('class', 'scatterplot-titulo')
            .attr('x', CONFIG.largura / 2)
            .attr('y', 26)
            .attr('text-anchor', 'middle')
            .text('Perfil de risco por UF');

        ESTADO.grupoPrincipal = ESTADO.svg.append('g')
            .attr('transform', `translate(${CONFIG.margem.esquerda},${CONFIG.margem.superior})`);

        ESTADO.grupoEixoX = ESTADO.grupoPrincipal.append('g')
            .attr('class', 'scatterplot-eixo scatterplot-eixo-x')
            .attr('transform', `translate(0,${ALTURA_GRAFICO})`);

        ESTADO.grupoEixoY = ESTADO.grupoPrincipal.append('g')
            .attr('class', 'scatterplot-eixo scatterplot-eixo-y');

        ESTADO.svg.append('text')
            .attr('class', 'scatterplot-rotulo-eixo')
            .attr('x', CONFIG.margem.esquerda + LARGURA_GRAFICO / 2)
            .attr('y', CONFIG.altura - 14)
            .attr('text-anchor', 'middle')
            .text('Total de acidentes');

        ESTADO.svg.append('text')
            .attr('class', 'scatterplot-rotulo-eixo')
            .attr('transform', 'rotate(-90)')
            .attr('x', -(CONFIG.margem.superior + ALTURA_GRAFICO / 2))
            .attr('y', 16)
            .attr('text-anchor', 'middle')
            .text('Taxa de gravidade');

        ESTADO.grupoQuadrantes = ESTADO.grupoPrincipal
            .append('g')
            .attr('class', 'scatterplot-quadrantes');

        ESTADO.comportamentoBrush = d3.brush()
            .extent([[0, 0], [LARGURA_GRAFICO, ALTURA_GRAFICO]])
            .on('end', tratarFimDoBrush);

        ESTADO.grupoBrush = ESTADO.grupoPrincipal
            .append('g')
            .attr('class', 'scatterplot-brush')
            .call(ESTADO.comportamentoBrush);

        ESTADO.grupoPontos = ESTADO.grupoPrincipal
            .append('g')
            .attr('class', 'scatterplot-pontos');

        construirLegendas();
    }

    function construirLegendas() {
        const xLegendas = CONFIG.largura - CONFIG.margem.direita + 30;

        const legendaRegiao = ESTADO.svg.append('g')
            .attr('class', 'scatterplot-legenda-regiao')
            .attr('transform', `translate(${xLegendas}, ${CONFIG.margem.superior})`);

        Object.keys(CORES_REGIAO).forEach(function (regiao, indice) {
            const linha = legendaRegiao.append('g')
                .attr('transform', `translate(0, ${indice * 20})`);

            linha.append('circle')
                .attr('r', 6)
                .attr('fill', CORES_REGIAO[regiao]);

            linha.append('text')
                .attr('x', 12)
                .attr('y', 4)
                .text(regiao);
        });

        ESTADO.legendaRaioGrupo = ESTADO.svg.append('g')
            .attr('class', 'scatterplot-legenda-raio')
            .attr('transform', `translate(${xLegendas}, ${CONFIG.margem.superior + 130})`);

        ESTADO.legendaRaioGrupo.append('text')
            .attr('class', 'scatterplot-legenda-raio-titulo')
            .attr('y', -10)
            .text('Mortos');
    }

    function atualizarLegendaDeRaio() {
        const maximo = ESTADO.escalaRaio.domain()[1] || 1;
        const referencias = [maximo * 0.25, maximo * 0.5, maximo].map(function (valor) {
            return Math.round(valor);
        });

        const grupos = ESTADO.legendaRaioGrupo.selectAll('g.scatterplot-legenda-raio-item')
            .data(referencias)
            .join('g')
            .attr('class', 'scatterplot-legenda-raio-item')
            .attr('transform', function (d, i) { return `translate(20, ${i * 68 + 25})`; });

        grupos.selectAll('circle')
            .data(function (d) { return [d]; })
            .join('circle')
            .attr('r', function (d) { return ESTADO.escalaRaio(d); })
            .attr('fill', 'none');

        grupos.selectAll('text')
            .data(function (d) { return [d]; })
            .join('text')
            .attr('x', 40)
            .attr('y', 4)
            .text(function (d) { return formatarNumero(d); });
    }

    // ===== RENDERIZAÇÃO =====

    function renderizar(dadosPorUf, filtros) {
        const pontos = Array.from(dadosPorUf, function (par) {
            return Object.assign({ uf: par[0] }, par[1]);
        });

        ESTADO.grupoBrush.call(
            ESTADO.comportamentoBrush.move,
            null
        );

        ESTADO.escalaX.domain([0, d3.max(pontos, function (d) { return d.total_acidentes; }) || 1]).nice();
        ESTADO.escalaY.domain([0, d3.max(pontos, function (d) { return d.taxa_gravidade; }) || 1]).nice();
        ESTADO.escalaRaio.domain([0, d3.max(pontos, function (d) { return d.total_mortos; }) || 1]);

        ESTADO.grupoEixoX.transition().duration(500).call(
            d3.axisBottom(ESTADO.escalaX).ticks(6).tickFormat(formatarNumero)
        );
        ESTADO.grupoEixoY.transition().duration(500).call(
            d3.axisLeft(ESTADO.escalaY).ticks(6).tickFormat(formatarPercentual)
        );

        atualizarLegendaDeRaio();
        desenharQuadrantes(pontos);

        ESTADO.grupoPontos.selectAll('circle.scatterplot-ponto')
            .data(pontos, function (d) { return d.uf; })
            .join('circle')
            .attr('class', 'scatterplot-ponto')
            .attr('tabindex', 0)
            .attr('role', 'button')
            .attr('aria-label', function (d) {
                return `${d.uf}, região ${d.regiao}: ${formatarNumero(d.total_acidentes)} acidentes, ` +
                    `taxa de gravidade ${formatarPercentual(d.taxa_gravidade)}, ${formatarNumero(d.total_mortos)} mortos`;
            })
            .classed('scatterplot-ponto-selecionado', function (d) { return d.uf === filtros.uf; })
            .on('mouseover', manipularMouseOver)
            .on('mousemove', moverTooltip)
            .on('mouseleave', esconderTooltip)
            .on('click', function (evento, d) { manipularClique(d); })
            .on('keydown', function (evento, d) { manipularKeydown(evento, d); })
            .transition()
            .duration(600)
            .attr('cx', function (d) { return ESTADO.escalaX(d.total_acidentes); })
            .attr('cy', function (d) { return ESTADO.escalaY(d.taxa_gravidade); })
            .attr('r', function (d) { return ESTADO.escalaRaio(d.total_mortos); })
            .attr('fill', function (d) { return CORES_REGIAO[d.regiao] || '#94a3b8'; })
            .attr('opacity', function (d) {
                return !filtros.uf || d.uf === filtros.uf ? 0.85 : 0.25;
            });
    }

    function desenharQuadrantes(pontos) {
        const mediaX = d3.mean(pontos, function (d) { return d.total_acidentes; }) || 0;
        const mediaY = d3.mean(pontos, function (d) { return d.taxa_gravidade; }) || 0;

        const linhas = [
            { id: 'vertical', x1: ESTADO.escalaX(mediaX), x2: ESTADO.escalaX(mediaX), y1: 0, y2: ALTURA_GRAFICO },
            { id: 'horizontal', x1: 0, x2: LARGURA_GRAFICO, y1: ESTADO.escalaY(mediaY), y2: ESTADO.escalaY(mediaY) }
        ];

        ESTADO.grupoQuadrantes.selectAll('line.scatterplot-linha-media')
            .data(linhas, function (d) { return d.id; })
            .join('line')
            .attr('class', 'scatterplot-linha-media')
            .attr('x1', function (d) { return d.x1; })
            .attr('x2', function (d) { return d.x2; })
            .attr('y1', function (d) { return d.y1; })
            .attr('y2', function (d) { return d.y2; });
    }

    // ===== INTERAÇÃO =====

    function manipularMouseOver(evento, d) {
        const html = [
            `<strong>${d.uf}</strong> — ${d.regiao}`,
            `Total de acidentes: ${formatarNumero(d.total_acidentes)}`,
            `Graves ou fatais: ${formatarNumero(d.total_graves_fatais)}`,
            `Mortos: ${formatarNumero(d.total_mortos)}`,
            `Feridos graves: ${formatarNumero(d.total_feridos_graves)}`,
            `Total de vítimas: ${formatarNumero(d.total_vitimas)}`,
            `Taxa de gravidade: ${formatarPercentual(d.taxa_gravidade)}`
        ].join('<br>');

        mostrarTooltip(html, evento);
    }

    function manipularClique(d) {
        const filtrosAtuais = obterFiltros();
        definirFiltro('uf', filtrosAtuais.uf === d.uf ? null : d.uf);
    }

    function manipularKeydown(evento, d) {
        if (evento.key === 'Enter' || evento.key === ' ') {
            evento.preventDefault();
            manipularClique(d);
        }
    }

    // O brush é só uma exploração local: destaca visualmente os
    // pontos dentro da área arrastada, sem alterar o filtro global
    // de UF (que só aceita uma UF por vez — ver js/state.js).
    function tratarFimDoBrush(evento) {
        if (!evento.selection) {
            ESTADO.grupoPontos
                .selectAll('.scatterplot-ponto')
                .classed('scatterplot-ponto-brush', false);

            return;
        }

        if (!evento.sourceEvent) {
            return;
        }

        const [[x0, y0], [x1, y1]] = evento.selection;

        ESTADO.grupoPontos
            .selectAll('.scatterplot-ponto')
            .classed('scatterplot-ponto-brush', function (d) {
                const cx = ESTADO.escalaX(d.total_acidentes);
                const cy = ESTADO.escalaY(d.taxa_gravidade);

                return cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1;
            });
    }

    // ===== CONTRATO DO MÓDULO =====

    function iniciar(dadosIniciais) {
        ESTADO.dadosBrutos = dadosIniciais.porDataUf;
        construirBaseSVG();
        atualizar(obterFiltros());
    }

    function atualizar(filtros) {
        const filtrosComparativos = Object.assign({}, filtros, {
            uf: null
        });

        const dadosPorUf = agregarPorUf(
            ESTADO.dadosBrutos,
            filtrosComparativos
        );

        if (dadosPorUf.size === 0) {
            ESTADO.svg.attr('hidden', true);
            mostrarMensagemVazia('#scatterplot-container', 'Nenhum acidente encontrado para os filtros selecionados.');
            return;
        }

        ESTADO.svg.attr('hidden', null);
        removerMensagemVazia('#scatterplot-container');
        renderizar(dadosPorUf, filtros);
    }

    return {
        iniciar,
        atualizar
    };
})();