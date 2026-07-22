/*
 * RodoviaVis — utils.js
 * Responsável: Guilherme Castilho Machado (dados, arquitetura e integração)
 *
 * Funções pequenas e reaproveitáveis usadas por mais de um módulo:
 * conversão de tipos, formatação, filtragem pelo estado global,
 * tooltip compartilhada e normalização de texto.
 *
 * Nenhuma função aqui monta um layout inteiro sozinha — quem desenha
 * mapa, calendário, matriz etc. é cada módulo específico. Este
 * arquivo só oferece ferramentas para eles.
 */

const localidadeBR = d3.formatLocale({
    decimal: ',',
    thousands: '.',
    grouping: [3],
    currency: ['R$ ', '']
});

const parseDataISO = d3.timeParse('%Y-%m-%d');
const formatoDataBR = d3.timeFormat('%d/%m/%Y');
const formatoInteiro = localidadeBR.format(',d');
const formatoPercentual = localidadeBR.format('.1%');

// ===== CONVERSÃO DE TIPOS =====
// Os arquivos agregados vêm do pandas: números como texto, datas no
// formato ISO (AAAA-MM-DD) e booleanos como 'True'/'False'.

function paraNumero(valor) {
    if (valor === undefined || valor === null) {
        return null;
    }

    const texto = String(valor).trim();

    if (texto === '') {
        return null;
    }

    const numero = Number(texto.replace(',', '.'));

    return Number.isFinite(numero) ? numero : null;
}

function paraBooleano(valor) {
    if (typeof valor === 'boolean') {
        return valor;
    }

    return String(valor).trim().toLowerCase() === 'true';
}

function paraData(textoISO) {
    if (!textoISO) {
        return null;
    }
    return parseDataISO(textoISO);
}

// ===== FORMATAÇÃO =====

function formatarNumero(valor) {
    return (valor === null || valor === undefined) ? '-' : formatoInteiro(valor);
}

function formatarPercentual(valor) {
    return (valor === null || valor === undefined) ? '-' : formatoPercentual(valor);
}

function formatarData(data) {
    return data ? formatoDataBR(data) : '-';
}

// ===== FILTRAGEM PELO ESTADO GLOBAL =====
// Cada arquivo agregado tem colunas diferentes (ex.: o agregado por
// UF e ano não tem "causa_acidente"). Por isso, um filtro só é
// aplicado quando o registro realmente possui aquele campo — assim
// a mesma função serve para todos os arquivos, sem precisar de uma
// versão de filtro por layout.

function filtrarPorEstado(registros, filtros) {
    return registros.filter(function (registro) {
        if (filtros.ano !== null && registro.ano !== undefined && registro.ano !== filtros.ano) {
            return false;
        }
        if (filtros.uf !== null && registro.uf !== undefined && registro.uf !== filtros.uf) {
            return false;
        }
        if (filtros.mes !== null && registro.mes_numero !== undefined && registro.mes_numero !== filtros.mes) {
            return false;
        }
        if (filtros.causa !== null && registro.causa_acidente !== undefined && registro.causa_acidente !== filtros.causa) {
            return false;
        }
        if (filtros.faixaHorario !== null && registro.faixa_horario !== undefined && registro.faixa_horario !== filtros.faixaHorario) {
            return false;
        }
        if (filtros.dataInicial !== null && registro.data !== undefined && registro.data < filtros.dataInicial) {
            return false;
        }
        if (filtros.dataFinal !== null && registro.data !== undefined && registro.data > filtros.dataFinal) {
            return false;
        }
        return true;
    });
}

// ===== TOOLTIP COMPARTILHADA =====
// Reaproveita a div #tooltip-global já existente no index.html, em
// vez de cada módulo criar a sua própria. Segue o mesmo padrão
// mouseover/mousemove/mouseout visto em aula, adaptado ao atributo
// "hidden" que já está no HTML.

const tooltipGlobal = d3.select('#tooltip-global');

function mostrarTooltip(html, event) {
    tooltipGlobal
        .attr('hidden', null)
        .html(html)
        .style('left', (event.pageX + 12) + 'px')
        .style('top', (event.pageY - 24) + 'px');
}

function moverTooltip(event) {
    tooltipGlobal
        .style('left', (event.pageX + 12) + 'px')
        .style('top', (event.pageY - 24) + 'px');
}

function esconderTooltip() {
    tooltipGlobal.attr('hidden', true);
}

// ===== TRATAMENTO DE LISTA VAZIA =====

function possuiDados(lista) {
    return Array.isArray(lista) && lista.length > 0;
}

function mostrarMensagemVazia(seletorContainer, mensagem) {
    const texto = mensagem || 'Nenhum dado encontrado para os filtros selecionados.';

    d3.select(seletorContainer)
        .selectAll('.mensagem-vazia')
        .data([texto])
        .join('p')
        .attr('class', 'mensagem-vazia')
        .text(function (d) { return d; });
}

function removerMensagemVazia(seletorContainer) {
    d3.select(seletorContainer).selectAll('.mensagem-vazia').remove();
}

// ===== NORMALIZAÇÃO DE TEXTO =====
// Usada, por exemplo, no filtro de busca de causas da matriz
// (Geovanna), para "Ingestão de álcool" encontrar "ingestao de alcool".

function normalizarTexto(texto) {
    if (!texto) {
        return '';
    }
    return texto
        .toString()
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

// ===== AGREGAÇÃO POR UF =====
// Usada por mapa.js e scatterplot.js, que precisam do mesmo
// agrupamento a partir de Dados.porDataUf (filtra pelo estado global
// e soma por UF). Fica aqui, e não duplicada nos dois módulos,
// porque os dois precisam exatamente da mesma conta.

function agregarPorUf(dados, filtros) {
    const filtrados = filtrarPorEstado(dados, filtros);

    return new Map(
        d3.rollups(
            filtrados,
            function (registros) {
                const totalAcidentes = d3.sum(registros, function (d) { return d.total_acidentes; });
                const totalGravesFatais = d3.sum(registros, function (d) { return d.total_graves_fatais; });

                return {
                    total_acidentes: totalAcidentes,
                    total_graves_fatais: totalGravesFatais,
                    total_mortos: d3.sum(registros, function (d) { return d.total_mortos; }),
                    total_feridos_graves: d3.sum(registros, function (d) { return d.total_feridos_graves; }),
                    total_vitimas: d3.sum(registros, function (d) { return d.total_vitimas; }),
                    // recalculada a partir dos totais do grupo, nunca somada
                    // nem tirada a média a partir das taxas que já vinham
                    // prontas por linha (mesma regra do kpis.js/timeline.js).
                    taxa_gravidade: totalAcidentes > 0 ? (totalGravesFatais / totalAcidentes) : 0,
                    regiao: registros[0].regiao
                };
            },
            function (d) { return d.uf; }
        )
    );
}

// ===== CONFIGURAÇÃO COMPARTILHADA DE MÉTRICAS =====
// Nomes oficiais das colunas dos CSVs (nunca traduzidos para nomes
// curtos como "acidentes" ou "taxa"), com o rótulo e o formatador
// corretos de cada uma. Usada por qualquer módulo que precise
// respeitar o filtro global de métrica (mapa, timeline...).

const CONFIGURACAO_METRICAS = {
    total_acidentes: {
        titulo: 'Total de acidentes',
        campo: 'total_acidentes',
        formato: function (valor) { return formatarNumero(valor); }
    },
    total_graves_fatais: {
        titulo: 'Acidentes graves ou fatais',
        campo: 'total_graves_fatais',
        formato: function (valor) { return formatarNumero(valor); }
    },
    total_mortos: {
        titulo: 'Mortos',
        campo: 'total_mortos',
        formato: function (valor) { return formatarNumero(valor); }
    },
    total_feridos_graves: {
        titulo: 'Feridos graves',
        campo: 'total_feridos_graves',
        formato: function (valor) { return formatarNumero(valor); }
    },
    total_vitimas: {
        titulo: 'Total de vítimas',
        campo: 'total_vitimas',
        formato: function (valor) { return formatarNumero(valor); }
    },
    taxa_gravidade: {
        titulo: 'Taxa de gravidade',
        campo: 'taxa_gravidade',
        formato: function (valor) { return formatarPercentual(valor); }
    }
};