# Decisões visuais do RodoviaVis

## 1. Objetivo analítico

O sistema busca responder cinco perguntas:

1. Qual é a dimensão geral dos acidentes e de sua gravidade?
2. Onde os acidentes se concentram?
3. Quais UFs combinam volume e gravidade elevados?
4. Quando ocorrem os principais picos?
5. Quais causas predominam em cada faixa horária?

## 2. Indicadores gerais

Os KPIs apresentam totais de acidentes, ocorrências graves ou fatais, mortos, feridos graves, vítimas e taxa de gravidade. Eles oferecem uma leitura inicial e são recalculados conforme os filtros compatíveis.

## 3. Mapa coroplético

O mapa utiliza posição geográfica para representar as UFs e uma escala sequencial amarelo–laranja–vermelho para codificar a métrica escolhida. Tons mais escuros indicam valores maiores. A legenda é atualizada com o subconjunto filtrado.

O clique em um estado define a UF no estado global. O zoom auxilia a inspeção, mas não substitui o filtro.

## 4. Scatterplot de perfil de risco

- eixo x: total de acidentes;
- eixo y: taxa de gravidade;
- cor: região do Brasil;
- tamanho: quantidade de mortos.

As linhas de média dividem o plano em quadrantes e ajudam a distinguir UFs com volume e gravidade acima ou abaixo da média do conjunto exibido.

## 5. Calendário heatmap

Cada célula representa um dia. A intensidade da cor indica o valor da métrica selecionada. A organização semanal preserva a percepção de sazonalidade, recorrência e picos diários.

## 6. Matriz de causa e faixa horária

As colunas representam causas de acidentes e as linhas representam Madrugada, Manhã, Tarde e Noite. A cor indica a métrica selecionada. Os controles Top 5/10/15/Todas reduzem a sobrecarga visual.

Quando a métrica é taxa de gravidade, a taxa é recalculada a partir dos totais do grupo, e não somada nem calculada pela média simples das taxas.

A matriz utiliza um agregado anual por UF, causa e faixa horária. Portanto, o intervalo diário da linha temporal não é aplicado a esse painel. A interface informa essa limitação quando um período está ativo.

## 7. Linha temporal

A série diária permite identificar tendência e picos. O brush transforma a seleção visual em `dataInicial` e `dataFinal`, coordenando os módulos que possuem dimensão diária.

## 8. Cores e consistência

A interface usa azul-escuro e cinza-azulado para estrutura e interação. A escala YlOrRd é reservada para intensidade e gravidade, evitando misturar cores decorativas com cores que codificam dados.

As cores regionais do scatterplot são categóricas porque representam grupos sem ordem natural.

## 9. Interação coordenada

- controles globais: ano, UF e métrica;
- mapa e scatterplot: seleção de UF;
- calendário: seleção de data;
- matriz: seleção de causa e faixa horária;
- linha temporal: seleção de período;
- botão Restaurar: retorno ao estado inicial.

## 10. Acessibilidade e responsividade

Elementos interativos importantes possuem foco visível, rótulos acessíveis e ativação por Enter ou Espaço quando aplicável. Tooltips complementam, mas não são a única indicação de seleção. Gráficos largos utilizam rolagem horizontal em telas pequenas.

## 11. Limites estaduais

A origem, a licença MIT, o processamento e as limitações topológicas do GeoJSON estão documentados em `data/geo/README.md` e `data/geo/LICENSE-MIT.txt`.
