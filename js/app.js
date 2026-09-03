/*
 * RodoviaVis — app.js
 * Responsável: Guilherme Castilho Machado (dados, arquitetura e integração)
 *
 * Ponto de entrada do sistema. Responsabilidades:
 *   1. carregar os arquivos processados;
 *   2. aguardar todas as Promises de carregamento;
 *   3. guardar os dados carregados em Dados;
 *   4. inicializar os módulos que já estiverem implementados;
 *   5. executar atualizarDashboard() sempre que o estado mudar;
 *   6. capturar e mostrar erros de forma amigável.
 *
 * Este arquivo NÃO implementa nenhum layout (mapa, calendário,
 * matriz, scatterplot, KPIs, timeline). Ele só carrega os dados e
 * avisa cada módulo na hora certa.
 *
 * Importante: NÃO carregamos data/processed/acidentes_2022_2024.csv
 * aqui. São ~205 mil linhas e ~71 MiB — os arquivos agregados já
 * têm tudo que os layouts precisam, e carregar a base detalhada no
 * navegador deixaria o sistema lento à toa.
 */

const CAMINHOS_DADOS = {
    porDataUf: 'data/processed/agregado_data_uf.csv',
    porCausaHorarioUf: 'data/processed/agregado_causa_horario_uf.csv'
};

const Dados = {
    porDataUf: [],
    porCausaHorarioUf: []
};

// Cada módulo dos colegas deve expor um objeto global com, no
// mínimo, iniciar(dados) e atualizar(filtros). Enquanto um módulo
// ainda não existir (arquivo .js vazio), o typeof abaixo não gera
// erro — ele só fica marcado como "não implementado" no console.
const MODULOS = [
    {
        nome: 'Filtros',
        obterRef: function () {
            return typeof Filtros !== 'undefined' ? Filtros : null;
        }
    },
    {
        nome: 'KPIs',
        obterRef: function () {
            return typeof KPIs !== 'undefined' ? KPIs : null;
        }
    },
    {
        nome: 'Mapa',
        obterRef: function () {
            return typeof Mapa !== 'undefined' ? Mapa : null;
        }
    },
    {
        nome: 'Scatterplot',
        obterRef: function () {
            return typeof Scatterplot !== 'undefined'
                ? Scatterplot
                : null;
        }
    },
    {
        nome: 'Calendario',
        obterRef: function () {
            return typeof Calendario !== 'undefined'
                ? Calendario
                : null;
        }
    },
    {
        nome: 'Matriz',
        obterRef: function () {
            return typeof Matriz !== 'undefined' ? Matriz : null;
        }
    },
    {
        nome: 'Timeline',
        obterRef: function () {
            return typeof Timeline !== 'undefined' ? Timeline : null;
        }
    }
];

// ===== CONVERSÃO DOS REGISTROS DE CADA ARQUIVO =====

function converterRegistroDataUf(d) {
    return {
        data: paraData(d.data),
        ano: paraNumero(d.ano),
        mes_numero: paraNumero(d.mes_numero),
        dia_semana: d.dia_semana,
        dia_semana_numero: paraNumero(d.dia_semana_numero),
        fim_semana: paraBooleano(d.fim_semana),
        uf: d.uf,
        regiao: d.regiao,
        total_acidentes: paraNumero(d.total_acidentes),
        total_graves_fatais: paraNumero(d.total_graves_fatais),
        total_mortos: paraNumero(d.total_mortos),
        total_feridos_graves: paraNumero(d.total_feridos_graves),
        total_vitimas: paraNumero(d.total_vitimas),
        taxa_gravidade: paraNumero(d.taxa_gravidade)
    };
}

function converterRegistroCausaHorarioUf(d) {
    return {
        ano: paraNumero(d.ano),
        uf: d.uf,
        regiao: d.regiao,
        causa_acidente: d.causa_acidente,
        faixa_horario: d.faixa_horario,
        total_acidentes: paraNumero(d.total_acidentes),
        total_graves_fatais: paraNumero(d.total_graves_fatais),
        total_mortos: paraNumero(d.total_mortos),
        total_feridos_graves: paraNumero(d.total_feridos_graves),
        total_vitimas: paraNumero(d.total_vitimas),
        taxa_gravidade: paraNumero(d.taxa_gravidade)
    };
}

// ===== CARREGAMENTO =====

Promise.all([
    d3.csv(CAMINHOS_DADOS.porDataUf, converterRegistroDataUf),
    d3.csv(CAMINHOS_DADOS.porCausaHorarioUf, converterRegistroCausaHorarioUf)
]).then(function (resultados) {
    Dados.porDataUf = resultados[0];
    Dados.porCausaHorarioUf = resultados[1];

    console.info('RodoviaVis: dois conjuntos de dados agregados carregados com sucesso.');

    inicializarModulos();
    inscreverEstado(atualizarDashboard);
    atualizarDashboard();
}).catch(function (erro) {
    console.error('RodoviaVis: falha ao carregar os dados processados.', erro);
    mostrarErroCarregamento();
});

// ===== INICIALIZAÇÃO E ATUALIZAÇÃO DOS MÓDULOS =====

function inicializarModulos() {
    MODULOS.forEach(function (modulo) {
        const referencia = modulo.obterRef();

        if (referencia && typeof referencia.iniciar === 'function') {
            try {
                referencia.iniciar(Dados);
            } catch (erro) {
                console.error(
                    'RodoviaVis: erro ao iniciar o módulo "' +
                    modulo.nome + '".',
                    erro
                );
            }
        } else {
            console.info(
                'RodoviaVis: módulo "' + modulo.nome +
                '" ainda não foi implementado.'
            );
        }
    });
}

// Chamada toda vez que o Estado avisa que os filtros mudaram (e uma
// vez no carregamento inicial). Cada módulo recebe os filtros atuais
// e decide sozinho, com filtrarPorEstado(), o que desenhar.
function atualizarDashboard() {
    const filtrosAtuais = obterFiltros();

    MODULOS.forEach(function (modulo) {
        const referencia = modulo.obterRef();

        if (referencia && typeof referencia.atualizar === 'function') {
            try {
                referencia.atualizar(filtrosAtuais);
            } catch (erro) {
                console.error(
                    'RodoviaVis: erro ao atualizar o módulo "' +
                    modulo.nome + '".',
                    erro
                );
            }
        }
    });

    atualizarIndicacaoFiltrosAtivos();
}

// ===== INDICAÇÃO VISÍVEL DOS FILTROS ATIVOS =====
// Usa a seção #detalhes-selecao (aria-live="polite") que já existe
// no index.html, para leitores de tela também anunciarem a mudança.

function atualizarIndicacaoFiltrosAtivos() {
    const filtros = obterFiltros();
    const partes = [];

    if (filtros.ano !== null) partes.push('Ano: ' + filtros.ano);
    if (filtros.uf !== null) partes.push('UF: ' + filtros.uf);
    if (filtros.mes !== null) partes.push('Mês: ' + filtros.mes);
    if (filtros.causa !== null) partes.push('Causa: ' + filtros.causa);
    if (filtros.faixaHorario !== null) partes.push('Faixa de horário: ' + filtros.faixaHorario);
    if (filtros.dataInicial !== null && filtros.dataFinal !== null) {
        partes.push('Período: ' + formatarData(filtros.dataInicial) + ' a ' + formatarData(filtros.dataFinal));
    }

    d3.select('#detalhes-selecao')
        .text(partes.length ? 'Filtros ativos — ' + partes.join(' · ') : 'Nenhum filtro ativo.');
}

// ===== ERRO DE CARREGAMENTO =====

function mostrarErroCarregamento() {
    d3.select('body')
        .insert('div', ':first-child')
        .attr('class', 'erro-carregamento')
        .html(
            '<strong>Não foi possível carregar os dados do RodoviaVis.</strong><br>' +
            'Verifique se os arquivos existem em data/processed/ e se a página está ' +
            'sendo aberta por um servidor local (Live Server), não direto pelo navegador.'
        );
}