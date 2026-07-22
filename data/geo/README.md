# Limites estaduais do Brasil

## Arquivo utilizado

`brasil_estados.geojson`

O arquivo contém os limites geográficos das 27 unidades federativas
brasileiras usados no mapa coroplético do RodoviaVis.

Cada feature contém as propriedades:

- `sigla`: sigla da unidade federativa;
- `nome`: nome completo da unidade federativa.

## Fonte e rastreabilidade

**Repositório intermediário:**

- Repositório: `giuliano-macedo/geodata-br-states`
- Arquivo original: `geojson/br_states.json`
- Endereço:
  https://github.com/giuliano-macedo/geodata-br-states
- URL utilizada para obtenção do arquivo:
  https://raw.githubusercontent.com/giuliano-macedo/geodata-br-states/main/geojson/br_states.json

O repositório intermediário identifica como fonte primária a camada
“Estados do Brasil”, disponibilizada pelo Laboratório de
Geoprocessamento Ambiental da Universidade Federal do Paraná
(LAGEAMB/UFPR):

https://geonode.paranagua.pr.gov.br/layers/geonode:a__031_003_estadosBrasil

**Data de acesso:** 21/07/2026.

## Licenciamento

O repositório intermediário `giuliano-macedo/geodata-br-states`
é disponibilizado sob a MIT License:

Copyright (c) 2023 Giuliano Oliveira de Macedo.

Para preservar a atribuição, o texto dessa licença deve ser mantido
no arquivo `LICENSE-MIT.txt` desta pasta.

Durante a revisão, não foi localizada uma licença específica
claramente informada para a camada primária do LAGEAMB/UFPR.
Essa ausência de indicação explícita não significa que os dados
estejam em domínio público. A fonte institucional e o repositório
intermediário foram mantidos neste documento para garantir a
rastreabilidade acadêmica do arquivo.

## Processamento aplicado

O arquivo original possuía aproximadamente 5,4 MB.

A geometria foi simplificada com o Mapshaper utilizando o comando:

```bash
mapshaper -i br_states_candidate1.json -simplify 8% -o br_states_simplificado.json format=geojson precision=0.0001
```

A opção -simplify 8% manteve aproximadamente 8% dos vértices
originais. Foi utilizado o método padrão de simplificação do
Mapshaper, baseado em área efetiva ponderada.

A opção precision=0.0001 arredondou as coordenadas geográficas,
mantendo precisão aproximada suficiente para a visualização
nacional apresentada no dashboard.

Durante o processamento, o Mapshaper informou:

* 190 interseções reparadas automaticamente;
* 5 interseções que não puderam ser reparadas automaticamente.

As cinco ocorrências restantes não apresentaram impacto visual
perceptível durante a renderização do mapa, mas são registradas
aqui como limitação do arquivo simplificado.

Após a simplificação, foi realizado um processamento adicional para:

* renomear SIGLA para sigla;
* renomear Estado para nome;
* remover campos demográficos que não são utilizados pelo RodoviaVis;
* preservar somente as propriedades necessárias para identificação
  das unidades federativas.

## Resultado

O arquivo final possui:

* tipo FeatureCollection;
* 27 features, uma por unidade federativa;
* 27 siglas únicas;
* geometrias dos tipos Polygon e MultiPolygon;
* aproximadamente 414 KB em tamanho decimal, ou 405 KiB.

## Uso no RodoviaVis

O arquivo é carregado pelo módulo:

js/mapa.js

O GeoJSON é mantido com a orientação convencional dos anéis
geográficos. Durante o carregamento, o módulo do mapa cria uma
cópia das geometrias com a orientação necessária ao d3-geo,
sem modificar o arquivo original.

Os limites são utilizados exclusivamente para visualização
acadêmica e exploração de padrões estaduais no dashboard.

## Limitações

O arquivo foi simplificado para reduzir o tamanho e melhorar o
desempenho no navegador. Portanto, não deve ser utilizado para:

* medições cartográficas de alta precisão;
* definição legal de fronteiras;
* análises cadastrais ou fundiárias;
* aplicações que dependam da geometria oficial em escala detalhada.

Para essas finalidades, deve ser utilizada uma fonte cartográfica
oficial, atualizada e com precisão adequada ao objetivo da análise.