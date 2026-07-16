# Contrato inicial dos dados do RodoviaVis

## Período

2022 a 2024.

## Unidade de análise

Cada linha representa uma ocorrência de acidente registrada pela PRF.

## Bases originais

- data/raw/datatran2022.csv
- data/raw/datatran2023.csv
- data/raw/datatran2024.csv

## Formato das bases originais

- Separador: ponto e vírgula
- Codificação: Latin-1
- Datas: dia/mês/ano
- Coordenadas: podem utilizar vírgula ou ponto decimal

## Variáveis processadas previstas

- id
- data
- ano
- mes_numero
- mes_nome
- dia_semana
- fim_semana
- hora
- faixa_horario
- uf
- regiao
- br
- causa_acidente
- tipo_acidente
- classificacao_acidente
- condicao_meteorologica
- tipo_pista
- mortos
- feridos_graves
- feridos_leves
- total_vitimas
- acidente_fatal
- acidente_grave_ou_fatal
- latitude
- longitude

## Indicadores

- total_acidentes
- total_graves_fatais
- taxa_gravidade
- total_mortos