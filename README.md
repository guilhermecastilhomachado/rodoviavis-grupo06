# RodoviaVis — Grupo 06

Sistema web interativo para análise visual de padrões, distribuição geográfica e gravidade de acidentes nas rodovias federais brasileiras entre 2022 e 2024.

## Integrantes

- Geovanna David Gonzaga
- Guilherme Castilho Machado
- Tiago Magela Borges
- Wothon Mateus de Araujo

## Funcionalidades

- filtros globais por ano, UF e métrica;
- indicadores gerais atualizados de forma coordenada;
- mapa coroplético dos estados brasileiros;
- scatterplot do perfil de risco por UF;
- calendário heatmap com a distribuição diária dos acidentes;
- matriz de causas por faixa horária;
- linha temporal com seleção interativa de período;
- tooltips, estados vazios, interação por mouse e suporte básico ao teclado;
- layout responsivo para desktop, tablet e celular.

## Tecnologias

- HTML5 e CSS3;
- JavaScript;
- D3.js v7, mantido localmente em `lib/`;
- Python e pandas no pré-processamento dos dados.

## Execução local

A aplicação precisa ser aberta por um servidor local, pois os arquivos CSV e GeoJSON são carregados de forma assíncrona.

No Windows, na raiz do projeto:

```powershell
py -m http.server 8000
```

Depois, acesse:

```text
http://localhost:8000
```

Também é possível utilizar a extensão Live Server no VS Code.

## Interações principais

- altere ano, UF ou métrica nos controles globais;
- clique em um estado do mapa ou em um ponto do scatterplot para selecionar uma UF;
- clique em um dia do calendário para selecionar uma data;
- clique em uma célula da matriz para filtrar causa e faixa horária;
- arraste sobre a linha temporal para selecionar um intervalo;
- use **Restaurar visualização** para retornar ao estado inicial.

## Arquitetura

O carregamento e a integração ficam centralizados em `js/app.js`. O contrato de filtros compartilhados fica em `js/state.js`, e funções reutilizáveis ficam em `js/utils.js`. Cada visualização expõe os métodos `iniciar(dados)` e `atualizar(filtros)`.

Mais detalhes:

- [Arquitetura](docs/arquitetura.md)
- [Decisões visuais](docs/decisoes-visuais.md)
- [Plano de testes](docs/testes.md)
- [Dicionário de dados](docs/dicionario-dados.md)
- [Fonte e licença dos limites estaduais](data/geo/README.md)

## Dados

Fonte principal: Polícia Rodoviária Federal — Dados Abertos — Boletim de Acidente de Trânsito, arquivos agrupados por ocorrência dos anos de 2022, 2023 e 2024.

A base detalhada é preparada em Python e transformada em arquivos agregados menores para uso no navegador. O mapa utiliza limites estaduais documentados em `data/geo/`.

## Limitação conhecida

A matriz contextual utiliza um agregado anual por UF, causa e faixa horária. Por isso, o recorte diário criado pela linha temporal não é aplicado à matriz; essa limitação é informada na interface quando um período está selecionado.

## Organização dos módulos

- Guilherme: dados, filtros, KPIs, linha temporal e integração;
- Tiago: calendário heatmap;
- Geovanna: matriz de causas por faixa horária;
- Wothon: mapa coroplético e scatterplot.

## Status

Versão integrada e funcional, em fase de acabamento visual, documentação e validação final para apresentação.
