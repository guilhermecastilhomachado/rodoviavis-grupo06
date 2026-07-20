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
        tooltip: null
    };

    function extrairDominio(dadosProcessados, metrica) {
        const maximo = d3.max(Array.from(dadosProcessados.values()), anoMap =>
            d3.max(Array.from(anoMap.values()), d => d[metrica])
        );
        return [0, maximo || 1];
    }

    function processarDados(dados, filtros) {
        const filtrados = dados.filter(d => !filtros.uf || d.uf === filtros.uf);

        return d3.rollup(
            filtrados,
            v => {
                const totalAcidentes = d3.sum(v, d => d.total_acidentes);
                const totalGravesFatais = d3.sum(v, d => d.total_graves_fatais);
                return {
                    total_acidentes: totalAcidentes,
                    total_graves_fatais: totalGravesFatais,
                    total_mortos: d3.sum(v, d => d.total_mortos),
                    total_feridos_graves: d3.sum(v, d => d.total_feridos_graves),
                    total_vitimas: d3.sum(v, d => d.total_vitimas),
                    taxa_gravidade: totalAcidentes > 0 ? totalGravesFatais / totalAcidentes : 0
                };
            },
            d => d.ano,
            d => d.data.toISOString().split('T')[0]
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
        const alturaTotal = CONFIG.anos.length * (alturaAno + CONFIG.margem.base) + CONFIG.margem.topo + 50; // +50 para legenda

        ESTADO.svg = d3.select('#calendario-container')
            .append('svg')
            .attr('viewBox', `0 0 ${CONFIG.largura} ${alturaTotal}`)
            .attr('preserveAspectRatio', 'xMinYMin meet');

        ESTADO.tooltip = d3.select('#tooltip-global');

        const legendaGrupo = ESTADO.svg.append('g')
            .attr('class', 'calendario-legenda')
            .attr('transform', `translate(${CONFIG.margem.esquerda}, ${CONFIG.margem.topo / 2})`);

        legendaGrupo.append('rect')
            .attr('width', 200)
            .attr('height', 10)
            .attr('fill', 'url(#gradiente-legenda)');

        const defs = ESTADO.svg.append('defs');
        const linearGradient = defs.append('linearGradient')
            .attr('id', 'gradiente-legenda')
            .attr('x1', '0%').attr('y1', '0%')
            .attr('x2', '100%').attr('y2', '0%');

        const gruposAnos = ESTADO.svg.selectAll('g.ano')
            .data(CONFIG.anos)
            .join('g')
            .attr('class', 'ano')
            .attr('transform', (d, i) => `translate(${CONFIG.margem.esquerda}, ${CONFIG.margem.topo + 30 + i * (alturaAno + CONFIG.margem.base)})`);

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
        const metrica = filtros.metrica || 'total_acidentes';
        const dominio = extrairDominio(mapaDados, metrica);

        const interpoladorDeCor = d3.interpolateOranges;
        const escalaCor = d3.scaleSequential(interpoladorDeCor).domain(dominio);

        const paradasGradiente = d3.ticks(0, 1, 10).map(t => ({
            offset: `${t * 100}%`,
            cor: interpoladorDeCor(t)
        }));

        d3.select('#gradiente-legenda').selectAll('stop')
            .data(paradasGradiente)
            .join('stop')
            .attr('offset', d => d.offset)
            .attr('stop-color', d => d.cor);

        ESTADO.svg.selectAll('g.ano')
            .transition()
            .duration(300)
            .style('opacity', d => (filtros.ano && parseInt(filtros.ano) !== d) ? 0.2 : 1);

        CONFIG.anos.forEach(ano => {
            const diasAno = d3.timeDays(new Date(ano, 0, 1), new Date(ano + 1, 0, 1));
            const dadosAno = mapaDados.get(ano) || new Map();
            const grupoAno = ESTADO.svg.selectAll('g.ano').filter(d => d === ano);

            const dias = grupoAno.selectAll('rect.calendario-dia')
                .data(diasAno, d => d.toISOString());

            dias.join('rect')
                .attr('class', d => {
                    const diaSemana = d.getDay();
                    const isFimSemana = diaSemana === 0 || diaSemana === 6;
                    let classe = `calendario-dia ${isFimSemana ? 'calendario-dia--fim-semana' : ''}`;
                    return classe;
                })
                .attr('width', CONFIG.tamanhoCelula - 2)
                .attr('height', CONFIG.tamanhoCelula - 2)
                .attr('x', d => d3.timeWeek.count(d3.timeYear(d), d) * CONFIG.tamanhoCelula)
                .attr('y', d => d.getDay() * CONFIG.tamanhoCelula)
                .on('mouseover', (evento, d) => manipularMouseOver(evento, d, dadosAno, metrica))
                .on('mousemove', manipularMouseMove)
                .on('mouseleave', manipularMouseLeave)
                .on('click', (evento, d) => manipularClique(d))
                .transition()
                .duration(300)
                .attr('fill', d => {
                    const chave = d.toISOString().split('T')[0];
                    const registro = dadosAno.get(chave);
                    return registro && registro[metrica] > 0 ? escalaCor(registro[metrica]) : '#ebedf0';
                });

            grupoAno.selectAll('path.calendario-mes-borda').raise();
        });
    }

    function manipularMouseOver(evento, dataObj, mapaAno, metrica) {
        const chave = dataObj.toISOString().split('T')[0];
        const registro = mapaAno.get(chave);
        const valor = registro ? registro[metrica] : 0;
        const formatador = metrica === 'taxa_gravidade' ? d3.format('.3f') : d3.format(',');

        ESTADO.tooltip
            .html(`
                <strong>${dataObj.toLocaleDateString('pt-BR')}</strong><br>
                Registro: ${formatador(valor)}
            `)
            .attr('hidden', null);
    }

    function manipularMouseMove(evento) {
        ESTADO.tooltip
            .style('left', `${evento.pageX + 10}px`)
            .style('top', `${evento.pageY + 10}px`);
    }

    function manipularMouseLeave() {
        ESTADO.tooltip.attr('hidden', true);
    }

    function manipularClique(dataObj) {
        definirFiltros({
            dataInicial: dataObj,
            dataFinal: dataObj
        });
    }

    function iniciar(dadosIniciais) {
        ESTADO.dadosBrutos = dadosIniciais.porDataUf;
        construirBaseSVG();
        atualizar(obterFiltros());
    }

    function atualizar(filtros) {
        const dadosAgrupados = processarDados(ESTADO.dadosBrutos, filtros);
        renderizar(dadosAgrupados, filtros);
    }

    return {
        iniciar,
        atualizar
    };
})();