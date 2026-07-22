/*
 * RodoviaVis — matriz.js
 * Responsável: Geovanna David Gonzaga (análise contextual e gravidade)
 */

const Matriz = (function () {

    const CONFIG = {
        margem: { topo: 190, direita: 30, base: 10, esquerda: 110 },
        celula: { minimo: 22, maximo: 90 },
        larguraAlvo: 900,
        corSemDados: '#ebedf0',
        interpoladorCor: d3.interpolateYlOrRd
    };

    const CAMPOS = {
        causa_acidente: { rotulo: 'Causa do acidente', filtro: 'causa' },
        faixa_horario: {
            rotulo: 'Faixa horária',
            filtro: 'faixaHorario',
            ordemFixa: ['Madrugada', 'Manhã', 'Tarde', 'Noite']
        }
    };

    const METRICAS = {
        total_acidentes: { rotulo: 'Total de acidentes', formatar: formatarNumero },
        total_graves_fatais: { rotulo: 'Acidentes graves ou fatais', formatar: formatarNumero },
        total_mortos: { rotulo: 'Mortos', formatar: formatarNumero },
        total_feridos_graves: { rotulo: 'Feridos graves', formatar: formatarNumero },
        total_vitimas: { rotulo: 'Total de vítimas', formatar: formatarNumero },
        taxa_gravidade: { rotulo: 'Taxa de gravidade', formatar: formatarPercentual }
    };

    const REGISTRO_VAZIO = {
        total_acidentes: 0,
        total_graves_fatais: 0,
        total_mortos: 0,
        total_feridos_graves: 0,
        total_vitimas: 0,
        taxa_gravidade: 0
    };

    const ESTADO = {
        dadosBrutos: [],
        svg: null,
        topCausas: 10,
        ordenacao: 'valor'
    };

    // ===== PREPARAÇÃO DOS DADOS =====

    function filtrarPorAnoEUf(dados, filtros) {
        return dados.filter(function (registro) {
            if (filtros.ano !== null && registro.ano !== filtros.ano) {
                return false;
            }
            if (filtros.uf !== null && registro.uf !== filtros.uf) {
                return false;
            }
            return true;
        });
    }

    function agregarPorCausaEFaixa(dados) {
        return d3.rollup(
            dados,
            function (registros) {
                const totalAcidentes = d3.sum(registros, function (d) { return d.total_acidentes; });
                const totalGravesFatais = d3.sum(registros, function (d) { return d.total_graves_fatais; });

                return {
                    total_acidentes: totalAcidentes,
                    total_graves_fatais: totalGravesFatais,
                    total_mortos: d3.sum(registros, function (d) { return d.total_mortos; }),
                    total_feridos_graves: d3.sum(registros, function (d) { return d.total_feridos_graves; }),
                    total_vitimas: d3.sum(registros, function (d) { return d.total_vitimas; }),
                    taxa_gravidade: totalAcidentes > 0 ? totalGravesFatais / totalAcidentes : 0
                };
            },
            function (d) { return d.causa_acidente; },
            function (d) { return d.faixa_horario; }
        );
    }

    function obterRegistro(mapaAgregado, causa, faixa) {
        const mapaFaixas = mapaAgregado.get(causa);
        return (mapaFaixas && mapaFaixas.get(faixa)) || REGISTRO_VAZIO;
    }

    function obterCategoriasFaixaHorario(mapaAgregado) {
        const presentes = new Set();

        mapaAgregado.forEach(function (mapaFaixas) {
            mapaFaixas.forEach(function (registro, faixa) { presentes.add(faixa); });
        });

        return CAMPOS.faixa_horario.ordemFixa.filter(function (faixa) {
            return presentes.has(faixa);
        });
    }

    function calcularValorPorCausa(mapaAgregado, campoMetrica) {
        const valores = new Map();

        mapaAgregado.forEach(function (mapaFaixas, causa) {
            let totalAcidentes = 0;
            let totalGravesFatais = 0;
            let somaMetrica = 0;

            mapaFaixas.forEach(function (registro) {
                totalAcidentes += registro.total_acidentes;
                totalGravesFatais += registro.total_graves_fatais;
                somaMetrica += registro[campoMetrica] || 0;
            });

            const valor = campoMetrica === 'taxa_gravidade'
                ? (totalAcidentes > 0 ? totalGravesFatais / totalAcidentes : 0)
                : somaMetrica;

            valores.set(causa, valor);
        });

        return valores;
    }

    function selecionarCausas(mapaAgregado, campoMetrica) {
        const valores = calcularValorPorCausa(mapaAgregado, campoMetrica);
        let causas = Array.from(mapaAgregado.keys());

        causas.sort(function (a, b) { return (valores.get(b) || 0) - (valores.get(a) || 0); });

        if (ESTADO.topCausas > 0) {
            causas = causas.slice(0, ESTADO.topCausas);
        }

        if (ESTADO.ordenacao === 'alfabetica') {
            causas.sort(function (a, b) { return a.localeCompare(b, 'pt-BR'); });
        }

        return causas;
    }

    // ===== INTEGRAÇÃO COM O ESTADO GLOBAL =====

    function filtroAtivoIgual(campo, valor, filtros) {
        const valorFiltro = filtros[CAMPOS[campo].filtro];

        if (valorFiltro === null || valorFiltro === undefined) {
            return false;
        }

        return String(valorFiltro) === String(valor);
    }

    function alternarFiltro(campo, valor) {
        const chave = CAMPOS[campo].filtro;
        const filtrosAtuais = obterFiltros();
        const mudanca = {};

        mudanca[chave] = filtroAtivoIgual(campo, valor, filtrosAtuais) ? null : valor;
        definirFiltros(mudanca);
    }

    function manipularCliqueCelula(d) {
        const filtrosAtuais = obterFiltros();
        const causaJaAtiva = filtroAtivoIgual('causa_acidente', d.causa, filtrosAtuais);
        const faixaJaAtiva = filtroAtivoIgual('faixa_horario', d.faixa, filtrosAtuais);

        definirFiltros({
            causa: causaJaAtiva && faixaJaAtiva ? null : d.causa,
            faixaHorario: causaJaAtiva && faixaJaAtiva ? null : d.faixa
        });
    }

    // ===== CONTROLES LOCAIS =====

    function tratarMudancaDeTopCausas(event) {
        ESTADO.topCausas = +event.currentTarget.value;
        atualizar(obterFiltros());
    }

    function tratarMudancaDeOrdenacao(event) {
        ESTADO.ordenacao = event.currentTarget.value;
        atualizar(obterFiltros());
    }

    // ===== DESENHO =====

    function truncarRotulo(texto, tamanhoMaximo) {
        const limite = tamanhoMaximo || 30;
        const textoCompleto = String(texto);
        return textoCompleto.length > limite ? textoCompleto.slice(0, limite - 1) + '…' : textoCompleto;
    }

    function construirBaseSVG() {
        ESTADO.svg = d3.select('#heatmap')
            .append('svg')
            .attr('class', 'matriz-svg');
    }

    function manipularMouseOverCelula(evento, d) {
        ESTADO.svg.classed('tem-destaque', true);

        ESTADO.svg.selectAll('rect.celula')
            .classed('esmaecida', function (outro) {
                return outro.causa !== d.causa && outro.faixa !== d.faixa;
            });

        ESTADO.svg.selectAll('text.rotulo-eixo-x')
            .classed('em-destaque', function (causa) { return causa === d.causa; });

        ESTADO.svg.selectAll('text.rotulo-eixo-y')
            .classed('em-destaque', function (faixa) { return faixa === d.faixa; });

        const r = d.registro;

        mostrarTooltip(
            '<strong>' + CAMPOS.causa_acidente.rotulo + ':</strong> ' + d.causa + '<br>' +
            '<strong>' + CAMPOS.faixa_horario.rotulo + ':</strong> ' + d.faixa + '<br>' +
            'Acidentes: ' + formatarNumero(r.total_acidentes) + '<br>' +
            'Mortos: ' + formatarNumero(r.total_mortos) + '<br>' +
            'Feridos graves: ' + formatarNumero(r.total_feridos_graves) + '<br>' +
            'Taxa de gravidade: ' + formatarPercentual(r.taxa_gravidade),
            evento
        );
    }

    function manipularMouseLeaveCelula() {
        ESTADO.svg.classed('tem-destaque', false);
        ESTADO.svg.selectAll('rect.celula').classed('esmaecida', false);
        ESTADO.svg.selectAll('text.rotulo-eixo-x, text.rotulo-eixo-y').classed('em-destaque', false);
        esconderTooltip();
    }

    function manipularMouseOverRotulo(evento, rotuloCampo, valor) {
        mostrarTooltip('<strong>' + rotuloCampo + ':</strong> ' + valor, evento);
    }

    function desenharLegenda(infoMetrica, valorMaximo, escalaCor) {
        const paradas = d3.range(0, 1.0001, 0.1).map(function (t) {
            return escalaCor(t * valorMaximo);
        });

        const legenda = d3.select('#heatmap-legenda');
        legenda.html('');

        legenda.append('span').text(infoMetrica.rotulo + ':');
        legenda.append('span').text('0');
        legenda.append('span')
            .attr('class', 'heatmap-legenda__gradiente')
            .style('background', 'linear-gradient(to right, ' + paradas.join(', ') + ')');
        legenda.append('span').text(infoMetrica.formatar(valorMaximo));
    }

    function renderizar(mapaAgregado, categoriasX, categoriasY, campoMetrica, filtros) {
        if (!categoriasX.length || !categoriasY.length) {
            ESTADO.svg.attr('width', 0).attr('height', 0).selectAll('*').remove();
            mostrarMensagemVazia('#heatmap', 'Nenhuma causa encontrada para os filtros selecionados.');
            d3.select('#heatmap-legenda').html('');
            return;
        }

        removerMensagemVazia('#heatmap');

        const infoMetrica = METRICAS[campoMetrica];

        const tamanhoCelula = Math.max(
            CONFIG.celula.minimo,
            Math.min(CONFIG.celula.maximo, Math.floor(CONFIG.larguraAlvo / categoriasX.length))
        );

        const largura = CONFIG.margem.esquerda + categoriasX.length * tamanhoCelula + CONFIG.margem.direita;
        const altura = CONFIG.margem.topo + categoriasY.length * tamanhoCelula + CONFIG.margem.base;

        ESTADO.svg.attr('width', largura).attr('height', altura);

        const valores = [];
        mapaAgregado.forEach(function (mapaFaixas) {
            mapaFaixas.forEach(function (registro) { valores.push(registro[campoMetrica] || 0); });
        });
        const valorMaximo = d3.max(valores) || 1;
        const escalaCor = d3.scaleSequential(CONFIG.interpoladorCor).domain([0, valorMaximo]);


        ESTADO.svg.selectAll('text.rotulo-eixo-x')
            .data(categoriasX, function (d) { return d; })
            .join('text')
            .attr('class', 'rotulo-eixo-x')
            .attr('transform', function (d, i) {
                const x = CONFIG.margem.esquerda + i * tamanhoCelula + tamanhoCelula / 2;
                return 'translate(' + x + ',' + (CONFIG.margem.topo - 12) + ') rotate(-90)';
            })
            .text(function (d) { return truncarRotulo(d, 22); })
            .on('mouseover', function (evento, d) { manipularMouseOverRotulo(evento, CAMPOS.causa_acidente.rotulo, d); })
            .on('mousemove', moverTooltip)
            .on('mouseleave', esconderTooltip)
            .on('click', function (evento, d) { alternarFiltro('causa_acidente', d); });

        // Cabeçalho das linhas
        ESTADO.svg.selectAll('text.rotulo-eixo-y')
            .data(categoriasY, function (d) { return d; })
            .join('text')
            .attr('class', 'rotulo-eixo-y')
            .attr('x', CONFIG.margem.esquerda - 10)
            .attr('y', function (d, i) { return CONFIG.margem.topo + i * tamanhoCelula + tamanhoCelula / 2; })
            .text(function (d) { return d; })
            .on('mouseover', function (evento, d) { manipularMouseOverRotulo(evento, CAMPOS.faixa_horario.rotulo, d); })
            .on('mousemove', moverTooltip)
            .on('mouseleave', esconderTooltip)
            .on('click', function (evento, d) { alternarFiltro('faixa_horario', d); });

        const celulasData = [];
        categoriasY.forEach(function (faixa, indiceY) {
            categoriasX.forEach(function (causa, indiceX) {
                celulasData.push({
                    causa: causa,
                    faixa: faixa,
                    indiceX: indiceX,
                    indiceY: indiceY,
                    registro: obterRegistro(mapaAgregado, causa, faixa)
                });
            });
        });

        ESTADO.svg.selectAll('rect.celula')
            .data(celulasData, function (d) { return d.causa + '::' + d.faixa; })
            .join('rect')
            .attr('class', function (d) {
                const selecionada = filtroAtivoIgual('causa_acidente', d.causa, filtros) &&
                    filtroAtivoIgual('faixa_horario', d.faixa, filtros);
                return 'celula' + (selecionada ? ' selecionada' : '');
            })
            .attr('x', function (d) { return CONFIG.margem.esquerda + d.indiceX * tamanhoCelula; })
            .attr('y', function (d) { return CONFIG.margem.topo + d.indiceY * tamanhoCelula; })
            .attr('width', tamanhoCelula - 1)
            .attr('height', tamanhoCelula - 1)
            .attr('fill', function (d) {
                const valor = d.registro[campoMetrica];
                return valor > 0 ? escalaCor(valor) : CONFIG.corSemDados;
            })
            .on('mouseover', manipularMouseOverCelula)
            .on('mousemove', moverTooltip)
            .on('mouseleave', manipularMouseLeaveCelula)
            .on('click', function (evento, d) { manipularCliqueCelula(d); });

        desenharLegenda(infoMetrica, valorMaximo, escalaCor);
    }

    // ===== CONTRATO COMUM DOS MÓDULOS (app.js) =====

    function iniciar(dadosIniciais) {
        ESTADO.dadosBrutos = dadosIniciais.porCausaHorarioUf;

        ESTADO.topCausas = +d3.select('#heatmap-top-causas').property('value');
        ESTADO.ordenacao = d3.select('#heatmap-ordem').property('value');

        d3.select('#heatmap-top-causas').on('change', tratarMudancaDeTopCausas);
        d3.select('#heatmap-ordem').on('change', tratarMudancaDeOrdenacao);

        construirBaseSVG();
        atualizar(obterFiltros());
    }

    function atualizar(filtros) {
        const dadosFiltrados = filtrarPorAnoEUf(ESTADO.dadosBrutos, filtros);

        if (!possuiDados(dadosFiltrados)) {
            ESTADO.svg.attr('width', 0).attr('height', 0).selectAll('*').remove();
            mostrarMensagemVazia('#heatmap', 'Nenhum acidente encontrado para os filtros selecionados.');
            d3.select('#heatmap-legenda').html('');
            return;
        }

        const mapaAgregado = agregarPorCausaEFaixa(dadosFiltrados);
        const campoMetrica = filtros.metrica || 'total_acidentes';

        const categoriasX = selecionarCausas(mapaAgregado, campoMetrica);
        const categoriasY = obterCategoriasFaixaHorario(mapaAgregado);

        renderizar(mapaAgregado, categoriasX, categoriasY, campoMetrica, filtros);
    }

    return {
        iniciar: iniciar,
        atualizar: atualizar
    };

})();
