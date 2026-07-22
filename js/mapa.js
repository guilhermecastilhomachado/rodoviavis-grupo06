/*
 * RodoviaVis — mapa.js
 * Implementação visual inicial: Wothon de Araujo
 * Refatoração e integração: Guilherme Castilho Machado
 *
 * Mapa coroplético integrado ao estado global do RodoviaVis
 * Recebe os dados pelo app.js e implementa o contrato
 * iniciar(dados) / atualizar(filtros).
 */

const Mapa = (function () {
    const CONFIG = {
        largura: 950,
        altura: 650,
        zoomMinimo: 1,
        zoomMaximo: 8,
        caminhoGeoJSON: 'data/geo/brasil_estados.geojson'
    };

    const ESTADO = {
        dadosBrutos: [],
        geojson: null,
        svg: null,
        grupoZoom: null,
        projecao: d3.geoMercator(),
        geradorDeCaminho: null,
        comportamentoZoom: null,
        ufCentralizada: null
    };

    // ===== ESTRUTURA (criada uma única vez) =====

    function possuiDadosDaUf(feature, dadosPorUf) {
        return dadosPorUf.has(feature.properties.sigla);
    }

    // O arquivo segue a orientação de anéis do padrão GeoJSON.
    // O d3-geo usa a convenção esférica inversa para polígonos
    // menores que um hemisfério. Por isso, uma cópia dos anéis
    // é invertida somente durante a preparação para a renderização.
    function prepararGeoJsonParaD3(geojson) {
        const features = geojson.features.map(function (feature) {
            const geometria = feature.geometry;
            let coordenadas;

            if (geometria.type === 'Polygon') {
                coordenadas = geometria.coordinates.map(function (anel) {
                    return anel.slice().reverse();
                });
            } else if (geometria.type === 'MultiPolygon') {
                coordenadas = geometria.coordinates.map(function (poligono) {
                    return poligono.map(function (anel) {
                        return anel.slice().reverse();
                    });
                });
            } else {
                return feature;
            }

            return Object.assign({}, feature, {
                geometry: Object.assign({}, geometria, {
                    coordinates: coordenadas
                })
            });
        });

        return Object.assign({}, geojson, {
            features: features
        });
    }

    function construirBaseSVG() {
        const container = d3.select('#mapa-container');

        const ferramentas = container
            .selectAll('div.mapa-ferramentas')
            .data([null])
            .join('div')
            .attr('class', 'mapa-ferramentas');

        ferramentas
            .selectAll('button.mapa-zoom-resetar')
            .data([null])
            .join('button')
            .attr('type', 'button')
            .attr('class', 'mapa-zoom-resetar')
            .text('Redefinir zoom')
            .on('click', redefinirZoom);

        const areaRolagem = container
            .selectAll('div.mapa-area-rolagem')
            .data([null])
            .join('div')
            .attr('class', 'mapa-area-rolagem');

        ESTADO.svg = areaRolagem
            .selectAll('svg.mapa-svg')
            .data([null])
            .join('svg')
            .attr('class', 'mapa-svg')
            .attr('viewBox', `0 0 ${CONFIG.largura} ${CONFIG.altura}`)
            .attr('preserveAspectRatio', 'xMidYMid meet');

        ESTADO.svg.selectAll('*').remove();

        ESTADO.geradorDeCaminho = d3.geoPath().projection(ESTADO.projecao);
        ESTADO.grupoZoom = ESTADO.svg.append('g').attr('class', 'mapa-grupo-zoom');

        ESTADO.comportamentoZoom = d3.zoom()
            .scaleExtent([CONFIG.zoomMinimo, CONFIG.zoomMaximo])
            .on('zoom', function (evento) {
                ESTADO.grupoZoom.attr('transform', evento.transform);
            });

        ESTADO.svg.call(ESTADO.comportamentoZoom);

        construirLegenda();
    }

    function construirLegenda() {
        const defs = ESTADO.svg.append('defs');

        defs.append('linearGradient')
            .attr('id', 'mapa-gradiente-legenda')
            .attr('x1', '0%').attr('x2', '100%')
            .attr('y1', '0%').attr('y2', '0%');

        const legenda = ESTADO.svg.append('g')
            .attr('class', 'mapa-legenda')
            .attr('transform', `translate(40, ${CONFIG.altura - 46})`);

        legenda.append('text')
            .attr('class', 'mapa-legenda-titulo')
            .attr('y', -8);

        legenda.append('rect')
            .attr('width', 260)
            .attr('height', 14)
            .attr('rx', 2)
            .style('fill', 'url(#mapa-gradiente-legenda)');

        legenda.append('g')
            .attr('class', 'mapa-legenda-eixo')
            .attr('transform', 'translate(0,14)');
    }

    // ===== ZOOM =====

    function redefinirZoom() {
        ESTADO.svg.transition().duration(600)
            .call(ESTADO.comportamentoZoom.transform, d3.zoomIdentity);
    }

    function centralizarEm(feature) {
        if (!feature) {
            return;
        }

        const limites = ESTADO.geradorDeCaminho.bounds(feature);
        const dx = limites[1][0] - limites[0][0];
        const dy = limites[1][1] - limites[0][1];
        const x = (limites[0][0] + limites[1][0]) / 2;
        const y = (limites[0][1] + limites[1][1]) / 2;

        const escala = Math.max(
            CONFIG.zoomMinimo,
            Math.min(CONFIG.zoomMaximo, 0.8 / Math.max(dx / CONFIG.largura, dy / CONFIG.altura))
        );

        const transformacao = d3.zoomIdentity
            .translate(CONFIG.largura / 2, CONFIG.altura / 2)
            .scale(escala)
            .translate(-x, -y);

        ESTADO.svg.transition().duration(700)
            .call(ESTADO.comportamentoZoom.transform, transformacao);
    }

    // ===== RENDERIZAÇÃO =====

    function renderizar(dadosPorUf, filtros) {
        const metricaConfig =
            CONFIGURACAO_METRICAS[filtros.metrica] ||
            CONFIGURACAO_METRICAS.total_acidentes;
        const campo = metricaConfig.campo;

        const valorMaximo = d3.max(Array.from(dadosPorUf.values()), function (d) { return d[campo]; }) || 0;
        const escalaCor = d3.scaleSequential(d3.interpolateYlOrRd)
            .domain([0, Math.max(valorMaximo, 1)]);

        atualizarLegenda(
            metricaConfig,
            valorMaximo
        );

        ESTADO.grupoZoom.selectAll('path.mapa-estado')
            .data(ESTADO.geojson.features, function (d) { return d.properties.sigla; })
            .join('path')
            .attr('class', 'mapa-estado')
            .attr('d', ESTADO.geradorDeCaminho)
            .attr('tabindex', function (d) {
                const uf = d.properties.sigla;

                return possuiDadosDaUf(d, dadosPorUf) ||
                    filtros.uf === uf
                    ? 0
                    : null;
            })
            .attr('role', function (d) {
                const uf = d.properties.sigla;

                return possuiDadosDaUf(d, dadosPorUf) ||
                    filtros.uf === uf
                    ? 'button'
                    : null;
            })
            .classed('mapa-estado-sem-dados', function (d) {
                return !possuiDadosDaUf(d, dadosPorUf);
            })
            .attr('aria-label', function (d) {
                const info = dadosPorUf.get(d.properties.sigla);
                if (!info) {
                    return `${d.properties.nome}: sem dados para os filtros atuais`;
                }
                return `${d.properties.nome}: ${metricaConfig.titulo} ${metricaConfig.formato(info[campo])}`;
            })
            .classed('mapa-estado-selecionado', function (d) { return d.properties.sigla === filtros.uf; })
            .on('mouseover', function (evento, d) { manipularMouseOver(evento, d, dadosPorUf); })
            .on('mousemove', moverTooltip)
            .on('mouseleave', esconderTooltip)
            .on('click', function (evento, d) { manipularClique(d, dadosPorUf); })
            .on('keydown', function (evento, d) { manipularKeydown(evento, d, dadosPorUf); })
            .transition()
            .duration(500)
            .attr('fill', function (d) {
                const info = dadosPorUf.get(d.properties.sigla);
                return info ? escalaCor(info[campo]) : '#e9ecef';
            })
            .attr('opacity', function (d) {
                return !filtros.uf || d.properties.sigla === filtros.uf ? 1 : 0.35;
            });

        if (filtros.uf !== ESTADO.ufCentralizada) {
            if (filtros.uf) {
                const featureSelecionada = ESTADO.geojson.features.find(function (d) {
                    return d.properties.sigla === filtros.uf;
                });
                centralizarEm(featureSelecionada);
            } else if (ESTADO.ufCentralizada !== null) {
                redefinirZoom();
            }
            ESTADO.ufCentralizada = filtros.uf;
        }
    }

    function atualizarLegenda(metricaConfig, valorMaximo) {
        const paradas = d3.ticks(0, 1, 10).map(function (t) {
            return {
                offset: `${t * 100}%`,
                cor: d3.interpolateYlOrRd(t)
            };
        });

        ESTADO.svg
            .select('#mapa-gradiente-legenda')
            .selectAll('stop')
            .data(paradas)
            .join('stop')
            .attr('offset', function (d) {
                return d.offset;
            })
            .attr('stop-color', function (d) {
                return d.cor;
            });

        ESTADO.svg
            .select('.mapa-legenda-titulo')
            .text(metricaConfig.titulo);

        const limiteSuperior =
            valorMaximo > 0 ? valorMaximo : 1;

        const escalaEixo = d3
            .scaleLinear()
            .domain([0, limiteSuperior])
            .range([0, 260]);

        ESTADO.svg
            .select('.mapa-legenda-eixo')
            .call(
                d3
                    .axisBottom(escalaEixo)
                    .ticks(5)
                    .tickFormat(metricaConfig.formato)
            );
    }

    // ===== INTERAÇÃO =====

    function manipularMouseOver(evento, feature, dadosPorUf) {
        const info = dadosPorUf.get(feature.properties.sigla);

        if (!info) {
            mostrarTooltip(`<strong>${feature.properties.nome}</strong><br>Sem dados para os filtros atuais.`, evento);
            return;
        }

        const html = [
            `<strong>${feature.properties.nome} (${feature.properties.sigla})</strong>`,
            `Região: ${info.regiao}`,
            `Total de acidentes: ${formatarNumero(info.total_acidentes)}`,
            `Graves ou fatais: ${formatarNumero(info.total_graves_fatais)}`,
            `Mortos: ${formatarNumero(info.total_mortos)}`,
            `Feridos graves: ${formatarNumero(info.total_feridos_graves)}`,
            `Total de vítimas: ${formatarNumero(info.total_vitimas)}`,
            `Taxa de gravidade: ${formatarPercentual(info.taxa_gravidade)}`
        ].join('<br>');

        mostrarTooltip(html, evento);
    }

    function manipularClique(feature, dadosPorUf) {
        const uf = feature.properties.sigla;
        const filtrosAtuais = obterFiltros();
        const ufJaSelecionada = filtrosAtuais.uf === uf;

        if (!dadosPorUf.has(uf) && !ufJaSelecionada) {
            return;
        }

        definirFiltro(
            'uf',
            ufJaSelecionada ? null : uf
        );
    }

    function manipularKeydown(evento, feature, dadosPorUf) {
        if (evento.key === 'Enter' || evento.key === ' ') {
            evento.preventDefault();
            manipularClique(feature, dadosPorUf);
        }
    }

    // ===== CONTRATO DO MÓDULO =====

    function iniciar(dadosIniciais) {
        ESTADO.dadosBrutos = dadosIniciais.porDataUf;

        construirBaseSVG();

        d3.json(CONFIG.caminhoGeoJSON)
            .then(function (geojson) {
                ESTADO.geojson = prepararGeoJsonParaD3(geojson);

                ESTADO.projecao.fitExtent(
                    [
                        [30, 30],
                        [
                            CONFIG.largura - 30,
                            CONFIG.altura - 95
                        ]
                    ],
                    ESTADO.geojson
                );

                atualizar(obterFiltros());
            })
            .catch(function (erro) {
                console.error(
                    'Mapa: falha ao carregar o GeoJSON dos estados.',
                    erro
                );

                mostrarMensagemVazia(
                    '#mapa-container',
                    'Não foi possível carregar o mapa dos estados.'
                );
            });
    }

    function atualizar(filtros) {
        if (!ESTADO.geojson) {
            return;
        }

        const filtrosComparativos = Object.assign(
            {},
            filtros,
            {
                uf: null
            }
        );

        const dadosPorUf = agregarPorUf(
            ESTADO.dadosBrutos,
            filtrosComparativos
        );

        if (dadosPorUf.size === 0) {
            ESTADO.svg.attr('hidden', true);

            mostrarMensagemVazia(
                '#mapa-container',
                'Nenhum acidente encontrado para os filtros selecionados.'
            );

            return;
        }

        ESTADO.svg.attr('hidden', null);

        removerMensagemVazia('#mapa-container');

        renderizar(dadosPorUf, filtros);
    }

    return {
        iniciar,
        atualizar
    };
})();