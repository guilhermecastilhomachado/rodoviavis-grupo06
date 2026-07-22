/*
 * RodoviaVis — state.js
 * Responsável: Guilherme Castilho Machado (dados, arquitetura e integração)
 *
 * Este arquivo guarda o estado dos filtros que é compartilhado entre
 * todos os layouts (mapa, calendário, matriz, scatterplot, KPIs e
 * linha temporal), para que cada colega não crie sua própria lógica
 * de filtro incompatível com a dos outros.
 *
 * Este arquivo NÃO desenha nada e não sabe nada sobre D3, SVG ou
 * HTML. Ele só guarda dados e avisa quem está interessado quando
 * eles mudam.
 */

// Formato combinado com o grupo para o objeto de filtros.
const filtrosIniciais = {
    ano: null,
    uf: null,
    mes: null,
    dataInicial: null,
    dataFinal: null,
    causa: null,
    faixaHorario: null,
    metrica: 'total_acidentes'
};

const Estado = {
    filtros: Object.assign({}, filtrosIniciais),
    ouvintes: []
};

// ===== INSCRIÇÃO =====
// Qualquer módulo (mapa.js, kpis.js, timeline.js etc.) pode se
// inscrever para ser avisado sempre que os filtros mudarem.

function inscreverEstado(ouvinte) {
    if (typeof ouvinte !== 'function') {
        console.warn('Estado: só é possível inscrever uma função.');
        return function () {};
    }

    if (!Estado.ouvintes.includes(ouvinte)) {
        Estado.ouvintes.push(ouvinte);
    }

    return function removerInscricao() {
        Estado.ouvintes = Estado.ouvintes.filter(function (item) {
            return item !== ouvinte;
        });
    };
}

function notificarOuvintesDoEstado() {
    const filtrosAtuais = obterFiltros();

    Estado.ouvintes.slice().forEach(function (ouvinte) {
        try {
            ouvinte(filtrosAtuais);
        } catch (erro) {
            console.error('Estado: erro ao notificar um ouvinte.', erro);
        }
    });
}

// ===== LEITURA E ALTERAÇÃO DOS FILTROS =====
// Os módulos não devem alterar Estado.filtros diretamente. Sempre
// usar definirFiltro/definirFiltros/resetarFiltros, para garantir
// que os ouvintes sejam avisados da mudança.

function obterFiltros() {
    return Object.assign({}, Estado.filtros);
}

function definirFiltro(nome, valor) {
    if (!(nome in filtrosIniciais)) {
        console.warn(
            'Estado: o filtro "' + nome +
            '" não existe no contrato combinado.'
        );
        return;
    }

    if (Object.is(Estado.filtros[nome], valor)) {
        return;
    }

    Estado.filtros[nome] = valor;
    notificarOuvintesDoEstado();
}

function definirFiltros(novosValores) {
    if (
        novosValores === null ||
        typeof novosValores !== 'object' ||
        Array.isArray(novosValores)
    ) {
        console.warn('Estado: definirFiltros espera um objeto.');
        return;
    }

    let houveAlteracao = false;

    Object.keys(novosValores).forEach(function (nome) {
        if (!(nome in filtrosIniciais)) {
            console.warn(
                'Estado: o filtro "' + nome +
                '" não existe no contrato combinado.'
            );
            return;
        }

        if (!Object.is(Estado.filtros[nome], novosValores[nome])) {
            Estado.filtros[nome] = novosValores[nome];
            houveAlteracao = true;
        }
    });

    if (houveAlteracao) {
        notificarOuvintesDoEstado();
    }
}

function resetarFiltros() {
    Estado.filtros = Object.assign({}, filtrosIniciais);
    notificarOuvintesDoEstado();
}

// Usado pelo painel de filtros para mostrar/esconder o botão "limpar"
// e pelo app.js para exibir a indicação de filtros ativos.
function existeFiltroAtivo() {
    return Object.keys(filtrosIniciais).some(function (nome) {
        return !Object.is(Estado.filtros[nome], filtrosIniciais[nome]);
    });
}
