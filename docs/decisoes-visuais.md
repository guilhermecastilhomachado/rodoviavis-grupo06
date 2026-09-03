# Decisões visuais do RodoviaVis

## 1. Perguntas analíticas

O dashboard combina técnicas diferentes porque cada uma responde melhor a uma pergunta:

1. Qual é a dimensão geral dos acidentes e da gravidade?
2. Onde os valores se concentram?
3. Quais UFs combinam volume e gravidade elevados?
4. Quando surgem picos e recorrências?
5. Quais causas aparecem com maior intensidade em cada faixa horária?

Tentar codificar todas essas dimensões em um único gráfico aumentaria a carga visual e reduziria a legibilidade.

## 2. KPIs - visão geral

Os cartões apresentam seis indicadores: total de acidentes, ocorrências graves ou fatais, mortos, feridos graves, vítimas e taxa de gravidade.

A taxa de gravidade é sempre recalculada a partir dos totais filtrados:

```text
taxa_gravidade = total_graves_fatais / total_acidentes
```

Ela não é obtida pela média simples das taxas das UFs, pois isso daria o mesmo peso a estados com volumes muito diferentes.

Na versão de portfólio, os KPIs usam o agregado diário para responder também ao período selecionado na linha temporal.

## 3. Mapa coroplético - onde?

- **marca:** área de cada UF;
- **posição/forma:** geografia do Brasil;
- **cor sequencial:** valor da métrica selecionada;
- **interação:** tooltip, seleção de UF e zoom.

A escala sequencial amarelo-laranja-vermelho comunica ordem: tons mais escuros representam valores maiores.

O mapa é adequado para padrões espaciais, mas não é a melhor técnica para ranking preciso. Um gráfico de barras ordenado facilitaria comparações exatas entre UFs, porém perderia a estrutura geográfica.

## 4. Scatterplot - volume versus gravidade

Cada círculo representa uma UF:

- eixo x: total de acidentes;
- eixo y: taxa de gravidade;
- tamanho: total de mortos, usando escala de raiz quadrada;
- cor: região do Brasil.

As linhas de média criam quatro quadrantes para separar combinações de alto/baixo volume e alta/baixa gravidade. As cores são categóricas porque as regiões não possuem ordem natural.

O scatterplot complementa o mapa: uma UF com muitos acidentes não é necessariamente a que possui maior gravidade proporcional.

## 5. Calendário heatmap - quando?

Cada célula representa um dia. A organização em semanas e dias da semana preserva a estrutura temporal e facilita perceber recorrência, sazonalidade e picos.

A cor é eficiente para detectar padrões em muitas células. Valores exatos ficam disponíveis em tooltip.

Quando existe um período selecionado na linha temporal, o calendário mantém o contexto completo e destaca o intervalo em vez de remover os demais dias. Essa escolha preserva orientação temporal.

## 6. Matriz contextual - causa versus faixa horária

- colunas: causas;
- linhas: Madrugada, Manhã, Tarde e Noite;
- cor: métrica selecionada.

Os controles Top 5/10/15/Todas evitam excesso de categorias. A ordenação por valor facilita localizar concentrações; a alfabética favorece busca por uma causa conhecida.

A matriz usa agregado anual por UF, causa e faixa horária. Por isso, não aplica o recorte diário da linha temporal e informa essa limitação quando necessário.

## 7. Linha temporal - navegação temporal

A linha temporal é uma visualização auxiliar de contexto e navegação:

- eixo x: data;
- eixo y: métrica selecionada;
- pontos/linha: evolução diária;
- brush: transforma uma seleção visual em `dataInicial` e `dataFinal`.

O eixo x mantém 2022-2024 como referência estável. O brush atualiza os módulos com granularidade compatível.

## 8. Linked views

O estado global coordena os módulos. Uma interação não chama diretamente outro gráfico; ela altera filtros compartilhados e cada módulo decide como responder.

Isso permite combinar múltiplas perspectivas sem duplicar lógica de integração.

## 9. Cor e consistência

A interface reserva a escala YlOrRd para quantidade/intensidade e usa cores categóricas no scatterplot para regiões. Cores decorativas não devem competir com cores que codificam dados.

## 10. Limitações de interpretação

- associação não implica causalidade;
- volume absoluto não é sinônimo de risco individual;
- a taxa de gravidade é uma proporção específica, não um índice completo de segurança;
- resultados por UF não controlam exposição, frota, população, extensão da malha ou fluxo de veículos;
- o sistema apoia exploração e geração de hipóteses, não previsão.
