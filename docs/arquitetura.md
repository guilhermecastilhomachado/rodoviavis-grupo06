# Arquitetura do RodoviaVis

## 1. Visão geral

O RodoviaVis é uma aplicação web estática. O navegador carrega arquivos agregados em CSV e um GeoJSON local, mantém os filtros em um estado compartilhado e solicita que cada módulo atualize sua visualização.

Fluxo principal:

```text
Bases PRF 2022–2024
        ↓
preprocessing/preparar_dados.py
        ↓
data/processed/acidentes_2022_2024.csv
        ↓
preprocessing/gerar_agregados.py
        ↓
CSVs agregados + GeoJSON
        ↓
js/app.js → js/state.js → módulos D3.js
```

## 2. Arquivos de dados consumidos

| Arquivo | Finalidade principal |
|---|---|
| `agregado_uf_ano.csv` | totais anuais por UF |
| `agregado_data_uf.csv` | calendário, KPIs, mapa, scatterplot e linha temporal |
| `agregado_mes_uf.csv` | apoio a análises mensais |
| `agregado_causa_horario_uf.csv` | matriz contextual |
| `perfil_uf_ano.csv` | perfil das UFs |
| `data/geo/brasil_estados.geojson` | geometria dos estados no mapa |

A base detalhada não é carregada no navegador, evitando transferir e processar aproximadamente 205 mil registros a cada abertura.

## 3. Módulos JavaScript

| Arquivo | Responsabilidade |
|---|---|
| `app.js` | carregar dados, inicializar módulos, coordenar atualizações e tratar falhas |
| `state.js` | guardar filtros e notificar ouvintes |
| `utils.js` | conversões, formatação, filtragem, agregação e tooltip compartilhada |
| `filtros.js` | sincronizar os controles globais com o estado |
| `kpis.js` | calcular e exibir indicadores gerais |
| `mapa.js` | mapa coroplético e seleção de UF |
| `scatterplot.js` | perfil de risco por UF |
| `calendario.js` | heatmap diário e seleção de data |
| `matriz.js` | relação entre causa e faixa horária |
| `timeline.js` | série diária e brush temporal |

## 4. Contrato dos módulos

Cada visualização expõe:

```javascript
Modulo.iniciar(dados);
Modulo.atualizar(filtros);
```

`iniciar` constrói a base do layout e registra eventos. `atualizar` recebe uma cópia dos filtros atuais e recalcula somente o necessário.

## 5. Estado compartilhado

O estado contém:

```text
ano, uf, mes, dataInicial, dataFinal,
causa, faixaHorario e metrica
```

As alterações devem usar `definirFiltro`, `definirFiltros` ou `resetarFiltros`. Os módulos não devem alterar `Estado.filtros` diretamente.

Nem todo agregado possui todas as dimensões. `filtrarPorEstado` aplica um filtro somente quando o campo existe no registro. Dessa forma, ano, UF e período coordenam os módulos compatíveis, enquanto causa e faixa horária atuam sobre o agregado contextual.

## 6. Inicialização

1. `app.js` carrega os cinco CSVs em `Promise.all`.
2. Os registros são convertidos para números, booleanos e objetos `Date`.
3. `inicializarModulos()` chama `iniciar(dados)`.
4. `app.js` inscreve `atualizarDashboard` no estado.
5. Cada mudança de filtro chama `atualizar(filtros)` em todos os módulos.

## 7. Tratamento de erros e resultados vazios

- falhas no carregamento mostram uma mensagem amigável;
- erros de um módulo são capturados sem interromper os demais;
- resultados vazios usam a mensagem compartilhada de `utils.js`;
- os módulos evitam duplicar SVGs durante atualizações.

## 8. Responsividade

O layout utiliza uma grade de 12 colunas. Mapa e scatterplot aparecem lado a lado em telas largas e ocupam a largura completa em telas menores. Visualizações SVG extensas usam áreas de rolagem horizontal.
