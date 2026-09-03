# Plano de testes do RodoviaVis

## 1. Preparação

Executar a aplicação por Live Server ou servidor HTTP local. Abrir o Console e a aba Network do navegador.

## 2. Verificações estáticas

Na raiz do projeto:

```powershell
node --check js/state.js
node --check js/utils.js
node --check js/filtros.js
node --check js/kpis.js
node --check js/mapa.js
node --check js/scatterplot.js
node --check js/calendario.js
node --check js/matriz.js
node --check js/timeline.js
node --check js/app.js

git diff --check
python -m json.tool data/geo/brasil_estados.geojson > $null
```

Resultado esperado: nenhuma mensagem de erro. O aviso local do Python sobre bibliotecas independentes da plataforma não invalida o JSON quando o comando termina sem traceback.

## 3. Carregamento

- abrir a aplicação;
- confirmar que os CSVs, o GeoJSON, o CSS e o JavaScript retornam status 200 ou 304;
- confirmar ausência de erros vermelhos no Console;
- confirmar a presença de KPIs, mapa, scatterplot, calendário, matriz e linha temporal.

## 4. Filtros globais

| Ação | Resultado esperado |
|---|---|
| selecionar 2022, 2023 ou 2024 | KPIs e visualizações compatíveis mudam |
| selecionar uma UF | mapa, scatterplot, KPIs, calendário e timeline refletem a UF |
| selecionar cada métrica | títulos, valores, escalas e legendas mudam |
| clicar em Restaurar | ano/UF/período/causa/faixa e métrica retornam ao padrão |

Verificação adicional: alterar apenas a métrica deve habilitar o botão Restaurar.

## 5. Mapa

- deve renderizar 27 estados;
- hover mostra tooltip;
- clique seleciona a UF e novo clique remove;
- Enter e Espaço realizam a mesma ação;
- Redefinir zoom retorna ao enquadramento inicial;
- estados sem dados não devem ser clicáveis.

Console:

```javascript
document.querySelectorAll('#mapa-container path.mapa-estado').length
```

Resultado esperado: `27`.

## 6. Scatterplot

- deve renderizar 27 pontos sem filtro de UF;
- cor representa região;
- tamanho representa mortos;
- clique e teclado selecionam uma UF;
- brush apenas destaca localmente e não cria seleção múltipla global;
- legenda de raio muda com o conjunto exibido.

Console:

```javascript
document.querySelectorAll('#scatterplot-container circle.scatterplot-ponto').length
```

Resultado esperado: `27` sem filtro de UF.

## 7. Calendário

- deve exibir os anos disponíveis;
- tooltip apresenta data e métricas;
- clique seleciona uma data;
- células fora do período ficam esmaecidas;
- não deve haver SVG ou células duplicadas após mudar filtros várias vezes.

Console:

```javascript
d3.selectAll('#calendario-container rect.calendario-celula').size()
d3.selectAll('#calendario-container rect.calendario-celula-selecionada').size()
```

## 8. Matriz

- Top 5/10/15/Todas altera a quantidade de colunas;
- ordenação alfabética e por valor funciona;
- tooltip apresenta causa, faixa e métricas;
- clique em célula define causa e faixa;
- clique novamente remove a combinação;
- rótulos e células com dados funcionam por Enter ou Espaço;
- células sem dados não devem criar filtros;
- ao selecionar um período, deve aparecer a nota sobre a granularidade anual.

## 9. Linha temporal

- a série deve mudar por ano, UF e métrica;
- o brush define período inicial e final;
- limpar o brush remove o período;
- trocar o ano limpa um período incompatível;
- a seleção deve recalcular KPIs, mapa e scatterplot;
- o calendário deve preservar o contexto completo e destacar/esmaecer o recorte;
- a matriz deve exibir a nota de que o agregado contextual possui granularidade anual.

Verificação adicional: compare os KPIs antes e depois de selecionar um intervalo curto. Os valores devem mudar quando o recorte temporal contiver apenas parte dos dias.

## 10. Responsividade

Testar aproximadamente em:

- 1440 × 900;
- 1024 × 768;
- 768 × 1024;
- 390 × 844.

Confirmar:

- ausência de sobreposição;
- mapa e scatterplot empilhados em telas menores;
- filtros em uma coluna no celular;
- KPIs em duas ou uma coluna;
- rolagem horizontal disponível para SVGs extensos.

## 11. Aceite final

- `git status` limpo;
- `git diff --check` sem saída;
- Console sem erros;
- todas as visualizações presentes;
- documentação atualizada;
- Pull Request revisado e integrado em `develop` antes de `main`.
