# RodoviaVis — Grupo 06

Sistema web interativo para análise visual de padrões e gravidade em
acidentes nas rodovias federais brasileiras entre 2022 e 2024.

## Integrantes

- Geovanna David Gonzaga
- Guilherme Castilho Machado
- Tiago Magela Borges
- Wothon Mateus de Araujo

## Tecnologias previstas

- HTML
- CSS
- JavaScript
- D3.js
- Python para pré-processamento dos dados

## Execução local

O sistema deverá ser executado por servidor local.

No Windows:

```bash
py -m http.server 8000
```

Depois, acesse:

```link
http://localhost:8000
```

Também é possível utilizar a extensão Live Server no VS Code.

## Organização dos módulos
* Guilherme: dados, filtros, KPIs, linha temporal e integração;
* Tiago: calendário heatmap;
* Geovanna: heatmap matricial;
* Wothon: mapa coroplético e scatterplot.

## Fonte dos dados

Polícia Rodoviária Federal — Dados Abertos — Boletim de Acidente de
Trânsito, arquivos agrupados por ocorrência dos anos de 2022, 2023 e 2024.

## Status

Estrutura inicial e preparação das bases de dados.