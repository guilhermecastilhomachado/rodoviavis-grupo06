const Calendario = (function () {
    const CONFIG = {
        largura: 900,
        tamanhoCelula: 15,
        margem: { topo: 20, direita: 20, base: 20, esquerda: 70 },
        anos: [2022, 2023, 2024]
    };

    const ESTADO = {
        dadosBrutos: [],
        svg: null,
    };

    const CONFIGURACAO_METRICAS = {
        total_acidentes: {
            titulo: "Total de acidentes",
            campo: "total_acidentes",
            formato: valor => formatarNumero(valor)
        },
        total_graves_fatais: {
            titulo: "Acidentes graves ou fatais",
            campo: "total_graves_fatais",
            formato: valor => formatarNumero(valor)
        },
        total_mortos: {
            titulo: "Mortos",
            campo: "total_mortos",
            formato: valor => formatarNumero(valor)
        },
        total_feridos_graves: {
            titulo: "Feridos graves",
            campo: "total_feridos_graves",
            formato: valor => formatarNumero(valor)
        },
        total_vitimas: {
            titulo: "Total de vítimas",
            campo: "total_vitimas",
            formato: valor => formatarNumero(valor)
        },
        taxa_gravidade: {
            titulo: "Taxa de gravidade",
            campo: "taxa_gravidade",
            formato: valor => formatarPercentual(valor)
        }
    };

    const formatarChaveData = d3.timeFormat('%Y-%m-%d');

    function processarDados(dados, filtros) {
        const filtrosSemIntervalo = Object.assign({}, filtros, {
            dataInicial: null,
            dataFinal: null
        });

        const filtrados = filtrarPorEstado(
            dados,
            filtrosSemIntervalo
        ).filter(function (registro) {
            return registro.data instanceof Date &&
                !Number.isNaN(registro.data.getTime());
        });

        return d3.rollup(
            filtrados,
            function (registros) {
                const totalAcidentes = d3.sum(
                    registros,
                    d => d.total_acidentes
                );

                const totalGravesFatais = d3.sum(
                    registros,
                    d => d.total_graves_fatais
                );

                return {
                    total_acidentes: totalAcidentes,
                    total_graves_fatais: totalGravesFatais,
                    total_mortos: d3.sum(
                        registros,
                        d => d.total_mortos
                    ),
                    total_feridos_graves: d3.sum(
                        registros,
                        d => d.total_feridos_graves
                    ),
                    total_vitimas: d3.sum(
                        registros,
                        d => d.total_vitimas
                    ),
                    taxa_gravidade: totalAcidentes > 0
                        ? totalGravesFatais / totalAcidentes
                        : 0
                };
            },
            d => d.ano,
            d => formatarChaveData(d.data)
        );
    }

    function gerarCaminhoMes(t0) {
        const t1 = new Date(t0.getFullYear(), t0.getMonth() + 1, 0);
        const d0 = t0.getDay();
        const w0 = d3.timeWeek.count(d3.timeYear(t0), t0);
        const d1 = t1.getDay();
        const w1 = d3.timeWeek.count(d3.timeYear(t1), t1);
        const tc = CONFIG.tamanhoCelula;

        return `M${(w0 + 1) * tc},${d0 * tc}H${w0 * tc}V${7 * tc}H${w1 * tc}V${(d1 + 1) * tc}H${(w1 + 1) * tc}V0H${(w0 + 1) * tc}Z`;
    }

    function construirBaseSVG() {
        const alturaAno = CONFIG.tamanhoCelula * 7;
        const topoCalendarios = 70;
        const alturaTotal = CONFIG.anos.length * (alturaAno + CONFIG.margem.base) + topoCalendarios + 50;

        const container = d3.select('#calendario-container');

        // Cria a div que permite a rolagem horizontal em telas pequenas
        const areaRolagem = container
            .selectAll('div.calendario-area-rolagem')
            .data([null])
            .join('div')
            .attr('class', 'calendario-area-rolagem');

        ESTADO.svg = areaRolagem
            .selectAll('svg.calendario-svg')
            .data([null])
            .join('svg')
            .attr('class', 'calendario-svg')
            .attr('viewBox', `0 0 ${CONFIG.largura} ${alturaTotal}`)
            .attr('preserveAspectRatio', 'xMinYMin meet');

        // Limpa o SVG para evitar duplicação em caso de recarregamento
        ESTADO.svg.selectAll('*').remove();

        // Cria a legenda utilizada para representar a métrica ativa.
        const legendaGrupo = ESTADO.svg.append('g')
            .attr('class', 'calendario-legenda')
            .attr('transform', `translate(${CONFIG.margem.esquerda}, 24)`);

        legendaGrupo.append('text')
            .attr('class', 'calendario-legenda-titulo')
            .attr('x', 0)
            .attr('y', 0)
            .style('font-size', '12px')
            .style('font-weight', 'bold');

        legendaGrupo.append('rect')
            .attr('x', 0)
            .attr('y', 8)
            .attr('width', 200)
            .attr('height', 10)
            .attr('fill', 'url(#calendario-gradiente-legenda)');

        legendaGrupo.append('text')
            .attr('class', 'calendario-legenda-min')
            .attr('x', 0)
            .attr('y', 32)
            .style('font-size', '11px');

        legendaGrupo.append('text')
            .attr('class', 'calendario-legenda-max')
            .attr('x', 200)
            .attr('y', 32)
            .style('font-size', '11px')
            .attr('text-anchor', 'end');

        // Gradiente específico do calendário
        const defs = ESTADO.svg.append('defs');
        const linearGradient = defs.append('linearGradient')
            .attr('id', 'calendario-gradiente-legenda')
            .attr('x1', '0%').attr('y1', '0%')
            .attr('x2', '100%').attr('y2', '0%');

        // Criação dos grupos dos anos (com a classe calendário-ano)
        const gruposAnos = ESTADO.svg.selectAll('g.ano')
            .data(CONFIG.anos)
            .join('g')
            .attr('class', 'ano calendario-ano')
            .attr('transform', (d, i) => `translate(${CONFIG.margem.esquerda}, ${topoCalendarios + i * (alturaAno + CONFIG.margem.base)})`);

        gruposAnos.append('text')
            .attr('class', 'calendario-ano-rotulo')
            .attr('x', -20)
            .attr('y', alturaAno / 2)
            .attr('text-anchor', 'end')
            .attr('dominant-baseline', 'middle')
            .text(d => d);

        const diasSemana = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
        gruposAnos.selectAll('.calendario-dia-rotulo')
            .data(diasSemana)
            .join('text')
            .attr('class', 'calendario-dia-rotulo')
            .attr('x', -10)
            .attr('y', (d, i) => (i + 0.5) * CONFIG.tamanhoCelula)
            .attr('dy', '0.32em')
            .attr('text-anchor', 'end')
            .text(d => d);

        CONFIG.anos.forEach(ano => {
            const meses = d3.timeMonths(new Date(ano, 0, 1), new Date(ano + 1, 0, 1));
            const grupo = ESTADO.svg.selectAll('g.ano').filter(d => d === ano);

            grupo.selectAll('.calendario-mes-rotulo')
                .data(meses)
                .join('text')
                .attr('class', 'calendario-mes-rotulo')
                .attr('x', d => d3.timeWeek.count(d3.timeYear(d), d) * CONFIG.tamanhoCelula + 5)
                .attr('y', -5)
                .text(d => d.toLocaleString('pt-BR', { month: 'short' }).toUpperCase());

            grupo.selectAll('path.calendario-mes-borda')
                .data(meses)
                .join('path')
                .attr('class', 'calendario-mes-borda')
                .attr('d', gerarCaminhoMes)
                .attr('fill', 'none')
                .attr('stroke', '#212529')
                .attr('stroke-width', '1.5px')
                .attr('pointer-events', 'none');
        });
    }

    function renderizar(mapaDados, filtros) {
        const metricaConfig = CONFIGURACAO_METRICAS[filtros.metrica || 'total_acidentes'];
        const campo = metricaConfig.campo;

        // Verifica se o usuário quer um ano específico ou todos
        const anosVisiveis = filtros.ano ? [parseInt(filtros.ano)] : CONFIG.anos;

        // Calcula o domínio considerando somente os anos exibidos.
        let valorMaximo = 0;
        anosVisiveis.forEach(ano => {
            const dadosAno = mapaDados.get(ano);
            if (dadosAno) {
                const maxAno = d3.max(Array.from(dadosAno.values()), d => d[campo]);
                if (maxAno > valorMaximo) valorMaximo = maxAno;
            }
        });

        const escalaCor = d3.scaleSequential(d3.interpolateYlOrRd)
            .domain([0, Math.max(valorMaximo, 1)]);

        const paradasGradiente = d3.ticks(0, 1, 10).map(t => ({
            offset: `${t * 100}%`,
            cor: d3.interpolateYlOrRd(t)
        }));


        ESTADO.svg.select('#calendario-gradiente-legenda').selectAll('stop')
            .data(paradasGradiente)
            .join('stop')
            .attr('offset', d => d.offset)
            .attr('stop-color', d => d.cor);

        ESTADO.svg.select('.calendario-legenda-titulo').text(`Intensidade — ${metricaConfig.titulo}`);
        ESTADO.svg.select('.calendario-legenda-min').text(metricaConfig.formato(0));
        ESTADO.svg.select('.calendario-legenda-max').text(metricaConfig.formato(valorMaximo));

        // Mantém apenas os calendários correspondentes ao filtro de ano.
        const alturaAno = CONFIG.tamanhoCelula * 7;
        const topoCalendarios = 70;
        const alturaTotal = anosVisiveis.length * (alturaAno + CONFIG.margem.base) + topoCalendarios + 50;

        ESTADO.svg.transition().duration(300)
            .attr('viewBox', `0 0 ${CONFIG.largura} ${alturaTotal}`);

        ESTADO.svg.selectAll('g.ano')
            .style('display', d => anosVisiveis.includes(d) ? null : 'none')
            .transition().duration(300)
            .attr('transform', d => {
                const indexVisible = anosVisiveis.indexOf(d);
                if (indexVisible === -1) return '';
                // Reposiciona apenas os anos visíveis.
                return `translate(${CONFIG.margem.esquerda}, ${topoCalendarios + indexVisible * (alturaAno + CONFIG.margem.base)})`;
            });

        CONFIG.anos.forEach(ano => {
            if (!anosVisiveis.includes(ano)) return;

            const diasAno = d3.timeDays(new Date(ano, 0, 1), new Date(ano + 1, 0, 1));
            const dadosAno = mapaDados.get(ano) || new Map();
            const grupoAno = ESTADO.svg.selectAll('g.ano').filter(d => d === ano);

            const dias = grupoAno.selectAll('rect.calendario-celula')
                .data(diasAno, d => formatarChaveData(d));

            dias.join('rect')
                .attr('class', d => {
                    const chave = formatarChaveData(d);
                    const possuiDado = dadosAno.has(chave);
                    let classe = 'calendario-celula';

                    if (!possuiDado) {
                        classe += ' calendario-celula-sem-dados';
                    }

                    // Só aplica o destaque de seleção se o dia realmente tiver dados
                    if (possuiDado && filtros.dataInicial !== null && filtros.dataFinal !== null) {
                        if (d >= filtros.dataInicial && d <= filtros.dataFinal) {
                            classe += ' calendario-celula-selecionada';
                        } else {
                            classe += ' calendario-celula-fora-periodo';
                        }
                    }
                    return classe;
                })
                .attr('width', CONFIG.tamanhoCelula - 2)
                .attr('height', CONFIG.tamanhoCelula - 2)
                .attr('x', d => d3.timeWeek.count(d3.timeYear(d), d) * CONFIG.tamanhoCelula)
                .attr('y', d => d.getDay() * CONFIG.tamanhoCelula)

                // Habilita navegação e seleção pelo teclado.
                .attr('tabindex', d => {
                    const chave = formatarChaveData(d);
                    return dadosAno.has(chave) ? 0 : null;
                })
                .attr('role', d => {
                    const chave = formatarChaveData(d);
                    return dadosAno.has(chave) ? 'button' : null;
                })
                .attr('aria-label', d => {
                    const chave = formatarChaveData(d);
                    const registro = dadosAno.get(chave);

                    if (!registro) {
                        return null;
                    }

                    return `${formatarData(d)}: ${metricaConfig.formato(registro[metricaConfig.campo])}`;
                })

                .on('mouseover', (evento, d) => manipularMouseOver(evento, d, dadosAno, metricaConfig, filtros))
                .on('mousemove', manipularMouseMove)
                .on('mouseleave', manipularMouseLeave)
                .on('click', (evento, d) => manipularClique(d, dadosAno))
                .on('keydown', (evento, d) => manipularKeydown(evento, d, dadosAno))
                .transition()
                .duration(300)
                .attr('fill', function (data) {
                    const chave = formatarChaveData(data);
                    const registro = dadosAno.get(chave);

                    if (!registro) {
                        return '#ebedf0';
                    }

                    const valor = Number(registro[campo]) || 0;

                    return escalaCor(valor);
                });

            grupoAno.selectAll('path.calendario-mes-borda').raise();
        });
    }

    function manipularMouseOver(evento, dataObj, mapaAno, metricaConfig, filtros) {
        const chave = formatarChaveData(dataObj);
        const registro = mapaAno.get(chave);

        // Não mostra tooltip em dias sem acidentes registrados
        if (!registro) return;

        const local = filtros.uf ? filtros.uf : 'Brasil';
        const valorFormatado = metricaConfig.formato(registro[metricaConfig.campo]);

        const html = [
            `<strong>${formatarData(dataObj)}</strong>`,
            `Local: ${local}`,
            `Métrica: ${metricaConfig.titulo}`,
            `Valor: ${valorFormatado}`,
            `Total de acidentes: ${formatarNumero(registro.total_acidentes)}`,
            `Graves ou fatais: ${formatarNumero(registro.total_graves_fatais)}`,
            `Mortos: ${formatarNumero(registro.total_mortos)}`,
            `Taxa de gravidade: ${formatarPercentual(registro.taxa_gravidade)}`
        ].join('<br>');

        mostrarTooltip(html, evento);
    }

    function manipularMouseMove(evento) {
        moverTooltip(evento);
    }

    function manipularMouseLeave() {
        esconderTooltip();
    }

    function manipularClique(dataObj, mapaAno) {
        const chave = formatarChaveData(dataObj);

        // Bloqueia o clique se não houver dados no dia
        if (!mapaAno.has(chave)) return;

        definirFiltros({
            dataInicial: dataObj,
            dataFinal: dataObj
        });
    }

    function manipularKeydown(evento, dataObj, mapaAno) {
        // Aciona o clique caso o usuário aperte Enter ou Espaço
        if (evento.key === "Enter" || evento.key === " ") {
            evento.preventDefault();
            manipularClique(dataObj, mapaAno);
        }
    }

    function iniciar(dadosIniciais) {
        ESTADO.dadosBrutos = dadosIniciais.porDataUf;
        construirBaseSVG();
        atualizar(obterFiltros());
    }

    function atualizar(filtros) {
        const dadosAgrupados = processarDados(ESTADO.dadosBrutos, filtros);

        if (dadosAgrupados.size === 0) {
            ESTADO.svg.attr('hidden', true);

            mostrarMensagemVazia(
                '#calendario-container',
                'Não há registros para os filtros selecionados.'
            );

            return;
        }

        ESTADO.svg.attr('hidden', null);
        removerMensagemVazia('#calendario-container');
        renderizar(dadosAgrupados, filtros);
    }

    return {
        iniciar,
        atualizar
    };
})();